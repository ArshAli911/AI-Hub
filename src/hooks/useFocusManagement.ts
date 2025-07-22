import { useRef, useCallback } from 'react';
import { findNodeHandle, AccessibilityInfo, Platform } from 'react-native';

/**
 * Hook for managing focus in the application, particularly useful for accessibility
 * Provides methods to move focus between elements and announce focus changes
 */
const useFocusManagement = () => {
  const focusableRefs = useRef<Record<string, React.RefObject<any>>>({});

  /**
   * Register a ref to be managed by the focus system
   * @param id Unique identifier for the focusable element
   * @param ref React ref object for the element
   */
  const registerFocusable = useCallback((id: string, ref: React.RefObject<any>) => {
    focusableRefs.current[id] = ref;
  }, []);

  /**
   * Unregister a ref from the focus system
   * @param id Unique identifier for the focusable element
   */
  const unregisterFocusable = useCallback((id: string) => {
    delete focusableRefs.current[id];
  }, []);

  /**
   * Focus a specific element by its ID
   * @param id Unique identifier for the focusable element
   * @returns Boolean indicating if focus was successful
   */
  const focusElement = useCallback((id: string): boolean => {
    const ref = focusableRefs.current[id];
    if (ref?.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        if (Platform.OS === 'web') {
          // Web focus handling
          ref.current.focus();
        } else {
          // Native focus handling
          AccessibilityInfo.setAccessibilityFocus(node);
        }
        return true;
      }
    }
    return false;
  }, []);

  /**
   * Announce a message to screen readers
   * @param message Message to be announced
   */
  const announceForAccessibility = useCallback((message: string) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);

  /**
   * Move focus to the next element in the tab order
   * @param currentId Current focused element ID
   * @returns ID of the newly focused element or null if unsuccessful
   */
  const focusNext = useCallback((currentId: string): string | null => {
    const ids = Object.keys(focusableRefs.current);
    const currentIndex = ids.indexOf(currentId);
    
    if (currentIndex >= 0 && currentIndex < ids.length - 1) {
      const nextId = ids[currentIndex + 1];
      if (focusElement(nextId)) {
        return nextId;
      }
    }
    return null;
  }, [focusElement]);

  /**
   * Move focus to the previous element in the tab order
   * @param currentId Current focused element ID
   * @returns ID of the newly focused element or null if unsuccessful
   */
  const focusPrevious = useCallback((currentId: string): string | null => {
    const ids = Object.keys(focusableRefs.current);
    const currentIndex = ids.indexOf(currentId);
    
    if (currentIndex > 0) {
      const prevId = ids[currentIndex - 1];
      if (focusElement(prevId)) {
        return prevId;
      }
    }
    return null;
  }, [focusElement]);

  /**
   * Reset focus to the first focusable element
   * @returns ID of the focused element or null if unsuccessful
   */
  const resetFocus = useCallback((): string | null => {
    const ids = Object.keys(focusableRefs.current);
    if (ids.length > 0) {
      const firstId = ids[0];
      if (focusElement(firstId)) {
        return firstId;
      }
    }
    return null;
  }, [focusElement]);

  return {
    registerFocusable,
    unregisterFocusable,
    focusElement,
    focusNext,
    focusPrevious,
    resetFocus,
    announceForAccessibility
  };
};

export default useFocusManagement;