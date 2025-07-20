import { renderHook, act } from '@testing-library/react-native';
import { useOffline } from '../../hooks/useOffline';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('useOffline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {},
    } as any);
  });

  it('should initialize with online state', async () => {
    const { result } = renderHook(() => useOffline());

    await act(async () => {
      // Wait for initial network check
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('should detect offline state', async () => {
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
      details: {},
    } as any);

    const { result } = renderHook(() => useOffline());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('should handle network state changes', async () => {
    let networkListener: ((state: any) => void) | null = null;
    
    mockNetInfo.addEventListener.mockImplementation((listener) => {
      networkListener = listener;
      return jest.fn(); // unsubscribe function
    });

    const { result } = renderHook(() => useOffline());

    // Simulate going offline
    act(() => {
      networkListener?.({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    expect(result.current.isOffline).toBe(true);

    // Simulate coming back online
    act(() => {
      networkListener?.({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should provide connection type information', async () => {
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'cellular',
      details: {
        cellularGeneration: '4g',
      },
    } as any);

    const { result } = renderHook(() => useOffline());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.connectionType).toBe('cellular');
  });

  it('should cleanup listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useOffline());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should handle NetInfo errors gracefully', async () => {
    mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOffline());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should default to offline when error occurs
    expect(result.current.isOffline).toBe(true);
  });
});