import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { AppButton } from '../../components';

interface UploadPrototypeProps {
  navigation: any; // Replace with proper navigation type
}

const UploadPrototype: React.FC<UploadPrototypeProps> = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload New Prototype</Text>
      <TextInput
        style={styles.input}
        placeholder="Prototype Name"
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Prototype Description"
        multiline
        numberOfLines={6}
      />
      <TextInput
        style={styles.input}
        placeholder="Image URL (Optional)"
        keyboardType="url"
        autoCapitalize="none"
      />
      <AppButton title="Upload Prototype" onPress={() => { /* Handle prototype upload */ navigation.goBack(); }} />
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
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  cancelButtonText: {
    marginTop: 15,
    color: '#888',
    textAlign: 'center',
  },
});

export default UploadPrototype; 