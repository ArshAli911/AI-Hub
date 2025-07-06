import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  buttonStyle?: object;
  textStyle?: object;
}

const AppButton: React.FC<AppButtonProps> = ({ title, onPress, color = Colors.primary, buttonStyle, textStyle }) => {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }, buttonStyle]} 
      onPress={onPress}
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
});

export default AppButton; 