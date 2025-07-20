import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

export interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animationDuration?: number;
  backgroundColor?: string;
  highlightColor?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animationDuration = 1000,
  backgroundColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue, animationDuration]);

  const animatedBackgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [backgroundColor, highlightColor],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: animatedBackgroundColor,
        },
        style,
      ]}
    />
  );
};

// Predefined skeleton components
export const SkeletonText: React.FC<{
  lines?: number;
  lineHeight?: number;
  lineSpacing?: number;
  lastLineWidth?: string;
  style?: ViewStyle;
}> = ({
  lines = 1,
  lineHeight = 16,
  lineSpacing = 8,
  lastLineWidth = '70%',
  style,
}) => (
  <View style={style}>
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonLoader
        key={index}
        height={lineHeight}
        width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        style={{ marginBottom: index < lines - 1 ? lineSpacing : 0 }}
      />
    ))}
  </View>
);

export const SkeletonCircle: React.FC<{
  size: number;
  style?: ViewStyle;
}> = ({ size, style }) => (
  <SkeletonLoader
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
  />
);

export const SkeletonCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <SkeletonCircle size={40} />
      <View style={styles.cardHeaderText}>
        <SkeletonLoader height={16} width="60%" />
        <SkeletonLoader height={12} width="40%" style={{ marginTop: 4 }} />
      </View>
    </View>
    <SkeletonText lines={3} lineHeight={14} style={{ marginTop: 16 }} />
    <View style={styles.cardFooter}>
      <SkeletonLoader height={32} width={80} borderRadius={16} />
      <SkeletonLoader height={32} width={60} borderRadius={16} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{
  itemCount?: number;
  itemHeight?: number;
  showSeparator?: boolean;
  style?: ViewStyle;
}> = ({
  itemCount = 5,
  itemHeight = 80,
  showSeparator = true,
  style,
}) => (
  <View style={style}>
    {Array.from({ length: itemCount }, (_, index) => (
      <View key={index}>
        <View style={[styles.listItem, { height: itemHeight }]}>
          <SkeletonCircle size={40} />
          <View style={styles.listItemContent}>
            <SkeletonLoader height={16} width="70%" />
            <SkeletonLoader height={12} width="50%" style={{ marginTop: 8 }} />
          </View>
          <SkeletonLoader height={12} width={60} />
        </View>
        {showSeparator && index < itemCount - 1 && (
          <View style={styles.separator} />
        )}
      </View>
    ))}
  </View>
);

export const SkeletonProfile: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => (
  <View style={[styles.profile, style]}>
    <SkeletonCircle size={80} style={{ alignSelf: 'center' }} />
    <SkeletonLoader height={20} width="60%" style={{ alignSelf: 'center', marginTop: 16 }} />
    <SkeletonLoader height={14} width="40%" style={{ alignSelf: 'center', marginTop: 8 }} />
    <View style={styles.profileStats}>
      {Array.from({ length: 3 }, (_, index) => (
        <View key={index} style={styles.profileStat}>
          <SkeletonLoader height={24} width={40} />
          <SkeletonLoader height={12} width={60} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
    <SkeletonText lines={4} lineHeight={14} style={{ marginTop: 24 }} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 68,
  },
  profile: {
    padding: 24,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  profileStat: {
    alignItems: 'center',
  },
});

export default SkeletonLoader;