import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import PremiumUpgradeCard from '../PremiumUpgradeCard/PremiumUpgradeCard';
import {
  fetchSentShares,
  fetchReceivedShares,
  revokeShare,
  type ShareListEntry,
  type ShareItemType,
} from '../../api/sharing';
import styles from './SharingSettings.module.css';

const TYPE_LABELS: Record<ShareItemType, string> = {
  warranty: 'Warranty',
  subscription: 'Subscription',
  reminder: 'Reminder',
  todo: 'To-do',
};

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function ItemDetails({ entry }: { entry: ShareListEntry }) {
  const item = entry.item;
  if (!item) return <p className={styles.meta}>Details are no longer available.</p>;

  const rows: { label: string; value: string }[] = [];

  switch (entry.itemType) {
    case 'warranty':
      rows.push(
        { label: 'Product', value: String(item.product_name || '—') },
        { label: 'Category', value: String(item.category || '—') },
        { label: 'Purchased from', value: String(item.purchase_place || '—') },
        { label: 'Expiry', value: formatDate(item.expiry_date) },
        { label: 'Status', value: String(item.status || '—') },
        { label: 'Description', value: String(item.description || '—') }
      );
      if (item.document_url) {
        const url = String(item.document_url).split(',')[0];
        rows.push({ label: 'Document', value: url });
      }
      break;
    case 'subscription':
      rows.push(
        { label: 'Service', value: String(item.service_name || '—') },
        { label: 'Amount', value: String(item.amount ?? '—') },
        { label: 'Billing cycle', value: String(item.billing_cycle || '—') },
        { label: 'Next billing', value: formatDate(item.next_billing_date) },
        { label: 'Description', value: String(item.description || '—') }
      );
      break;
    case 'reminder':
      rows.push(
        { label: 'Title', value: String(item.title || '—') },
        { label: 'Type', value: String(item.type || '—') },
        { label: 'Date', value: formatDate(item.reminder_date) },
        { label: 'Remind', value: String(item.remind_time || '—') },
        { label: 'Repeat', value: String(item.repeat_cycle || '—') },
        { label: 'Description', value: String(item.description || '—') }
      );
      break;
    case 'todo':
      rows.push(
        { label: 'Task', value: String(item.task_name || '—') },
        { label: 'Reminder date', value: formatDate(item.reminder_date) },
        { label: 'Has reminder', value: item.has_reminder ? 'Yes' : 'No' },
        { label: 'Completed', value: item.is_completed ? 'Yes' : 'No' }
      );
      break;
  }

  return (
    <div className={styles.detailPanel}>
      {rows.map((row) => (
        <div key={row.label} className={styles.detailRow}>
          <span className={styles.detailLabel}>{row.label}</span>
          <span className={styles.detailValue}>
            {row.label === 'Document' ? (
              <a href={row.value} target="_blank" rel="noopener noreferrer" className={styles.docLink}>
                View document
              </a>
            ) : (
              row.value
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SharingSettings() {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const [sent, setSent] = useState<ShareListEntry[]>([]);
  const [received, setReceived] = useState<ShareListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const [sentData, receivedData] = await Promise.all([
        isPremium ? fetchSentShares(user.token) : Promise.resolve([]),
        fetchReceivedShares(user.token),
      ]);
      setSent(sentData);
      setReceived(receivedData);
    } catch (err) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.token, isPremium]);

  const handleRevoke = async (shareId: string) => {
    if (!user?.token || !window.confirm('Stop sharing this item? They will no longer receive alerts.')) return;
    try {
      setRevokingId(shareId);
      await revokeShare(shareId, user.token);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) {
    return (
      <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Loader2 size={18} className="spin" /> Loading sharing…
      </p>
    );
  }

  return (
    <div>
      {isPremium ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Shared by you</h3>
          <p className={styles.sectionDesc}>
            Reminders you shared with others. Revoking removes them from both lists and stops their alerts.
          </p>
          {sent.length === 0 ? (
            <p className={styles.empty}>You have not shared any items yet.</p>
          ) : (
            <div className={styles.list}>
              {sent.map((entry) => (
                <div key={entry.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.cardTitle}>{entry.itemLabel}</p>
                      <span className={styles.badge}>{TYPE_LABELS[entry.itemType]}</span>
                    </div>
                  </div>
                  <p className={styles.meta}>
                    Shared with <strong>{entry.otherUser.displayName}</strong> ·{' '}
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    type="button"
                    className={styles.revokeBtn}
                    onClick={() => handleRevoke(entry.id)}
                    disabled={revokingId === entry.id}
                  >
                    {revokingId === entry.id ? 'Removing…' : 'Stop sharing'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <PremiumUpgradeCard
            title="Share reminders"
            description="Premium lets you share warranties, subscriptions, reminders, and to-dos with other Trakkit users."
          />
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Shared with you</h3>
        <p className={styles.sectionDesc}>
          Read-only reminders others shared with you. Alerts follow your notification preferences.
        </p>
        {received.length === 0 ? (
          <p className={styles.empty}>Nothing has been shared with you yet.</p>
        ) : (
          <div className={styles.list}>
            {received.map((entry) => (
              <div key={entry.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.cardTitle}>{entry.itemLabel}</p>
                    <span className={styles.badge}>{TYPE_LABELS[entry.itemType]}</span>
                  </div>
                </div>
                <p className={styles.meta}>
                  Shared by <strong>{entry.otherUser.displayName}</strong> ·{' '}
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
                <button
                  type="button"
                  className={styles.detailBtn}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  {expandedId === entry.id ? 'Hide details' : 'View details'}
                </button>
                {expandedId === entry.id && <ItemDetails entry={entry} />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
