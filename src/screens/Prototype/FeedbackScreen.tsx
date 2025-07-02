import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { AppButton } from '../../components';
import { Prototype } from '../../types';
import { formatTimestampToDateTime } from '../../utils';

type FeedbackScreenRouteProp = RouteProp<{ FeedbackScreen: { prototypeId: string } }, 'FeedbackScreen'>;

interface FeedbackScreenProps {
  route: FeedbackScreenRouteProp;
}

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  rating: number; // e.g., 1-5 stars
  createdAt: number;
}

const mockPrototype: Prototype = {
  id: 'proto1',
  name: 'AI Chatbot for Customer Service',
  description: 'A prototype of an AI-powered chatbot designed to handle customer service inquiries, providing instant support and reducing response times.',
  imageUrl: 'https://via.placeholder.com/300x200',
  creatorId: 'userABC',
  createdAt: Date.now() - 3600000 * 48,
};

const mockFeedback: Feedback[] = [
  {
    id: 'f1',
    userId: 'userX',
    userName: 'Emily',
    comment: 'The chatbot is very responsive and helpful for common queries. Great job!',
    rating: 5,
    createdAt: Date.now() - 3600000 * 24,
  },
  {
    id: 'f2',
    userId: 'userY',
    userName: 'Frank',
    comment: 'Sometimes it struggles with more complex questions, but overall a solid prototype.',
    rating: 4,
    createdAt: Date.now() - 3600000 * 12,
  },
];

const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ route }) => {
  const { prototypeId } = route.params;
  // In a real app, you would fetch prototype and feedback data using prototypeId
  const prototype = mockPrototype;
  const feedbackList = mockFeedback;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.prototypeDetails}>
          {prototype.imageUrl && <Image source={{ uri: prototype.imageUrl }} style={styles.prototypeImage} />}
          <Text style={styles.prototypeName}>{prototype.name}</Text>
          <Text style={styles.prototypeDescription}>{prototype.description}</Text>
          <Text style={styles.prototypeMeta}>Created by {prototype.creatorId} on {formatTimestampToDateTime(prototype.createdAt)}</Text>
        </View>

        <Text style={styles.feedbackTitle}>Feedback</Text>
        <FlatList
          data={feedbackList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.feedbackItem}>
              <Text style={styles.feedbackAuthor}>{item.userName} ({item.rating}/5 Stars)</Text>
              <Text style={styles.feedbackComment}>{item.comment}</Text>
              <Text style={styles.feedbackDate}>{formatTimestampToDateTime(item.createdAt)}</Text>
            </View>
          )}
          scrollEnabled={false} // Disable FlatList scrolling as it's inside a ScrollView
        />
      </ScrollView>

      <View style={styles.feedbackInputContainer}>
        <TextInput
          style={styles.feedbackInput}
          placeholder="Leave your feedback..."
          multiline
        />
        <AppButton title="Submit Feedback" onPress={() => { /* Handle submitting feedback */ }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollViewContent: {
    padding: 10,
    paddingBottom: 100, // Space for feedback input and button
  },
  prototypeDetails: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prototypeImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 10,
  },
  prototypeName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  prototypeDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 10,
  },
  prototypeMeta: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  feedbackItem: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackAuthor: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  feedbackComment: {
    fontSize: 14,
    marginBottom: 5,
  },
  feedbackDate: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
  },
  feedbackInputContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default FeedbackScreen; 