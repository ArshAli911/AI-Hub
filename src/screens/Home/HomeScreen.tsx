import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import Button from '../../components/Button';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.header}>AI Companion Home</Text>

        {/* Personalized Feed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalized Feed</Text>
          <Text style={styles.sectionContent}>
            - Latest AI news: Lorem ipsum...
            - Mentor highlights: John Doe, AI Ethics Specialist
            - Event suggestions: AI for Good Summit
          </Text>
        </View>

        {/* Upcoming Hackathons / Webinars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <Text style={styles.sectionContent}>
            - Hackathon: AI for Climate Change (Oct 26-28)
            - Webinar: Deep Learning Fundamentals (Nov 5)
          </Text>
        </View>

        {/* Trending Discussions / Prototypes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending</Text>
          <Text style={styles.sectionContent}>
            - Discussion: Future of AGI
            - Prototype: AI-powered healthcare diagnostic tool
          </Text>
        </View>

        {/* Quick Access Buttons */}
        <View style={styles.quickAccessContainer}>
          <Button title="Post Idea" onPress={() => console.log('Post Idea')} style={styles.button} textStyle={styles.buttonText} />
          <Button title="Upload Prototype" onPress={() => console.log('Upload Prototype')} style={styles.button} textStyle={styles.buttonText} />
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
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 