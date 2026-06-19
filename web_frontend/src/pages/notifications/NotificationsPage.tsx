import { useEffect, useState } from "react";
import { formatDate, formatDateTime, formatDateMedium } from "../../utils/dateFormat";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import {
  Bell, Trash2, CheckCircle, Clock, Search, Loader2,
  X, ArrowRight, AlarmClock, ShieldCheck, CreditCard, CheckSquare, ExternalLink, Share2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchNotifications,
  deleteNotification,
  clearAllNotifications,
  markNotificationsRead,
  type AppNotification,
} from "../../api/notifications";
import {
  fetchReceivedShares,
  respondToShare,
  type ShareListEntry,
  type ShareItemType,
} from "../../api/sharing";
import { API_BASE_URL } from "../../api/config";
import styles from "./NotificationsPage.module.css";
import { useAlert } from "../../context/AlertContext";

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; route: string; Icon: React.ElementType }> = {
  subscription:    { label: "Subscription", route: "/subscriptions", Icon: CreditCard  },
  warranty:        { label: "Warranty",     route: "/warranties",    Icon: ShieldCheck },
  todo:            { label: "To Do",        route: "/todos",         Icon: CheckSquare },
  manual_reminder: { label: "Reminder",     route: "/reminders",     Icon: AlarmClock  },
};

// Map a share's item type to the reference_type used by renderFields
const SHARE_REF_TYPE: Record<ShareItemType, string> = {
  warranty: "warranty",
  subscription: "subscription",
  reminder: "manual_reminder",
  todo: "todo",
};

// ── Detail field rows ─────────────────────────────────────────────────────────
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderFields(type: string, detail: any) {
  if (!detail) return null;
  switch (type) {
    case "manual_reminder":
      return (
        <>
          {detail.reminder_date && <FieldRow label="Date"   value={formatDate(detail.reminder_date)} />}
          {detail.type          && <FieldRow label="Type"   value={detail.type} />}
          {detail.remind_time   && <FieldRow label="Remind" value={detail.remind_time} />}
          {detail.repeat_cycle  && <FieldRow label="Recurring" value={detail.repeat_cycle} />}
          {detail.description   && <FieldRow label="Notes"  value={detail.description} />}
        </>
      );
    case "subscription":
      return (
        <>
          {detail.amount            && <FieldRow label="Amount"       value={`Rs. ${detail.amount} / ${detail.billing_cycle}`} />}
          {detail.category          && <FieldRow label="Category"     value={detail.category} />}
          {detail.next_billing_date && <FieldRow label="Next Billing" value={formatDate(detail.next_billing_date)} />}
          {detail.status            && <FieldRow label="Status"       value={detail.status} />}
          {detail.description       && <FieldRow label="Notes"        value={detail.description} />}
        </>
      );
    case "warranty":
      return (
        <>
          {detail.purchase_place && <FieldRow label="Purchased From" value={detail.purchase_place} />}
          {detail.category       && <FieldRow label="Category"       value={detail.category} />}
          {detail.purchase_date  && <FieldRow label="Purchase Date"  value={formatDate(detail.purchase_date)} />}
          {detail.expiry_date    && <FieldRow label="Expiry Date"    value={formatDate(detail.expiry_date)} />}
          {detail.status         && <FieldRow label="Status"         value={detail.status} />}
          {detail.description    && <FieldRow label="Notes"          value={detail.description} />}
        </>
      );
    case "todo":
      return (
        <>
          {detail.reminder_date && <FieldRow label="Due Date" value={formatDate(detail.reminder_date)} />}
          <FieldRow label="Status" value={detail.is_completed ? "Completed ✓" : "Pending"} />
        </>
      );
    default:
      return null;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Detail modal
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [itemDetail, setItemDetail] = useState<any>(null);
  const [itemLoading, setItemLoading] = useState(false);

  // Shared-item invites: shown as an in-place popup with accept/decline (no page redirect)
  const [receivedShares, setReceivedShares] = useState<ShareListEntry[]>([]);
  const [shareEntry, setShareEntry] = useState<ShareListEntry | null>(null);
  const [respondingShare, setRespondingShare] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadNotifications(); }, [user]);

  // Fetch linked item when a notification is selected
  useEffect(() => {
    if (!selectedNotif || !user?.token) { setItemDetail(null); return; }
    const endpoints: Record<string, string> = {
      manual_reminder: `${API_BASE_URL}/api/reminders/${selectedNotif.reference_id}`,
      subscription:    `${API_BASE_URL}/api/subscriptions/${selectedNotif.reference_id}`,
      warranty:        `${API_BASE_URL}/api/warranties/${selectedNotif.reference_id}`,
      todo:            `${API_BASE_URL}/api/todos/${selectedNotif.reference_id}`,
    };
    const url = endpoints[selectedNotif.reference_type];
    if (!url) return;
    setItemLoading(true);
    setItemDetail(null);
    fetch(url, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => r.json())
      .then(json => setItemDetail(json.data || json))
      .catch(() => {})
      .finally(() => setItemLoading(false));
  }, [selectedNotif, user?.token]);

  async function loadNotifications() {
    if (!user?.token) return;
    try {
      setLoading(true);
      const [data, shares] = await Promise.all([
        fetchNotifications(user.token),
        fetchReceivedShares(user.token).catch(() => [] as ShareListEntry[]),
      ]);
      setNotifications(data || []);
      setReceivedShares(shares || []);
      const newIds = (data || [])
        .filter(n => n.status === "notified" || n.status === "failed")
        .map(n => n.id);
      if (newIds.length > 0) markNotificationsRead(newIds, user.token).catch(() => {});
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  // A shared item has no page on the recipient's side, so open it in a popup instead of navigating.
  function openNotification(notif: AppNotification) {
    if (notif.shared_from_user_id) {
      const match = receivedShares.find(
        s => s.itemId === notif.reference_id && s.otherUser.id === notif.shared_from_user_id
      );
      if (match) {
        setShareEntry(match);
        return;
      }
    }
    setSelectedNotif(notif);
  }

  async function handleShareRespond(action: "accept" | "decline") {
    if (!user?.token || !shareEntry) return;
    try {
      setRespondingShare(true);
      await respondToShare(shareEntry.id, action, user.token);
      const shares = await fetchReceivedShares(user.token).catch(() => [] as ShareListEntry[]);
      setReceivedShares(shares || []);
      setShareEntry(null);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Failed to respond to share");
    } finally {
      setRespondingShare(false);
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user?.token) return;
    try {
      await deleteNotification(id, user.token);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (selectedNotif?.id === id) setSelectedNotif(null);
    } catch {
      showAlert("Could not delete notification.");
    }
  };

  const handleClearAll = async () => {
    if (!user?.token || notifications.length === 0) return;
    const isConfirmed = await showConfirm("Are you sure you want to clear all your notifications?");
    if (!isConfirmed) return;
    try {
      setIsClearing(true);
      await clearAllNotifications(user.token);
      setNotifications([]);
      setSelectedNotif(null);
    } catch {
      showAlert("Could not clear notifications.");
    } finally {
      setIsClearing(false);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modal metadata
  const meta = selectedNotif
    ? TYPE_META[selectedNotif.reference_type] || { label: "Notification", route: "/", Icon: Bell }
    : null;
  const cleanTitle = selectedNotif?.title.replace(
    /^(Subscription Renewal:|Warranty Expiry:|Todo Reminder:|Reminder:)\s?/i, ""
  ) ?? "";

  return (
    <Layout>
      {/* ── Page header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inbox</h1>
          <p className={styles.subtitle}>Stay on top of your renewals and expiring warranties.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={styles.clearAllBtn}
            onClick={handleClearAll}
            disabled={notifications.length === 0 || isClearing}
          >
            {isClearing ? <Loader2 size={18} className={styles.spinner} /> : <Trash2 size={18} />}
            <span>Clear All</span>
          </button>
        </div>
      </header>

      {/* ── Notification list ── */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader2 size={40} className={styles.spinner} />
            <p>Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Bell size={48} /></div>
            <h3>You're all caught up!</h3>
            <p>No new notifications in your inbox right now.</p>
          </div>
        ) : (
          <div className={styles.notificationList}>
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`${styles.notificationCard} ${
                  notif.status === "notified" || notif.status === "failed" ? styles.unread : ""
                }`}
              >
                <div
                  className={styles.notificationClickable}
                  onClick={() => openNotification(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && openNotification(notif)}
                >
                  <div className={styles.notificationIconContainer}>
                    {notif.reference_type === "warranty"     ? <CheckCircle size={20} className={styles.iconWarranty} />    :
                     notif.reference_type === "subscription" ? <Clock size={20} className={styles.iconSubscription} />       :
                     notif.reference_type === "todo"         ? <CheckCircle size={20} className={styles.iconTodo} />         :
                     <Bell size={20} className={styles.iconDefault} />}
                  </div>
                  <div className={styles.notificationContent}>
                    <h3 className={styles.notificationTitle}>
                      {notif.title}
                      {notif.status === "failed" && (
                        <span className={styles.failedBadge}>Delivery failed</span>
                      )}
                    </h3>
                    <p className={styles.notificationBody}>{notif.body}</p>
                    <p className={styles.notificationDate}>
                      {formatDateMedium(notif.scheduled_for)}
                    </p>
                  </div>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => handleDelete(e, notif.id)}
                  title="Remove notification"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail prompt modal ────────────────────────────────────── */}
      {selectedNotif && meta && (
        <div className={styles.modalOverlay} onClick={() => setSelectedNotif(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

            {/* Brand accent bar */}
            <div className={styles.modalAccentBar} />

            {/* Icon + close row */}
            <div className={styles.modalTopRow}>
              <div className={styles.modalIconCircle}>
                <meta.Icon size={26} />
              </div>
              <div className={styles.flexSpacer} />
              <button
                className={styles.modalCloseBtn}
                onClick={() => setSelectedNotif(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Type badge */}
            <div className={styles.modalBadge}>
              <span>{meta.label} Reminder</span>
            </div>

            {/* Scrollable content */}
            <div className={styles.modalBody}>
              <h2 className={styles.modalTitle}>{cleanTitle}</h2>

              {/* Body message — the main text */}
              {selectedNotif.body && (
                <div className={styles.modalMessageBox}>
                  <p className={styles.modalMessage}>{selectedNotif.body}</p>
                </div>
              )}

              {/* Scheduled time */}
              <p className={styles.modalTime}>
                🕐&nbsp;
                {formatDateTime(selectedNotif.scheduled_for)}
              </p>

              {/* Item-specific fields */}
              {itemLoading ? (
                <div className={styles.modalFieldsLoading}>
                  <Loader2 size={20} className={styles.spinner} />
                </div>
              ) : itemDetail && (
                <div className={styles.modalFields}>
                  {renderFields(selectedNotif.reference_type, itemDetail)}
                </div>
              )}

              {/* Jump straight to the provider's account/billing page (if the user saved a link) */}
              {selectedNotif.reference_type === "subscription" && itemDetail?.manage_url && (
                <button
                  className={styles.modalManageBtn}
                  onClick={() => window.open(itemDetail.manage_url, "_blank", "noopener")}
                >
                  <ExternalLink size={18} style={{ marginRight: 8 }} />
                  Manage on provider's site
                </button>
              )}

              {/* Navigate to the page */}
              <button
                className={styles.modalNavBtn}
                onClick={() => { setSelectedNotif(null); navigate(meta.route); }}
              >
                <ArrowRight size={18} style={{ marginRight: 8 }} />
                Open in {meta.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shared item popup (accept / decline, no page redirect) ──────────── */}
      {shareEntry && (
        <div className={styles.modalOverlay} onClick={() => setShareEntry(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalAccentBar} />

            <div className={styles.modalTopRow}>
              <div className={styles.modalIconCircle}>
                <Share2 size={26} />
              </div>
              <div className={styles.flexSpacer} />
              <button
                className={styles.modalCloseBtn}
                onClick={() => setShareEntry(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBadge}>
              <span>Shared with you{shareEntry.status === "pending" ? " · Pending" : ""}</span>
            </div>

            <div className={styles.modalBody}>
              <h2 className={styles.modalTitle}>{shareEntry.itemLabel}</h2>
              <div className={styles.modalMessageBox}>
                <p className={styles.modalMessage}>
                  Shared by {shareEntry.otherUser.displayName}
                </p>
              </div>

              {shareEntry.item ? (
                <div className={styles.modalFields}>
                  {renderFields(SHARE_REF_TYPE[shareEntry.itemType], shareEntry.item)}
                </div>
              ) : (
                <p className={styles.modalTime}>Details are no longer available.</p>
              )}

              {shareEntry.status === "pending" ? (
                <div className={styles.shareActions}>
                  <button
                    type="button"
                    className={`${styles.modalNavBtn} ${styles.acceptBtn}`}
                    disabled={respondingShare}
                    onClick={() => handleShareRespond("accept")}
                  >
                    {respondingShare ? <Loader2 size={18} className={styles.spinner} /> : "Accept"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.modalNavBtn} ${styles.declineBtn}`}
                    disabled={respondingShare}
                    onClick={() => handleShareRespond("decline")}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <p className={styles.modalTime}>✓ You accepted this share.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
