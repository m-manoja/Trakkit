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
  Share2
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./WarrantiesPage.module.css";
import WarrantyFormModal from "./WarrantyFormModal";
import DetailsModal from "../../components/DetailsModal/DetailsModal";
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
import { useAlert } from "../../context/AlertContext";

export default function WarrantiesPage() {
  const { user } = useAuth();
  const { isPremium, isFree } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [usage, setUsage] = useState<PremiumUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItems, setShareItems] = useState<ShareModalItem[]>([]);
  const [bulkShareMode, setBulkShareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

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
      if (location.state?.itemId) {
        setPendingItemId(location.state.itemId);
      } else {
        setIsModalOpen(true);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (pendingItemId && warranties.length > 0) {
      const item = warranties.find(w => w.id === pendingItemId);
      if (item) {
        setSelectedWarranty(item);
        setDetailsModalOpen(true);
      }
      setPendingItemId(null);
    }
  }, [pendingItemId, warranties]);

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
    if (!user?.token) return;
    const isConfirmed = await showConfirm("Are you sure you want to delete this warranty?");
    if (!isConfirmed) return;
    
    try {
      await deleteWarranty(id, user.token);
      loadWarranties();
    } catch (err) {
      console.error("Failed to delete:", err);
      showAlert("Failed to delete warranty");
    }
  };

  const handleDownload = async (url: string, productName?: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
      const blob = await response.blob();

      // Derive a filename from the URL, falling back to the product name.
      const urlPath = url.split('?')[0];
      const urlName = decodeURIComponent(urlPath.substring(urlPath.lastIndexOf('/') + 1));
      const fileName = urlName || `${productName || 'warranty'}-document`;

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download document:", err);
      showAlert("Failed to download document");
    }
  };

  const handleClaim = async (warranty: Warranty) => {
    if (!user?.token) return;
    const isConfirmed = await showConfirm(`Are you sure you want to claim the warranty for "${warranty.product_name}"? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      await claimWarranty(warranty.id, user.token);
      loadWarranties();
    } catch (err: any) {
      console.error("Claim error:", err);
      showAlert(err?.message || "Failed to claim warranty");
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
        const upgrade = await showConfirm(
          `${err.message}\n\nGo to the pricing page to upgrade?`
        );
        if (upgrade) navigate('/pricing');
      } else {
        showAlert("Failed to save warranty");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const availableCategories = Array.from(
    new Set(warranties.map(w => w.category).filter(Boolean))
  ).sort();

  const filteredWarranties = warranties.filter(w => {
    const matchesSearch =
      w.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || w.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
      showAlert('Select at least one warranty.');
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
            {availableCategories.length > 0 && (
              <select
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                title="Filter by category"
              >
                <option value="All">All Categories</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
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
              {searchQuery || categoryFilter !== "All" ? "Try adjusting your search or category filter." : "Keep track of your product warranties. Add your first warranty to get started."}
            </p>
            {!searchQuery && categoryFilter === "All" && (
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
                        aria-label={`Select ${warranty.product_name}`}
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
                        <button
                          type="button"
                          onClick={() => handleDownload(warranty.document_url!.split(',')[0], warranty.product_name)}
                          className={styles.documentLink}
                        >
                          <Download size={16} /> Save
                        </button>
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

        {selectedWarranty && (
          <DetailsModal
            isOpen={detailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            title="Warranty Details"
            entityName={selectedWarranty.product_name}
            fields={[
              { label: "Category", value: selectedWarranty.category || 'N/A' },
              { label: "Status", value: selectedWarranty.status },
              { label: "Expiry Date", value: formatDate(selectedWarranty.expiry_date) },
              ...(selectedWarranty.purchase_date ? [{ label: "Purchase Date", value: formatDate(selectedWarranty.purchase_date) }] : []),
              ...(selectedWarranty.purchase_place ? [{ label: "Purchased At", value: selectedWarranty.purchase_place }] : [])
            ]}
            onManage={() => {
              setDetailsModalOpen(false);
              handleOpenModal(selectedWarranty);
            }}
          />
        )}

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
