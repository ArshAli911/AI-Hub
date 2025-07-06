import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Thread, Comment } from '../../types';
import { AppButton } from '../../components';
import { Ionicons } from '@expo/vector-icons';

type ThreadViewRouteProp = RouteProp<{ ThreadView: { threadId: string } }, 'ThreadView'>;

interface ThreadViewProps {
  route: ThreadViewRouteProp;
  navigation: any; // Add navigation prop
}

// Mock data - In a real app, fetch this from API
const mockThreads: Thread[] = [
  {
    id: '1',
    title: 'Introduction to AI in Healthcare',
    content: 'Discussing the growing impact of AI on healthcare diagnostics and personalized medicine.',
    authorId: 'user1',
    authorName: 'Alice',
    createdAt: Date.now() - 3600000 * 5,
    categoryId: '3',
    comments: [
      {
        id: 'c1',
        threadId: '1',
        authorId: 'user3',
        authorName: 'Charlie',
        content: 'Great topic! What about the ethical considerations?',
        createdAt: Date.now() - 3600000 * 4,
      },
      {
        id: 'c2',
        threadId: '1',
        authorId: 'user2',
        authorName: 'Bob',
        content: 'Absolutely, privacy and bias are huge concerns.',
        createdAt: Date.now() - 3600000 * 3,
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
    categoryId: '3',
    comments: [],
    upvotes: ['user1', 'user3'],
    bookmarks: ['user1'],
    views: 250,
  },
];

const ThreadView: React.FC<ThreadViewProps> = ({ route, navigation }) => {
  const { threadId } = route.params;
  const [thread, setThread] = useState<Thread | undefined>(
    mockThreads.find((t) => t.id === threadId)
  );
  const [commentText, setCommentText] = useState('');
  const currentUserId = 'user1'; // Mock current user ID

  if (!thread) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Thread not found.</Text>
      </View>
    );
  }

  const handleUpvote = () => {
    // In a real app, send API call to upvote
    setThread((prevThread) => {
      if (!prevThread) return prevThread;
      const newUpvotes = prevThread.upvotes.includes(currentUserId)
        ? prevThread.upvotes.filter((id) => id !== currentUserId)
        : [...prevThread.upvotes, currentUserId];
      return { ...prevThread, upvotes: newUpvotes };
    });
    Alert.alert('Upvote', 'Thread upvoted/unupvoted!');
  };

  const handleBookmark = () => {
    // In a real app, send API call to bookmark
    setThread((prevThread) => {
      if (!prevThread) return prevThread;
      const newBookmarks = prevThread.bookmarks.includes(currentUserId)
        ? prevThread.bookmarks.filter((id) => id !== currentUserId)
        : [...prevThread.bookmarks, currentUserId];
      return { ...prevThread, bookmarks: newBookmarks };
    });
    Alert.alert('Bookmark', 'Thread bookmarked/unbookmarked!');
  };

  const handleAddComment = () => {
    if (commentText.trim() === '') {
      Alert.alert('Error', 'Comment cannot be empty.');
      return;
    }
    const newComment: Comment = {
      id: `c${Date.now()}`,
      threadId: thread.id,
      authorId: currentUserId,
      authorName: 'Current User', // Replace with actual user name
      content: commentText,
      createdAt: Date.now(),
    };
    // In a real app, send API call to add comment
    setThread((prevThread) => {
      if (!prevThread) return prevThread;
      return { ...prevThread, comments: [...prevThread.comments, newComment] };
    });
    setCommentText('');
    Alert.alert('Comment', 'Comment added!');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // Adjust as needed
    >
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.threadTitle}>{thread.title}</Text>
        <Text style={styles.threadAuthor}>By {thread.authorName} on {new Date(thread.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.threadContent}>{thread.content}</Text>

        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={handleUpvote} style={styles.actionButton}>
            <Ionicons name={thread.upvotes.includes(currentUserId) ? "arrow-up-circle" : "arrow-up-circle-outline"} size={24} color={thread.upvotes.includes(currentUserId) ? "#007BFF" : "#333"} />
            <Text style={styles.actionText}>{thread.upvotes.length} Upvotes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
            <Ionicons name={thread.bookmarks.includes(currentUserId) ? "bookmark" : "bookmark-outline"} size={24} color={thread.bookmarks.includes(currentUserId) ? "#007BFF" : "#333"} />
            <Text style={styles.actionText}>Bookmark</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.commentsTitle}>Comments ({thread.comments.length})</Text>
        {thread.comments.length === 0 ? (
          <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
        ) : (
          <View>
            {thread.comments.map((comment) => (
              <View key={comment.id} style={styles.commentContainer}>
                <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <Text style={styles.commentDate}>{new Date(comment.createdAt).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <AppButton title="Comment" onPress={handleAddComment} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 100, // To make space for the comment input
  },
  threadTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  threadAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  threadContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 5,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#333',
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  commentContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#555',
  },
  commentContent: {
    fontSize: 16,
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    textAlign: 'right',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  noCommentsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: 'red',
  },
});

export default ThreadView; 