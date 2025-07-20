import { renderHook, act } from "@testing-library/react-native";
import { useOptimizedList } from "../../components/OptimizedList";

describe("useOptimizedList Hook", () => {
  const mockData = Array.from({ length: 100 }, (_, index) => ({
    id: index.toString(),
    title: `Item ${index}`,
    description: `Description for item ${index}`,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with provided data", () => {
    const { result } = renderHook(() => useOptimizedList(mockData));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);
  });

  it("should initialize with empty data", () => {
    const { result } = renderHook(() => useOptimizedList([]));

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);
  });

  it("should handle loading more data", async () => {
    const { result } = renderHook(() =>
      useOptimizedList(mockData.slice(0, 20))
    );

    const mockLoadMore = jest.fn().mockResolvedValue(mockData.slice(20, 40));

    await act(async () => {
      await result.current.loadMore(mockLoadMore);
    });

    expect(mockLoadMore).toHaveBeenCalledWith(1, 20);
    expect(result.current.data.length).toBe(40);
  });

  it("should handle refresh", async () => {
    const { result } = renderHook(() => useOptimizedList(mockData));

    const mockRefresh = jest.fn().mockResolvedValue(mockData.slice(0, 10));

    await act(async () => {
      await result.current.refresh(mockRefresh);
    });

    expect(mockRefresh).toHaveBeenCalledWith(0, 20);
    expect(result.current.data.length).toBe(10);
  });

  it("should handle reset", () => {
    const { result } = renderHook(() => useOptimizedList(mockData));

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.hasMore).toBe(true);
  });
});
