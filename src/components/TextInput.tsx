import React, { useState, forwardRef } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ValidationResult } from '../utils/validation';
import { useAccessibility } from '../hooks/useAccessibility';
import { accessibilityHelpers, commonAccessibilityProps } from '../utils/accessibility';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validate?: (value: string) => ValidationResult;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  variant?: 'outlined' | 'filled' | 'standard';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const TextInput = forwardRef<RNTextInput, TextInputProps>(({
  label,
  error,
  helperText,
  required = false,
  validate,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  helperStyle,
  variant = 'outlined',
  leftIcon,
  rightIcon,
  value,
  onChangeText,
  onBlur,
  ...props
}, ref) => {
  const [internalError, setInternalError] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const { getFontWeight, announce } = useAccessibility();

  const handleChangeText = (text: string) => {
    // Clear error when user starts typing
    if (internalError) {
      setInternalError('');
    }
    
    onChangeText?.(text);
  };

  const handleBlur = async (e: any) => {
    setIsFocused(false);
    
    // Validate on blur if validate function is provided
    if (validate && value) {
      const result = validate(value);
      if (!result.isValid && result.error) {
        setInternalError(result.error);
        // Announce validation error to screen reader
        await announce(`Validation error: ${result.error}`, 'high');
      }
    }
    
    onBlur?.(e);
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const displayError = error || internalError;
  const hasError = Boolean(displayError);

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle = styles.inputContainer;
    const variantStyle = styles[`${variant}Container` as keyof typeof styles] as ViewStyle;
    const focusStyle = isFocused ? styles.focusedContainer : {};
    const errorStyle = hasError ? styles.errorContainer : {};

    return {
      ...baseStyle,
      ...variantStyle,
      ...focusStyle,
      ...errorStyle,
    };
  };

  const getInputStyle = (): TextStyle => {
    const baseStyle = styles.input;
    const variantStyle = styles[`${variant}Input` as keyof typeof styles] as TextStyle;

    return {
      ...baseStyle,
      ...variantStyle,
      fontWeight: getFontWeight(baseStyle.fontWeight as string),
    };
  };

  // Create accessibility props
  const accessibilityProps = {
    ...commonAccessibilityProps.textInput,
    accessibilityLabel: accessibilityHelpers.createInputLabel(
      label || props.placeholder || 'Text input',
      required,
      displayError
    ),
    accessibilityHint: helperText,
    accessibilityState: {
      disabled: props.editable === false,
    },
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <RNTextInput
          ref={ref}
          style={[getInputStyle(), inputStyle]}
          value={value}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholderTextColor="#999999"
          {...accessibilityProps}
          {...props}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {displayError && (
        <Text style={[styles.errorText, errorStyle]}>{displayError}</Text>
      )}
      
      {helperText && !displayError && (
        <Text style={[styles.helperText, helperStyle]}>{helperText}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  outlinedContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  filledContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  standardContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  focusedContainer: {
    borderColor: '#6200EE',
  },
  errorContainer: {
    borderColor: '#F44336',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 12,
  },
  outlinedInput: {
    // Specific styles for outlined variant
  },
  filledInput: {
    // Specific styles for filled variant
  },
  standardInput: {
    // Specific styles for standard variant
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
});

TextInput.displayName = 'TextInput';

export default TextInput;