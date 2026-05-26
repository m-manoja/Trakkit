
import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import styles from "./SubscriptionsPage.module.css";
import { type Subscription } from "../../api/subscriptions";

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Subscription | null;
  onSubmit: (formData: Record<string, unknown>, editId: string | null) => void;
  isSaving: boolean;
}

const BILLING_CYCLES = ['Weekly', 'Monthly', 'Yearly'];
const CATEGORIES = ['Entertainment', 'Productivity', 'Cloud Storage', 'Software', 'Fitness', 'Education', 'Other'];

export default function SubscriptionFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isSaving
}: SubscriptionFormModalProps) {
  const [formData, setFormData] = useState({
    service_name: "",
    amount: "",
    billing_cycle: "",
    category: "",
    start_date: new Date().toISOString().split('T')[0],
    description: "",
    reminder_schedule: "7,3,1",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          service_name: initialData.service_name,
          amount: initialData.amount.toString(),
          billing_cycle: initialData.billing_cycle,
          category: initialData.category,
          start_date: new Date(initialData.start_date).toISOString().split('T')[0],
          description: initialData.description || "",
          reminder_schedule: initialData.reminder_schedule || "7,3,1",
        });
      } else {
        setFormData({
          service_name: "",
          amount: "",
          billing_cycle: "",
          category: "",
          start_date: new Date().toISOString().split('T')[0],
          description: "",
          reminder_schedule: "7,3,1",
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.service_name || !formData.amount || !formData.billing_cycle || !formData.category) {
      alert("Please fill in all mandatory fields.");
      return;
    }
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    }, initialData?.id || null);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{initialData ? "Edit Subscription" : "Add Subscription"}</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <form id="subscriptionForm" onSubmit={handleSubmit} className={styles.formGroup}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Service Name *</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. Netflix, Spotify"
                  value={formData.service_name}
                  onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className={styles.formInput}
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Billing Cycle *</label>
                <select
                  required
                  className={styles.formSelect}
                  title="Billing cycle"
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData({...formData, billing_cycle: e.target.value})}
                >
                  <option value="">Select Cycle</option>
                  {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category *</label>
                <select
                  required
                  className={styles.formSelect}
                  title="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start/First Billing Date *</label>
                <input
                  type="date"
                  required
                  className={styles.formInput}
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Remind me (days before)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. 7,3,1"
                  value={formData.reminder_schedule}
                  onChange={(e) => setFormData({...formData, reminder_schedule: e.target.value})}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                className={styles.formTextarea}
                placeholder="Optional notes about this subscription"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button 
            type="button" 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="subscriptionForm" 
            className={styles.submitButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 size={18} className={styles.spinner} /> Saving...</>
            ) : (
              "Save Subscription"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
