import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.header}>Your Profile</Text>

        {/* User Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionContent}>Name: {user?.name || 'Guest'}</Text>
          <Text style={styles.sectionContent}>Email: {user?.email || 'N/A'}</Text>
          <Button title="Edit Profile" onPress={() => console.log('Edit Profile')} style={styles.editButton} />
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Text style={styles.sectionContent}>- Notification Preferences</Text>
          <Text style={styles.sectionContent}>- Privacy Settings</Text>
          <Button title="Update Settings" onPress={() => console.log('Update Settings')} style={styles.editButton} />
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
});

export default ProfileScreen; 