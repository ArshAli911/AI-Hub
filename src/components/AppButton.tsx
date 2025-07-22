import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  buttonStyle?: object;
  textStyle?: object;
  disabled?: boolean;
  icon?: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  style?: object;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onLongPress?: () => void;
}

const AppButton: React.FC<AppButtonProps> = ({ 
  title, 
  onPress, 
  color = Colors.primary, 
  buttonStyle, 
  textStyle, 
  disabled = false,
  icon,
  loading = false,
  variant = 'primary',
  size = 'medium',
  style,
  accessibilityLabel,
  accessibilityHint,
  onLongPress
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button, 
        styles[`${variant}Button`],
        styles[`${size}Button`],
        { backgroundColor: color }, 
        buttonStyle,
        style,
        disabled && styles.disabledButton
      ]} 
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel || (loading ? `Loading, ${title}` : title)}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <View style={styles.contentContainer}>
        {icon && !loading && (
          <MaterialIcons 
            name={icon as any} 
            size={size === 'small' ? 16 : size === 'medium' ? 20 : 24} 
            color={variant === 'outline' ? color : '#fff'} 
            style={styles.icon} 
          />
        )}
        <Text style={[
          styles.text, 
          styles[`${size}Text`], 
          variant === 'outline' && { color },
          textStyle
        ]}>
          {loading ? 'Loading...' : title}
        </Text>
      </View>
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
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Variant styles
  primaryButton: {},
  secondaryButton: {
    backgroundColor: Colors.accent,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  // Size styles
  smallButton: {
    padding: 10,
    minHeight: 40,
  },
  mediumButton: {
    padding: 15,
    minHeight: 50,
  },
  largeButton: {
    padding: 20,
    minHeight: 60,
  },
  // Text size styles
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 18,
  },
  largeText: {
    fontSize: 22,
  },
});

export default AppButton; 