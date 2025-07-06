import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { AppButton } from '../../components';
import { Product } from '../../types';

type ProductDetailsRouteProp = RouteProp<{ ProductDetails: { productId: string } }, 'ProductDetails'>;

interface ProductDetailsProps {
  route: ProductDetailsRouteProp;
}

// Mock data for a product
const mockProduct: Product = {
  id: 'p1',
  name: 'AI Assistant Software',
  description: 'A powerful AI-driven assistant designed to streamline your daily tasks. It uses advanced machine learning algorithms to automate repetitive actions, manage schedules, and provide intelligent recommendations. Compatible with various platforms and highly customizable.',
  price: 99.99,
  imageUrl: 'https://via.placeholder.com/300x200',
  category: 'Software',
  sellerId: 'seller123',
};

const ProductDetails: React.FC<ProductDetailsProps> = ({ route }) => {
  const { productId } = route.params;
  // In a real app, you would fetch product data using productId
  const product = mockProduct; // For now, use mock data

  return (
    <ScrollView style={styles.container}>
      {product.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.productImage} />}
      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
        <Text style={styles.productDescription}>{product.description}</Text>
        {product.category && <Text style={styles.productCategory}>Category: {product.category}</Text>}
        {/* Add more product details as needed */}
      </View>
      <AppButton title="Add to Cart" onPress={() => Alert.alert('Add to Cart', `Added ${product.name} to cart.`)} />
      <AppButton title="Buy Now" onPress={() => Alert.alert('Buy Now', `Buying ${product.name} now!`)} buttonStyle={styles.buyNowButton} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  productImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  detailsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 20,
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 10,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  buyNowButton: {
    backgroundColor: 'red',
    marginTop: 10,
  },
});

export default ProductDetails; 