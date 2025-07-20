import { AccessibilityRole } from 'react-native';

// Common accessibility props for different component types
export const commonAccessibilityProps = {
  button: {
    accessible: true,
    accessibilityRole: 'button' as AccessibilityRole,
  },
  text: {
    accessible: true,
    accessibilityRole: 'text' as AccessibilityRole,
  },
  image: {
    accessible: true,
    accessibilityRole: 'image' as AccessibilityRole,
  },
  textInput: {
    accessible: true,
    accessibilityRole: 'text' as AccessibilityRole,
  },
  list: {
    accessible: true,
    accessibilityRole: 'list' as AccessibilityRole,
  },
};

// Accessibility helper functions
export const accessibilityHelpers = {
  /**
   * Create button label with state information
   */
  createButtonLabel: (title: string, state?: string): string => {
    if (state) {
      return `${title}, ${state}`;
    }
    return title;
  },

  /**
   * Create input label with validation state
   */
  createInputLabel: (label: string, required?: boolean, error?: string): string => {
    let fullLabel = label;
    
    if (required) {
      fullLabel += ', required';
    }
    
    if (error) {
      fullLabel += `, error: ${error}`;
    }
    
    return fullLabel;
  },

  /**
   * Create list item label with position information
   */
  createListItemLabel: (
    title: string, 
    subtitle?: string, 
    position?: { index: number; total: number }
  ): string => {
    let label = title;
    
    if (subtitle) {
      label += `, ${subtitle}`;
    }
    
    if (position) {
      label += `, item ${position.index + 1} of ${position.total}`;
    }
    
    return label;
  },

  /**
   * Create action hint for buttons
   */
  createActionHint: (action: string): string => {
    return `Double tap to ${action}`;
  },

  /**
   * Create navigation hint
   */
  createNavigationHint: (destination: string): string => {
    return `Double tap to navigate to ${destination}`;
  },

  /**
   * Create form field hint
   */
  createFormFieldHint: (fieldType: string, format?: string): string => {
    let hint = `Enter ${fieldType}`;
    
    if (format) {
      hint += ` in ${format} format`;
    }
    
    return hint;
  },
};

export default {
  commonAccessibilityProps,
  accessibilityHelpers,
};