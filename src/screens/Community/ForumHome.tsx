import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { PostCard } from '../../components';
import { Post } from '../../types';

const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Introduction to AI in Healthcare',
    content: 'Discussing the growing impact of AI on healthcare diagnostics and personalized medicine.',
    authorId: 'user1',
    authorName: 'Alice',
    createdAt: Date.now() - 3600000 * 5, // 5 hours ago
  },
  {
    id: '2',
    title: 'Building Your First ML Model',
    content: 'A step-by-step guide for beginners to create their first machine learning model using Python and scikit-learn.',
    authorId: 'user2',
    authorName: 'Bob',
    createdAt: Date.now() - 3600000 * 24, // 24 hours ago
  },
  // Add more mock posts as needed
];

interface ForumHomeProps {
  navigation: any; // Replace with proper navigation type
}

const ForumHome: React.FC<ForumHomeProps> = ({ navigation }) => {
  const renderItem = ({ item }: { item: Post }) => (
    <TouchableOpacity onPress={() => navigation.navigate('ThreadView', { postId: item.id })}> {/* Update 'ThreadView' with the actual route name */}
      <PostCard post={item} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community Forum</Text>
      <FlatList
        data={mockPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.createPostButton} onPress={() => navigation.navigate('CreatePost')}> {/* Update 'CreatePost' with the actual route name */}
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