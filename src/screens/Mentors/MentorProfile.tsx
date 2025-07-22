import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppButton } from '../../components';
import { Mentor, MentorSession } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { AppRoutes, Colors } from '../../constants';

// Import the types from navigation instead of redefining them
import { MentorsStackParamList } from '../../navigation/AppNavigator';

type MentorProfileRouteProp = RouteProp<{ MentorProfile: { mentorId: string } }, 'MentorProfile'>;

interface MentorProfileProps {
  route: MentorProfileRouteProp;
  navigation: StackNavigationProp<MentorsStackParamList, 'MentorProfile'>;
}

// Mock data for a mentor profile
const mockMentor: Mentor = {
  _id: '1',
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  name: 'John Doe',
  title: 'AI/ML Specialist',
  specialty: 'Machine Learning',
  bio: 'Experienced in machine learning and deep learning, with a focus on natural language processing. I have worked on various projects, from predictive analytics to natural language understanding, and am passionate about sharing my knowledge.',
  imageUrl: 'https://via.placeholder.com/150',
  domain: 'Machine Learning',
  availability: 'Weekdays',
  price: 50,
};

const mockMentorReviews = [
  { id: '1', user: 'Alice', rating: 5, comment: 'John is an excellent mentor! Very knowledgeable and helpful.' },
  { id: '2', user: 'Bob', rating: 4, comment: 'Great insights on NLP. Session was very productive.' },
];

const MentorProfile: React.FC<MentorProfileProps> = ({ route, navigation }) => {
  const { mentorId } = route.params; // Get mentorId from navigation params
  // In a real app, you would fetch mentor data using mentorId
  const mentor = mockMentor; // For now, use mock data

  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const handleBookSession = (type: 'chat' | 'video') => {
    Alert.alert(
      'Book Session',
      `You are about to request a ${type} session with ${mentor.name}. Do you want to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => Alert.alert('Session Booked', `A ${type} session with ${mentor.name} has been requested.`) },
      ]
    );
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating.');
      return;
    }
    // In a real app, send review and rating to backend
    Alert.alert('Review Submitted', `Thank you for rating ${mentor.name} with ${rating} stars!`);
    setRatingModalVisible(false);
    setRating(0);
    setReview('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        {mentor.imageUrl && <Image source={{ uri: mentor.imageUrl }} style={styles.avatar} />}
        <Text style={styles.name}>{mentor.name}</Text>
        <Text style={styles.title}>{mentor.title}</Text>
        {mentor.domain && <Text style={styles.detailText}>Domain: {mentor.domain}</Text>}
        {mentor.availability && <Text style={styles.detailText}>Availability: {mentor.availability}</Text>}
        {mentor.price && <Text style={styles.detailText}>Price: ${mentor.price}/hr</Text>}
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bio}>{mentor.bio}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <AppButton title="Request Chat Session" onPress={() => handleBookSession('chat')} />
        <AppButton title="Request Video Session" onPress={() => handleBookSession('video')} />
        <AppButton title="Rate/Review Mentor" onPress={() => setRatingModalVisible(true)} />
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {mockMentorReviews.map((reviewItem) => (
          <View key={reviewItem.id} style={styles.reviewCard}>
            <Text style={styles.reviewUser}>{reviewItem.user}</Text>
            <View style={styles.starContainer}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < reviewItem.rating ? 'star' : 'star-outline'}
                  size={20}
                  color={Colors.primary}
                />
              ))}
            </View>
            <Text style={styles.reviewComment}>{reviewItem.comment}</Text>
          </View>
        ))}
        {mockMentorReviews.length === 0 && <Text>No reviews yet.</Text>}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isRatingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Rate {mentor.name}</Text>
            <View style={styles.starRatingContainer}>
              {[...Array(5)].map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setRating(i + 1)}>
                  <Ionicons
                    name={i < rating ? 'star' : 'star-outline'}
                    size={30}
                    color={Colors.primary}
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review here..."
              multiline
              numberOfLines={4}
              value={review}
              onChangeText={setReview}
            />
            <AppButton title="Submit Review" onPress={handleSubmitReview} />
            <AppButton title="Cancel" onPress={() => setRatingModalVisible(false)} buttonStyle={styles.cancelButton} textStyle={styles.cancelButtonText} />
          </View>
        </View>
      </Modal>
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
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
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
  buttonsContainer: {
    flexDirection: 'column',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewUser: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  starRatingContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  starIcon: {
    marginHorizontal: 5,
  },
  reviewInput: {
    width: '100%',
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  cancelButton: {
    backgroundColor: Colors.gray,
    marginTop: 10,
  },
  cancelButtonText: {
    color: Colors.white,
  },
});

export default MentorProfile; 