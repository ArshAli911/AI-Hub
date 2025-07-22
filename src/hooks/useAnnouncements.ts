import { useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Hook for managing screen reader announcements
 * Provides methods to announce messages to screen readers with different priority levels
 */
export const useAnnouncements = () => {
  /**
   * Announce a message to screen readers
   * @param message Message to be announced
   */
  const announce = useCallback((message: string) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      AccessibilityInfo.announceForAccessibility(message);
    } else if (Platform.OS === 'web') {
      // For web, we would use ARIA live regions
      // This is a simplified implementation
      const liveRegion = document.getElementById('accessibility-announcer');
      if (liveRegion) {
        liveRegion.textContent = message;
      } else {
        console.warn('No accessibility announcer element found in the DOM');
      }
    }
  }, []);

  /**
   * Announce a message with polite priority (won't interrupt current speech)
   * @param message Message to be announced
   */
  const announcePolite = useCallback((message: string) => {
    announce(message);
  }, [announce]);

  /**
   * Announce a message with assertive priority (interrupts current speech)
   * @param message Message to be announced
   */
  const announceAssertive = useCallback((message: string) => {
    // On native platforms, all announcements are treated the same
    // On web, we would use an assertive live region
    announce(message);
  }, [announce]);

  /**
   * Announce a status update
   * @param message Status message to be announced
   */
  const announceStatus = useCallback((message: string) => {
    announcePolite(message);
  }, [announcePolite]);

  /**
   * Announce an error or alert
   * @param message Error message to be announced
   */
  const announceError = useCallback((message: string) => {
    announceAssertive(`Alert: ${message}`);
  }, [announceAssertive]);

  /**
   * Announce a success message
   * @param message Success message to be announced
   */
  const announceSuccess = useCallback((message: string) => {
    announcePolite(`Success: ${message}`);
  }, [announcePolite]);

  /**
   * Announce navigation changes
   * @param screenName Name of the screen being navigated to
   */
  const announceNavigation = useCallback((screenName: string) => {
    announcePolite(`Navigated to ${screenName}`);
  }, [announcePolite]);

  return {
    announce,
    announcePolite,
    announceAssertive,
    announceStatus,
    announceError,
    announceSuccess,
    announceNavigation
  };
};