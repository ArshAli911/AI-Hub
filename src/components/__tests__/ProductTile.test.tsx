import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProductTile from '../ProductTile';

describe('ProductTile', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'This is a long description for a test product to see if it truncates properly.',
    price: 99.99,
    imageUrl: 'https://example.com/test-image.jpg',
  };

  it('renders correctly with product data', () => {
    const { getByText, getByTestId } = render(<ProductTile product={mockProduct} />);

    expect(getByText(mockProduct.name)).toBeTruthy();
    expect(getByText(`$${mockProduct.price.toFixed(2)}`)).toBeTruthy();
    expect(getByText(mockProduct.description)).toBeTruthy();

    // You might need a way to assert image source, but testing-library often doesn't expose it directly.
    // If needed, you might use a snapshot test or a custom matcher/prop test if the Image component allows.
  });

  it('calls onPress when the tile is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<ProductTile product={mockProduct} onPress={mockOnPress} />);

    fireEvent.press(getByText(mockProduct.name)); // Pressing on the name as part of the TouchableOpacity

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays price with two decimal places', () => {
    const productWithIntegerPrice = { ...mockProduct, price: 50 };
    const { getByText } = render(<ProductTile product={productWithIntegerPrice} />);
    expect(getByText('$50.00')).toBeTruthy();

    const productWithOneDecimal = { ...mockProduct, price: 25.5 };
    const { getByText: getByText2 } = render(<ProductTile product={productWithOneDecimal} />);
    expect(getByText2('$25.50')).toBeTruthy();
  });

  // Note: Testing `numberOfLines` property behavior directly with testing-library is complex
  // as it's a styling property often handled by the native layout engine. A visual regression
  // test or manual inspection is usually more reliable for such UI aspects.
}); 