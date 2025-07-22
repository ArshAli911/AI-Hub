import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mentor } from '../types';

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard: React.FC<MentorCardProps> = ({ mentor }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{mentor.name}</Text>
      <Text style={styles.title}>{mentor.title}</Text>
      <Text style={styles.bio}>{mentor.bio}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default MentorCard; 