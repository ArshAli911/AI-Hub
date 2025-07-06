import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import apiClient from '../api/client';
import firebaseAuthService from './firebaseService';

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  params?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  conflictResolution: 'server-wins' | 'client-wins' | 'manual';
  syncOnConnect: boolean;
  syncOnAppStart: boolean;
}

export interface DataCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  version: number;
  etag?: string;
}

export interface ConflictData {
  id: string;
  key: string;
  serverData: any;
  localData: any;
  timestamp: number;
  resolved: boolean;
  resolution?: 'server' | 'client' | 'merge';
}

class OfflineService {
  private actionQueue: OfflineAction[] = [];
  private dataCache: Map<string, DataCache> = new Map();
  private conflicts: Map<string, ConflictData> = new Map();
  private isOnline = true;
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private config: SyncConfig = {
    enabled: true,
    autoSync: true,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 5000,
    conflictResolution: 'server-wins',
    syncOnConnect: true,
    syncOnAppStart: true
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize offline service
   */
  private async initialize(): Promise<void> {
    try {
      // Load configuration
      await this.loadConfig();
      
      // Load cached data
      await this.loadCache();
      
      // Load action queue
      await this.loadActionQueue();
      
      // Load conflicts
      await this.loadConflicts();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Set up auto-sync
      if (this.config.autoSync) {
        this.startAutoSync();
      }
      
      // Initial sync if online
      if (this.isOnline && this.config.syncOnAppStart) {
        this.sync();
      }
    } catch (error) {
      console.error('Error initializing offline service:', error);
    }
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline && this.config.syncOnConnect) {
        this.sync();
      }
    });
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop auto-sync timer
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Add action to offline queue
   */
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    try {
      const offlineAction: OfflineAction = {
        ...action,
        id: this.generateActionId(),
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };

      this.actionQueue.push(offlineAction);
      await this.saveActionQueue();

      // Process immediately if online
      if (this.isOnline && !this.isSyncing) {
        this.processQueue();
      }

      return offlineAction.id;
    } catch (error) {
      console.error('Error queuing action:', error);
      throw error;
    }
  }

  /**
   * Process the action queue
   */
  private async processQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;

    try {
      const actions = [...this.actionQueue].sort((a, b) => {
        // Sort by priority, then by timestamp
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });

      for (const action of actions) {
        if (action.status === 'pending' || action.status === 'failed') {
          await this.processAction(action);
        }
      }

      // Clean up completed actions
      this.actionQueue = this.actionQueue.filter(action => action.status !== 'completed');
      await this.saveActionQueue();

    } catch (error) {
      console.error('Error processing action queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single action
   */
  private async processAction(action: OfflineAction): Promise<void> {
    try {
      action.status = 'processing';
      await this.saveActionQueue();

      const response = await this.executeAction(action);
      
      action.status = 'completed';
      action.result = response;
      action.retryCount = 0;

    } catch (error) {
      console.error('Error processing action:', action.id, error);
      
      action.status = 'failed';
      action.error = error instanceof Error ? error.message : 'Unknown error';
      action.retryCount++;

      if (action.retryCount >= action.maxRetries) {
        console.error('Action failed after max retries:', action.id);
      }
    }

    await this.saveActionQueue();
  }

  /**
   * Execute an action
   */
  private async executeAction(action: OfflineAction): Promise<any> {
    const { endpoint, method, data, params, headers } = action;

    switch (method) {
      case 'GET':
        return await apiClient.get(endpoint, { params, headers });
      case 'POST':
        return await apiClient.post(endpoint, data, { headers });
      case 'PUT':
        return await apiClient.put(endpoint, data, { headers });
      case 'PATCH':
        return await apiClient.patch(endpoint, data, { headers });
      case 'DELETE':
        return await apiClient.delete(endpoint, { headers });
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
    try {
      const cacheEntry: DataCache = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        version: 1
      };

      this.dataCache.set(key, cacheEntry);
      await this.saveCache();
    } catch (error) {
      console.error('Error caching data:', error);
      throw error;
    }
  }

  /**
   * Get cached data
   */
  async getCachedData(key: string): Promise<any | null> {
    try {
      const cacheEntry = this.dataCache.get(key);
      
      if (!cacheEntry) {
        return null;
      }

      // Check if cache is expired
      if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
        this.dataCache.delete(key);
        await this.saveCache();
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Clear cached data
   */
  async clearCache(key?: string): Promise<void> {
    try {
      if (key) {
        this.dataCache.delete(key);
      } else {
        this.dataCache.clear();
      }
      await this.saveCache();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Sync data with server
   */
  async sync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;

    try {
      // Process action queue
      await this.processQueue();
      
      // Sync cached data
      await this.syncCache();
      
      // Resolve conflicts
      await this.resolveConflicts();
      
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync cache with server
   */
  private async syncCache(): Promise<void> {
    try {
      for (const [key, cacheEntry] of this.dataCache) {
        // Check if data needs to be synced
        if (this.shouldSyncData(key, cacheEntry)) {
          await this.syncData(key, cacheEntry);
        }
      }
    } catch (error) {
      console.error('Error syncing cache:', error);
    }
  }

  /**
   * Check if data should be synced
   */
  private shouldSyncData(key: string, cacheEntry: DataCache): boolean {
    // Add your sync logic here
    // For example, sync if data is older than 5 minutes
    return Date.now() - cacheEntry.timestamp > 300000;
  }

  /**
   * Sync individual data item
   */
  private async syncData(key: string, cacheEntry: DataCache): Promise<void> {
    try {
      // Get fresh data from server
      const response = await apiClient.get(`/sync/${key}`, {
        headers: { 'If-None-Match': cacheEntry.etag }
      });

      // Check for conflicts
      if (response.data.version !== cacheEntry.version) {
        await this.handleConflict(key, cacheEntry.data, response.data);
      } else {
        // Update cache with fresh data
        cacheEntry.data = response.data;
        cacheEntry.timestamp = Date.now();
        cacheEntry.version = response.data.version;
        cacheEntry.etag = response.headers.etag;
      }

    } catch (error) {
      if (error.response?.status === 304) {
        // Data hasn't changed
        return;
      }
      console.error('Error syncing data:', key, error);
    }
  }

  /**
   * Handle data conflicts
   */
  private async handleConflict(key: string, localData: any, serverData: any): Promise<void> {
    const conflict: ConflictData = {
      id: this.generateConflictId(),
      key,
      serverData,
      localData,
      timestamp: Date.now(),
      resolved: false
    };

    this.conflicts.set(conflict.id, conflict);
    await this.saveConflicts();

    // Auto-resolve based on config
    if (this.config.conflictResolution !== 'manual') {
      await this.resolveConflict(conflict.id, this.config.conflictResolution);
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(conflictId: string, resolution: 'server' | 'client' | 'merge'): Promise<void> {
    try {
      const conflict = this.conflicts.get(conflictId);
      if (!conflict) {
        return;
      }

      let resolvedData: any;

      switch (resolution) {
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'client':
          resolvedData = conflict.localData;
          break;
        case 'merge':
          resolvedData = this.mergeData(conflict.localData, conflict.serverData);
          break;
      }

      // Update cache with resolved data
      const cacheEntry = this.dataCache.get(conflict.key);
      if (cacheEntry) {
        cacheEntry.data = resolvedData;
        cacheEntry.timestamp = Date.now();
        cacheEntry.version++;
      }

      // Mark conflict as resolved
      conflict.resolved = true;
      conflict.resolution = resolution;
      this.conflicts.delete(conflictId);

      await this.saveCache();
      await this.saveConflicts();

    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Merge local and server data
   */
  private mergeData(localData: any, serverData: any): any {
    // Implement your merge logic here
    // This is a simple example - you might want more sophisticated merging
    return { ...serverData, ...localData };
  }

  /**
   * Resolve all conflicts
   */
  private async resolveConflicts(): Promise<void> {
    try {
      for (const [conflictId, conflict] of this.conflicts) {
        if (!conflict.resolved) {
          await this.resolveConflict(conflictId, this.config.conflictResolution);
        }
      }
    } catch (error) {
      console.error('Error resolving conflicts:', error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isOnline: boolean;
    isSyncing: boolean;
    queueLength: number;
    conflictsCount: number;
    lastSync?: Date;
  } {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueLength: this.actionQueue.length,
      conflictsCount: this.conflicts.size,
      lastSync: this.lastSync
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<SyncConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await this.saveConfig();

      if (this.config.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem('offline_config');
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Load cache from storage
   */
  private async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem('offline_cache');
      if (cacheData) {
        const cache = JSON.parse(cacheData);
        this.dataCache = new Map(Object.entries(cache));
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCache(): Promise<void> {
    try {
      const cache = Object.fromEntries(this.dataCache);
      await AsyncStorage.setItem('offline_cache', JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  /**
   * Load action queue from storage
   */
  private async loadActionQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_queue');
      if (queueData) {
        this.actionQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading action queue:', error);
    }
  }

  /**
   * Save action queue to storage
   */
  private async saveActionQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.actionQueue));
    } catch (error) {
      console.error('Error saving action queue:', error);
    }
  }

  /**
   * Load conflicts from storage
   */
  private async loadConflicts(): Promise<void> {
    try {
      const conflictsData = await AsyncStorage.getItem('offline_conflicts');
      if (conflictsData) {
        const conflicts = JSON.parse(conflictsData);
        this.conflicts = new Map(Object.entries(conflicts));
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  }

  /**
   * Save conflicts to storage
   */
  private async saveConflicts(): Promise<void> {
    try {
      const conflicts = Object.fromEntries(this.conflicts);
      await AsyncStorage.setItem('offline_conflicts', JSON.stringify(conflicts));
    } catch (error) {
      console.error('Error saving conflicts:', error);
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.stopAutoSync();
    this.isSyncing = false;
  }

  private lastSync?: Date;
}

export const offlineService = new OfflineService();
export default offlineService; 