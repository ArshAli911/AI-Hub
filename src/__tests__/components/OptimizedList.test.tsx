import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { OptimizedList } from '../../components/OptimizedList';

describe('OptimizedList', () => {
  const mockData = Array.from({ length: 100 }, (_, index) => ({
    id: index.toString(),
    title: `Item ${index}`,
    description: `Description for item ${index}`,
  }));

  const renderItem = ({ item }: { item: any }) => (
    <Text testID={`item-${item.id}`}>{item.title}</Text>
  );

  const defaultProps = {
    data: mockData,
    renderItem,
    keyExtractor: (item: any) => item.id,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render list with items', () => {
    const { getByTestId } = render(<OptimizedList {...defaultProps} />);
    
    expect(getByTestId('optimized-list')).toBeTruthy();
    expect(getByTestId('item-0')).toBeTruthy();
  });

  it('should handle empty data', () => {
    const { getByTestId, queryByTestId } = render(
      <OptimizedList {...defaultProps} data={[]} />
    );
    
    expect(getByTestId('optimized-list')).toBeTruthy();
    expect(queryByTestId('item-0')).toBeNull();
  });

  it('should render empty component when data is empty', () => {
    const EmptyComponent = () => <Text testID="empty-list">No items</Text>;
    
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        data={[]} 
        ListEmptyComponent={<EmptyComponent />}
      />
    );
    
    expect(getByTestId('empty-list')).toBeTruthy();
  });

  it('should handle pull to refresh', () => {
    const onRefreshMock = jest.fn();
    
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        onRefresh={onRefreshMock}
        refreshing={false}
      />
    );
    
    const list = getByTestId('optimized-list');
    fireEvent(list, 'onRefresh');
    
    expect(onRefreshMock).toHaveBeenCalled();
  });

  it('should handle end reached for pagination', () => {
    const onEndReachedMock = jest.fn();
    
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        onEndReached={onEndReachedMock}
        onEndReachedThreshold={0.5}
      />
    );
    
    const list = getByTestId('optimized-list');
    fireEvent(list, 'onEndReached');
    
    expect(onEndReachedMock).toHaveBeenCalled();
  });

  it('should render header component', () => {
    const HeaderComponent = () => <Text testID="list-header">Header</Text>;
    
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        ListHeaderComponent={<HeaderComponent />}
      />
    );
    
    expect(getByTestId('list-header')).toBeTruthy();
  });

  it('should render footer component', () => {
    const FooterComponent = () => <Text testID="list-footer">Footer</Text>;
    
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        ListFooterComponent={<FooterComponent />}
      />
    );
    
    expect(getByTestId('list-footer')).toBeTruthy();
  });

  it('should handle horizontal scrolling', () => {
    const { getByTestId } = render(
      <OptimizedList {...defaultProps} horizontal={true} />
    );
    
    const list = getByTestId('optimized-list');
    expect(list.props.horizontal).toBe(true);
  });

  it('should apply custom item separator', () => {
    const ItemSeparator = () => <Text testID="separator">---</Text>;
    
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        ItemSeparatorComponent={<ItemSeparator />}
      />
    );
    
    expect(getByTestId('separator')).toBeTruthy();
  });

  it('should handle scroll events', () => {
    const onScrollMock = jest.fn();
    
    const { getByTestId } = render(
      <OptimizedList {...defaultProps} onScroll={onScrollMock} />
    );
    
    const list = getByTestId('optimized-list');
    fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { y: 100 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 500 },
      },
    });
    
    expect(onScrollMock).toHaveBeenCalled();
  });

  it('should optimize rendering with getItemLayout', () => {
    const getItemLayout = jest.fn((data, index) => ({
      length: 50,
      offset: 50 * index,
      index,
    }));
    
    render(
      <OptimizedList 
        {...defaultProps} 
        getItemLayout={getItemLayout}
      />
    );
    
    expect(getItemLayout).toHaveBeenCalled();
  });

  it('should handle loading state', () => {
    const { getByTestId } = render(
      <OptimizedList {...defaultProps} loading={true} />
    );
    
    expect(getByTestId('list-loading')).toBeTruthy();
  });

  it('should handle error state', () => {
    const { getByTestId } = render(
      <OptimizedList 
        {...defaultProps} 
        error="Failed to load data"
      />
    );
    
    expect(getByTestId('list-error')).toBeTruthy();
  });

  it('should support search functionality', () => {
    const filteredData = mockData.slice(0, 5);
    
    const { getByTestId, queryByTestId } = render(
      <OptimizedList {...defaultProps} data={filteredData} />
    );
    
    expect(getByTestId('item-0')).toBeTruthy();
    expect(getByTestId('item-4')).toBeTruthy();
    expect(queryByTestId('item-5')).toBeNull();
  });
});