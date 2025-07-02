import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MentorCard } from '../../components';
import { Mentor } from '../../types';

const mockMentors: Mentor[] = [
  {
    id: '1',
    name: 'John Doe',
    title: 'AI/ML Specialist',
    bio: 'Experienced in machine learning and deep learning, with a focus on natural language processing.',
    imageUrl: 'https://via.placeholder.com/150',
  },
  {
    id: '2',
    name: 'Jane Smith',
    title: 'Data Science Lead',
    bio: 'Passionate about data-driven insights and building scalable data solutions.',
    imageUrl: 'https://via.placeholder.com/150',
  },
  // Add more mock mentors as needed
];

const MentorList: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mentors</Text>
      <FlatList
        data={mockMentors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MentorCard mentor={item} />}
        contentContainerStyle={styles.listContent}
      />
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
});

export default MentorList; 