import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const PrimaryButton = ({ title, onPress, loading, disabled }: ButtonProps) => (
  <TouchableOpacity 
    style={[styles.button, (disabled || loading) && styles.disabled]} 
    onPress={onPress}
    disabled={disabled || loading}
  >
    {loading ? (
      <ActivityIndicator color="#FFF" />
    ) : (
      <Text style={styles.text}>{title}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});