import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { AppButton, Avatar } from '../../components';
import { User } from '../../types';

// Mock user data for editing
const mockUser: User = {
  id: 'user123',
  email: 'john.doe@example.com',
  username: 'JohnDoe',
  token: 'mock_token',
  name: 'John Doe',
  profilePicture: 'https://via.placeholder.com/150/007BFF/FFFFFF?text=JD',
  bio: 'Passionate about AI and technology. Always learning and exploring new ideas.',
};

interface EditProfileProps {
  navigation: any; // Replace with proper navigation type
}

const EditProfile: React.FC<EditProfileProps> = ({ navigation }) => {
  const [name, setName] = React.useState(mockUser.name || '');
  const [username, setUsername] = React.useState(mockUser.username || '');
  const [bio, setBio] = React.useState(mockUser.bio || '');
  const [profilePicture, setProfilePicture] = React.useState(mockUser.profilePicture || '');

  const handleSave = () => {
    // Handle saving profile changes
    console.log('Saving profile:', { name, username, bio, profilePicture });
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <View style={styles.avatarContainer}>
        <Avatar imageUrl={profilePicture} size={100} />
        <TouchableOpacity onPress={() => { /* Handle change profile picture */ }}>
          <Text style={styles.changeAvatarText}>Change Profile Picture</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
      />
      
      <AppButton title="Save Changes" onPress={handleSave} />
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  changeAvatarText: {
    color: '#007BFF',
    marginTop: 10,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  cancelButtonText: {
    marginTop: 15,
    color: '#888',
    textAlign: 'center',
  },
});

export default EditProfile; 