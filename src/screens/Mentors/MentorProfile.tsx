import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppButton } from '../../components';
import { Mentor } from '../../types';

type MentorProfileRouteProp = RouteProp<{ MentorProfile: { mentorId: string } }, 'MentorProfile'>;

interface MentorProfileProps {
  route: MentorProfileRouteProp;
  // navigation: StackNavigationProp<any, 'MentorProfile'>; // You might use this if navigating from here
}

// Mock data for a mentor profile
const mockMentor: Mentor = {
  id: '1',
  name: 'John Doe',
  title: 'AI/ML Specialist',
  bio: 'Experienced in machine learning and deep learning, with a focus on natural language processing. I have worked on various projects, from predictive analytics to natural language understanding, and am passionate about sharing my knowledge.',
  imageUrl: 'https://via.placeholder.com/150',
};

const MentorProfile: React.FC<MentorProfileProps> = ({ route }) => {
  const { mentorId } = route.params; // Get mentorId from navigation params
  // In a real app, you would fetch mentor data using mentorId
  const mentor = mockMentor; // For now, use mock data

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        {mentor.imageUrl && <Image source={{ uri: mentor.imageUrl }} style={styles.avatar} />}
        <Text style={styles.name}>{mentor.name}</Text>
        <Text style={styles.title}>{mentor.title}</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bio}>{mentor.bio}</Text>
        {/* Add more mentor details like skills, experience, etc. */}
      </View>
      <AppButton title="Book a Session" onPress={() => { /* Handle booking */ }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    color: '#666',
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});

export default MentorProfile; 