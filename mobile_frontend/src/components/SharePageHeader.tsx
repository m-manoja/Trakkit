import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import PremiumUpgradeCard from './PremiumUpgradeCard';
import { sharePageStyles as styles } from './sharePageStyles';

type ActionsProps = {
  isPremium: boolean;
  bulkShareMode: boolean;
  selectedCount: number;
  onBulkShare: () => void;
  onEnterBulkMode: () => void;
  onExitBulkMode: () => void;
  addButton: React.ReactNode;
};

export function ShareHeaderActions({
  isPremium,
  bulkShareMode,
  selectedCount,
  onBulkShare,
  onEnterBulkMode,
  onExitBulkMode,
  addButton,
}: ActionsProps) {
  return (
    <View style={styles.titleActions}>
      {isPremium &&
        (bulkShareMode ? (
          <>
            <TouchableOpacity
              style={[styles.shareHeaderBtn, selectedCount === 0 && styles.shareHeaderBtnDisabled]}
              onPress={onBulkShare}
              disabled={selectedCount === 0}
            >
              <Ionicons name="share-social-outline" size={18} color="white" />
              <Text style={styles.shareHeaderBtnText}>Share ({selectedCount})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelShareBtn} onPress={onExitBulkMode}>
              <Text style={styles.cancelShareBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.shareHeaderBtn} onPress={onEnterBulkMode}>
            <Ionicons name="share-social-outline" size={18} color="white" />
            <Text style={styles.shareHeaderBtnText}>Share</Text>
          </TouchableOpacity>
        ))}
      {addButton}
    </View>
  );
}

type NoticesProps = {
  isFree: boolean;
  shareNotice: string | null;
  upgradeTitle: string;
  upgradeDescription: string;
};

export function SharePageNotices({ isFree, shareNotice, upgradeTitle, upgradeDescription }: NoticesProps) {
  return (
    <>
      {shareNotice ? (
        <View style={styles.shareNotice}>
          <Text style={styles.shareNoticeText}>{shareNotice}</Text>
        </View>
      ) : null}
      {isFree ? (
        <PremiumUpgradeCard title={upgradeTitle} description={upgradeDescription} />
      ) : null}
    </>
  );
}

export { shareCardStyles } from './sharePageStyles';
