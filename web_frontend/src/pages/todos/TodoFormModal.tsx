
import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import styles from "./TodosPage.module.css";
import { getNotificationSettings } from "../../api/users";
import { useAuth } from "../../context/AuthContext";

interface TodoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Record<string, unknown>) => void;
  isSaving: boolean;
}

export default function TodoFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving
}: TodoFormModalProps) {
  const { user } = useAuth();
  const token = user?.token;

  const [formData, setFormData] = useState({
    task_name: "",
    has_reminder: false,
    reminder_date: new Date().toISOString().split('T')[0],
    reminder_schedule: "7,3,1",
  });
  const [defaultReminderSchedule, setDefaultReminderSchedule] = useState("7,3,1");

  useEffect(() => {
    if (token) {
      getNotificationSettings(token).then((res) => {
        if (res.reminder_schedule) {
          const globalSchedule = res.reminder_schedule;
          setDefaultReminderSchedule(globalSchedule);
          setFormData(prev => ({
            ...prev,
            reminder_schedule: prev.reminder_schedule === '7,3,1' ? globalSchedule : prev.reminder_schedule
          }));
        }
      }).catch((err) => console.log('Failed to fetch default settings:', err));
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        task_name: "",
        has_reminder: false,
        reminder_date: new Date().toISOString().split('T')[0],
        reminder_schedule: defaultReminderSchedule,
      });
    }
  }, [isOpen, defaultReminderSchedule]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_name.trim()) {
      alert("Please enter a task name.");
      return;
    }
    if (formData.has_reminder && formData.reminder_date < today) {
      alert("Reminder date cannot be in the past. Please choose today or a future date.");
      return;
    }
    
    const payload = {
      ...formData,
      task_name: formData.task_name.trim(),
      reminder_date: formData.has_reminder ? new Date(formData.reminder_date).toISOString() : null,
      reminder_schedule: formData.has_reminder ? (formData.reminder_schedule.trim() || defaultReminderSchedule) : null
    };
    
    onSubmit(payload);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Add Todo List</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <form id="todoForm" onSubmit={handleSubmit} className={styles.formGroup}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Enter Task *</label>
              <input
                type="text"
                required
                className={styles.formInput}
                placeholder="E.g - Finish design"
                value={formData.task_name}
                onChange={(e) => setFormData({...formData, task_name: e.target.value})}
              />
            </div>

            <div className={styles.toggleRow}>
              <label className={styles.formLabel}>Add Reminder</label>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={formData.has_reminder}
                  onChange={(e) => setFormData({...formData, has_reminder: e.target.checked})}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            {formData.has_reminder && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reminder Date</label>
                  <input
                    type="date"
                    required
                    min={today}
                    className={styles.formInput}
                    value={formData.reminder_date}
                    onChange={(e) => setFormData({...formData, reminder_date: e.target.value})}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Remind me (days before)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder={`Default: ${defaultReminderSchedule}`}
                    value={formData.reminder_schedule}
                    onChange={(e) => setFormData({...formData, reminder_schedule: e.target.value})}
                  />
                  <small className={styles.inputHelp}>
                    Enter comma-separated days (e.g. 7,3,1). Leave blank to use default.
                  </small>
                </div>
              </>
            )}
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
            form="todoForm" 
            className={styles.submitButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 size={18} className={styles.spinner} /> Saving...</>
            ) : (
              "Add Task"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
