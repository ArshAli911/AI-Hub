// src/screens/Community/CommunityScreen.tsx

import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

const CommunityScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.header}>AI Community Hub</Text>

        {/* Trending Discussions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Discussions</Text>
          <Text style={styles.sectionContent}>
            - Discussion: Generative AI in Art
            - Discussion: Ethical AI Development
          </Text>
        </View>

        {/* Groups and Forums */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Groups & Forums</Text>
          <Text style={styles.sectionContent}>
            - Group: Machine Learning Enthusiasts
            - Forum: AI Ethics Roundtable
          </Text>
        </View>

        {/* Events and Meetups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events & Meetups</Text>
          <Text style={styles.sectionContent}>
            - Virtual Meetup: Data Science Insights (Dec 1)
            - Local Meetup: AI in Healthcare (Dec 10)
          </Text>
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
});

export default CommunityScreen; 