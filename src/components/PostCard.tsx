import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Post } from '../types';
import { Colors } from '../constants';
import moment from 'moment';

interface PostCardProps {
  post: Post;
  onPress?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(post);
    }
  };

  const formattedDate = moment(post.createdAt).fromNow();

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.content} numberOfLines={2}>{post.content}</Text>
      <View style={styles.footer}>
        <Text style={styles.author}>By {post.authorName}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 280, // Fixed width for horizontal scrolling
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: Colors.text,
  },
  content: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  author: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: Colors.darkGray,
  },
});

export default React.memo(PostCard); 