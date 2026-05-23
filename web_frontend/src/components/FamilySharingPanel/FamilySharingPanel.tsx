import { useEffect, useState } from 'react';
import { usePlan } from '../../hooks/usePlan';
import PremiumUpgradeCard from '../PremiumUpgradeCard/PremiumUpgradeCard';
import {
  getPremiumPrefs,
  savePremiumPrefs,
  parseEmailList,
} from '../../utils/premiumPrefs';
import styles from './FamilySharingPanel.module.css';

export type FamilySharingModule = 'warranty' | 'subscription' | 'reminder' | 'todo';

const MODULE_LABELS: Record<FamilySharingModule, string> = {
  warranty: 'warranty',
  subscription: 'subscription',
  reminder: 'reminder',
  todo: 'to-do',
};

interface FamilySharingPanelProps {
  userId: string | undefined;
  module: FamilySharingModule;
}

export default function FamilySharingPanel({ userId, module }: FamilySharingPanelProps) {
  const { isPremium } = usePlan();
  const [familyEmailsInput, setFamilyEmailsInput] = useState('');
  const [familySaved, setFamilySaved] = useState(false);

  useEffect(() => {
    if (!userId || !isPremium) return;
    const prefs = getPremiumPrefs(userId);
    setFamilyEmailsInput(prefs.familyEmails.join(', '));
  }, [userId, isPremium]);

  const handleSaveFamilyEmails = () => {
    if (!userId) return;
    const emails = parseEmailList(familyEmailsInput);
    const prefs = getPremiumPrefs(userId);
    savePremiumPrefs(userId, {
      ...prefs,
      familyEmails: emails,
    });
    setFamilySaved(true);
    setTimeout(() => setFamilySaved(false), 2500);
  };

  const moduleLabel = MODULE_LABELS[module];

  if (!isPremium) {
    return (
      <PremiumUpgradeCard
        title="Family sharing mode"
        description={`Share ${moduleLabel} alerts with family members. Premium unlocks family sharing for warranties, subscriptions, reminders, and to-dos.`}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>Family sharing mode</p>
      <p className={styles.desc}>
        Family emails apply across <strong>warranties, subscriptions, reminders, and to-dos</strong>.
        Members listed here can be included when sharing {moduleLabel} updates and alerts.
      </p>
      <input
        type="text"
        className={styles.input}
        placeholder="e.g. spouse@email.com, parent@email.com"
        value={familyEmailsInput}
        onChange={(e) => setFamilyEmailsInput(e.target.value)}
      />
      <button type="button" className={styles.saveBtn} onClick={handleSaveFamilyEmails}>
        {familySaved ? 'Saved!' : 'Save family emails'}
      </button>
    </div>
  );
}
