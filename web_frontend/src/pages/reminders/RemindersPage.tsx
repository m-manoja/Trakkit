import { useState, useEffect } from "react";
import { formatDate } from "../../utils/dateFormat";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  BellRing, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  Share2,
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./RemindersPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../hooks/usePlan";
import ShareModal, { type ShareModalItem } from "../../components/ShareModal/ShareModal";
import PremiumUpgradeCard from "../../components/PremiumUpgradeCard/PremiumUpgradeCard";
import { 
  fetchReminders, 
  deleteReminder, 
  saveReminder, 
  type Reminder 
} from "../../api/reminders";
import ReminderFormModal from "./ReminderFormModal";

// Force TS Language Server refresh
export default function RemindersPage() {
  const { user } = useAuth();
  const { isPremium, isFree } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItems, setShareItems] = useState<ShareModalItem[]>([]);
  const [bulkShareMode, setBulkShareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadReminders = async () => {
    if (!user?.id || !user?.token) return;
    
    try {
      setLoading(true);
      const data = await fetchReminders(user.id, user.token);
      setReminders(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load reminders:", err);
      setError("Failed to load reminders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleOpenModal = (reminder?: Reminder) => {
    setSelectedReminder(reminder || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReminder(null);
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.token || !window.confirm("Are you sure you want to delete this reminder?")) return;
    
    try {
      await deleteReminder(id, user.token);
      loadReminders();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete reminder");
    }
  };

  const handleSaveReminder = async (formData: Record<string, unknown>, editId: string | null) => {
    if (!user?.token) return;

    try {
      setIsSaving(true);
      formData.userId = user.id;
      await saveReminder(editId, formData, user.token);
      handleCloseModal();
      loadReminders();
    } catch (err) {
      console.error("Save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save reminder");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredReminders = reminders.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openShare = (items: ShareModalItem[]) => {
    if (!isPremium) return;
    setShareItems(items);
    setShareModalOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkShare = () => {
    const items = filteredReminders
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({ itemType: 'reminder' as const, itemId: r.id, label: r.title }));
    if (!items.length) {
      alert('Select at least one reminder.');
      return;
    }
    openShare(items);
  };

  const exitBulkMode = () => {
    setBulkShareMode(false);
    setSelectedIds(new Set());
  };

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Reminders</h1>
            <p className={styles.subtitle}>Keep track of important dates and recurring tasks.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search reminders..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isPremium && (
              bulkShareMode ? (
                <>
                  <button type="button" className={styles.addButton} onClick={handleBulkShare} disabled={selectedIds.size === 0}>
                    <Share2 size={20} /><span>Share selected ({selectedIds.size})</span>
                  </button>
                  <button type="button" className={`${styles.addButton} ${styles.addButtonGray}`} onClick={exitBulkMode}>Cancel</button>
                </>
              ) : (
                <button type="button" className={styles.addButton} onClick={() => setBulkShareMode(true)}>
                  <Share2 size={20} /><span>Share</span>
                </button>
              )
            )}
            <button className={styles.addButton} onClick={() => handleOpenModal()}>
              <Plus size={20} />
              <span>Add New</span>
            </button>
          </div>
        </header>

        {shareNotice && <div className={styles.shareNotice}>{shareNotice}</div>}
        {isFree && (
          <PremiumUpgradeCard title="Sharing mode" description="Upgrade to Premium to share reminders with other Trakkit users." />
        )}

        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button onClick={loadReminders}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Loading your reminders...</p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className={styles.emptyState}>
            <BellRing size={64} className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>No reminders found</h3>
            <p className={styles.emptyStateDesc}>
              {searchQuery ? "Try adjusting your search query." : "Stay on top of things. Add your first reminder to get started."}
            </p>
            {!searchQuery && (
              <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <Plus size={20} />
                <span>Add Your First Reminder</span>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.remindersGrid}>
            {filteredReminders.map((rem) => (
              <div key={rem.id} className={styles.reminderCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    {bulkShareMode && isPremium && (
                      <input type="checkbox" checked={selectedIds.has(rem.id)} onChange={() => toggleSelect(rem.id)} className={styles.bulkCheckbox} />
                    )}
                    <div>
                      <h3 className={styles.cardTitle}>{rem.title}</h3>
                      <span className={styles.categoryBadge}>{rem.type}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    {isPremium && !bulkShareMode && (
                      <button type="button" className={styles.iconButton} title="Share" onClick={() => openShare([{ itemType: 'reminder', itemId: rem.id, label: rem.title }])}>
                        <Share2 size={18} />
                      </button>
                    )}
                    <button className={styles.iconButton} title="Edit" onClick={() => handleOpenModal(rem)}>
                      <Edit2 size={18} />
                    </button>
                    <button className={styles.iconButton} title="Delete" onClick={() => handleDelete(rem.id)}>
                      <Trash2 size={18} color="#EF4444" />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Date</span>
                    <span className={styles.infoValue}>
                      {formatDate(rem.reminder_date)}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Remind</span>
                    <span className={styles.infoValue}>{rem.remind_time}</span>
                  </div>
                  {rem.type === 'repeat' && rem.repeat_cycle && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Repeat</span>
                      <span className={styles.infoValue}>{rem.repeat_cycle}</span>
                    </div>
                  )}
                  
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Status</span>
                    <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                      Active
                    </span>
                  </div>
                  {rem.description && (
                    <p className={styles.cardDescription}>{rem.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <ReminderFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={selectedReminder}
          onSubmit={handleSaveReminder}
          isSaving={isSaving}
        />

        {user?.token && (
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => { setShareModalOpen(false); exitBulkMode(); }}
            items={shareItems}
            token={user.token}
            onSuccess={(msg) => { setShareNotice(msg); setTimeout(() => setShareNotice(null), 4000); }}
          />
        )}
      </div>
    </Layout>
  );
}
