import { useState, useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  pageSize?: number;
  initialData?: T[];
  dependencies?: any[];
}

export function useInfiniteScroll<T>(
  fetchFn: (range: { from: number; to: number }) => Promise<{ data: T[]; error: any; count: number | null }>,
  options: UseInfiniteScrollOptions<T> = {}
) {
  const { pageSize = 20, initialData = [], dependencies = [] } = options;
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<any>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  const isFirstRender = useRef(true);

  const fetchBatch = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    const from = pageNum * pageSize;
    const to = from + pageSize - 1;

    try {
      const { data: newItems, error: fetchError, count } = await fetchFn({ from, to });
      
      if (fetchError) throw fetchError;

      if (isRefresh) {
        setData(newItems || []);
      } else {
        setData(prev => [...prev, ...(newItems || [])]);
      }

      setTotalCount(count);
      setHasMore((newItems?.length || 0) === pageSize);
      setPage(pageNum);
    } catch (err) {
      setError(err);
      console.error('Infinite Scroll Fetch Error:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [fetchFn, pageSize]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchBatch(page + 1);
    }
  }, [fetchBatch, page, hasMore, isLoadingMore, isLoading]);

  const refresh = useCallback(() => {
    fetchBatch(0, true);
  }, [fetchBatch]);

  // Handle dependency changes (filters, search, etc.)
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        refresh();
        return;
    }
    refresh();
  }, dependencies);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    error,
    totalCount,
    setData
  };
}
