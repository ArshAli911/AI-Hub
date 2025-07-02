import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants';

const Splash: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI-Hub</Text>
      <ActivityIndicator size="large" color={Colors.primary} />
      {/* Add your splash screen content here, e.g., logo, loading indicator */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 20,
  },
});

export default Splash; 