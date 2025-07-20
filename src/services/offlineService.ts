import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '../api/client';
import { logger } from '../utils/logger';

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncTime?: number;
  syncErrors: string[];
}

class OfflineService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private pendingActions: OfflineAction[] = [];
  private cachedData: Map<string, OfflineData> = new Map();
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private readonly STORAGE_KEYS = {
    PENDING_ACTIONS: '@offline_pending_actions',
    CACHED_DATA: '@offline_cached_data',
    LAST_SYNC: '@offline_last_sync',
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load pending actions from storage
      await this.loadPendingActions();
      
      // Load cached data from storage
      await this.loadCachedData();
      
      // Set up network listener
      this.setupNetworkListener();
      
      // Initial sync if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.handleNetworkChange(true);
      }
      
      logger.info('OfflineService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OfflineService', error);
    }
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        // Just came online
        this.handleNetworkChange(true);
      } else if (wasOnline && !this.isOnline) {
        // Just went offline
        this.handleNetworkChange(false);
      }
    });
  }

  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    logger.info(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    if (isOnline && this.pendingActions.length > 0) {
      // Sync pending actions when coming online
      await this.syncPendingActions();
    }
    
    this.notifyListeners();
  }

  private async loadPendingActions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PENDING_ACTIONS);
      if (stored) {
        this.pendingActions = JSON.parse(stored);
        logger.debug(`Loaded ${this.pendingActions.length} pending actions`);
      }
    } catch (error) {
      logger.error('Failed to load pending actions', error);
    }
  }

  private async savePendingActions(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PENDING_ACTIONS,
        JSON.stringify(this.pendingActions)
      );
    } catch (error) {
      logger.error('Failed to save pending actions', error);
    }
  }

  private async loadCachedData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CACHED_DATA);
      if (stored) {
        const data = JSON.parse(stored);
        this.cachedData = new Map(Object.entries(data));
        logger.debug(`Loaded ${this.cachedData.size} cached items`);
      }
    } catch (error) {
      logger.error('Failed to load cached data', error);
    }
  }

  private async saveCachedData(): Promise<void> {
    try {
      const data = Object.fromEntries(this.cachedData);
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CACHED_DATA,
        JSON.stringify(data)
      );
    } catch (error) {
      logger.error('Failed to save cached data', error);
    }
  }

  /**
   * Queue an action for offline execution
   */
  async queueAction(
    type: OfflineAction['type'],
    endpoint: string,
    data?: any,
    maxRetries: number = 3
  ): Promise<string> {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.pendingActions.push(action);
    await this.savePendingActions();
    
    logger.info(`Queued offline action: ${type} ${endpoint}`);
    this.notifyListeners();

    // Try to execute immediately if online
    if (this.isOnline) {
      await this.syncPendingActions();
    }

    return action.id;
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    const cacheItem: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    this.cachedData.set(key, cacheItem);
    await this.saveCachedData();
    
    logger.debug(`Cached data for key: ${key}`);
  }

  /**
   * Get cached data
   */
  getCachedData<T>(key: string): T | null {
    const cached = this.cachedData.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.cachedData.delete(key);
      this.saveCachedData();
      return null;
    }

    return cached.data as T;
  }

  /**
   * Clear cached data
   */
  async clearCache(key?: string): Promise<void> {
    if (key) {
      this.cachedData.delete(key);
    } else {
      this.cachedData.clear();
    }
    
    await this.saveCachedData();
    logger.info(key ? `Cleared cache for: ${key}` : 'Cleared all cache');
  }

  /**
   * Sync pending actions with server
   */
  private async syncPendingActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.pendingActions.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners();

    logger.info(`Starting sync of ${this.pendingActions.length} pending actions`);

    const actionsToSync = [...this.pendingActions];
    const syncErrors: string[] = [];

    for (const action of actionsToSync) {
      try {
        await this.executeAction(action);
        
        // Remove successful action
        this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
        logger.debug(`Successfully synced action: ${action.type} ${action.endpoint}`);
        
      } catch (error) {
        action.retryCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (action.retryCount >= action.maxRetries) {
          // Remove failed action after max retries
          this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
          syncErrors.push(`Failed to sync ${action.type} ${action.endpoint}: ${errorMessage}`);
          logger.error(`Action failed after ${action.maxRetries} retries`, error);
        } else {
          logger.warn(`Action retry ${action.retryCount}/${action.maxRetries}`, error);
        }
      }
    }

    await this.savePendingActions();
    await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, Date.now().toString());

    this.syncInProgress = false;
    this.notifyListeners();

    if (syncErrors.length > 0) {
      logger.error('Sync completed with errors', { errors: syncErrors });
    } else {
      logger.info('Sync completed successfully');
    }
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        await apiClient.post(action.endpoint, action.data);
        break;
      case 'UPDATE':
        await apiClient.put(action.endpoint, action.data);
        break;
      case 'DELETE':
        await apiClient.delete(action.endpoint);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress,
      pendingActions: this.pendingActions.length,
      lastSyncTime: this.getLastSyncTime(),
      syncErrors: [],
    };
  }

  private async getLastSyncTime(): Promise<number | undefined> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      return stored ? parseInt(stored, 10) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Error in sync status listener', error);
      }
    });
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingActions();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Check if device is online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get pending actions count
   */
  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  /**
   * Clear all offline data
   */
  async clearAllOfflineData(): Promise<void> {
    this.pendingActions = [];
    this.cachedData.clear();
    
    await Promise.all([
      AsyncStorage.removeItem(this.STORAGE_KEYS.PENDING_ACTIONS),
      AsyncStorage.removeItem(this.STORAGE_KEYS.CACHED_DATA),
      AsyncStorage.removeItem(this.STORAGE_KEYS.LAST_SYNC),
    ]);
    
    logger.info('Cleared all offline data');
    this.notifyListeners();
  }
}

export const offlineService = new OfflineService();
export default offlineService;