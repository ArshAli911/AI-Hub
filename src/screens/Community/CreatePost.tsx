import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Category } from '../../types';
import { Picker } from '@react-native-picker/picker';

const mockCategories: Category[] = [
  { id: '1', name: 'NLP', description: 'Natural Language Processing' },
  { id: '2', name: 'Robotics', description: 'Robotics and Automation' },
  { id: '3', name: 'ML', description: 'Machine Learning Algorithms' },
  { id: '4', name: 'DL', description: 'Deep Learning Architectures' },
  { id: '5', name: 'Computer Vision', description: 'Image and Video Analysis' },
];

interface CreatePostProps {
  navigation: any;
}

const CreatePost: React.FC<CreatePostProps> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCreatePost = () => {
    if (!title || !content || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all fields and select a category.');
      return;
    }

    // Here you would typically send this data to your backend API
    console.log('New Post:', { title, content, categoryId: selectedCategory });
    Alert.alert('Success', 'Post created successfully!');
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Post</Text>

      <TextInput
        style={styles.input}
        placeholder="Post Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.contentInput]}
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Select Category:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCategory || ''}
          onValueChange={(itemValue: string) => setSelectedCategory(itemValue || null)}
          style={styles.picker}
        >
          <Picker.Item label="-- Select a Category --" value="" />
          {mockCategories.map((category) => (
            <Picker.Item key={category.id} label={category.name} value={category.id} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreatePost}>
        <Text style={styles.createButtonText}>Create Post</Text>
      </TouchableOpacity>
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
  contentInput: {
    minHeight: 120,
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
  createButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreatePost; 