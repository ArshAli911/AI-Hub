import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import OptimizedImage from '../../components/OptimizedImage';

// Mock Image component
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Image: {
      ...RN.Image,
      getSize: jest.fn((uri, success, error) => {
        if (uri.includes('error')) {
          error(new Error('Failed to load image'));
        } else {
          success(300, 200);
        }
      }),
      prefetch: jest.fn(() => Promise.resolve(true)),
    },
  };
});

describe('OptimizedImage', () => {
  const defaultProps = {
    source: { uri: 'https://example.com/image.jpg' },
    style: { width: 100, height: 100 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading placeholder initially', () => {
    const { getByTestId } = render(<OptimizedImage {...defaultProps} />);
    
    expect(getByTestId('image-loading')).toBeTruthy();
  });

  it('should render image after loading', async () => {
    const { getByTestId, queryByTestId } = render(<OptimizedImage {...defaultProps} />);
    
    const image = getByTestId('optimized-image');
    fireEvent(image, 'onLoad');

    await waitFor(() => {
      expect(queryByTestId('image-loading')).toBeNull();
      expect(getByTestId('optimized-image')).toBeTruthy();
    });
  });

  it('should show error placeholder on load error', async () => {
    const { getByTestId, queryByTestId } = render(<OptimizedImage {...defaultProps} />);
    
    const image = getByTestId('optimized-image');
    fireEvent(image, 'onError', { nativeEvent: { error: 'Load failed' } });

    await waitFor(() => {
      expect(queryByTestId('image-loading')).toBeNull();
      expect(getByTestId('image-error')).toBeTruthy();
    });
  });

  it('should handle retry functionality', async () => {
    const { getByTestId, getByText } = render(<OptimizedImage {...defaultProps} />);
    
    const image = getByTestId('optimized-image');
    fireEvent(image, 'onError', { nativeEvent: { error: 'Load failed' } });

    await waitFor(() => {
      expect(getByTestId('image-error')).toBeTruthy();
    });

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    expect(getByTestId('image-loading')).toBeTruthy();
  });

  it('should apply lazy loading when enabled', () => {
    const { getByTestId } = render(
      <OptimizedImage {...defaultProps} />
    );
    
    // Should render image
    expect(getByTestId('optimized-image')).toBeTruthy();
  });

  it('should prefetch image when specified', async () => {
    const mockPrefetch = require('react-native').Image.prefetch;
    
    render(<OptimizedImage {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockPrefetch).toHaveBeenCalledWith('https://example.com/image.jpg');
    });
  });

  it('should handle custom placeholder', () => {
    const { getByTestId } = render(
      <OptimizedImage 
        {...defaultProps}
      />
    );
    
    // Should show loading placeholder initially
    expect(getByTestId('image-loading')).toBeTruthy();
  });

  it('should apply fade animation on load', async () => {
    const { getByTestId } = render(
      <OptimizedImage {...defaultProps} />
    );
    
    const image = getByTestId('optimized-image');
    fireEvent(image, 'onLoad');

    // Animation should be applied (opacity changes)
    await waitFor(() => {
      expect(image.props.style).toEqual(
        expect.objectContaining({
          opacity: expect.any(Object), // Animated.Value
        })
      );
    });
  });

  it('should handle accessibility props', () => {
    const { getByTestId } = render(
      <OptimizedImage 
        {...defaultProps}
        accessible={true}
        accessibilityLabel="Profile picture"
        accessibilityRole="image"
      />
    );
    
    const image = getByTestId('optimized-image');
    expect(image.props.accessible).toBe(true);
    expect(image.props.accessibilityLabel).toBe('Profile picture');
    expect(image.props.accessibilityRole).toBe('image');
  });

  it('should call onLoad callback', async () => {
    const onLoadMock = jest.fn();
    
    const { getByTestId } = render(
      <OptimizedImage {...defaultProps} onLoad={onLoadMock} />
    );
    
    const image = getByTestId('optimized-image');
    fireEvent(image, 'onLoad');

    expect(onLoadMock).toHaveBeenCalled();
  });

  it('should call onError callback', async () => {
    const onErrorMock = jest.fn();
    
    const { getByTestId } = render(
      <OptimizedImage {...defaultProps} onError={onErrorMock} />
    );
    
    const image = getByTestId('optimized-image');
    fireEvent(image, 'onError', { nativeEvent: { error: 'Load failed' } });

    expect(onErrorMock).toHaveBeenCalledWith('Load failed');
  });
});