// src/screens/Marketplace/MarketplaceScreen.tsx

import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

const MarketplaceScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        <Text style={styles.header}>AI Marketplace</Text>

        {/* Browse Products/Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products & Services</Text>
          <Text style={styles.sectionContent}>
            - AI Model A: Image Recognition
            - AI Service B: Custom Chatbot Development
          </Text>
        </View>

        {/* Featured Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Items</Text>
          <Text style={styles.sectionContent}>
            - Premium NLP API
            - AI-powered Analytics Dashboard
          </Text>
        </View>

        {/* Sell Your AI Solution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sell Your Solution</Text>
          <Text style={styles.sectionContent}>
            - List your AI models, datasets, or services here.
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

export default MarketplaceScreen; 