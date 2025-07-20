import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ListRenderItem,
} from 'react-native';
import { useLazyLoadBatch } from '../hooks/useLazyLoading';
import { useAsyncOperation } from '../hooks/useMemoryManagement';
import { usePerformanceMonitor } from '../utils/performanceMonitor';

interface OptimizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  refreshing?: boolean;
  emptyComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  loadingComponent?: React.ComponentType;
  itemHeight?: number;
  estimatedItemSize?: number;
  windowSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  removeClippedSubviews?: boolean;
  lazy?: boolean;
  batchSize?: number;
  preloadDistance?: number;
  cacheSize?: number;
  onViewableItemsChanged?: (info: { viewableItems: any[]; changed: any[] }) => void;
  viewabilityConfig?: any;
  horizontal?: boolean;
  numColumns?: number;
  getItemLayout?: (data: T[] | null | undefined, index: number) => { length: number; offset: number; index: number };
}

const { height: screenHeight } = Dimensions.get('window');

function OptimizedList<T>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  onRefresh,
  loading = false,
  refreshing = false,
  emptyComponent: EmptyComponent,
  errorComponent: ErrorComponent,
  loadingComponent: LoadingComponent,
  itemHeight,
  estimatedItemSize = 100,
  windowSize = 10,
  maxToRenderPerBatch = 10,
  updateCellsBatchingPeriod = 50,
  removeClippedSubviews = true,
  lazy = false,
  batchSize = 20,
  preloadDistance = 1000,
  cacheSize = 50,
  onViewableItemsChanged,
  viewabilityConfig,
  horizontal = false,
  numColumns = 1,
  getItemLayout,
}: OptimizedListProps<T>) {
  const [error, setError] = useState<Error | null>(null);
  const { measureRender } = usePerformanceMonitor();
  const { executeAsync } = useAsyncOperation();

  // Lazy loading for large datasets
  const lazyBatch = useLazyLoadBatch(
    lazy ? data.map((_, index) => () => Promise.resolve(data[index])) : [],
    {
      batchSize,
      priority: 'normal',
    }
  );

  // Memoized render item with performance monitoring
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(
    ({ item, index }) => {
      // For performance monitoring, we'll use a simpler approach
      // that doesn't violate React's rules of hooks
      try {
        const result = renderItem({ item, index, separators: {} as any });
        return result;
      } catch (err) {
        console.warn(`Error rendering item at index ${index}:`, err);
        return (
          <View style={styles.errorItem}>
            <Text style={styles.errorText}>Failed to render item</Text>
          </View>
        );
      }
    },
    [renderItem]
  );

  // Optimized key extractor
  const memoizedKeyExtractor = useCallback(
    (item: T, index: number) => {
      try {
        return keyExtractor(item, index);
      } catch (err) {
        console.warn('Key extractor error:', err);
        return `fallback_${index}`;
      }
    },
    [keyExtractor]
  );

  // Handle refresh with error handling
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    await executeAsync(
      onRefresh,
      () => setError(null),
      (err) => setError(err instanceof Error ? err : new Error(String(err)))
    );
  }, [onRefresh, executeAsync]);

  // Handle end reached with throttling
  const handleEndReached = useCallback(() => {
    if (onEndReached && !loading) {
      onEndReached();
    }
  }, [onEndReached, loading]);

  // Optimized viewability config
  const optimizedViewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
    ...viewabilityConfig,
  }), [viewabilityConfig]);

  // Get item layout for better performance
  const optimizedGetItemLayout = useCallback(
    (data: ArrayLike<T> | null | undefined, index: number) => {
      if (getItemLayout) {
        return getItemLayout(data as T[] | null | undefined, index);
      }
      
      if (itemHeight) {
        return {
          length: itemHeight,
          offset: itemHeight * index,
          index,
        };
      }
      
      return {
        length: estimatedItemSize,
        offset: estimatedItemSize * index,
        index,
      };
    },
    [getItemLayout, itemHeight, estimatedItemSize]
  );

  // Empty component
  const renderEmpty = useCallback(() => {
    if (loading && LoadingComponent) {
      return <LoadingComponent />;
    }
    
    if (error && ErrorComponent) {
      return <ErrorComponent error={error} retry={() => handleRefresh()} />;
    }
    
    if (EmptyComponent) {
      return <EmptyComponent />;
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No items found</Text>
      </View>
    );
  }, [loading, error, LoadingComponent, ErrorComponent, EmptyComponent, handleRefresh]);

  // Footer component for loading more
  const renderFooter = useCallback(() => {
    if (!loading) return null;
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#6200EE" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [loading]);

  // Use lazy data if enabled
  const displayData = lazy ? lazyBatch.data.filter(Boolean) as T[] : data;

  // Refresh control
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#6200EE']}
      tintColor="#6200EE"
    />
  ) : undefined;

  // Performance optimizations
  const flatListProps = {
    data: displayData,
    renderItem: memoizedRenderItem,
    keyExtractor: memoizedKeyExtractor,
    onEndReached: handleEndReached,
    onEndReachedThreshold: 0.5,
    refreshControl,
    ListEmptyComponent: renderEmpty,
    ListFooterComponent: renderFooter,
    windowSize,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    removeClippedSubviews,
    initialNumToRender: Math.ceil(screenHeight / estimatedItemSize),
    onViewableItemsChanged,
    viewabilityConfig: optimizedViewabilityConfig,
    horizontal,
    numColumns,
    getItemLayout: itemHeight || getItemLayout ? optimizedGetItemLayout : undefined,
    // Performance optimizations
    disableVirtualization: false,
    legacyImplementation: false,
    maintainVisibleContentPosition: horizontal ? undefined : {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 100,
    },
  };

  return (
    <View style={styles.container}>
      <FlatList
        {...flatListProps}
        style={styles.list}
        contentContainerStyle={displayData.length === 0 ? styles.emptyContentContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666666',
  },
  errorItem: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    margin: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
  },
});

// Memoize the component to prevent unnecessary re-renders
export default memo(OptimizedList) as <T>(props: OptimizedListProps<T>) => JSX.Element;

// Hook for managing list state
export const useOptimizedList = <T>(
  initialData: T[] = [],
  options: {
    pageSize?: number;
    preloadPages?: number;
    cacheSize?: number;
  } = {}
) => {
  const { pageSize = 20, preloadPages = 2, cacheSize = 100 } = options;
  
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadMore = useCallback(async (loadFn: (page: number, size: number) => Promise<T[]>) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newData = await loadFn(page, pageSize);
      
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      
      setData(prev => {
        const combined = [...prev, ...newData];
        // Implement LRU cache to prevent memory issues
        if (combined.length > cacheSize) {
          return combined.slice(-cacheSize);
        }
        return combined;
      });
      
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, pageSize, cacheSize]);

  const refresh = useCallback(async (loadFn: (page: number, size: number) => Promise<T[]>) => {
    setRefreshing(true);
    try {
      const newData = await loadFn(0, pageSize);
      setData(newData);
      setPage(1);
      setHasMore(newData.length === pageSize);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [pageSize]);

  const reset = useCallback(() => {
    setData([]);
    setPage(0);
    setHasMore(true);
    setLoading(false);
    setRefreshing(false);
  }, []);

  return {
    data,
    loading,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    reset,
    setData,
  };
};