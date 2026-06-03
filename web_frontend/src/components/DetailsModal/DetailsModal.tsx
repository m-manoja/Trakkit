import React, { useEffect } from 'react';
import { X, Edit2, ExternalLink } from 'lucide-react';
import styles from './DetailsModal.module.css';

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  icon?: React.ReactNode;
  fields: DetailField[];
  onManage: () => void;
  /** When set, shows a button that opens the provider's account/billing page in a new tab. */
  manageUrl?: string;
}

export default function DetailsModal({
  isOpen,
  onClose,
  title,
  entityName,
  icon,
  fields,
  onManage,
  manageUrl
}: DetailsModalProps) {
  
  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.entityHeader}>
            {icon && <div className={styles.entityIcon}>{icon}</div>}
            <h3 className={styles.entityName}>{entityName}</h3>
          </div>

          <div className={styles.fieldsContainer}>
            {fields.map((field, idx) => (
              <div key={idx} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{field.label}</span>
                <span className={styles.fieldValue}>{field.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnCancel}>Close</button>
          {manageUrl && (
            <button
              onClick={() => window.open(manageUrl, '_blank', 'noopener')}
              className={styles.btnManageExternal}
            >
              Manage on site <ExternalLink size={16} />
            </button>
          )}
          <button onClick={onManage} className={styles.btnManage}>
            Manage <Edit2 size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
