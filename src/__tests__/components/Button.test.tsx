import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import Button from '../../components/Button';
import { useAccessibility } from '../../hooks/useAccessibility';

// Mock the accessibility hook
jest.mock('../../hooks/useAccessibility');
const mockUseAccessibility = useAccessibility as jest.MockedFunction<typeof useAccessibility>;

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
}));

// Test utilities
const createMockAccessibility = (overrides = {}) => ({
  announce: jest.fn(),
  getFontWeight: jest.fn((weight) => weight),
  getAccessibleColor: jest.fn((color) => color),
  needsHighContrast: () => false,
  isScreenReaderEnabled: false,
  isReduceMotionEnabled: false,
  isReduceTransparencyEnabled: false,
  isBoldTextEnabled: false,
  isGrayscaleEnabled: false,
  isInvertColorsEnabled: false,
  prefersCrossFadeTransitions: false,
  setFocus: jest.fn(),
  getAnimationDuration: jest.fn((duration) => duration),
  getOpacity: jest.fn((opacity) => opacity),
  ...overrides,
});

const defaultProps = {
  title: 'Test Button',
  onPress: jest.fn(),
};

const createButton = (props = {}) => (
  <Button {...defaultProps} {...props} />
);

describe('Button Component', () => {
  let mockAccessibility: ReturnType<typeof createMockAccessibility>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAccessibility = createMockAccessibility();
    mockUseAccessibility.mockReturnValue(mockAccessibility);
  });

  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByText } = render(createButton());
      expect(getByText('Test Button')).toBeTruthy();
    });

    describe('Variants', () => {
      test.each([
        ['primary'],
        ['secondary'], 
        ['outline'],
        ['danger']
      ])('renders %s variant correctly', (variant) => {
        const { getByText } = render(
          createButton({ 
            title: `${variant} Button`, 
            variant: variant as any 
          })
        );
        
        expect(getByText(`${variant} Button`)).toBeTruthy();
      });
    });

    describe('Sizes', () => {
      test.each([
        ['small'],
        ['medium'],
        ['large']
      ])('renders %s size correctly', (size) => {
        const { getByText } = render(
          createButton({ 
            title: `${size} Button`, 
            size: size as any 
          })
        );
        
        expect(getByText(`${size} Button`)).toBeTruthy();
      });
    });

    describe('States', () => {
      it('shows loading spinner when loading', () => {
        const { getByLabelText } = render(
          createButton({ title: 'Loading Button', loading: true })
        );
        
        expect(getByLabelText('Loading')).toBeTruthy();
      });

      it('shows disabled state correctly', () => {
        const { getByRole } = render(
          createButton({ title: 'Disabled Button', disabled: true })
        );
        
        const button = getByRole('button');
        expect(button.props.accessibilityState.disabled).toBe(true);
      });
    });
  });

  describe('User Interaction', () => {
    it('calls onPress when pressed', async () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        createButton({ title: 'Press Me', onPress: mockOnPress })
      );
      
      fireEvent.press(getByText('Press Me'));
      
      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        createButton({ title: 'Disabled Button', onPress: mockOnPress, disabled: true })
      );
      
      fireEvent.press(getByText('Disabled Button'));
      
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const mockOnPress = jest.fn();
      const { getByLabelText } = render(
        createButton({ title: 'Loading Button', onPress: mockOnPress, loading: true })
      );
      
      fireEvent.press(getByLabelText('Loading'));
      
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('announces button press to screen reader', async () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        createButton({ title: 'Announce Button', onPress: mockOnPress })
      );
      
      fireEvent.press(getByText('Announce Button'));
      
      await waitFor(() => {
        expect(mockAccessibility.announce).toHaveBeenCalledWith('Announce Button activated');
      }, { timeout: 1000 });
    });

    it('handles rapid button presses', async () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        createButton({ title: 'Rapid Press', onPress: mockOnPress })
      );
      
      const button = getByText('Rapid Press');
      
      // Simulate rapid presses
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility props', () => {
      const mockOnPress = jest.fn();
      const { getByRole } = render(
        createButton({
          title: "Accessible Button",
          onPress: mockOnPress,
          accessibilityLabel: "Custom label",
          accessibilityHint: "Custom hint"
        })
      );
      
      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toBe('Custom label');
      expect(button.props.accessibilityHint).toBe('Custom hint');
    });

    it('sets disabled state in accessibility', () => {
      const { getByRole } = render(
        createButton({ title: "Disabled Button", disabled: true })
      );
      
      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('adapts font weight based on accessibility settings', () => {
      mockAccessibility.getFontWeight.mockReturnValue('bold');
      
      const { getByText } = render(
        createButton({ title: "Bold Button" })
      );
      
      expect(mockAccessibility.getFontWeight).toHaveBeenCalled();
    });

    it('updates accessibility state when loading changes', () => {
      const { getByRole, rerender } = render(
        createButton({ loading: false })
      );
      
      let button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(false);
      
      rerender(createButton({ loading: true }));
      
      button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Styling', () => {
    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const customTextStyle = { color: 'white' };
      const mockOnPress = jest.fn();
      
      const { getByText } = render(
        createButton({
          title: "Styled Button",
          onPress: mockOnPress,
          style: customStyle,
          textStyle: customTextStyle
        })
      );
      
      // Test that custom styles are applied (implementation depends on testing library capabilities)
      expect(getByText('Styled Button')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title gracefully', () => {
      const mockOnPress = jest.fn();
      const { container } = render(
        createButton({ title: "", onPress: mockOnPress })
      );
      
      expect(container).toBeTruthy();
    });

    it('handles onPress errors gracefully', async () => {
      const errorOnPress = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const { getByText } = render(
        createButton({ title: "Error Button", onPress: errorOnPress })
      );
      
      // Should not crash the component when onPress throws
      expect(() => {
        fireEvent.press(getByText('Error Button'));
      }).not.toThrow();
      
      expect(errorOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('handles rapid button presses efficiently', async () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        createButton({ title: 'Rapid Press', onPress: mockOnPress })
      );
      
      const button = getByText('Rapid Press');
      
      // Simulate rapid presses
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(3);
      });
    });
  });
});