
import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import styles from "./TodosPage.module.css";
import { getNotificationSettings } from "../../api/users";
import { useAuth } from "../../context/AuthContext";
import { normalizeReminderTime } from "../../utils/reminderTime";
import TimeSelect, { readTimeFromSelects } from "../../components/TimeSelect/TimeSelect";
import { useAlert } from "../../context/AlertContext";

import { type Todo } from "../../api/todos";

const TODO_TIME_SELECT_ID = "todo-form-time-select";

interface TodoFormModalProps {
  isOpen: boolean;
  initialData?: Todo | null;
  onClose: () => void;
  onSubmit: (formData: Record<string, unknown>) => void;
  isSaving: boolean;
}

export default function TodoFormModal({
  isOpen,
  initialData,
  onClose,
  onSubmit,
  isSaving
}: TodoFormModalProps) {
  const { user } = useAuth();
  const token = user?.token;
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState({
    task_name: "",
    has_reminder: false,
    reminder_date: new Date().toISOString().split('T')[0],
    reminder_time: "08:00",
    reminder_schedule: "7,3,1",
  });
  const [defaultReminderSchedule, setDefaultReminderSchedule] = useState("7,3,1");
  const reminderTimeRef = useRef("08:00");
  const initializedRef = useRef(false);

  const patchForm = (patch: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

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
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (initialData) {
      const hasReminder = Boolean(initialData.has_reminder && initialData.reminder_date);
      let dateVal = new Date().toISOString().split('T')[0];
      let timeVal = "08:00";
      
      if (hasReminder && initialData.reminder_date) {
        const d = new Date(initialData.reminder_date);
        if (!isNaN(d.getTime())) {
          dateVal = d.toISOString().split('T')[0];
        }
        // Use reminder_time or extract from reminder_date if we have a time component
        if ((initialData as any).reminder_time) {
          timeVal = (initialData as any).reminder_time;
        } else if (initialData.reminder_date.includes('T')) {
          timeVal = d.toISOString().split('T')[1].substring(0, 5);
        }
      }
      
      reminderTimeRef.current = timeVal;
      setFormData({
        task_name: initialData.task_name || "",
        has_reminder: hasReminder,
        reminder_date: dateVal,
        reminder_time: timeVal,
        reminder_schedule: initialData.reminder_schedule || defaultReminderSchedule,
      });
    } else {
      reminderTimeRef.current = "08:00";
      setFormData({
        task_name: "",
        has_reminder: false,
        reminder_date: new Date().toISOString().split('T')[0],
        reminder_time: "08:00",
        reminder_schedule: defaultReminderSchedule,
      });
    }
  }, [isOpen, initialData, defaultReminderSchedule]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => ({
      ...prev,
      reminder_schedule:
        prev.reminder_schedule === "7,3,1" ? defaultReminderSchedule : prev.reminder_schedule,
    }));
  }, [defaultReminderSchedule, isOpen]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const domTime = readTimeFromSelects(TODO_TIME_SELECT_ID);
    const reminderTime = normalizeReminderTime(domTime ?? reminderTimeRef.current);

    if (!formData.task_name.trim()) {
      showAlert("Please enter a task name.");
      return;
    }
    if (formData.has_reminder && formData.reminder_date < today) {
      showAlert("Reminder date cannot be in the past. Please choose today or a future date.");
      return;
    }
    
    onSubmit({
      ...formData,
      task_name: formData.task_name.trim(),
      reminder_date: formData.has_reminder ? new Date(formData.reminder_date).toISOString() : null,
      reminder_time: formData.has_reminder ? reminderTime : null,
      reminder_schedule: formData.has_reminder ? (formData.reminder_schedule.trim() || defaultReminderSchedule) : null
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{initialData ? "Edit Task" : "Add Todo List"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <form id="todoForm" onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Enter Task *</label>
              <input
                type="text"
                required
                className={styles.formInput}
                placeholder="E.g - Finish design"
                value={formData.task_name}
                onChange={(e) => patchForm({ task_name: e.target.value })}
              />
            </div>

            <div className={styles.toggleRow}>
              <label className={styles.formLabel}>Add Reminder</label>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={formData.has_reminder}
                  onChange={(e) => patchForm({ has_reminder: e.target.checked })}
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
                    onChange={(e) => patchForm({ reminder_date: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reminder Time *</label>
                  <TimeSelect
                    selectId={TODO_TIME_SELECT_ID}
                    value={formData.reminder_time}
                    onChange={(reminder_time) => {
                      reminderTimeRef.current = reminder_time;
                      patchForm({ reminder_time });
                    }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Remind me (days before)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder={`Default: ${defaultReminderSchedule}`}
                    value={formData.reminder_schedule}
                    onChange={(e) => {
                      if (/^[0-9,]*$/.test(e.target.value)) {
                        patchForm({ reminder_schedule: e.target.value });
                      }
                    }}
                  />
                  <small className={styles.inputHelp}>
                    Enter comma-separated days (e.g. 7,3,1). Leave blank to use default.
                  </small>
                </div>
              </>
            )}
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
              className={styles.submitButton}
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 size={18} className={styles.spinner} /> Saving...</>
              ) : (
                initialData ? "Save Changes" : "Add Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
