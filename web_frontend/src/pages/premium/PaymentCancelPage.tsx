import { useNavigate } from 'react-router-dom';
import { XCircle, Smartphone } from 'lucide-react';
import styles from './PaymentResult.module.css';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className={`${styles.page} ${styles.pageMuted}`}>
      <div className={`${styles.card} ${styles.cardMuted}`}>
        <div className={`${styles.iconCircle} ${styles.iconCircleMuted}`}>
          <XCircle size={36} style={{ color: '#EF4444' }} />
        </div>

        <h1 className={styles.title}>Payment Cancelled</h1>
        <p className={styles.subtitle}>
          No worries — your payment was not completed and you have not been charged.
          You can try again whenever you&apos;re ready.
        </p>

        <div className={styles.appNote}>
          <Smartphone size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Opened from the Trakkit app? Close this browser to go back to the app.</span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate('/pricing')}>
            Try Again
          </button>
          <button type="button" className={styles.textBtn} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
