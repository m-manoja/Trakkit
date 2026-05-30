import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, File, Loader2 } from "lucide-react";
import styles from "./WarrantiesPage.module.css";
import { type Warranty } from "../../api/warranties";
import { useAlert } from "../../context/AlertContext";

const CATEGORIES = ['Electronics', 'Appliances', 'Furniture', 'Vehicles', 'Other'];
const DURATIONS = ['6', '12', '18', '24', '36', '48', '60'];

interface WarrantyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, editId: string | null) => Promise<void>;
  initialData?: Warranty | null;
  isSaving: boolean;
}

export default function WarrantyFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSaving
}: WarrantyFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    product_name: "",
    purchase_place: "",
    warranty_period: "12",
    category: "Electronics",
    purchase_date: new Date().toISOString().split('T')[0],
    description: "",
    reminder_schedule: "7,3,1",
    fileAction: "replace" as "replace" | "keep",
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        product_name: initialData.product_name,
        purchase_place: initialData.purchase_place,
        warranty_period: initialData.warranty_period.toString(),
        category: initialData.category,
        purchase_date: new Date(initialData.purchase_date).toISOString().split('T')[0],
        description: initialData.description || "",
        reminder_schedule: initialData.reminder_schedule || "7,3,1",
        fileAction: "replace"
      });
      setExistingUrl(initialData.document_url || null);
    } else {
      setFormData({
        product_name: "",
        purchase_place: "",
        warranty_period: "12",
        category: "Electronics",
        purchase_date: new Date().toISOString().split('T')[0],
        description: "",
        reminder_schedule: "7,3,1",
        fileAction: "replace"
      });
      setExistingUrl(null);
    }
    setSelectedFile(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const { showAlert } = useAlert();

  const handleSubmitWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.purchase_date > today) {
      showAlert("Purchase date cannot be in the future. Please enter the actual purchase date.");
      return;
    }
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submitData.append(key, value);
    });
    
    if (selectedFile) {
      submitData.append('document', selectedFile);
    }
    
    await onSubmit(submitData, initialData ? initialData.id : null);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{initialData ? 'Edit Warranty' : 'Add New Warranty'}</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmitWrapper}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Name *</label>
              <input 
                type="text" 
                className={styles.formInput} 
                required
                placeholder="e.g. Samsung 4K TV"
                value={formData.product_name}
                onChange={(e) => setFormData({...formData, product_name: e.target.value})}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Duration (Months)</label>
                <select
                  className={styles.formSelect}
                  title="Duration in months"
                  value={formData.warranty_period}
                  onChange={(e) => setFormData({...formData, warranty_period: e.target.value})}
                >
                  {DURATIONS.map(d => <option key={d} value={d}>{d} months</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  className={styles.formSelect}
                  title="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Purchase Date *</label>
              <input
                type="date"
                className={styles.formInput}
                required
                max={today}
                value={formData.purchase_date}
                onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Purchase Place *</label>
              <input 
                type="text" 
                className={styles.formInput} 
                required
                placeholder="e.g. Best Buy, Amazon"
                value={formData.purchase_place}
                onChange={(e) => setFormData({...formData, purchase_place: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Warranty Document (Receipt/Card)</label>
              
              {!selectedFile && !existingUrl ? (
                <div 
                  className={styles.fileUploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={32} color="#9CA3AF" className={styles.uploadIcon} />
                  <p>Click to browse or drag and drop</p>
                  <span className={styles.fileHint}>PNG, JPG, PDF up to 10MB</span>
                </div>
              ) : (
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>
                    <File size={20} color="#B9375D" />
                    <span>
                      {selectedFile 
                        ? selectedFile.name 
                        : `Existing receipt attached`}
                    </span>
                  </div>
                  <div className={styles.fileActions}>
                    <button 
                      type="button" 
                      className={`${styles.iconButton} ${styles.removeFileBtn}`}
                      onClick={() => setSelectedFile(null)}
                      title="Remove new file"
                    >
                      {selectedFile ? <X size={18} /> : null}
                    </button>
                  </div>
                </div>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className={styles.fileInputHidden}
                accept=".pdf,image/*"
                aria-hidden="true"
                tabIndex={-1}
              />

              {selectedFile && existingUrl && (
                <div className={styles.fileActionChoice}>
                  <button
                    type="button"
                    className={`${styles.choiceBtn} ${formData.fileAction === 'replace' ? styles.choiceBtnActive : ''}`}
                    onClick={() => setFormData({...formData, fileAction: 'replace'})}
                  >
                    Replace Old File
                  </button>
                  <button
                    type="button"
                    className={`${styles.choiceBtn} ${formData.fileAction === 'keep' ? styles.choiceBtnActive : ''}`}
                    onClick={() => setFormData({...formData, fileAction: 'keep'})}
                  >
                    Keep Both
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Remind me (days before)</label>
              <input 
                type="text" 
                className={styles.formInput} 
                placeholder="e.g. 30,14,7"
                value={formData.reminder_schedule}
                onChange={(e) => {
                  if (/^[0-9,]*$/.test(e.target.value)) {
                    setFormData({...formData, reminder_schedule: e.target.value});
                  }
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description / Notes (Optional)</label>
              <textarea 
                className={styles.formTextarea} 
                placeholder="Any special terms or conditions..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSaving}>
              {isSaving ? <><Loader2 size={18} className={styles.spinner} /> Saving...</> : (initialData ? 'Update Warranty' : 'Save Warranty')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
