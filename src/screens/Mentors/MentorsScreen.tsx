import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';
import Button from '../../components/Button';

const MentorsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Find Your AI Mentor</Text>

      {/* Browse Mentors with Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse Mentors</Text>
        <TextInput style={styles.searchInput} placeholder="Search by domain or name..." />
        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Domain</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Price</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionContent}>
          - Mentor 1: Dr. AI (NLP Specialist)
          - Mentor 2: Data Wizard (Machine Learning)
          - Mentor 3: Code Guru (AI Ethics)
        </Text>
      </View>

      {/* Request Mentorship Session */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Session</Text>
        <TextInput style={styles.textInput} placeholder="Enter mentor's name" />
        <TextInput style={styles.textArea} placeholder="Describe your needs (chat/video)" multiline />
        <Button title="Submit Request" onPress={() => console.log('Submit Request')} style={styles.button} textStyle={styles.buttonText} />
      </View>

      {/* Rate/Review Mentors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rate & Review</Text>
        <TextInput style={styles.textInput} placeholder="Mentor's name" />
        <TextInput style={styles.textArea} placeholder="Your review (1-5 stars)" multiline />
        <Button title="Submit Review" onPress={() => console.log('Submit Review')} style={styles.button} textStyle={styles.buttonText} />
      </View>

      {/* View Booked Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booked Sessions</Text>
        <Text style={styles.sectionContent}>
          - Nov 10, 2 PM with Dr. AI (NLP)
          - Nov 15, 4 PM with Data Wizard (ML)
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  searchInput: {
    height: 40,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: Colors.gray,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  filterButtonText: {
    color: Colors.darkGray,
    fontWeight: 'bold',
  },
  textInput: {
    height: 40,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MentorsScreen; 