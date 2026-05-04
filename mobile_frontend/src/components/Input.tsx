import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS } from '../theme/colors';

interface InputProps extends TextInputProps {
  label: string;
  rightAccessory?: React.ReactNode;
}

export const CustomInput = ({ label, rightAccessory, ...props }: InputProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <TextInput 
        style={styles.input} 
        placeholderTextColor={COLORS.textSecondary}
        {...props} 
      />
      {rightAccessory && (
        <View style={styles.rightAccessory}>
          {rightAccessory}
        </View>
      )}
    </View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  rightAccessory: {
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  }
});