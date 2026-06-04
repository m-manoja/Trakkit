import { useState } from 'react';
import { X, Loader2, Share2 } from 'lucide-react';
import {
  resolveShareRecipient,
  createShare,
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

  if (!isOpen) return null;

  const resetLookup = () => {
    setResolvedUserId(null);
    setResolvedName(null);
    setError(null);
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
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
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

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnSecondary} onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleShare}
            disabled={!resolvedUserId || sharing}
          >
            {sharing ? <Loader2 size={16} /> : <Share2 size={16} />}
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
