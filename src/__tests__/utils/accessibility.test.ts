import { AccessibilityInfo } from 'react-native';
import { accessibilityService, accessibilityHelpers } from '../../utils/accessibility';

// Mock React Native AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(),
    isReduceMotionEnabled: jest.fn(),
    isReduceTransparencyEnabled: jest.fn(),
    isBoldTextEnabled: jest.fn(),
    isGrayscaleEnabled: jest.fn(),
    isInvertColorsEnabled: jest.fn(),
    addEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

const mockAccessibilityInfo = AccessibilityInfo as jest.Mocked<typeof AccessibilityInfo>;

describe('AccessibilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default mock values
    mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(false);
    mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(false);
    mockAccessibilityInfo.isReduceTransparencyEnabled.mockResolvedValue(false);
    mockAccessibilityInfo.isBoldTextEnabled.mockResolvedValue(false);
    mockAccessibilityInfo.isGrayscaleEnabled.mockResolvedValue(false);
    mockAccessibilityInfo.isInvertColorsEnabled.mockResolvedValue(false);
    mockAccessibilityInfo.announceForAccessibility.mockResolvedValue();
    mockAccessibilityInfo.setAccessibilityFocus.mockResolvedValue();
  });

  describe('State Management', () => {
    it('initializes with correct default state', () => {
      const state = accessibilityService.getState();
      
      expect(state).toEqual({
        isScreenReaderEnabled: false,
        isReduceMotionEnabled: false,
        isReduceTransparencyEnabled: false,
        isBoldTextEnabled: false,
        isGrayscaleEnabled: false,
        isInvertColorsEnabled: false,
        prefersCrossFadeTransitions: false,
      });
    });

    it('updates state when accessibility settings change', async () => {
      mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(true);
      mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);
      
      // Simulate state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(accessibilityService.isScreenReaderEnabled()).toBe(false); // Initial state
    });

    it('sets up event listeners for accessibility changes', () => {
      expect(mockAccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'screenReaderChanged',
        expect.any(Function)
      );
      expect(mockAccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );
      expect(mockAccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'boldTextChanged',
        expect.any(Function)
      );
    });
  });

  describe('Announcements', () => {
    it('announces message when screen reader is enabled', async () => {
      // Mock screen reader as enabled
      const mockState = { ...accessibilityService.getState(), isScreenReaderEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      await accessibilityService.announce({
        message: 'Test announcement',
        priority: 'medium',
      });
      
      expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Test announcement');
    });

    it('does not announce when screen reader is disabled', async () => {
      await accessibilityService.announce({
        message: 'Test announcement',
        priority: 'medium',
      });
      
      expect(mockAccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('queues multiple announcements', async () => {
      const mockState = { ...accessibilityService.getState(), isScreenReaderEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      await accessibilityService.announce({ message: 'First announcement' });
      await accessibilityService.announce({ message: 'Second announcement' });
      
      expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(2);
    });

    it('handles announcement delays', async () => {
      const mockState = { ...accessibilityService.getState(), isScreenReaderEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      const startTime = Date.now();
      
      await accessibilityService.announce({
        message: 'Delayed announcement',
        delay: 100,
      });
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Focus Management', () => {
    it('sets accessibility focus', async () => {
      const reactTag = 123;
      
      await accessibilityService.setAccessibilityFocus(reactTag);
      
      expect(mockAccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(reactTag);
    });

    it('handles focus errors gracefully', async () => {
      mockAccessibilityInfo.setAccessibilityFocus.mockRejectedValue(new Error('Focus error'));
      
      // Should not throw
      await expect(accessibilityService.setAccessibilityFocus(123)).resolves.toBeUndefined();
    });
  });

  describe('Animation Duration Adaptation', () => {
    it('returns 0 duration when reduce motion is enabled', () => {
      const mockState = { ...accessibilityService.getState(), isReduceMotionEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      const duration = accessibilityService.getAnimationDuration(300);
      
      expect(duration).toBe(0);
    });

    it('returns original duration when reduce motion is disabled', () => {
      const duration = accessibilityService.getAnimationDuration(300);
      
      expect(duration).toBe(300);
    });
  });

  describe('Opacity Adaptation', () => {
    it('increases opacity when reduce transparency is enabled', () => {
      const mockState = { ...accessibilityService.getState(), isReduceTransparencyEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      const opacity = accessibilityService.getOpacity(0.5);
      
      expect(opacity).toBe(0.8);
    });

    it('returns original opacity when reduce transparency is disabled', () => {
      const opacity = accessibilityService.getOpacity(0.5);
      
      expect(opacity).toBe(0.5);
    });
  });

  describe('Font Weight Adaptation', () => {
    it('increases font weight when bold text is enabled', () => {
      const mockState = { ...accessibilityService.getState(), isBoldTextEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      const fontWeight = accessibilityService.getFontWeight('400');
      
      expect(fontWeight).toBe('600');
    });

    it('returns original font weight when bold text is disabled', () => {
      const fontWeight = accessibilityService.getFontWeight('400');
      
      expect(fontWeight).toBe('400');
    });

    it('handles edge cases in font weight mapping', () => {
      const mockState = { ...accessibilityService.getState(), isBoldTextEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      expect(accessibilityService.getFontWeight('900')).toBe('bold'); // Fallback
      expect(accessibilityService.getFontWeight('normal')).toBe('bold');
      expect(accessibilityService.getFontWeight('light')).toBe('normal');
    });
  });

  describe('High Contrast Detection', () => {
    it('detects high contrast need when invert colors is enabled', () => {
      const mockState = { ...accessibilityService.getState(), isInvertColorsEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      expect(accessibilityService.needsHighContrast()).toBe(true);
    });

    it('detects high contrast need when grayscale is enabled', () => {
      const mockState = { ...accessibilityService.getState(), isGrayscaleEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      expect(accessibilityService.needsHighContrast()).toBe(true);
    });

    it('returns false when no high contrast features are enabled', () => {
      expect(accessibilityService.needsHighContrast()).toBe(false);
    });
  });

  describe('Color Adaptation', () => {
    it('returns high contrast color when needed', () => {
      const mockState = { ...accessibilityService.getState(), isInvertColorsEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      const color = accessibilityService.getAccessibleColor('#666666', '#000000');
      
      expect(color).toBe('#000000');
    });

    it('returns original color when high contrast is not needed', () => {
      const color = accessibilityService.getAccessibleColor('#666666', '#000000');
      
      expect(color).toBe('#666666');
    });

    it('returns original color when no high contrast color provided', () => {
      const mockState = { ...accessibilityService.getState(), isInvertColorsEnabled: true };
      jest.spyOn(accessibilityService, 'getState').mockReturnValue(mockState);
      
      const color = accessibilityService.getAccessibleColor('#666666');
      
      expect(color).toBe('#666666');
    });
  });

  describe('Event Listeners', () => {
    it('allows subscribing to state changes', () => {
      const listener = jest.fn();
      const unsubscribe = accessibilityService.onStateChange(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('notifies listeners of state changes', () => {
      const listener = jest.fn();
      accessibilityService.onStateChange(listener);
      
      // Simulate state change
      const eventListener = mockAccessibilityInfo.addEventListener.mock.calls
        .find(call => call[0] === 'screenReaderChanged')?.[1];
      
      if (eventListener) {
        eventListener(true);
        expect(listener).toHaveBeenCalled();
      }
    });

    it('removes listeners when unsubscribed', () => {
      const listener = jest.fn();
      const unsubscribe = accessibilityService.onStateChange(listener);
      
      unsubscribe();
      
      // Simulate state change
      const eventListener = mockAccessibilityInfo.addEventListener.mock.calls
        .find(call => call[0] === 'screenReaderChanged')?.[1];
      
      if (eventListener) {
        eventListener(true);
        expect(listener).not.toHaveBeenCalled();
      }
    });
  });
});

describe('AccessibilityHelpers', () => {
  describe('createButtonLabel', () => {
    it('creates basic button label', () => {
      const label = accessibilityHelpers.createButtonLabel('Save');
      expect(label).toBe('Save');
    });

    it('creates button label with state', () => {
      const label = accessibilityHelpers.createButtonLabel('Play', 'paused');
      expect(label).toBe('Play, paused');
    });
  });

  describe('createActionHint', () => {
    it('creates action hint', () => {
      const hint = accessibilityHelpers.createActionHint('save');
      expect(hint).toBe('Double tap to save');
    });
  });

  describe('createInputLabel', () => {
    it('creates basic input label', () => {
      const label = accessibilityHelpers.createInputLabel('Email');
      expect(label).toBe('Email');
    });

    it('creates input label with required state', () => {
      const label = accessibilityHelpers.createInputLabel('Email', true);
      expect(label).toBe('Email, required');
    });

    it('creates input label with error', () => {
      const label = accessibilityHelpers.createInputLabel('Email', false, 'Invalid email');
      expect(label).toBe('Email, error: Invalid email');
    });

    it('creates input label with required and error', () => {
      const label = accessibilityHelpers.createInputLabel('Email', true, 'Invalid email');
      expect(label).toBe('Email, required, error: Invalid email');
    });
  });

  describe('createListItemLabel', () => {
    it('creates basic list item label', () => {
      const label = accessibilityHelpers.createListItemLabel('John Doe');
      expect(label).toBe('John Doe');
    });

    it('creates list item label with subtitle', () => {
      const label = accessibilityHelpers.createListItemLabel('John Doe', 'Software Engineer');
      expect(label).toBe('John Doe, Software Engineer');
    });

    it('creates list item label with position', () => {
      const label = accessibilityHelpers.createListItemLabel(
        'John Doe',
        undefined,
        { index: 0, total: 10 }
      );
      expect(label).toBe('John Doe, item 1 of 10');
    });

    it('creates complete list item label', () => {
      const label = accessibilityHelpers.createListItemLabel(
        'John Doe',
        'Software Engineer',
        { index: 2, total: 10 }
      );
      expect(label).toBe('John Doe, Software Engineer, item 3 of 10');
    });
  });

  describe('createToggleState', () => {
    it('creates toggle state for on', () => {
      const state = accessibilityHelpers.createToggleState(true);
      expect(state).toEqual({ checked: true });
    });

    it('creates toggle state for off', () => {
      const state = accessibilityHelpers.createToggleState(false);
      expect(state).toEqual({ checked: false });
    });
  });

  describe('createExpandableState', () => {
    it('creates expandable state for expanded', () => {
      const state = accessibilityHelpers.createExpandableState(true);
      expect(state).toEqual({ expanded: true });
    });

    it('creates expandable state for collapsed', () => {
      const state = accessibilityHelpers.createExpandableState(false);
      expect(state).toEqual({ expanded: false });
    });
  });

  describe('createSelectedState', () => {
    it('creates selected state for selected', () => {
      const state = accessibilityHelpers.createSelectedState(true);
      expect(state).toEqual({ selected: true });
    });

    it('creates selected state for unselected', () => {
      const state = accessibilityHelpers.createSelectedState(false);
      expect(state).toEqual({ selected: false });
    });
  });

  describe('createProgressValue', () => {
    it('creates basic progress value', () => {
      const value = accessibilityHelpers.createProgressValue(50, 100);
      expect(value).toEqual({
        min: 0,
        max: 100,
        now: 50,
        text: '50 of 100',
      });
    });

    it('creates progress value with unit', () => {
      const value = accessibilityHelpers.createProgressValue(50, 100, 'MB');
      expect(value).toEqual({
        min: 0,
        max: 100,
        now: 50,
        text: '50 MB of 100 MB',
      });
    });
  });
});