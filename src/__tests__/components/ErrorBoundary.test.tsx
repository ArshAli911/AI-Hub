import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import ErrorBoundary, { 
  AppErrorBoundary, 
  ScreenErrorBoundary, 
  ComponentErrorBoundary,
  withErrorBoundary 
} from '../../components/ErrorBoundary';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

// Component that works normally
const WorkingComponent: React.FC = () => <Text>Working component</Text>;

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  describe('Basic Error Boundary', () => {
    it('renders children when there is no error', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );
      
      expect(getByText('Working component')).toBeTruthy();
    });

    it('renders error UI when child component throws', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('renders custom fallback when provided', () => {
      const customFallback = <Text>Custom error message</Text>;
      
      const { getByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(getByText('Custom error message')).toBeTruthy();
    });

    it('resets error state when retry button is pressed', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(getByText('Try Again')).toBeTruthy();
      
      // Press retry button
      fireEvent.press(getByText('Try Again'));
      
      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(getByText('No error')).toBeTruthy();
    });
  });

  describe('App Error Boundary', () => {
    it('renders app-level error UI', () => {
      const { getByText } = render(
        <AppErrorBoundary>
          <ThrowError />
        </AppErrorBoundary>
      );
      
      expect(getByText('App Crashed')).toBeTruthy();
      expect(getByText('Restart App')).toBeTruthy();
    });
  });

  describe('Screen Error Boundary', () => {
    it('renders screen-level error UI', () => {
      const { getByText } = render(
        <ScreenErrorBoundary>
          <ThrowError />
        </ScreenErrorBoundary>
      );
      
      expect(getByText('Screen Error')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('resets on props change when resetOnPropsChange is true', () => {
      let shouldThrow = true;
      const resetKeys = ['key1'];
      
      const { rerender, getByText, queryByText } = render(
        <ScreenErrorBoundary resetKeys={resetKeys}>
          <ThrowError shouldThrow={shouldThrow} />
        </ScreenErrorBoundary>
      );
      
      expect(getByText('Screen Error')).toBeTruthy();
      
      // Change reset keys to trigger reset
      shouldThrow = false;
      rerender(
        <ScreenErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={shouldThrow} />
        </ScreenErrorBoundary>
      );
      
      expect(queryByText('Screen Error')).toBeFalsy();
      expect(getByText('No error')).toBeTruthy();
    });
  });

  describe('Component Error Boundary', () => {
    it('renders component-level error UI', () => {
      const { getByText } = render(
        <ComponentErrorBoundary>
          <ThrowError />
        </ComponentErrorBoundary>
      );
      
      expect(getByText('Component Error')).toBeTruthy();
    });

    it('renders isolated error when isolate is true', () => {
      const { getByText } = render(
        <ComponentErrorBoundary isolate>
          <ThrowError />
        </ComponentErrorBoundary>
      );
      
      expect(getByText('Component unavailable')).toBeTruthy();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError, { level: 'component' });
      
      const { getByText } = render(<WrappedComponent />);
      
      expect(getByText('Component Error')).toBeTruthy();
    });

    it('passes props to wrapped component', () => {
      const TestComponent: React.FC<{ message: string }> = ({ message }) => (
        <Text>{message}</Text>
      );
      
      const WrappedComponent = withErrorBoundary(TestComponent);
      
      const { getByText } = render(<WrappedComponent message="Test message" />);
      
      expect(getByText('Test message')).toBeTruthy();
    });
  });

  describe('Error Recovery', () => {
    it('handles multiple errors gracefully', () => {
      const { getByText, rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(getByText('Try Again')).toBeTruthy();
      
      // Trigger retry
      fireEvent.press(getByText('Try Again'));
      
      // Render another error
      rerender(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByLabelText } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(getByLabelText('Restart App')).toBeTruthy();
    });
  });
});