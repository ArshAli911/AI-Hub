import React, { useState, useCallback, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { useAccessibility } from '../hooks/useAccessibility';
import { commonAccessibilityProps, accessibilityHelpers } from '../utils/accessibility';

const { width: screenWidth } = Dimensions.get('window');

export interface TabItem {
  key: string;
  title: string;
  icon?: ReactNode;
  badge?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export interface TabViewProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  children: ReactNode;
  variant?: 'default' | 'pills' | 'underline' | 'cards';
  scrollable?: boolean;
  showBadges?: boolean;
  tabBarStyle?: any;
  tabStyle?: any;
  activeTabStyle?: any;
  tabTextStyle?: any;
  activeTabTextStyle?: any;
  contentStyle?: any;
  animationType?: 'slide' | 'fade' | 'none';
  swipeEnabled?: boolean;
}

const TabView: React.FC<TabViewProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  variant = 'default',
  scrollable = false,
  showBadges = true,
  tabBarStyle,
  tabStyle,
  activeTabStyle,
  tabTextStyle,
  activeTabTextStyle,
  contentStyle,
  animationType = 'slide',
  swipeEnabled = true,
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const { announce, getAnimationDuration, getFontWeight } = useAccessibility();

  const activeIndex = tabs.findIndex(tab => tab.key === activeTab);

  const handleTabPress = useCallback(async (tab: TabItem, index: number) => {
    if (tab.disabled || tab.key === activeTab) return;

    const duration = getAnimationDuration(250);

    // Animate content change
    if (animationType === 'slide') {
      Animated.timing(slideAnim, {
        toValue: -index * screenWidth,
        duration,
        useNativeDriver: true,
      }).start();
    } else if (animationType === 'fade') {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onTabChange(tab.key);
    
    // Announce tab change
    await announce(
      `${tab.title} tab selected${tab.badge ? `, ${tab.badge} items` : ''}`,
      'medium'
    );

    // Scroll active tab into view if scrollable
    if (scrollable && scrollViewRef.current) {
      const tabWidth = screenWidth / Math.min(tabs.length, 4);
      const scrollX = Math.max(0, (index * tabWidth) - (screenWidth / 2) + (tabWidth / 2));
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [activeTab, onTabChange, announce, animationType, slideAnim, fadeAnim, getAnimationDuration, scrollable, tabs.length]);

  const renderTab = useCallback((tab: TabItem, index: number) => {
    const isActive = tab.key === activeTab;
    const isDisabled = tab.disabled;

    const tabAccessibilityProps = {
      ...commonAccessibilityProps.tab,
      accessibilityLabel: tab.accessibilityLabel || accessibilityHelpers.createButtonLabel(
        tab.title,
        isActive ? 'selected' : undefined
      ),
      accessibilityHint: isDisabled 
        ? 'Tab is disabled' 
        : `Double tap to switch to ${tab.title} tab`,
      accessibilityState: {
        selected: isActive,
        disabled: isDisabled,
      },
    };

    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tab,
          styles[`${variant}Tab`],
          tabStyle,
          isActive && styles.activeTab,
          isActive && styles[`active${variant.charAt(0).toUpperCase() + variant.slice(1)}Tab`],
          isActive && activeTabStyle,
          isDisabled && styles.disabledTab,
        ]}
        onPress={() => handleTabPress(tab, index)}
        disabled={isDisabled}
        {...tabAccessibilityProps}
      >
        <View style={styles.tabContent}>
          {tab.icon && (
            <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
              {tab.icon}
            </View>
          )}
          
          <Text
            style={[
              styles.tabText,
              styles[`${variant}TabText`],
              { fontWeight: getFontWeight('500') },
              tabTextStyle,
              isActive && styles.activeTabText,
              isActive && styles[`active${variant.charAt(0).toUpperCase() + variant.slice(1)}TabText`],
              isActive && activeTabTextStyle,
              isDisabled && styles.disabledTabText,
            ]}
          >
            {tab.title}
          </Text>

          {showBadges && tab.badge && tab.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {tab.badge > 99 ? '99+' : tab.badge.toString()}
              </Text>
            </View>
          )}
        </View>

        {variant === 'underline' && isActive && (
          <View style={styles.underline} />
        )}
      </TouchableOpacity>
    );
  }, [activeTab, variant, tabStyle, activeTabStyle, tabTextStyle, activeTabTextStyle, showBadges, handleTabPress, getFontWeight]);

  const renderTabBar = () => {
    const TabBarComponent = scrollable ? ScrollView : View;
    const tabBarProps = scrollable ? {
      ref: scrollViewRef,
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      contentContainerStyle: styles.scrollableTabBar,
    } : {};

    return (
      <TabBarComponent
        style={[
          styles.tabBar,
          styles[`${variant}TabBar`],
          tabBarStyle,
        ]}
        {...tabBarProps}
        {...commonAccessibilityProps.tablist}
        accessibilityLabel={`Tab bar with ${tabs.length} tabs`}
      >
        {tabs.map(renderTab)}
      </TabBarComponent>
    );
  };

  const renderContent = () => {
    if (animationType === 'slide') {
      return (
        <Animated.View
          style={[
            styles.slideContent,
            {
              transform: [{ translateX: slideAnim }],
              width: screenWidth * tabs.length,
            },
          ]}
        >
          {React.Children.map(children, (child, index) => (
            <View key={index} style={styles.slidePanel}>
              {child}
            </View>
          ))}
        </Animated.View>
      );
    }

    if (animationType === 'fade') {
      return (
        <Animated.View
          style={[
            styles.fadeContent,
            { opacity: fadeAnim },
          ]}
        >
          {React.Children.toArray(children)[activeIndex]}
        </Animated.View>
      );
    }

    // No animation
    return (
      <View style={styles.staticContent}>
        {React.Children.toArray(children)[activeIndex]}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderTabBar()}
      
      <View style={[styles.content, contentStyle]}>
        {renderContent()}
      </View>
    </View>
  );
};

// Swipeable Tab View with gesture support
export interface SwipeableTabViewProps extends TabViewProps {
  onSwipe?: (direction: 'left' | 'right') => void;
}

export const SwipeableTabView: React.FC<SwipeableTabViewProps> = ({
  onSwipe,
  ...props
}) => {
  // This would integrate with react-native-gesture-handler for swipe gestures
  // For now, we'll use the basic TabView
  return <TabView {...props} />;
};

// Tab Panel component for better organization
export interface TabPanelProps {
  children: ReactNode;
  tabKey: string;
  activeTab: string;
  lazy?: boolean;
  style?: any;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  tabKey,
  activeTab,
  lazy = false,
  style,
}) => {
  const isActive = tabKey === activeTab;
  const [hasBeenActive, setHasBeenActive] = useState(!lazy || isActive);

  React.useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (lazy && !hasBeenActive) {
    return null;
  }

  return (
    <View
      style={[
        styles.tabPanel,
        !isActive && styles.hiddenTabPanel,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scrollableTabBar: {
    paddingHorizontal: 16,
  },
  
  // Tab Styles
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  tabIcon: {
    marginRight: 8,
  },
  activeTabIcon: {
    // Active icon styles
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#6200EE',
    fontWeight: '600',
  },
  disabledTab: {
    opacity: 0.5,
  },
  disabledTabText: {
    color: '#CCCCCC',
  },
  
  // Badge Styles
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Variant Styles
  defaultTab: {
    // Default tab styles
  },
  defaultTabBar: {
    // Default tab bar styles
  },
  activeDefaultTab: {
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
  },
  
  pillsTab: {
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  pillsTabBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activePillsTab: {
    backgroundColor: '#6200EE',
  },
  pillsTabText: {
    fontSize: 14,
  },
  activePillsTabText: {
    color: '#FFFFFF',
  },
  
  underlineTab: {
    position: 'relative',
  },
  underlineTabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6200EE',
  },
  
  cardsTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardsTabBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
  },
  activeCardsTab: {
    backgroundColor: '#6200EE',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cardsTabText: {
    fontSize: 14,
  },
  activeCardsTabText: {
    color: '#FFFFFF',
  },
  
  // Content Styles
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  slideContent: {
    flexDirection: 'row',
    height: '100%',
  },
  slidePanel: {
    width: screenWidth,
    flex: 1,
  },
  fadeContent: {
    flex: 1,
  },
  staticContent: {
    flex: 1,
  },
  
  // Tab Panel Styles
  tabPanel: {
    flex: 1,
  },
  hiddenTabPanel: {
    position: 'absolute',
    top: -9999,
    left: -9999,
  },
});

export default TabView;