import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import styles from "./RemindersPage.module.css";
import { type Reminder } from "../../api/reminders";

interface ReminderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Reminder | null;
  onSubmit: (formData: Record<string, unknown>, editId: string | null) => void;
  isSaving: boolean;
}

const REMINDER_TYPES = ['one time', 'repeat'];
const REPEAT_CYCLES = ['Everyday', 'Every week', 'Every month', 'Every year'];

export default function ReminderFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  isSaving
}: ReminderFormModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    reminder_date: new Date().toISOString().split('T')[0],
    reminder_time: "08:00",
    repeat_cycle: "",
    remind_time: "On the day",
    description: "",
    reminder_schedule: "7,3,1",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          type: initialData.type,
          reminder_date: new Date(initialData.reminder_date).toISOString().split('T')[0],
          reminder_time: (initialData as any).reminder_time || "08:00",
          repeat_cycle: initialData.repeat_cycle || "",
          remind_time: initialData.remind_time || "On the day",
          description: initialData.description || "",
          reminder_schedule: initialData.reminder_schedule || "7,3,1",
        });
      } else {
        setFormData({
          title: "",
          type: "",
          reminder_date: new Date().toISOString().split('T')[0],
          reminder_time: "08:00",
          repeat_cycle: "",
          remind_time: "On the day",
          description: "",
          reminder_schedule: "7,3,1",
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.type) {
      alert("Please enter a Name and Type (*)");
      return;
    }
    if (formData.reminder_date < today) {
      alert("Reminder date cannot be in the past. Please choose today or a future date.");
      return;
    }

    // Convert logic to match backend expectations
    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      reminder_date: new Date(formData.reminder_date).toISOString(),
      reminder_time: formData.reminder_time,
      repeat_cycle: formData.type === 'repeat' ? formData.repeat_cycle : null,
      remind_time: formData.remind_time,
      reminder_schedule: (formData.remind_time === 'Before the day' || formData.remind_time === 'On and before')
        ? formData.reminder_schedule
        : null,
      description: formData.description.trim()
    };
    
    onSubmit(payload, initialData?.id || null);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{initialData ? "Edit Reminder" : "Add Reminder"}</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <form id="reminderForm" onSubmit={handleSubmit} className={styles.formGroup}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reminder Name *</label>
              <input
                type="text"
                required
                className={styles.formInput}
                placeholder="E.g - Meeting"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Type *</label>
                <select
                  required
                  className={styles.formSelect}
                  title="Reminder type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="">Select Type</option>
                  {REMINDER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reminder Date *</label>
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
                <label className={styles.formLabel}>Reminder Time</label>
                <input
                  type="time"
                  className={styles.formInput}
                  value={formData.reminder_time}
                  onChange={(e) => setFormData({...formData, reminder_time: e.target.value})}
                />
              </div>
            </div>

            {formData.type === 'repeat' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reminder cycle (if repeat) *</label>
                <div className={styles.radioGroupGrid}>
                  {REPEAT_CYCLES.map(cycle => (
                    <label key={cycle} className={styles.radioLabelContainer}>
                      <input 
                        type="radio" 
                        name="repeat_cycle"
                        value={cycle}
                        checked={formData.repeat_cycle === cycle}
                        onChange={(e) => setFormData({...formData, repeat_cycle: e.target.value})}
                      />
                      <span>{cycle}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Remind *</label>
              <div className={styles.radioGroupGrid}>
                {['On the day', 'Before the day', 'On and before'].map(time => (
                  <label key={time} className={styles.radioLabelContainer}>
                    <input 
                      type="radio" 
                      name="remind_time"
                      value={time}
                      checked={formData.remind_time === time}
                      onChange={(e) => setFormData({...formData, remind_time: e.target.value})}
                    />
                    <span>{time}</span>
                  </label>
                ))}
              </div>
            </div>

            {(formData.remind_time === 'Before the day' || formData.remind_time === 'On and before') && (
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
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                className={styles.formTextarea}
                placeholder="Add any notes about this reminder"
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
            form="reminderForm" 
            className={styles.submitButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <><Loader2 size={18} className={styles.spinner} /> Saving...</>
            ) : (
              "Save Reminder"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
