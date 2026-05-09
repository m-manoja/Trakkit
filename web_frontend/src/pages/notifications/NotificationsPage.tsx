import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { Bell, Trash2, CheckCircle, Clock, Search, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { 
  fetchNotifications, 
  deleteNotification, 
  clearAllNotifications,
  type AppNotification 
} from "../../api/notifications";
import styles from "./NotificationsPage.module.css";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadNotifications();
  }, [user]);

  async function loadNotifications() {
    if (!user?.token) return;
    try {
      setLoading(true);
      const data = await fetchNotifications(user.token);
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!user?.token) return;
    try {
      await deleteNotification(id, user.token);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
      alert("Could not delete notification.");
    }
  };

  const handleClearAll = async () => {
    if (!user?.token || notifications.length === 0) return;
    if (!confirm("Are you sure you want to clear all your notifications?")) return;
    
    try {
      setIsClearing(true);
      await clearAllNotifications(user.token);
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      alert("Could not clear notifications.");
    } finally {
      setIsClearing(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'warranty': return <CheckCircle size={20} className={styles.iconWarranty} />;
      case 'subscription': return <Clock size={20} className={styles.iconSubscription} />;
      case 'todo': return <CheckCircle size={20} className={styles.iconTodo} />;
      default: return <Bell size={20} className={styles.iconDefault} />;
    }
  };

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
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
              <div key={notif.id} className={`${styles.notificationCard} ${notif.status === 'pending' ? styles.unread : ''}`}>
                <div className={styles.notificationIconContainer}>
                  {getIconForType(notif.reference_type)}
                </div>
                <div className={styles.notificationContent}>
                  <h3 className={styles.notificationTitle}>{notif.title}</h3>
                  <p className={styles.notificationBody}>{notif.body}</p>
                  <p className={styles.notificationDate}>
                    {new Date(notif.scheduled_for).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(notif.id)}
                  title="Remove notification"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
