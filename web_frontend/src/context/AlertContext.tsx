import { createContext, useContext, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './AlertContext.module.css';

interface ConfirmOptions {
  /** Label for an optional extra button (e.g. "No, just renew"). */
  extraLabel?: string;
  /** Called when the extra button is clicked. The confirm resolves false. */
  onExtra?: () => void;
  /** Custom label for the primary/confirm button (defaults to "OK"). */
  confirmLabel?: string;
  /** Hide the default Cancel button (the header X still dismisses). */
  hideCancel?: boolean;
}

interface AlertContextType {
  showAlert: (message: string) => void;
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isConfirm, setIsConfirm] = useState(false);
  const [extra, setExtra] = useState<{ label: string; onClick: () => void } | null>(null);
  const [confirmLabel, setConfirmLabel] = useState('OK');
  const [hideCancel, setHideCancel] = useState(false);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const showAlert = (msg: string) => {
    setMessage(msg);
    setIsConfirm(false);
    setExtra(null);
    setConfirmLabel('OK');
    setHideCancel(false);
    setIsOpen(true);
  };

  const showConfirm = (msg: string, options?: ConfirmOptions): Promise<boolean> => {
    setMessage(msg);
    setIsConfirm(true);
    setExtra(
      options?.extraLabel && options.onExtra
        ? { label: options.extraLabel, onClick: options.onExtra }
        : null
    );
    setConfirmLabel(options?.confirmLabel ?? 'OK');
    setHideCancel(options?.hideCancel ?? false);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver({ resolve });
    });
  };

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    setMessage('');
    setExtra(null);
    setConfirmLabel('OK');
    setHideCancel(false);
    if (resolver) {
      resolver.resolve(result);
      setResolver(null);
    }
  };

  const handleExtra = () => {
    const onClick = extra?.onClick;
    handleClose(false);
    onClick?.();
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
              {isConfirm && !hideCancel && (
                <button type="button" className={styles.btnSecondary} onClick={() => handleClose(false)}>
                  Cancel
                </button>
              )}
              {isConfirm && extra && (
                <button type="button" className={styles.btnSecondary} onClick={handleExtra}>
                  {extra.label}
                </button>
              )}
              <button type="button" className={styles.btnPrimary} onClick={() => handleClose(true)}>
                {isConfirm ? confirmLabel : 'OK'}
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
