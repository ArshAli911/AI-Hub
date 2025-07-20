import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { accessibilityHelpers, commonAccessibilityProps } from '../utils/accessibility';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    expanded?: boolean;
  };
}

const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState
}) => {
  const isDisabled = disabled || loading;
  const { getFontWeight, getAccessibleColor, announce } = useAccessibility();

  const handlePress = async () => {
    if (!isDisabled) {
      // Announce button press for screen readers
      await announce(`${title} activated`);
      onPress();
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`${size}Button` as keyof typeof styles] as ViewStyle;
    const variantStyle = styles[`${variant}Button` as keyof typeof styles] as ViewStyle;
    const disabledStyle = isDisabled ? styles.disabledButton : {};

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...disabledStyle,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.buttonText;
    const sizeStyle = styles[`${size}Text` as keyof typeof styles] as TextStyle;
    const variantStyle = styles[`${variant}Text` as keyof typeof styles] as TextStyle;
    const disabledStyle = isDisabled ? styles.disabledText : {};

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...disabledStyle,
    };
  };

  // Create accessibility props
  const accessibilityProps = {
    ...commonAccessibilityProps.button,
    accessibilityLabel: accessibilityLabel || accessibilityHelpers.createButtonLabel(
      title, 
      loading ? 'loading' : undefined
    ),
    accessibilityHint: accessibilityHint || accessibilityHelpers.createActionHint(title.toLowerCase()),
    accessibilityState: {
      disabled: isDisabled,
      ...accessibilityState,
    },
  };

  return (
    <TouchableOpacity 
      style={[getButtonStyle(), style]} 
      onPress={handlePress}
      disabled={isDisabled}
      testID={testID}
      activeOpacity={0.8}
      {...accessibilityProps}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#6200EE' : '#FFFFFF'}
          accessibilityLabel="Loading"
        />
      ) : (
        <Text 
          style={[
            getTextStyle(), 
            { fontWeight: getFontWeight(getTextStyle().fontWeight as string) as any },
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minHeight: 44, // Accessibility minimum touch target
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Size variants
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minHeight: 36,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 44,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    minHeight: 52,
  },
  
  // Text size variants
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Color variants
  primaryButton: {
    backgroundColor: '#6200EE',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  
  secondaryButton: {
    backgroundColor: '#E0E0E0',
  },
  secondaryText: {
    color: '#424242',
  },
  
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6200EE',
  },
  outlineText: {
    color: '#6200EE',
  },
  
  dangerButton: {
    backgroundColor: '#F44336',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  
  // Disabled states
  disabledButton: {
    backgroundColor: '#BDBDBD',
    borderColor: '#BDBDBD',
  },
  disabledText: {
    color: '#757575',
  },
});

export default Button; 