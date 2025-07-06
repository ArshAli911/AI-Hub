import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { ProductTile } from '../../components';
import { Product } from '../../types';

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'AI Assistant Software',
    description: 'A powerful AI-driven assistant to streamline your daily tasks.',
    price: 99.99,
    imageUrl: 'https://via.placeholder.com/150/007BFF/FFFFFF?text=AI+Tool',
    category: 'AI Tool',
    sellerId: 's1',
  },
  {
    id: 'p2',
    name: 'Machine Learning E-book',
    description: 'Comprehensive guide to machine learning algorithms and applications.',
    price: 29.99,
    imageUrl: 'https://via.placeholder.com/150/28a745/FFFFFF?text=Course',
    category: 'Course',
    sellerId: 's2',
  },
  {
    id: 'p3',
    name: 'Custom AI Model Development API',
    description: 'Service for developing tailored AI models for specific business needs, exposed as an API.',
    price: 1500.00,
    imageUrl: 'https://via.placeholder.com/150/ffc107/FFFFFF?text=API',
    category: 'API',
    sellerId: 's1',
  },
  {
    id: 'p4',
    name: 'ImageNet Subset Dataset',
    description: 'A curated subset of the ImageNet dataset for computer vision research.',
    price: 499.00,
    imageUrl: 'https://via.placeholder.com/150/dc3545/FFFFFF?text=Dataset',
    category: 'Dataset',
    sellerId: 's3',
  },
  {
    id: 'p5',
    name: 'Advanced NLP Course',
    description: 'Deep dive into advanced Natural Language Processing techniques.',
    price: 199.99,
    imageUrl: 'https://via.placeholder.com/150/28a745/FFFFFF?text=Course',
    category: 'Course',
    sellerId: 's2',
  },
  {
    id: 'p6',
    name: 'Sentiment Analysis API',
    description: 'An API for real-time sentiment analysis of text data.',
    price: 50.00,
    imageUrl: 'https://via.placeholder.com/150/ffc107/FFFFFF?text=API',
    category: 'API',
    sellerId: 's1',
  },
];

const productCategories = [
  { id: 'all', name: 'All' },
  { id: 'AI Tool', name: 'AI Tools' },
  { id: 'API', name: 'APIs' },
  { id: 'Course', name: 'Courses' },
  { id: 'Dataset', name: 'Datasets' },
];

interface MarketHomeProps {
  navigation: any;
}

const MarketHome: React.FC<MarketHomeProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const filteredProducts = selectedCategory === 'all'
    ? mockProducts
    : mockProducts.filter(product => product.category === selectedCategory);

  const renderProductItem = ({ item }: { item: Product }) => (
    <ProductTile
      product={item}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
    />
  );

  const renderCategoryFilter = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === item.id && styles.selectedCategoryButton]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={[styles.categoryButtonText, selectedCategory === item.id && styles.selectedCategoryButtonText]}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Marketplace</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        <FlatList
          data={productCategories}
          renderItem={renderCategoryFilter}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </ScrollView>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.uploadProductButton} onPress={() => navigation.navigate('UploadProduct')}>
        <Text style={styles.uploadProductButtonText}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.betaTestingButton} onPress={() => navigation.navigate('PrototypeScreen')}>
        <Text style={styles.betaTestingButtonText}>BETA</Text>
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
  categoriesContainer: {
    marginBottom: 15,
    flexGrow: 0,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  selectedCategoryButton: {
    backgroundColor: '#007BFF',
  },
  categoryButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  selectedCategoryButtonText: {
    color: '#fff',
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
  betaTestingButton: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 20,
  },
  betaTestingButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MarketHome; 