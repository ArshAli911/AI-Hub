import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { AppButton, Avatar } from '../../components';
import { User } from '../../types'; // Import the updated User type
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import * as ImagePicker from 'expo-image-picker'; // Assuming Expo for image picking
import { uploadFile } from '../../utils/uploadFile'; // Import file upload utility
import { authApi } from '../../api/auth.api'; // Import authApi for user updates
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

interface EditProfileProps {
  navigation: any; // Replace with proper navigation type if needed later, but for now it's not directly used from props
}

const EditProfile: React.FC<EditProfileProps> = () => {
  const { user, signOut } = useAuth(); // Get user and signOut from AuthContext
  const navigation = useNavigation(); // Get navigation hook

  const [name, setName] = React.useState(user?.name || user?.displayName || '');
  const [username, setUsername] = React.useState(user?.username || '');
  const [bio, setBio] = React.useState(user?.bio || '');
  const [photoURL, setPhotoURL] = React.useState(user?.photoURL || '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Request permission to access media library
  React.useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
      }
    })();
  }, []);

  const handleChoosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setLoading(true);
        setError(null);

        // Upload the selected image to Firebase Storage
        const fileUrl = await uploadFile(selectedAsset.uri, `avatars/${user?.id}`, selectedAsset.mimeType || 'image/jpeg');

        if (fileUrl) {
          setPhotoURL(fileUrl);
          // Update the user's avatar URL in the backend via authApi
          if (user?.id) {
            await authApi.updateUser(user.id, { photoURL: fileUrl });
            // Optionally, update the user context if needed, though onAuthStateChanged should handle it
            console.log('Avatar updated successfully!');
          }
        }
      }
    } catch (err) {
      console.error('Error picking or uploading image:', err);
      setError('Failed to upload image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return; // Ensure user is logged in

    setLoading(true);
    setError(null);
    try {
      const updates = {
        displayName: name,
        username,
        bio,
        photoURL, // Include photoURL in the updates
      };
      // Call the API to update the user profile
      await authApi.updateUser(user.id, updates);
      console.log('Profile saved successfully!');
      navigation.goBack(); // Go back to previous screen after saving
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile changes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <View style={styles.avatarContainer}>
        <Avatar imageUrl={photoURL} size={100} />
        <TouchableOpacity onPress={handleChoosePhoto} disabled={loading}>
          <Text style={styles.changeAvatarText}>{loading ? 'Uploading...' : 'Change Profile Picture'}</Text>
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
      
      <AppButton title={loading ? 'Saving...' : 'Save Changes'} onPress={handleSave} disabled={loading} />
      <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default EditProfile; 