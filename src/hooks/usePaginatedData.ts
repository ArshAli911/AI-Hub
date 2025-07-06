import { useState, useEffect, useCallback } from 'react';

interface UsePaginatedDataOptions<T> {
  fetchData: (page: number, limit: number) => Promise<T[]>;
  initialLimit?: number;
}

const usePaginatedData = <T>({ fetchData, initialLimit = 10 }: UsePaginatedDataOptions<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);
    try {
      const newItems = await fetchData(page, initialLimit);
      setData((prevData) => [...prevData, ...newItems]);
      setPage((prevPage) => prevPage + 1);
      if (newItems.length < initialLimit) {
        setHasMore(false);
      }
    } catch (err) {
      setError('Failed to load data.');
      console.error('Pagination error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchData, initialLimit]);

  useEffect(() => {
    // Initial load
    loadMore();
  }, [loadMore]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
  };
};

export default usePaginatedData; 