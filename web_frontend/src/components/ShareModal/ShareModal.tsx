import { useState } from 'react';
import { X, Loader2, Share2, Mail } from 'lucide-react';
import {
  resolveShareRecipient,
  createShare,
  sendShareInvite,
  type ShareItemPayload,
} from '../../api/sharing';
import styles from './ShareModal.module.css';

export interface ShareModalItem extends ShareItemPayload {
  label: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShareModalItem[];
  token: string;
  onSuccess?: (message: string) => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  items,
  token,
  onSuccess,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  if (!isOpen) return null;

  const resetLookup = () => {
    setResolvedUserId(null);
    setResolvedName(null);
    setError(null);
    setInviteMode(false);
  };

  const handleLookup = async () => {
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      setError('Enter an email or phone number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await resolveShareRecipient(
        { email: trimmedEmail || undefined, phone: trimmedPhone || undefined },
        token
      );
      setResolvedUserId(result.userId);
      setResolvedName(result.displayName);
    } catch (err: unknown) {
      resetLookup();
      const message = err instanceof Error ? err.message : 'Lookup failed';
      // No account found → offer to invite them instead of dead-ending.
      if (/no trakkit account/i.test(message)) {
        setInviteMode(true);
        setInviteEmail(trimmedEmail);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    const trimmed = inviteEmail.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Enter a valid email address to send an invite.');
      return;
    }

    try {
      setInviting(true);
      setError(null);
      const payload = items.map(({ itemType, itemId }) => ({ itemType, itemId }));
      const result = await sendShareInvite(trimmed, payload, token);
      const message =
        result.invited > 0
          ? `Invite sent to ${result.email}. They'll get the shared reminder once they join Trakkit.`
          : 'These items were already invited to that email.';
      onSuccess?.(message);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleShare = async () => {
    if (!resolvedUserId) {
      setError('Look up a Trakkit user first.');
      return;
    }

    try {
      setSharing(true);
      setError(null);
      const payload = items.map(({ itemType, itemId }) => ({ itemType, itemId }));
      const result = await createShare(resolvedUserId, payload, token);
      let message = `Shared with ${result.recipientDisplayName}. They'll be asked to accept.`;
      if (result.skipped?.length) {
        message += ` Already shared: ${result.skipped.join(', ')}.`;
      }
      onSuccess?.(message);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPhone('');
    setInviteEmail('');
    resetLookup();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Share reminder</h3>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.itemsSummary}>
            <strong>
              {items.length === 1 ? '1 item' : `${items.length} items`} selected
            </strong>
            <ul>
              {items.slice(0, 5).map((item) => (
                <li key={`${item.itemType}-${item.itemId}`}>{item.label}</li>
              ))}
              {items.length > 5 && <li>…and {items.length -  5} more</li>}
            </ul>
          </div>

          <p className={styles.hint}>
            Enter the email or phone number of their Trakkit account.
          </p>

          <label className={styles.label}>Email</label>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetLookup();
            }}
            placeholder="name@example.com"
          />

          <p className={styles.or}>or</p>

          <label className={styles.label}>Phone</label>
          <input
            type="tel"
            className={styles.input}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              resetLookup();
            }}
            placeholder="0771234567"
          />

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleLookup}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : 'Find account'}
          </button>

          {resolvedName && resolvedUserId && (
            <div className={styles.resolved}>
              Account found: <strong>{resolvedName}</strong>
            </div>
          )}

          {inviteMode && (
            <div className={styles.invite}>
              <strong className={styles.inviteTitle}>No Trakkit account yet</strong>
              <p className={styles.inviteText}>
                Invite them by email — they'll get a link to install Trakkit, and this shared
                reminder will be waiting once they sign up with that email.
              </p>
              <label className={styles.label}>Invite email</label>
              <input
                type="email"
                className={styles.input}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={handleClose}>
            Cancel
          </button>
          {inviteMode ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleSendInvite}
              disabled={inviting}
            >
              {inviting ? <Loader2 size={16} /> : <Mail size={16} />}
              Send Invite
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleShare}
              disabled={!resolvedUserId || sharing}
            >
              {sharing ? <Loader2 size={16} /> : <Share2 size={16} />}
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
