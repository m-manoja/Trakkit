import { useNavigate } from 'react-router-dom';
import { Zap, Lock } from 'lucide-react';
import styles from './PremiumUpgradeCard.module.css';

interface PremiumUpgradeCardProps {
  title: string;
  description: string;
  compact?: boolean;
}

export default function PremiumUpgradeCard({
  title,
  description,
  compact = false,
}: PremiumUpgradeCardProps) {
  const navigate = useNavigate();

  return (
    <div className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.iconWrap}>
        <Lock size={20} />
      </div>
      <div className={styles.content}>
        <p className={styles.cardLabel}>{title}</p>
        <p className={styles.cardText}>{description}</p>
      </div>
      <button
        type="button"
        className={styles.cta}
        onClick={() => navigate('/pricing')}
      >
        <Zap size={16} />
        Upgrade
      </button>
    </div>
  );
}
