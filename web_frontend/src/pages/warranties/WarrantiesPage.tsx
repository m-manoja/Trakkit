import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Download,
  Loader2
} from "lucide-react";
import Layout from "../../components/Layout";
import styles from "./WarrantiesPage.module.css";
import { useAuth } from "../../context/AuthContext";
import { 
  fetchWarranties, 
  deleteWarranty, 
  saveWarranty, 
  type Warranty 
} from "../../api/warranties";
import WarrantyFormModal from "./WarrantyFormModal";

export default function WarrantiesPage() {
  const { user } = useAuth();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

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

  const handleOpenModal = (warranty?: Warranty) => {
    setSelectedWarranty(warranty || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWarranty(null);
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
        alert(err.message);
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
            <button className={styles.addButton} onClick={() => handleOpenModal()}>
              <Plus size={20} />
              <span>Add New</span>
            </button>
          </div>
        </header>

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
                  <div>
                    <h3 className={styles.cardTitle}>{warranty.product_name}</h3>
                    <span className={styles.categoryBadge}>{warranty.category}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.iconButton} onClick={() => handleOpenModal(warranty)}>
                      <Edit2 size={18} />
                    </button>
                    <button className={styles.iconButton} onClick={() => handleDelete(warranty.id)}>
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
                    <span className={styles.infoValue}>{new Date(warranty.expiry_date).toLocaleDateString()}</span>
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
                      <span className={styles.infoValue} style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No file</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Status</span>
                    <span className={`${styles.statusBadge} ${warranty.status === 'Expired' ? styles.statusExpired : styles.statusActive}`}>
                      {warranty.status || 'Active'}
                    </span>
                  </div>
                </div>

                <button className={styles.claimButton}>
                  Claim Warranty
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
      </div>
    </Layout>
  );
}
