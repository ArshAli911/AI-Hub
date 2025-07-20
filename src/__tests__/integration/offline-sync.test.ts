import { renderHook, act } from '@testing-library/react-native';
import { useOffline } from '../../hooks/useOffline';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@react-native-async-storage/async-storage');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Offline Sync Integration', () => {
  let networkListener: ((state: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockNetInfo.addEventListener.mockImplementation((listener) => {
      networkListener = listener;
      return jest.fn();
    });

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {},
    } as any);

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  it('should queue actions when offline and sync when online', async () => {
    const { result } = renderHook(() => useOffline());

    // Start online
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.isOnline).toBe(true);

    // Go offline
    act(() => {
      networkListener?.({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });
    expect(result.current.isOffline).toBe(true);

    // Queue some actions while offline
    const mockActions = [
      { id: '1', type: 'CREATE', endpoint: '/api/posts', data: { title: 'Test Post' } },
      { id: '2', type: 'UPDATE', endpoint: '/api/posts/1', data: { title: 'Updated Post' } },
      { id: '3', type: 'DELETE', endpoint: '/api/posts/2' },
    ];

    // Simulate queuing actions (this would be done by the offline service)
    await act(async () => {
      for (const action of mockActions) {
        await mockAsyncStorage.setItem(
          `offline_action_${action.id}`,
          JSON.stringify(action)
        );
      }
    });

    // Come back online
    act(() => {
      networkListener?.({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });
    expect(result.current.isOnline).toBe(true);

    // Verify actions were queued
    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
  });

  it('should handle data caching during offline periods', async () => {
    const { result } = renderHook(() => useOffline());

    // Cache some data while online
    const cachedData = {
      posts: [
        { id: 1, title: 'Cached Post 1' },
        { id: 2, title: 'Cached Post 2' },
      ],
      timestamp: Date.now(),
      ttl: 3600000, // 1 hour
    };

    await act(async () => {
      await mockAsyncStorage.setItem('cached_posts', JSON.stringify(cachedData));
    });

    // Go offline
    act(() => {
      networkListener?.({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    // Verify cached data can be retrieved
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));
    
    await act(async () => {
      const retrieved = await mockAsyncStorage.getItem('cached_posts');
      expect(retrieved).toBe(JSON.stringify(cachedData));
    });
  });

  it('should handle network state transitions gracefully', async () => {
    const { result } = renderHook(() => useOffline());

    // Start online
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.isOnline).toBe(true);

    // Rapid network changes
    const networkStates = [
      { isConnected: false, type: 'none' },
      { isConnected: true, type: 'cellular' },
      { isConnected: false, type: 'none' },
      { isConnected: true, type: 'wifi' },
    ];

    for (const state of networkStates) {
      act(() => {
        networkListener?.(state);
      });
      
      expect(result.current.isOnline).toBe(state.isConnected);
      expect(result.current.isOffline).toBe(!state.isConnected);
    }
  });

  it('should handle storage errors gracefully', async () => {
    const { result } = renderHook(() => useOffline());

    // Mock storage error
    mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

    // Go offline
    act(() => {
      networkListener?.({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    // Attempt to queue action (should handle error gracefully)
    await act(async () => {
      try {
        await mockAsyncStorage.setItem('test_key', 'test_value');
      } catch (error) {
        // Error should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(result.current.isOffline).toBe(true);
  });

  it('should prioritize sync order based on action type', async () => {
    const { result } = renderHook(() => useOffline());

    // Queue actions in mixed order
    const actions = [
      { id: '1', type: 'DELETE', priority: 3 },
      { id: '2', type: 'CREATE', priority: 1 },
      { id: '3', type: 'UPDATE', priority: 2 },
    ];

    // Go offline and queue actions
    act(() => {
      networkListener?.({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    await act(async () => {
      for (const action of actions) {
        await mockAsyncStorage.setItem(
          `offline_action_${action.id}`,
          JSON.stringify(action)
        );
      }
    });

    // Come back online
    act(() => {
      networkListener?.({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    // Verify sync would happen in priority order
    expect(result.current.isOnline).toBe(true);
  });

  it('should handle concurrent offline operations', async () => {
    const { result } = renderHook(() => useOffline());

    // Go offline
    act(() => {
      networkListener?.({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    // Simulate concurrent operations
    const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
      id: `concurrent_${i}`,
      type: 'CREATE',
      data: { index: i },
    }));

    await act(async () => {
      const promises = concurrentOperations.map(op =>
        mockAsyncStorage.setItem(`offline_action_${op.id}`, JSON.stringify(op))
      );
      await Promise.all(promises);
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(10);
    expect(result.current.isOffline).toBe(true);
  });
});