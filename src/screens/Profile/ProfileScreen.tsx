import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar'; // Import Avatar component
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { ProfileScreenNavigationProp } from '../../types/navigation'; // Import the new navigation type

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleEditProfile = () => {
    // Navigate to the EditProfile screen directly within the Profile stack
    navigation.navigate('EditProfile');
  };

  const handleUpdateSettings = () => {
    // Navigate to a settings screen (e.g., Notification Preferences or a general settings screen)
    console.log('Navigate to Update Settings'); // Placeholder for now
  };

  const handlePrivacySettings = () => {
    // Navigate to a privacy settings screen
    console.log('Navigate to Privacy Settings'); // Placeholder for now
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.header}>Your Profile</Text>

        {/* User Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.avatarContainer}>
            <Avatar imageUrl={user?.photoURL} size={100} />
            <Text style={styles.userName}>{user?.displayName || 'Guest User'}</Text>
          </View>
          <Text style={styles.sectionContent}>Name: {user?.name || 'Guest'}</Text>
          <Text style={styles.sectionContent}>Email: {user?.email || 'N/A'}</Text>
          <Button title="Edit Profile" onPress={handleEditProfile} style={styles.editButton} />
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={styles.sectionContent}>- Notification Preferences</Text>
          <Text style={styles.sectionContent}>- Privacy Settings</Text>
          <Button title="Update Settings" onPress={handleUpdateSettings} style={styles.editButton} />
          <Button title="Privacy Settings" onPress={handlePrivacySettings} style={styles.editButton} />
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Button title="Logout" onPress={signOut} style={styles.logoutButton} textStyle={styles.logoutButtonText} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollViewContent: {
    padding: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.darkGray,
  },
  sectionContent: {
    fontSize: 16,
    color: Colors.lightText,
    lineHeight: 24,
  },
  editButton: {
    marginTop: 15,
    backgroundColor: Colors.accent,
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: Colors.error,
  },
  logoutButtonText: {
    color: Colors.white,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    color: Colors.text,
  },
});

export default ProfileScreen; 