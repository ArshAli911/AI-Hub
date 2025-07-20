import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  buttonStyle?: object;
  textStyle?: object;
  disabled?: boolean; // Add disabled prop
}

const AppButton: React.FC<AppButtonProps> = ({ title, onPress, color = Colors.primary, buttonStyle, textStyle, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }, buttonStyle, disabled && styles.disabledButton]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    width: '100%',
    marginVertical: 10,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6, // Visual indication for disabled state
  },
});

export default AppButton; 