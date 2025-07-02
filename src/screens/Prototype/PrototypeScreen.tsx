// src/screens/Prototype/PrototypeScreen.tsx

import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

const PrototypeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.header}>Prototype Showcase</Text>

        {/* Your Prototypes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Prototypes</Text>
          <Text style={styles.sectionContent}>
            - Prototype A: AI-powered Image Editor
            - Prototype B: Smart Home Automation
          </Text>
        </View>

        {/* Explore Community Prototypes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Community Prototypes</Text>
          <Text style={styles.sectionContent}>
            - Community Prototype 1: AI-driven Music Composition
            - Community Prototype 2: Predictive Analytics for Sports
          </Text>
        </View>

        {/* Upload New Prototype */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload New Prototype</Text>
          <Text style={styles.sectionContent}>
            - Share your innovative AI solutions with the community.
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

export default PrototypeScreen; 