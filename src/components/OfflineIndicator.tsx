import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useOffline } from '../hooks/useOffline';
import { useAccessibility } from '../hooks/useAccessibility';
import { commonAccessibilityProps } from '../utils/accessibility';
import Button from './Button';

export interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showSyncButton?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'top',
  showSyncButton = true,
  autoHide = false,
  autoHideDelay = 5000,
}) => {
  const {
    isOnline,
    isSyncing,
    pendingActions,
    forceSync,
    lastSyncTime,
  } = useOffline();

  const { announce, getAccessibleColor } = useAccessibility();
  const [isVisible, setIsVisible] = useState(!isOnline);
  const [slideAnim] = useState(new Animated.Value(isOnline ? -100 : 0));

  useEffect(() => {
    const shouldShow = !isOnline || pendingActions > 0;
    
    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
      
      // Animate in/out
      Animated.timing(slideAnim, {
        toValue: shouldShow ? 0 : (position === 'top' ? -100 : 100),
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Announce status change
      if (!isOnline) {
        announce('You are now offline. Some features may be limited.', 'high');
      } else if (pendingActions > 0) {
        announce(`You are back online. ${pendingActions} actions are pending sync.`, 'medium');
      } else {
        announce('You are back online. All data is synchronized.', 'medium');
      }
    }
  }, [isOnline, pendingActions, isVisible, slideAnim, position, announce]);

  useEffect(() => {
    if (autoHide && isVisible && isOnline && pendingActions === 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        Animated.timing(slideAnim, {
          toValue: position === 'top' ? -100 : 100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, isVisible, isOnline, pendingActions, slideAnim, position]);

  const handleSyncPress = async () => {
    try {
      await forceSync();
      announce('Sync completed successfully', 'medium');
    } catch (error) {
      announce('Sync failed. Please try again.', 'high');
    }
  };

  const getStatusText = (): string => {
    if (!isOnline) {
      return pendingActions > 0 
        ? `Offline - ${pendingActions} actions pending`
        : 'You are offline';
    }
    
    if (isSyncing) {
      return 'Syncing data...';
    }
    
    if (pendingActions > 0) {
      return `${pendingActions} actions pending sync`;
    }
    
    return 'All data synchronized';
  };

  const getStatusColor = (): string => {
    if (!isOnline) {
      return getAccessibleColor('#F44336', '#D32F2F'); // Red
    }
    
    if (isSyncing) {
      return getAccessibleColor('#FF9800', '#F57C00'); // Orange
    }
    
    if (pendingActions > 0) {
      return getAccessibleColor('#2196F3', '#1976D2'); // Blue
    }
    
    return getAccessibleColor('#4CAF50', '#388E3C'); // Green
  };

  const formatLastSyncTime = (): string => {
    if (!lastSyncTime) return '';
    
    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!isVisible && isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.topContainer : styles.bottomContainer,
        { backgroundColor: getStatusColor() },
        { transform: [{ translateY: slideAnim }] },
      ]}
      {...commonAccessibilityProps.text}
      accessibilityLabel={`Network status: ${getStatusText()}`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <View style={styles.statusSection}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? '#FFFFFF' : '#FFCDD2' },
              ]}
            />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
          
          {lastSyncTime && (
            <Text style={styles.lastSyncText}>
              Last sync: {formatLastSyncTime()}
            </Text>
          )}
        </View>

        {showSyncButton && isOnline && pendingActions > 0 && (
          <Button
            title={isSyncing ? 'Syncing...' : 'Sync Now'}
            onPress={handleSyncPress}
            disabled={isSyncing}
            loading={isSyncing}
            variant="secondary"
            size="small"
            style={styles.syncButton}
            textStyle={styles.syncButtonText}
            accessibilityLabel={`Sync ${pendingActions} pending actions`}
            accessibilityHint="Double tap to synchronize pending data"
          />
        )}
      </View>

      {/* Dismiss button for persistent indicators */}
      {!autoHide && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => {
            setIsVisible(false);
            Animated.timing(slideAnim, {
              toValue: position === 'top' ? -100 : 100,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }}
          {...commonAccessibilityProps.button}
          accessibilityLabel="Dismiss offline indicator"
          accessibilityHint="Double tap to hide this notification"
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// Compact version for minimal UI impact
export const CompactOfflineIndicator: React.FC = () => {
  const { isOnline, pendingActions } = useOffline();
  
  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <View style={styles.compactContainer}>
      <View
        style={[
          styles.compactDot,
          { backgroundColor: isOnline ? '#2196F3' : '#F44336' },
        ]}
      />
      {pendingActions > 0 && (
        <Text style={styles.compactText}>{pendingActions}</Text>
      )}
    </View>
  );
};

// Banner version for full-width notifications
export const OfflineBanner: React.FC<{
  onDismiss?: () => void;
}> = ({ onDismiss }) => {
  const { isOnline, pendingActions, isSyncing, forceSync } = useOffline();
  const { announce } = useAccessibility();

  if (isOnline && pendingActions === 0) {
    return null;
  }

  const handleSyncPress = async () => {
    try {
      await forceSync();
      announce('Sync completed', 'medium');
      onDismiss?.();
    } catch (error) {
      announce('Sync failed', 'high');
    }
  };

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerText}>
          {!isOnline 
            ? 'You are offline. Some features may be limited.'
            : `${pendingActions} actions pending sync`
          }
        </Text>
        
        {isOnline && pendingActions > 0 && (
          <Button
            title={isSyncing ? 'Syncing...' : 'Sync'}
            onPress={handleSyncPress}
            disabled={isSyncing}
            loading={isSyncing}
            variant="outline"
            size="small"
            style={styles.bannerButton}
          />
        )}
      </View>
      
      {onDismiss && (
        <TouchableOpacity
          style={styles.bannerDismiss}
          onPress={onDismiss}
          {...commonAccessibilityProps.button}
          accessibilityLabel="Dismiss notification"
        >
          <Text style={styles.bannerDismissText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  topContainer: {
    top: 0,
    paddingTop: 50, // Account for status bar
  },
  bottomContainer: {
    bottom: 0,
    paddingBottom: 20, // Account for home indicator
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusSection: {
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  lastSyncText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
    marginLeft: 16,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#FFFFFF',
    marginLeft: 12,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactText: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Banner styles
  bannerContainer: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    color: '#E65100',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  bannerButton: {
    borderColor: '#FF9800',
  },
  bannerDismiss: {
    padding: 4,
    marginLeft: 8,
  },
  bannerDismissText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OfflineIndicator;