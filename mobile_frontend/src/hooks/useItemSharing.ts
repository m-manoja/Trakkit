import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { ShareModalItem } from '../components/ShareModal';

export function useItemSharing(isPremium: boolean, token?: string) {
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareItems, setShareItems] = useState<ShareModalItem[]>([]);
  const [bulkShareMode, setBulkShareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const openShare = useCallback(
    (items: ShareModalItem[]) => {
      if (!isPremium || !token) return;
      setShareItems(items);
      setShareModalVisible(true);
    },
    [isPremium, token]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitBulkMode = useCallback(() => {
    setBulkShareMode(false);
    setSelectedIds(new Set());
  }, []);

  const showShareSuccess = useCallback((message: string) => {
    setShareNotice(message);
    setTimeout(() => setShareNotice(null), 4000);
  }, []);

  const handleBulkShare = useCallback(
    (getItems: () => ShareModalItem[], emptyMessage: string) => {
      const items = getItems();
      if (!items.length) {
        Alert.alert('Select items', emptyMessage);
        return;
      }
      openShare(items);
    },
    [openShare]
  );

  const closeShareModal = useCallback(() => {
    setShareModalVisible(false);
    exitBulkMode();
  }, [exitBulkMode]);

  return {
    shareModalVisible,
    shareItems,
    bulkShareMode,
    setBulkShareMode,
    selectedIds,
    shareNotice,
    openShare,
    toggleSelect,
    exitBulkMode,
    showShareSuccess,
    handleBulkShare,
    closeShareModal,
  };
}
