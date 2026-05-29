import { useState, useEffect } from "react";
import { formatDate } from "../../utils/dateFormat";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Download,
  Loader2,
  Share2,
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./WarrantiesPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../hooks/usePlan";
import { getPremiumUsage, type PremiumUsage } from "../../api/payment";
import ShareModal, { type ShareModalItem } from "../../components/ShareModal/ShareModal";
import PremiumUpgradeCard from "../../components/PremiumUpgradeCard/PremiumUpgradeCard";
import { 
  fetchWarranties, 
  deleteWarranty, 
  saveWarranty, 
  claimWarranty,
  type Warranty 
} from "../../api/warranties";
import WarrantyFormModal from "./WarrantyFormModal";

export default function WarrantiesPage() {
  const { user } = useAuth();
  const { isPremium, isFree } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [usage, setUsage] = useState<PremiumUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItems, setShareItems] = useState<ShareModalItem[]>([]);
  const [bulkShareMode, setBulkShareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const loadWarranties = async () => {
    if (!user?.id || !user?.token) return;
    
    try {
      setLoading(true);
      const data = await fetchWarranties(user.id, user.token);
      setWarranties(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load warranties:", err);
      setError("Failed to load warranties. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarranties();
  }, [user]);

  useEffect(() => {
    if (!user?.token) return;
    getPremiumUsage(user.token)
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [user?.token, isPremium]);

  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleOpenModal = (warranty?: Warranty) => {
    setSelectedWarranty(warranty || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWarranty(null);
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.token || !window.confirm("Are you sure you want to delete this warranty?")) return;
    
    try {
      await deleteWarranty(id, user.token);
      loadWarranties();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete warranty");
    }
  };

  const handleClaim = async (warranty: Warranty) => {
    if (!user?.token) return;
    if (!window.confirm(`Are you sure you want to claim the warranty for "${warranty.product_name}"? This action cannot be undone.`)) return;

    try {
      await claimWarranty(warranty.id, user.token);
      loadWarranties();
    } catch (err: any) {
      console.error("Claim error:", err);
      alert(err?.message || "Failed to claim warranty");
    }
  };

  const handleSaveWarranty = async (formData: FormData, editId: string | null) => {
    if (!user?.token) return;

    try {
      setIsSaving(true);
      await saveWarranty(editId, formData, user.token);
      handleCloseModal();
      loadWarranties();
    } catch (err: any) {
      console.error("Save error:", err);
      if (err.error_code === 'DOCUMENT_LIMIT_REACHED') {
        const upgrade = window.confirm(
          `${err.message}\n\nGo to the pricing page to upgrade?`
        );
        if (upgrade) navigate('/pricing');
      } else {
        alert("Failed to save warranty");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredWarranties = warranties.filter(w => 
    w.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.category.toLowerCase().includes(searchQuery.toLowerCase())
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
    const items = filteredWarranties
      .filter((w) => selectedIds.has(w.id))
      .map((w) => ({
        itemType: 'warranty' as const,
        itemId: w.id,
        label: w.product_name,
      }));
    if (!items.length) {
      alert('Select at least one warranty.');
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
            <h1 className={styles.title}>Warranties</h1>
            <p className={styles.subtitle}>Manage your product warranties and receipts.</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search warranties..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isPremium && (
              <>
                {bulkShareMode ? (
                  <>
                    <button type="button" className={styles.addButton} onClick={handleBulkShare} disabled={selectedIds.size === 0}>
                      <Share2 size={20} />
                      <span>Share selected ({selectedIds.size})</span>
                    </button>
                    <button type="button" className={`${styles.addButton} ${styles.addButtonGray}`} onClick={exitBulkMode}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.addButton} onClick={() => setBulkShareMode(true)}>
                    <Share2 size={20} />
                    <span>Share</span>
                  </button>
                )}
              </>
            )}
            <button className={styles.addButton} onClick={() => handleOpenModal()}>
              <Plus size={20} />
              <span>Add New</span>
            </button>
          </div>
        </header>

        {shareNotice && (
          <div className={`${styles.premiumBanner} ${styles.shareNotice}`}>
            {shareNotice}
          </div>
        )}

        {isFree && (
          <PremiumUpgradeCard
            title="Sharing mode"
            description="Upgrade to Premium to share warranty reminders with other Trakkit users."
          />
        )}

        {isFree && usage?.document_limit != null && (
          <div className={styles.usageBanner}>
            <span>
              Documents: <strong>{usage.document_count}</strong> / {usage.document_limit}
            </span>
            <button type="button" onClick={() => navigate('/pricing')}>
              Upgrade for unlimited
            </button>
          </div>
        )}

        {isPremium && (
          <div className={styles.premiumBanner}>
            Premium — unlimited document uploads
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button onClick={loadWarranties}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Loading your warranties...</p>
          </div>
        ) : filteredWarranties.length === 0 ? (
          <div className={styles.emptyState}>
            <ShieldCheck size={64} className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>No warranties found</h3>
            <p className={styles.emptyStateDesc}>
              {searchQuery ? "Try adjusting your search query." : "Keep track of your product warranties. Add your first warranty to get started."}
            </p>
            {!searchQuery && (
              <button className={styles.addButton} onClick={() => handleOpenModal()}>
                <Plus size={20} />
                <span>Add Your First Warranty</span>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.warrantiesGrid}>
            {filteredWarranties.map((warranty) => (
              <div key={warranty.id} className={styles.warrantyCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    {bulkShareMode && isPremium && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(warranty.id)}
                        onChange={() => toggleSelect(warranty.id)}
                        className={styles.bulkCheckbox}
                      />
                    )}
                    <div>
                      <h3 className={styles.cardTitle}>{warranty.product_name}</h3>
                      <span className={styles.categoryBadge}>{warranty.category}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    {isPremium && !bulkShareMode && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Share"
                        onClick={() =>
                          openShare([
                            {
                              itemType: 'warranty',
                              itemId: warranty.id,
                              label: warranty.product_name,
                            },
                          ])
                        }
                      >
                        <Share2 size={18} />
                      </button>
                    )}
                    <button className={styles.iconButton} title="Edit" onClick={() => handleOpenModal(warranty)}>
                      <Edit2 size={18} />
                    </button>
                    <button className={styles.iconButton} title="Delete" onClick={() => handleDelete(warranty.id)}>
                      <Trash2 size={18} color="#EF4444" />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Purchased from</span>
                    <span className={styles.infoValue}>{warranty.purchase_place}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Expiry Date</span>
                    <span className={styles.infoValue}>{formatDate(warranty.expiry_date)}</span>
                  </div>
                  
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Document</span>
                    {warranty.document_url ? (
                      <div className={styles.documentActions}>
                        <a href={warranty.document_url.split(',')[0]} target="_blank" rel="noopener noreferrer" className={styles.documentLink}>
                          <Eye size={16} /> View
                        </a>
                        <a href={warranty.document_url.split(',')[0]} download className={styles.documentLink}>
                          <Download size={16} /> Save
                        </a>
                      </div>
                    ) : (
                      <span className={styles.infoValueEmpty}>No file</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Status</span>
                    <span className={`${styles.statusBadge} ${
                      warranty.status === 'Expired' ? styles.statusExpired :
                      warranty.status === 'Claimed' ? styles.statusClaimed :
                      styles.statusActive
                    }`}>
                      {warranty.status || 'Active'}
                    </span>
                  </div>
                  {warranty.description && (
                    <p className={styles.cardDescription}>{warranty.description}</p>
                  )}
                </div>

                <button 
                  className={styles.claimButton}
                  onClick={() => handleClaim(warranty)}
                  disabled={warranty.status === 'Claimed' || warranty.status === 'Expired'}
                  title={warranty.status === 'Claimed' ? 'Warranty already claimed' : warranty.status === 'Expired' ? 'Warranty has expired' : 'Claim this warranty'}
                >
                  {warranty.status === 'Claimed' ? '✓ Claimed' : 'Claim Warranty'}
                </button>
              </div>
            ))}
          </div>
        )}

        <WarrantyFormModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={selectedWarranty}
          onSubmit={handleSaveWarranty}
          isSaving={isSaving}
        />

        {user?.token && (
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => {
              setShareModalOpen(false);
              exitBulkMode();
            }}
            items={shareItems}
            token={user.token}
            onSuccess={(msg) => {
              setShareNotice(msg);
              setTimeout(() => setShareNotice(null), 4000);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
