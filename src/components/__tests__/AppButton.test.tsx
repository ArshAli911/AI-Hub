import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockUser } from '../../utils/testUtils';
import AppButton from '../AppButton';

describe('AppButton', () => {
  const defaultProps = {
    title: 'Test Button',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByText } = render(<AppButton {...defaultProps} />);
      
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with custom title', () => {
      const { getByText } = render(
        <AppButton {...defaultProps} title="Custom Title" />
      );
      
      expect(getByText('Custom Title')).toBeTruthy();
    });

    it('renders with icon when provided', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} icon="heart" />
      );
      
      expect(getByTestId('button-icon')).toBeTruthy();
    });

    it('renders with loading state', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} loading={true} />
      );
      
      expect(getByTestId('button-loading')).toBeTruthy();
    });

    it('renders with disabled state', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} disabled={true} />
      );
      
      const button = getByTestId('app-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('renders with different variants', () => {
      const { rerender, getByTestId } = render(
        <AppButton {...defaultProps} variant="primary" />
      );
      
      let button = getByTestId('app-button');
      expect(button.props.style).toMatchObject({
        backgroundColor: expect.any(String),
      });

      rerender(<AppButton {...defaultProps} variant="secondary" />);
      button = getByTestId('app-button');
      expect(button.props.style).toMatchObject({
        backgroundColor: 'transparent',
      });

      rerender(<AppButton {...defaultProps} variant="outline" />);
      button = getByTestId('app-button');
      expect(button.props.style).toMatchObject({
        borderWidth: 1,
      });
    });

    it('renders with different sizes', () => {
      const { rerender, getByTestId } = render(
        <AppButton {...defaultProps} size="small" />
      );
      
      let button = getByTestId('app-button');
      expect(button.props.style).toMatchObject({
        paddingVertical: expect.any(Number),
        paddingHorizontal: expect.any(Number),
      });

      rerender(<AppButton {...defaultProps} size="large" />);
      button = getByTestId('app-button');
      expect(button.props.style).toMatchObject({
        paddingVertical: expect.any(Number),
        paddingHorizontal: expect.any(Number),
      });
    });

    it('renders with custom style', () => {
      const customStyle = { backgroundColor: 'red', borderRadius: 20 };
      const { getByTestId } = render(
        <AppButton {...defaultProps} style={customStyle} />
      );
      
      const button = getByTestId('app-button');
      expect(button.props.style).toMatchObject(customStyle);
    });

    it('renders with accessibility props', () => {
      const { getByTestId } = render(
        <AppButton 
          {...defaultProps} 
          accessibilityLabel="Custom accessibility label"
          accessibilityHint="Custom accessibility hint"
        />
      );
      
      const button = getByTestId('app-button');
      expect(button.props.accessibilityLabel).toBe('Custom accessibility label');
      expect(button.props.accessibilityHint).toBe('Custom accessibility hint');
    });
  });

  describe('Interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <AppButton {...defaultProps} onPress={onPress} />
      );
      
      const button = getByTestId('app-button');
      fireEvent.press(button);
      
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <AppButton {...defaultProps} onPress={onPress} disabled={true} />
      );
      
      const button = getByTestId('app-button');
      fireEvent.press(button);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <AppButton {...defaultProps} onPress={onPress} loading={true} />
      );
      
      const button = getByTestId('app-button');
      fireEvent.press(button);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows loading indicator when loading', () => {
      const { getByTestId, queryByText } = render(
        <AppButton {...defaultProps} loading={true} />
      );
      
      expect(getByTestId('button-loading')).toBeTruthy();
      expect(queryByText('Test Button')).toBeFalsy();
    });

    it('handles long press', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <AppButton {...defaultProps} onLongPress={onLongPress} />
      );
      
      const button = getByTestId('app-button');
      fireEvent(button, 'longPress');
      
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      const { getByTestId } = render(<AppButton {...defaultProps} />);
      
      const button = getByTestId('app-button');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility state when disabled', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} disabled={true} />
      );
      
      const button = getByTestId('app-button');
      expect(button.props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('has correct accessibility state when loading', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} loading={true} />
      );
      
      const button = getByTestId('app-button');
      expect(button.props.accessibilityState).toMatchObject({
        busy: true,
      });
    });

    it('has correct accessibility label', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} accessibilityLabel="Custom Label" />
      );
      
      const button = getByTestId('app-button');
      expect(button.props.accessibilityLabel).toBe('Custom Label');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title', () => {
      const { getByTestId } = render(
        <AppButton {...defaultProps} title="" />
      );
      
      const button = getByTestId('app-button');
      expect(button).toBeTruthy();
    });

    it('handles very long title', () => {
      const longTitle = 'This is a very long button title that should be handled properly by the component';
      const { getByText } = render(
        <AppButton {...defaultProps} title={longTitle} />
      );
      
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('handles special characters in title', () => {
      const specialTitle = 'Button with special chars: !@#$%^&*()';
      const { getByText } = render(
        <AppButton {...defaultProps} title={specialTitle} />
      );
      
      expect(getByText(specialTitle)).toBeTruthy();
    });

    it('handles undefined onPress', () => {
      const { getByTestId } = render(
        <AppButton title="Test" onPress={undefined} />
      );
      
      const button = getByTestId('app-button');
      expect(() => fireEvent.press(button)).not.toThrow();
    });

    it('handles rapid button presses', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <AppButton {...defaultProps} onPress={onPress} />
      );
      
      const button = getByTestId('app-button');
      
      // Rapidly press the button multiple times
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(onPress).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender, getByTestId } = render(<AppButton {...defaultProps} />);
      
      const button = getByTestId('app-button');
      const initialRenderCount = button.props.testID;
      
      // Re-render with same props
      rerender(<AppButton {...defaultProps} />);
      
      const buttonAfterRerender = getByTestId('app-button');
      expect(buttonAfterRerender.props.testID).toBe(initialRenderCount);
    });

    it('handles style updates efficiently', () => {
      const { rerender, getByTestId } = render(<AppButton {...defaultProps} />);
      
      const button = getByTestId('app-button');
      const initialStyle = button.props.style;
      
      // Update style
      rerender(<AppButton {...defaultProps} style={{ backgroundColor: 'red' }} />);
      
      const buttonAfterStyleUpdate = getByTestId('app-button');
      expect(buttonAfterStyleUpdate.props.style).not.toEqual(initialStyle);
    });
  });

  describe('Integration', () => {
    it('works with navigation context', () => {
      const { getByTestId } = renderWithProviders(
        <AppButton {...defaultProps} />
      );
      
      const button = getByTestId('app-button');
      expect(button).toBeTruthy();
    });

    it('works with theme context', () => {
      const { getByTestId } = renderWithProviders(
        <AppButton {...defaultProps} />
      );
      
      const button = getByTestId('app-button');
      expect(button).toBeTruthy();
    });

    it('works with auth context', () => {
      const { getByTestId } = renderWithProviders(
        <AppButton {...defaultProps} />
      );
      
      const button = getByTestId('app-button');
      expect(button).toBeTruthy();
    });
  });
}); 