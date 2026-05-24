import { StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

export const sharePageStyles = StyleSheet.create({
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 100,
  },
  shareHeaderBtnDisabled: { opacity: 0.5 },
  shareHeaderBtnText: { color: 'white', fontWeight: '700', fontSize: 12 },
  cancelShareBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#6B7280',
  },
  cancelShareBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  shareNotice: {
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
  },
  shareNoticeText: { color: '#065F46', fontSize: 13, fontWeight: '500' },
});

export const shareCardStyles = StyleSheet.create({
  checkbox: { marginRight: 8 },
  cardShareBtn: { marginRight: 12 },
});
