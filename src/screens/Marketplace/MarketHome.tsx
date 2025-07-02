import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ProductTile } from '../../components';
import { Product } from '../../types';

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'AI Assistant Software',
    description: 'A powerful AI-driven assistant to streamline your daily tasks.',
    price: 99.99,
    imageUrl: 'https://via.placeholder.com/150',
    category: 'Software',
  },
  {
    id: 'p2',
    name: 'Machine Learning E-book',
    description: 'Comprehensive guide to machine learning algorithms and applications.',
    price: 29.99,
    imageUrl: 'https://via.placeholder.com/150',
    category: 'E-books',
  },
  {
    id: 'p3',
    name: 'Custom AI Model Development',
    description: 'Service for developing tailored AI models for specific business needs.',
    price: 1500.00,
    imageUrl: 'https://via.placeholder.com/150',
    category: 'Services',
  },
];

interface MarketHomeProps {
  navigation: any; // Replace with proper navigation type
}

const MarketHome: React.FC<MarketHomeProps> = ({ navigation }) => {
  const renderItem = ({ item }: { item: Product }) => (
    <ProductTile
      product={item}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })} // Update 'ProductDetails' with actual route
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>
      <FlatList
        data={mockProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.uploadProductButton} onPress={() => navigation.navigate('UploadProduct')}> {/* Update 'UploadProduct' with actual route */}
        <Text style={styles.uploadProductButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flex: 1,
    justifyContent: 'space-around',
  },
  uploadProductButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadProductButtonText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 30,
  },
});

export default MarketHome; 