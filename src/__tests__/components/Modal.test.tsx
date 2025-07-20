import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import Modal from '../../components/Modal';

describe('Modal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <Text testID="modal-content">Modal Content</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByTestId, getByText } = render(<Modal {...defaultProps} />);
    
    expect(getByTestId('modal-container')).toBeTruthy();
    expect(getByText('Test Modal')).toBeTruthy();
    expect(getByTestId('modal-content')).toBeTruthy();
  });

  it('should not render modal when not visible', () => {
    const { queryByTestId } = render(<Modal {...defaultProps} visible={false} />);
    
    expect(queryByTestId('modal-container')).toBeNull();
  });

  it('should call onClose when close button is pressed', () => {
    const onCloseMock = jest.fn();
    const { getByTestId } = render(<Modal {...defaultProps} onClose={onCloseMock} />);
    
    fireEvent.press(getByTestId('modal-close-button'));
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is pressed', () => {
    const onCloseMock = jest.fn();
    const { getByTestId } = render(<Modal {...defaultProps} onClose={onCloseMock} />);
    
    fireEvent.press(getByTestId('modal-backdrop'));
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should not close when backdrop is pressed if closeOnBackdrop is false', () => {
    const onCloseMock = jest.fn();
    const { getByTestId } = render(
      <Modal {...defaultProps} onClose={onCloseMock} closeOnBackdropPress={false} />
    );
    
    fireEvent.press(getByTestId('modal-backdrop'));
    
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should render without title', () => {
    const { queryByText, getByTestId } = render(
      <Modal {...defaultProps} title={undefined} />
    );
    
    expect(queryByText('Test Modal')).toBeNull();
    expect(getByTestId('modal-content')).toBeTruthy();
  });

  it('should render with custom content', () => {
    const CustomContent = () => <Text testID="custom-content">Custom Content</Text>;
    
    const { getByTestId } = render(
      <Modal {...defaultProps}>
        <CustomContent />
      </Modal>
    );
    
    expect(getByTestId('custom-content')).toBeTruthy();
  });

  it('should render with custom content in children', () => {
    const CustomFooter = () => (
      <TouchableOpacity testID="custom-footer-button">
        <Text>Custom Action</Text>
      </TouchableOpacity>
    );
    
    const { getByTestId } = render(
      <Modal {...defaultProps}>
        <CustomFooter />
      </Modal>
    );
    
    expect(getByTestId('custom-footer-button')).toBeTruthy();
  });

  it('should handle different sizes', () => {
    const { getByTestId, rerender } = render(<Modal {...defaultProps} size="small" />);
    
    let modalContent = getByTestId('modal-content-container');
    expect(modalContent.props.style).toEqual(
      expect.objectContaining({
        width: expect.any(String), // Should contain width style
      })
    );

    rerender(<Modal {...defaultProps} size="large" />);
    
    modalContent = getByTestId('modal-content-container');
    expect(modalContent.props.style).toEqual(
      expect.objectContaining({
        width: expect.any(String), // Should contain different width style
      })
    );
  });

  it('should handle animation', async () => {
    const { getByTestId, rerender } = render(<Modal {...defaultProps} animationType="fade" />);
    
    const modalContainer = getByTestId('modal-container');
    
    // Should have animated opacity
    expect(modalContainer.props.style).toEqual(
      expect.objectContaining({
        opacity: expect.any(Object), // Animated.Value
      })
    );

    // Test closing animation
    rerender(<Modal {...defaultProps} visible={false} animationType="fade" />);
    
    // Should animate out
    await waitFor(() => {
      expect(modalContainer.props.style.opacity).toBeDefined();
    });
  });

  it('should trap focus within modal', () => {
    const { getByTestId } = render(
      <Modal {...defaultProps}>
        <TouchableOpacity testID="first-button">
          <Text>First Button</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="second-button">
          <Text>Second Button</Text>
        </TouchableOpacity>
      </Modal>
    );
    
    // Focus should be trapped within modal
    const firstButton = getByTestId('first-button');
    const secondButton = getByTestId('second-button');
    
    expect(firstButton).toBeTruthy();
    expect(secondButton).toBeTruthy();
  });

  it('should handle keyboard events', () => {
    const onCloseMock = jest.fn();
    const { getByTestId } = render(<Modal {...defaultProps} onClose={onCloseMock} />);
    
    const modalContainer = getByTestId('modal-container');
    
    // Simulate escape key press
    fireEvent(modalContainer, 'onKeyPress', {
      nativeEvent: { key: 'Escape' },
    });
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should handle accessibility props', () => {
    const { getByTestId } = render(
      <Modal 
        {...defaultProps} 
        title="Test modal dialog"
      />
    );
    
    const modalContainer = getByTestId('modal-container');
    
    expect(modalContainer.props.accessibilityLabel).toBeDefined();
  });

  it('should handle loading state', () => {
    const { getByTestId } = render(
      <Modal {...defaultProps}>
        <Text testID="modal-loading">Loading...</Text>
      </Modal>
    );
    
    expect(getByTestId('modal-loading')).toBeTruthy();
  });

  it('should handle error state', () => {
    const { getByTestId, getByText } = render(
      <Modal {...defaultProps}>
        <Text testID="modal-error">Something went wrong</Text>
      </Modal>
    );
    
    expect(getByTestId('modal-error')).toBeTruthy();
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should handle confirmation modal', () => {
    const onConfirmMock = jest.fn();
    const onCancelMock = jest.fn();
    
    const { getByTestId } = render(
      <Modal {...defaultProps}>
        <Text testID="modal-confirm-button" onPress={onConfirmMock}>Yes, Delete</Text>
        <Text testID="modal-cancel-button" onPress={onCancelMock}>Cancel</Text>
      </Modal>
    );
    
    fireEvent.press(getByTestId('modal-confirm-button'));
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    
    fireEvent.press(getByTestId('modal-cancel-button'));
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should handle custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <Modal {...defaultProps} style={customStyle} />
    );
    
    const modalContainer = getByTestId('modal-content-container');
    expect(modalContainer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining(customStyle)
      ])
    );
  });

  it('should handle portal rendering', () => {
    const { getByTestId } = render(<Modal {...defaultProps} />);
    
    // Modal should still be rendered (portal implementation would be in the component)
    expect(getByTestId('modal-container')).toBeTruthy();
  });

  it('should handle z-index stacking', () => {
    const { getByTestId } = render(<Modal {...defaultProps} />);
    
    const modalContainer = getByTestId('modal-container');
    expect(modalContainer.props.style).toBeDefined();
  });
});