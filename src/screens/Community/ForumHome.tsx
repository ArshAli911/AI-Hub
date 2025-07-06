import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { PostCard } from '../../components';
import { Category, Thread, Comment } from '../../types';

const mockCategories: Category[] = [
  { id: '1', name: 'NLP', description: 'Natural Language Processing' },
  { id: '2', name: 'Robotics', description: 'Robotics and Automation' },
  { id: '3', name: 'ML', description: 'Machine Learning Algorithms' },
  { id: '4', name: 'DL', description: 'Deep Learning Architectures' },
  { id: '5', name: 'Computer Vision', description: 'Image and Video Analysis' },
];

const mockThreads: Thread[] = [
  {
    id: '1',
    title: 'Introduction to AI in Healthcare',
    content: 'Discussing the growing impact of AI on healthcare diagnostics and personalized medicine.',
    authorId: 'user1',
    authorName: 'Alice',
    createdAt: Date.now() - 3600000 * 5,
    categoryId: '3', // ML category
    comments: [
      {
        id: 'c1',
        threadId: '1',
        authorId: 'user3',
        authorName: 'Charlie',
        content: 'Great topic! What about the ethical considerations?',
        createdAt: Date.now() - 3600000 * 4,
      },
    ],
    upvotes: ['user2'],
    bookmarks: [],
    views: 120,
  },
  {
    id: '2',
    title: 'Building Your First ML Model',
    content: 'A step-by-step guide for beginners to create their first machine learning model using Python and scikit-learn.',
    authorId: 'user2',
    authorName: 'Bob',
    createdAt: Date.now() - 3600000 * 24,
    categoryId: '3', // ML category
    comments: [],
    upvotes: ['user1', 'user3'],
    bookmarks: ['user1'],
    views: 250,
  },
  {
    id: '3',
    title: 'Recent Advancements in Robotics',
    content: 'Exploring the latest breakthroughs in robotic arms and autonomous systems.',
    authorId: 'user4',
    authorName: 'David',
    createdAt: Date.now() - 3600000 * 10,
    categoryId: '2', // Robotics category
    comments: [
      {
        id: 'c2',
        threadId: '3',
        authorId: 'user1',
        authorName: 'Alice',
        content: 'Very insightful! Any thoughts on human-robot interaction?',
        createdAt: Date.now() - 3600000 * 9,
      },
    ],
    upvotes: [],
    bookmarks: [],
    views: 80,
  },
  // Add more mock threads as needed
];

interface ForumHomeProps {
  navigation: any;
}

const ForumHome: React.FC<ForumHomeProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredThreads = selectedCategory
    ? mockThreads.filter(thread => thread.categoryId === selectedCategory)
    : mockThreads;

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === item.id && styles.selectedCategoryButton]}
      onPress={() => setSelectedCategory(item.id === selectedCategory ? null : item.id)}
    >
      <Text style={[styles.categoryButtonText, selectedCategory === item.id && styles.selectedCategoryButtonText]}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderThreadItem = ({ item }: { item: Thread }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ThreadView', { threadId: item.id })}>
      <PostCard post={item} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community Forum</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        <TouchableOpacity
          style={[styles.categoryButton, selectedCategory === null && styles.selectedCategoryButton]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryButtonText, selectedCategory === null && styles.selectedCategoryButtonText]}>All</Text>
        </TouchableOpacity>
        <FlatList
          data={mockCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </ScrollView>

      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        renderItem={renderThreadItem}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.createPostButton} onPress={() => navigation.navigate('CreatePost')}>
        <Text style={styles.createPostButtonText}>+</Text>
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
  createPostButton: {
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
  createPostButtonText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 30,
  },
});

export default ForumHome; 