import React, { useState, useCallback, useRef, ReactNode, useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ViewStyle } from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { ValidationResult } from '../utils/validation';
import { Logger } from '../utils/logger';
import Button from './Button';

export interface FormField<T = unknown> {
  name: string;
  value: T;
  validate?: (value: T) => ValidationResult;
  required?: boolean;
}

export interface FormProps<T extends Record<string, unknown> = Record<string, unknown>> {
  children: ReactNode;
  onSubmit: (data: T) => Promise<void> | void;
  initialValues?: Partial<T>;
  validationSchema?: Partial<Record<keyof T, (value: T[keyof T]) => ValidationResult>>;
  style?: ViewStyle;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
}

export interface FormContextType<T extends Record<string, unknown> = Record<string, unknown>> {
  values: Partial<T>;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setError: <K extends keyof T>(name: K, error: string) => void;
  setTouched: <K extends keyof T>(name: K, touched: boolean) => void;
  validateField: <K extends keyof T>(name: K) => Promise<boolean>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
}

const FormContext = React.createContext<FormContextType<any> | null>(null);

export const useForm = <T extends Record<string, unknown> = Record<string, unknown>>(): FormContextType<T> => {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a Form component');
  }
  return context as FormContextType<T>;
};

const Form = <T extends Record<string, unknown> = Record<string, unknown>>({
  children,
  onSubmit,
  initialValues = {} as Partial<T>,
  validationSchema = {},
  style,
  scrollable = true,
  keyboardAvoiding = true,
}: FormProps<T>) => {
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { announce } = useAccessibility();
  const scrollViewRef = useRef<ScrollView>(null);

  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const setError = useCallback(<K extends keyof T>(name: K, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback(<K extends keyof T>(name: K, touched: boolean) => {
    setTouched(prev => ({ ...prev, [name]: touched }));
  }, []);

  const validateField = useCallback(async <K extends keyof T>(name: K): Promise<boolean> => {
    const validator = validationSchema[name];
    if (!validator) return true;

    const value = values[name];
    const result = validator(value);
    
    if (!result.isValid && result.error) {
      setError(name, result.error);
      return false;
    }
    
    return true;
  }, [values, validationSchema, setError]);

  const validateAllFields = useCallback(async (): Promise<boolean> => {
    const fieldNames = Object.keys(validationSchema) as Array<keyof T>;
    const validationPromises = fieldNames.map(name => validateField(name));
    const results = await Promise.all(validationPromises);
    
    return results.every(result => result);
  }, [validationSchema, validateField]);

  const markAllFieldsAsTouched = useCallback(() => {
    const touchedFields = (Object.keys(validationSchema) as Array<keyof T>).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Partial<Record<keyof T, boolean>>);
    setTouched(prev => ({ ...prev, ...touchedFields }));
  }, [validationSchema]);

  const handleValidationErrors = useCallback(async () => {
    const errorCount = Object.keys(errors).length;
    await announce(`Form has ${errorCount} validation errors`, 'high');
    
    // Scroll to first error
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [errors, announce]);

  const submitForm = useCallback(async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      markAllFieldsAsTouched();
      const isValid = await validateAllFields();
      
      if (!isValid) {
        await handleValidationErrors();
        return;
      }

      await onSubmit(values as T);
      await announce('Form submitted successfully', 'medium');
      
    } catch (error) {
      Logger.error('Form submission error', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Form submission failed. Please try again.';
      
      await announce(errorMessage, 'high');
      
      // Set form-level error if needed
      if (error instanceof Error && error.message.includes('validation')) {
        // Handle validation errors from server
        const validationErrors = (error as any).validationErrors;
        if (validationErrors) {
          Object.entries(validationErrors).forEach(([field, message]) => {
            setError(field as keyof T, message as string);
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, markAllFieldsAsTouched, validateAllFields, handleValidationErrors, onSubmit, values, announce]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const contextValue: FormContextType<T> = useMemo(() => ({
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setError,
    setTouched: setFieldTouched,
    validateField,
    submitForm,
    resetForm,
  }), [values, errors, touched, isSubmitting, setValue, setError, setFieldTouched, validateField, submitForm, resetForm]);

  const FormContent = useCallback(() => (
    <FormContext.Provider value={contextValue}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </FormContext.Provider>
  ), [contextValue, style, children]);

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {scrollable ? (
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FormContent />
          </ScrollView>
        ) : (
          <FormContent />
        )}
      </KeyboardAvoidingView>
    );
  }

  return scrollable ? (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <FormContent />
    </ScrollView>
  ) : (
    <FormContent />
  );
};

// Form Field Component
export interface FormFieldProps<T extends Record<string, unknown> = Record<string, unknown>, K extends keyof T = keyof T> {
  name: K;
  children: (props: {
    value: T[K] | undefined;
    error?: string;
    touched: boolean;
    onChange: (value: T[K]) => void;
    onBlur: () => void;
  }) => ReactNode;
}

export const FormField = <T extends Record<string, unknown> = Record<string, unknown>, K extends keyof T = keyof T>({ 
  name, 
  children 
}: FormFieldProps<T, K>) => {
  const { values, errors, touched, setValue, setTouched, validateField } = useForm<T>();

  const handleChange = useCallback((value: T[K]) => {
    setValue(name, value);
  }, [name, setValue]);

  const handleBlur = useCallback(async () => {
    setTouched(name, true);
    await validateField(name);
  }, [name, setTouched, validateField]);

  return (
    <>
      {children({
        value: values[name],
        error: touched[name] ? errors[name] : undefined,
        touched: touched[name] || false,
        onChange: handleChange,
        onBlur: handleBlur,
      })}
    </>
  );
};

// Form Submit Button
export interface FormSubmitButtonProps {
  title?: string;
  style?: ViewStyle;
  disabled?: boolean;
  children?: ReactNode;
}

export const FormSubmitButton: React.FC<FormSubmitButtonProps> = ({
  title = 'Submit',
  style,
  disabled = false,
  children,
}) => {
  const { submitForm, isSubmitting } = useForm();

  if (children) {
    return (
      <TouchableOpacity
        onPress={submitForm}
        disabled={disabled || isSubmitting}
        style={style}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <Button
      title={title}
      onPress={submitForm}
      loading={isSubmitting}
      disabled={disabled}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
});

export default Form;