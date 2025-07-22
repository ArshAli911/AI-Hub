import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

// Mock NetInfo for environments where it's not available
const mockNetInfo = {
  addEventListener: (callback: (state: any) => void) => {
    // Simulate online state
    setTimeout(() => callback({ isConnected: true, isInternetReachable: true }), 100);
    return () => {}; // Unsubscribe function
  }
};

// Try to import NetInfo, fallback to mock if not available
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  NetInfo = mockNetInfo;
}

// Mock AsyncStorage for environments where it's not available
const mockAsyncStorage = {
  getItem: async (key: string) => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
  getAllKeys: async () => {
    if (typeof localStorage !== 'undefined') {
      return Object.keys(localStorage);
    }
    return [];
  },
  multiRemove: async (keys: string[]) => {
    if (typeof localStorage !== 'undefined') {
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
};

let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  AsyncStorage = mockAsyncStorage;
}

export interface OfflineAction {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

export interface UseOfflineReturn {
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime: number | null;
  connectionType?: string;
  queueAction: (method: string, url: string, data?: any) => Promise<string>;
  forceSync: () => Promise<void>;
  getCachedData: <T>(key: string) => T | null;
  cacheData: (key: string, data: any, ttl?: number) => Promise<void>;
  clearCache: () => Promise<void>;
}

const OFFLINE_ACTIONS_KEY = '@offline_actions';
const CACHE_PREFIX = '@cache_';
const MAX_RETRY_COUNT = 3;

export const useOffline = (): UseOfflineReturn => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [connectionType, setConnectionType] = useState<string | undefined>(undefined);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online ?? false);
      
      if (online && pendingActions > 0) {
        // Auto-sync when coming back online
        forceSync();
      }
    });

    return unsubscribe;
  }, [pendingActions]);

  // Load pending actions count on mount
  useEffect(() => {
    loadPendingActionsCount();
  }, []);

  const loadPendingActionsCount = async () => {
    try {
      const actionsJson = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (actionsJson) {
        const actions: OfflineAction[] = JSON.parse(actionsJson);
        setPendingActions(actions.length);
      }
    } catch (error) {
      logger.error('Failed to load pending actions count', error);
    }
  };

  const queueAction = useCallback(async (
    method: string,
    url: string,
    data?: any
  ): Promise<string> => {
    try {
      const action: OfflineAction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        method: method.toUpperCase() as OfflineAction['method'],
        url,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };

      // Load existing actions
      const actionsJson = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      const actions: OfflineAction[] = actionsJson ? JSON.parse(actionsJson) : [];
      
      // Add new action
      actions.push(action);
      
      // Save updated actions
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
      setPendingActions(actions.length);
      
      logger.info('Action queued for offline sync', { action });
      return action.id;
    } catch (error) {
      logger.error('Failed to queue offline action', error);
      throw error;
    }
  }, []);

  const forceSync = useCallback(async (): Promise<void> => {
    if (!isOnline || isSyncing) {
      return;
    }

    setIsSyncing(true);
    
    try {
      // Call the correct method name in offlineService
      await offlineService.forcSync();
    } catch (error) {
      logger.error('Force sync failed', error);
    } finally {
      setIsSyncing(false);
    }
    
    try {
      const actionsJson = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (!actionsJson) {
        setLastSyncTime(Date.now());
        return;
      }

      const actions: OfflineAction[] = JSON.parse(actionsJson);
      const successfulActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      for (const action of actions) {
        try {
          // Simulate API call - replace with actual API client
          await simulateApiCall(action);
          successfulActions.push(action.id);
          logger.info('Offline action synced successfully', { actionId: action.id });
        } catch (error) {
          action.retryCount++;
          
          if (action.retryCount < MAX_RETRY_COUNT) {
            failedActions.push(action);
            logger.warn('Offline action failed, will retry', { 
              actionId: action.id, 
              retryCount: action.retryCount 
            });
          } else {
            logger.error('Offline action failed permanently', { 
              actionId: action.id, 
              error 
            });
          }
        }
      }

      // Update pending actions
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(failedActions));
      setPendingActions(failedActions.length);
      setLastSyncTime(Date.now());
      
      logger.info('Offline sync completed', {
        successful: successfulActions.length,
        failed: failedActions.length,
      });
    } catch (error) {
      logger.error('Offline sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  const getCachedData = useCallback(<T>(key: string): T | null => {
    try {
      const cachedJson = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cachedJson) return null;

      const cached = JSON.parse(cachedJson);
      
      // Check TTL
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return cached.data as T;
    } catch (error) {
      logger.error('Failed to get cached data', error, { key });
      return null;
    }
  }, []);

  const cacheData = useCallback(async (
    key: string,
    data: any,
    ttl: number = 3600000 // 1 hour default
  ): Promise<void> => {
    try {
      const cached = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
      } else {
        // Fallback to AsyncStorage for React Native
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
      }
    } catch (error) {
      logger.error('Failed to cache data', error, { key });
    }
  }, []);

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      if (typeof localStorage !== 'undefined') {
        // Web environment
        const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX));
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        // React Native environment
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    pendingActions,
    lastSyncTime,
    connectionType,
    queueAction,
    forceSync,
    getCachedData,
    cacheData,
    clearCache,
  };
};

// Simulate API call for demo purposes
const simulateApiCall = async (action: OfflineAction): Promise<void> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Simulate occasional failures
  if (Math.random() < 0.1) {
    throw new Error('Simulated network error');
  }
  
  logger.debug('Simulated API call completed', { action });
};

export default useOffline;