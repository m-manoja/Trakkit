import { createContext, useContext, useState, ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './AlertContext.module.css';

interface AlertContextType {
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isConfirm, setIsConfirm] = useState(false);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const showAlert = (msg: string) => {
    setMessage(msg);
    setIsConfirm(false);
    setIsOpen(true);
  };

  const showConfirm = (msg: string): Promise<boolean> => {
    setMessage(msg);
    setIsConfirm(true);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver({ resolve });
    });
  };

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    setMessage('');
    if (resolver) {
      resolver.resolve(result);
      setResolver(null);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {isOpen && (
        <div className={styles.overlay} onClick={() => handleClose(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.title}>{isConfirm ? 'Confirm' : 'Alert'}</h3>
              <button type="button" className={styles.closeBtn} onClick={() => handleClose(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.body}>
              <p>{message}</p>
            </div>
            <div className={styles.footer}>
              {isConfirm && (
                <button type="button" className={styles.btnSecondary} onClick={() => handleClose(false)}>
                  Cancel
                </button>
              )}
              <button type="button" className={styles.btnPrimary} onClick={() => handleClose(true)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
