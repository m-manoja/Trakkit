import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS } from '../theme/colors';

interface InputProps extends TextInputProps {
  label: string;
}

export const CustomInput = ({ label, ...props }: InputProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput 
      style={styles.input} 
      placeholderTextColor={COLORS.textSecondary}
      {...props} 
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: '#FFF',
  }
});