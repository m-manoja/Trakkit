import { useState, useEffect } from "react";
import { formatDate } from "../../utils/dateFormat";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Loader2,
  Share2,
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./SubscriptionsPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../hooks/usePlan";
import ShareModal, { type ShareModalItem } from "../../components/ShareModal/ShareModal";
import PremiumUpgradeCard from "../../components/PremiumUpgradeCard/PremiumUpgradeCard";
import { 
  fetchSubscriptions, 
  deleteSubscription, 
  saveSubscription, 
  renewSubscription,
  type Subscription 
} from "../../api/subscriptions";
import SubscriptionFormModal from "./SubscriptionFormModal";

// Force TS Language Server refresh
export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { isPremium, isFree } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItems, setShareItems] = useState<ShareModalItem[]>([]);
  const [bulkShareMode, setBulkShareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadSubscriptions = async () => {
    if (!user?.id || !user?.token) return;
    
    try {
      setLoading(true);
      const data = await fetchSubscriptions(user.id, user.token);
      setSubscriptions(data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
      setError("Failed to load subscriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleOpenModal = (subscription?: Subscription) => {
    setSelectedSubscription(subscription || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubscription(null);
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.token || !window.confirm("Are you sure you want to delete this subscription?")) return;
    
    try {
      await deleteSubscription(id, user.token);
      loadSubscriptions();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete subscription");
    }
  };

  const handleRenew = async (subscription: Subscription) => {
    if (!user?.token || subscription.status === 'Active') return;

    if (!window.confirm(`Would you like to renew ${subscription.service_name}?`)) return;

    try {
      await renewSubscription(subscription.id, user.token);
      loadSubscriptions();
    } catch (err) {
      console.error("Failed to renew:", err);
      alert("Failed to renew subscription");
    }
  };

  const handleSaveSubscription = async (formData: Record<string, unknown>, editId: string | null) => {
    if (!user?.token) return;

    try {
      setIsSaving(true);
      formData.userId = user.id;
      await saveSubscription(editId, formData, user.token);
      handleCloseModal();
      loadSubscriptions();
    } catch (err) {
      console.error("Save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save subscription");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(s => 
    s.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
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
    const items = filteredSubscriptions
      .filter((s) => selectedIds.has(s.id))
      .map((s) => ({ itemType: 'subscription' as const, itemId: s.id, label: s.service_name }));
    if (!items.length) {
      alert('Select at least one subscription.');
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
            <h1 className={styles.title}>Subscriptions</h1>
            <p className={styles.subtitle}>Manage your recurring payments and services.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search subscriptions..." 
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
          <PremiumUpgradeCard title="Sharing mode" description="Upgrade to Premium to share subscription reminders with other Trakkit users." />
        )}

        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button onClick={loadSubscriptions}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Loading your subscriptions...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <CreditCard size={64} className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>No subscriptions found</h3>
            <p className={styles.emptyStateDesc}>
              {searchQuery ? "Try adjusting your search query." : "Keep track of your recurring services. Add your first subscription to get started."}
            </p>
            {!searchQuery && (
              <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <Plus size={20} />
                <span>Add Your First Subscription</span>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.subscriptionsGrid}>
            {filteredSubscriptions.map((sub) => (
              <div key={sub.id} className={styles.subscriptionCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    {bulkShareMode && isPremium && (
                      <input type="checkbox" checked={selectedIds.has(sub.id)} onChange={() => toggleSelect(sub.id)} className={styles.bulkCheckbox} />
                    )}
                    <div>
                      <h3 className={styles.cardTitle}>{sub.service_name}</h3>
                      <span className={styles.categoryBadge}>{sub.category}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    {isPremium && !bulkShareMode && (
                      <button type="button" className={styles.iconButton} title="Share" onClick={() => openShare([{ itemType: 'subscription', itemId: sub.id, label: sub.service_name }])}>
                        <Share2 size={18} />
                      </button>
                    )}
                    <button className={styles.iconButton} title="Edit" onClick={() => handleOpenModal(sub)}>
                      <Edit2 size={18} />
                    </button>
                    <button className={styles.iconButton} title="Delete" onClick={() => handleDelete(sub.id)}>
                      <Trash2 size={18} color="#EF4444" />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Amount</span>
                    <span className={styles.infoValue}>Rs. {sub.amount} / {sub.billing_cycle}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Next Billing</span>
                    <span className={styles.infoValue}>
                      {formatDate(sub.next_billing_date || sub.start_date)}
                    </span>
                  </div>
                  
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Status</span>
                    <span className={`${styles.statusBadge} ${
                      sub.status?.toLowerCase() === 'active' ? styles.statusActive :
                      sub.status?.toLowerCase() === 'due soon' ? styles.statusWarning :
                      styles.statusExpired
                    }`}>
                      {sub.status || 'Active'}
                    </span>
                  </div>
                  {sub.description && (
                    <p className={styles.cardDescription}>{sub.description}</p>
                  )}
                </div>

                <button 
                  className={`${styles.claimButton} ${sub.status !== 'Active' ? styles.claimButtonActive : ''}`}
                  disabled={sub.status === 'Active'}
                  onClick={() => handleRenew(sub)}
                >
                  <RefreshCw size={16} /> 
                  {sub.status === 'Active' ? 'Renewed' : 'Renew Now'}
                </button>
              </div>
            ))}
          </div>
        )}

        <SubscriptionFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={selectedSubscription}
          onSubmit={handleSaveSubscription}
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
