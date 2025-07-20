import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { offlineService } from '../../services/offlineService';
import { apiClient } from '../../api/client';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../api/client');
jest.mock('../../utils/logger');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    
    // Mock NetInfo
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    mockNetInfo.addEventListener.mockReturnValue(() => {});
    
    // Mock API client
    mockApiClient.post.mockResolvedValue({ data: {}, success: true } as any);
    mockApiClient.put.mockResolvedValue({ data: {}, success: true } as any);
    mockApiClient.delete.mockResolvedValue({ data: {}, success: true } as any);
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const status = offlineService.getSyncStatus();
      
      expect(status.isOnline).toBe(true);
      expect(status.isSyncing).toBe(false);
      expect(status.pendingActions).toBe(0);
    });

    it('loads pending actions from storage on init', async () => {
      const storedActions = JSON.stringify([
        {
          id: '1',
          type: 'CREATE',
          endpoint: '/api/test',
          data: { test: true },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ]);
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(storedActions);
      
      // Re-initialize service
      const newService = new (offlineService.constructor as any)();
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initialization
      
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@offline_pending_actions');
    });
  });

  describe('Action Queuing', () => {
    it('queues action when offline', async () => {
      // Simulate offline state
      mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: false } as any);
      
      const actionId = await offlineService.queueAction('CREATE', '/api/test', { test: true });
      
      expect(actionId).toBeDefined();
      expect(offlineService.getPendingActionsCount()).toBe(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('executes action immediately when online', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: true } as any);
      
      await offlineService.queueAction('CREATE', '/api/test', { test: true });
      
      // Should attempt to sync immediately
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/test', { test: true });
    });

    it('handles different action types', async () => {
      await offlineService.queueAction('CREATE', '/api/test', { test: true });
      await offlineService.queueAction('UPDATE', '/api/test/1', { test: false });
      await offlineService.queueAction('DELETE', '/api/test/1');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/test', { test: true });
      expect(mockApiClient.put).toHaveBeenCalledWith('/api/test/1', { test: false });
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/test/1');
    });
  });

  describe('Data Caching', () => {
    it('caches data with TTL', async () => {
      const testData = { id: 1, name: 'Test' };
      const ttl = 60000; // 1 minute
      
      await offlineService.cacheData('test-key', testData, ttl);
      
      const cachedData = offlineService.getCachedData('test-key');
      
      expect(cachedData).toEqual(testData);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('returns null for expired cache', async () => {
      const testData = { id: 1, name: 'Test' };
      const ttl = -1000; // Expired
      
      await offlineService.cacheData('test-key', testData, ttl);
      
      const cachedData = offlineService.getCachedData('test-key');
      
      expect(cachedData).toBeNull();
    });

    it('clears specific cache key', async () => {
      await offlineService.cacheData('test-key', { test: true });
      await offlineService.clearCache('test-key');
      
      const cachedData = offlineService.getCachedData('test-key');
      
      expect(cachedData).toBeNull();
    });

    it('clears all cache when no key provided', async () => {
      await offlineService.cacheData('key1', { test: 1 });
      await offlineService.cacheData('key2', { test: 2 });
      
      await offlineService.clearCache();
      
      expect(offlineService.getCachedData('key1')).toBeNull();
      expect(offlineService.getCachedData('key2')).toBeNull();
    });
  });

  describe('Network State Management', () => {
    it('updates online status when network changes', () => {
      const listener = jest.fn();
      const unsubscribe = offlineService.onSyncStatusChange(listener);
      
      // Simulate network change
      const networkListener = mockNetInfo.addEventListener.mock.calls[0][1];
      networkListener({ isConnected: false });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ isOnline: false })
      );
      
      unsubscribe();
    });

    it('triggers sync when coming back online', async () => {
      // Queue an action while offline
      await offlineService.queueAction('CREATE', '/api/test', { test: true });
      
      // Simulate coming back online
      const networkListener = mockNetInfo.addEventListener.mock.calls[0][1];
      networkListener({ isConnected: true });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/test', { test: true });
    });
  });

  describe('Sync Management', () => {
    it('syncs pending actions successfully', async () => {
      await offlineService.queueAction('CREATE', '/api/test', { test: true });
      
      await offlineService.forceSync();
      
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/test', { test: true });
      expect(offlineService.getPendingActionsCount()).toBe(0);
    });

    it('retries failed actions up to max retries', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));
      mockApiClient.post.mockResolvedValueOnce({ data: {}, success: true } as any);
      
      await offlineService.queueAction('CREATE', '/api/test', { test: true }, 3);
      
      await offlineService.forceSync();
      
      expect(mockApiClient.post).toHaveBeenCalledTimes(3);
    });

    it('removes action after max retries exceeded', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Persistent error'));
      
      await offlineService.queueAction('CREATE', '/api/test', { test: true }, 2);
      
      await offlineService.forceSync();
      
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
      expect(offlineService.getPendingActionsCount()).toBe(0);
    });

    it('prevents concurrent sync operations', async () => {
      await offlineService.queueAction('CREATE', '/api/test1', { test: 1 });
      await offlineService.queueAction('CREATE', '/api/test2', { test: 2 });
      
      // Start two sync operations simultaneously
      const sync1 = offlineService.forceSync();
      const sync2 = offlineService.forceSync();
      
      await Promise.all([sync1, sync2]);
      
      // Should not duplicate API calls
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Status Reporting', () => {
    it('reports correct sync status', () => {
      const status = offlineService.getSyncStatus();
      
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('pendingActions');
      expect(status).toHaveProperty('syncErrors');
    });

    it('notifies listeners of status changes', () => {
      const listener = jest.fn();
      const unsubscribe = offlineService.onSyncStatusChange(listener);
      
      // Trigger a status change
      offlineService.queueAction('CREATE', '/api/test', { test: true });
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
    });
  });

  describe('Error Handling', () => {
    it('handles storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw
      await expect(
        offlineService.queueAction('CREATE', '/api/test', { test: true })
      ).resolves.toBeDefined();
    });

    it('handles network info errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Network info error'));
      
      // Should not throw during initialization
      expect(() => new (offlineService.constructor as any)()).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('clears all offline data', async () => {
      await offlineService.queueAction('CREATE', '/api/test', { test: true });
      await offlineService.cacheData('test-key', { test: true });
      
      await offlineService.clearAllOfflineData();
      
      expect(offlineService.getPendingActionsCount()).toBe(0);
      expect(offlineService.getCachedData('test-key')).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(3);
    });
  });
});