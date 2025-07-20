import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle, Animated } from 'react-native';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: ViewStyle;
  testID?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  duration?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#6200EE',
  text,
  overlay = false,
  style,
  testID = 'loading-spinner',
  variant = 'spinner',
  duration = 1000,
}) => {
  const containerStyle = overlay ? styles.overlay : styles.container;
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant === 'pulse') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animatedValue, duration, variant]);

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader color={color} size={size} />;
      case 'pulse':
        return (
          <Animated.View
            style={[
              styles.pulseLoader,
              {
                opacity: animatedValue,
                backgroundColor: color,
                width: size === 'large' ? 40 : 24,
                height: size === 'large' ? 40 : 24,
              },
            ]}
          />
        );
      case 'spinner':
      default:
        return <ActivityIndicator size={size} color={color} />;
    }
  };

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {renderLoader()}
      {text && <Text style={[styles.text, { color }]}>{text}</Text>}
    </View>
  );
};

const DotsLoader: React.FC<{ color: string; size: 'small' | 'large' }> = ({ color, size }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animatedValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );

    const animation1 = createAnimation(dot1, 0);
    const animation2 = createAnimation(dot2, 150);
    const animation3 = createAnimation(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotSize = size === 'large' ? 8 : 6;
  const dotStyle = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
    backgroundColor: color,
    marginHorizontal: 2,
  };

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[dotStyle, { opacity: dot1 }]} />
      <Animated.View style={[dotStyle, { opacity: dot2 }]} />
      <Animated.View style={[dotStyle, { opacity: dot3 }]} />
    </View>
  );
};

// Loading state component for full screen
export const FullScreenLoader: React.FC<{
  text?: string;
  variant?: LoadingSpinnerProps['variant'];
}> = ({ text = 'Loading...', variant = 'spinner' }) => (
  <View style={styles.fullScreen}>
    <LoadingSpinner
      size="large"
      text={text}
      variant={variant}
      color="#6200EE"
    />
  </View>
);

// Loading state component for inline content
export const InlineLoader: React.FC<{
  text?: string;
  size?: 'small' | 'large';
}> = ({ text, size = 'small' }) => (
  <View style={styles.inline}>
    <LoadingSpinner
      size={size}
      text={text}
      color="#6200EE"
    />
  </View>
);

// Loading state component for buttons
export const ButtonLoader: React.FC<{
  color?: string;
}> = ({ color = '#FFFFFF' }) => (
  <ActivityIndicator size="small" color={color} />
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseLoader: {
    borderRadius: 20,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inline: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default LoadingSpinner;