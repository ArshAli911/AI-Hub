import React, { useEffect, useRef, useState, ReactNode } from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  BackHandler,
  StatusBar,
  Platform,
} from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { commonAccessibilityProps } from '../utils/accessibility';
import Button from './Button';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  position?: 'center' | 'bottom' | 'top';
  animationType?: 'slide' | 'fade' | 'scale';
  closeOnBackdropPress?: boolean;
  closeOnBackButton?: boolean;
  showCloseButton?: boolean;
  backdrop?: boolean;
  backdropOpacity?: number;
  style?: any;
  contentStyle?: any;
  overlayStyle?: any;
  onShow?: () => void;
  onHide?: () => void;
  testID?: string;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  title,
  size = 'medium',
  position = 'center',
  animationType = 'fade',
  closeOnBackdropPress = true,
  closeOnBackButton = true,
  showCloseButton = true,
  backdrop = true,
  backdropOpacity = 0.5,
  style,
  contentStyle,
  overlayStyle,
  onShow,
  onHide,
  testID = 'modal',
}) => {
  const [modalVisible, setModalVisible] = useState(visible);
  const [contentVisible, setContentVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(getInitialSlideValue())).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  const { announce, getAnimationDuration, setFocus } = useAccessibility();
  const closeButtonRef = useRef<any>(null);

  function getInitialSlideValue(): number {
    switch (position) {
      case 'top':
        return -screenHeight;
      case 'bottom':
        return screenHeight;
      case 'center':
      default:
        return screenHeight;
    }
  }

  // Handle back button on Android
  useEffect(() => {
    if (!closeOnBackButton) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, closeOnBackButton, onClose]);

  // Handle modal visibility changes
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      showModal();
    } else {
      hideModal();
    }
  }, [visible]);

  const showModal = async () => {
    const duration = getAnimationDuration(300);
    
    // Reset animation values
    fadeAnim.setValue(0);
    slideAnim.setValue(getInitialSlideValue());
    scaleAnim.setValue(0.8);
    
    setContentVisible(true);
    
    // Animate in
    const animations = [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ];

    if (animationType === 'slide') {
      animations.push(
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      );
    } else if (animationType === 'scale') {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start(() => {
      onShow?.();
      
      // Announce modal opening and set focus
      announce(`Modal opened${title ? `: ${title}` : ''}`, 'medium');
      
      // Set focus to close button or first focusable element
      setTimeout(() => {
        if (showCloseButton && closeButtonRef.current) {
          setFocus(closeButtonRef);
        }
      }, 100);
    });
  };

  const hideModal = async () => {
    const duration = getAnimationDuration(250);
    
    const animations = [
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ];

    if (animationType === 'slide') {
      animations.push(
        Animated.timing(slideAnim, {
          toValue: getInitialSlideValue(),
          duration,
          useNativeDriver: true,
        })
      );
    } else if (animationType === 'scale') {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start(() => {
      setContentVisible(false);
      setModalVisible(false);
      onHide?.();
      announce('Modal closed', 'low');
    });
  };

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const getModalSize = () => {
    switch (size) {
      case 'small':
        return { width: Math.min(screenWidth * 0.8, 300), maxHeight: screenHeight * 0.6 };
      case 'medium':
        return { width: Math.min(screenWidth * 0.9, 400), maxHeight: screenHeight * 0.8 };
      case 'large':
        return { width: Math.min(screenWidth * 0.95, 600), maxHeight: screenHeight * 0.9 };
      case 'fullscreen':
        return { width: screenWidth, height: screenHeight };
      default:
        return { width: Math.min(screenWidth * 0.9, 400), maxHeight: screenHeight * 0.8 };
    }
  };

  const getModalPosition = () => {
    const modalSize = getModalSize();
    
    switch (position) {
      case 'top':
        return {
          justifyContent: 'flex-start',
          paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
        };
      case 'bottom':
        return {
          justifyContent: 'flex-end',
          paddingBottom: Platform.OS === 'ios' ? 34 : 0,
        };
      case 'center':
      default:
        return {
          justifyContent: 'center',
          alignItems: 'center',
        };
    }
  };

  const getContentTransform = () => {
    const transforms = [];
    
    if (animationType === 'slide') {
      transforms.push({ translateY: slideAnim });
    } else if (animationType === 'scale') {
      transforms.push({ scale: scaleAnim });
    }
    
    return transforms;
  };

  if (!modalVisible) {
    return null;
  }

  return (
    <RNModal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={[styles.overlay, getModalPosition(), overlayStyle]}>
        {/* Backdrop */}
        {backdrop && (
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <Animated.View
              style={[
                styles.backdrop,
                {
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, backdropOpacity],
                  }),
                },
              ]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* Modal Content */}
        {contentVisible && (
          <Animated.View
            style={[
              styles.modal,
              getModalSize(),
              {
                opacity: fadeAnim,
                transform: getContentTransform(),
              },
              style,
            ]}
            {...commonAccessibilityProps.text}
            accessibilityRole="dialog"
            accessibilityLabel={title || 'Modal dialog'}
            accessibilityModal={true}
          >
            <View style={[styles.content, contentStyle]}>
              {/* Close Button */}
              {showCloseButton && (
                <TouchableOpacity
                  ref={closeButtonRef}
                  style={styles.closeButton}
                  onPress={onClose}
                  {...commonAccessibilityProps.button}
                  accessibilityLabel="Close modal"
                  accessibilityHint="Double tap to close this dialog"
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              )}

              {/* Modal Content */}
              {children}
            </View>
          </Animated.View>
        )}
      </View>
    </RNModal>
  );
};

// Confirmation Modal
export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  loading = false,
}) => {
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      size="small"
      title={title}
      showCloseButton={false}
    >
      <View style={styles.confirmationContent}>
        <Text style={styles.confirmationTitle}>{title}</Text>
        <Text style={styles.confirmationMessage}>{message}</Text>
        
        <View style={styles.confirmationActions}>
          <Button
            title={cancelText}
            onPress={onCancel}
            variant="secondary"
            style={styles.confirmationButton}
            disabled={loading}
          />
          <Button
            title={confirmText}
            onPress={onConfirm}
            variant={confirmVariant}
            style={styles.confirmationButton}
            loading={loading}
            disabled={loading}
          />
        </View>
      </View>
    </Modal>
  );
};

// Bottom Sheet Modal
export interface BottomSheetModalProps extends Omit<ModalProps, 'position' | 'animationType'> {
  snapPoints?: number[];
  initialSnapPoint?: number;
  onSnapPointChange?: (index: number) => void;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  snapPoints = [0.5, 0.9],
  initialSnapPoint = 0,
  onSnapPointChange,
  ...modalProps
}) => {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint);
  
  const handleSnapPointChange = (index: number) => {
    setCurrentSnapPoint(index);
    onSnapPointChange?.(index);
  };

  return (
    <Modal
      {...modalProps}
      position="bottom"
      animationType="slide"
      style={[
        styles.bottomSheet,
        { height: screenHeight * snapPoints[currentSnapPoint] },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  
  // Confirmation Modal Styles
  confirmationContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
  },
  
  // Bottom Sheet Styles
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});

export default Modal;