import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Product } from '../../types';
import { AppButton } from '../../components';

const productCategories = [
  { id: 'AI Tool', name: 'AI Tool' },
  { id: 'API', name: 'API' },
  { id: 'Course', name: 'Course' },
  { id: 'Dataset', name: 'Dataset' },
];

interface UploadProductProps {
  navigation: any;
}

const UploadProduct: React.FC<UploadProductProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);

  const handleUploadProduct = () => {
    if (!name || !description || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const newProduct: Product = {
      id: `p${Date.now()}`, // Simple mock ID
      name,
      description,
      price: parseFloat(price),
      imageUrl: imageUrl || 'https://via.placeholder.com/150', // Placeholder if no image provided
      category: category,
      sellerId: 'currentUser', // Replace with actual user ID
    };

    console.log('New Product:', newProduct);
    Alert.alert('Success', 'Product uploaded successfully!');
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Your Product</Text>

      <TextInput
        style={styles.input}
        placeholder="Product Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Product Description"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <TextInput
        style={styles.input}
        placeholder="Price (e.g., 99.99)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChangeText={setImageUrl}
      />
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.previewImage} /> : null}

      <Text style={styles.label}>Select Category:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue: string) => setCategory(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="-- Select Category --" value={null} />
          {productCategories.map((cat) => (
            <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
          ))}
        </Picker>
      </View>

      <AppButton title="Upload Product" onPress={handleUploadProduct} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    minHeight: 100,
  },
  previewImage: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
    marginBottom: 15,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});

export default UploadProduct; 