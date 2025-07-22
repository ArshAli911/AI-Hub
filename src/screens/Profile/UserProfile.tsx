import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { AppButton, Avatar } from '../../components';
import { User } from '../../types';

// Mock user data
const mockUser: User = {
  id: 'user123',
  email: 'john.doe@example.com',
  username: 'JohnDoe',
  token: 'mock_token',
  // Add more user data as needed
  // For display purposes, adding a profile picture and some stats
  name: 'John Doe',
  profilePicture: 'https://via.placeholder.com/150/007BFF/FFFFFF?text=JD',
  photoURL: 'https://via.placeholder.com/150/007BFF/FFFFFF?text=JD',
  bio: 'Passionate about AI and technology. Always learning and exploring new ideas.',
  followers: 120,
  following: 80,
  posts: 45,
};

interface UserProfileProps {
  navigation: any; // Replace with proper navigation type
}

const UserProfile: React.FC<UserProfileProps> = ({ navigation }) => {
  const user = mockUser; // In a real app, fetch user data

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Avatar imageUrl={user.profilePicture} size={100} />
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.bio}>{user.bio}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <AppButton title="Edit Profile" onPress={() => navigation.navigate('EditProfile')} /> {/* Update 'EditProfile' with actual route */}
        <AppButton title="Logout" onPress={() => { /* Handle logout */ }} color="red" />
      </View>

      {/* Navigation to User's Posts, Projects, Feedback */}
      <View style={styles.contentSection}>
        <TouchableOpacity style={styles.contentOption} onPress={() => console.log('Navigate to My Posts')}> {/* Link to user's posts */}
          <Text style={styles.contentOptionText}>My Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contentOption} onPress={() => navigation.navigate('PrototypeScreen', { userId: user.id })}> {/* Link to user's prototypes */}
          <Text style={styles.contentOptionText}>My Prototypes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contentOption} onPress={() => console.log('Navigate to My Feedback')}> {/* Link to user's feedback */}
          <Text style={styles.contentOptionText}>My Feedback</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Content / Preferences */}
      <View style={styles.contentSection}>
        <TouchableOpacity style={styles.contentOption} onPress={() => console.log('Navigate to Saved Content')}> {/* Link to saved content */}
          <Text style={styles.contentOptionText}>Saved Content</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contentOption} onPress={() => console.log('Navigate to Preferences')}> {/* Link to preferences */}
          <Text style={styles.contentOptionText}>Preferences</Text>
        </TouchableOpacity>
      </View>
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
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  name: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  actionsContainer: {
    padding: 10,
  },
  contentSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contentOptionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default UserProfile; 