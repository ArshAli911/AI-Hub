import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MentorCard } from '../../components';
import { Mentor } from '../../types';
import { MentorsStackParamList } from '../../navigation/AppNavigator';

// Define the navigation prop for MentorListScreen
type MentorListScreenNavigationProp = StackNavigationProp<MentorsStackParamList, 'Mentors'>;

const mockMentors: Mentor[] = [
  {
    _id: '1',
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    title: 'AI/ML Specialist',
    specialty: 'Machine Learning',
    bio: 'Experienced in machine learning and deep learning, with a focus on natural language processing.',
    imageUrl: 'https://via.placeholder.com/150',
    domain: 'Machine Learning',
    availability: 'Weekdays',
    price: 50,
    hourlyRate: 50,
  },
  {
    _id: '2',
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    name: 'Jane Smith',
    title: 'Data Science Lead',
    specialty: 'Data Science',
    bio: 'Passionate about data-driven insights and building scalable data solutions.',
    imageUrl: 'https://via.placeholder.com/150',
    domain: 'Data Science',
    availability: 'Weekends',
    price: 75,
    hourlyRate: 75,
  },
  {
    _id: '3',
    id: '3',
    firstName: 'Alice',
    lastName: 'Johnson',
    name: 'Alice Johnson',
    title: 'NLP Expert',
    specialty: 'Natural Language Processing',
    bio: 'Deep understanding of natural language processing techniques and applications.',
    imageUrl: 'https://via.placeholder.com/150',
    domain: 'Natural Language Processing',
    availability: 'Weekdays',
    price: 60,
    hourlyRate: 60,
  },
  {
    _id: '4',
    id: '4',
    firstName: 'Bob',
    lastName: 'Williams',
    name: 'Bob Williams',
    title: 'Computer Vision Engineer',
    specialty: 'Computer Vision',
    bio: 'Skilled in image and video analysis using advanced computer vision models.',
    imageUrl: 'https://via.placeholder.com/150',
    domain: 'Computer Vision',
    availability: 'Weekends',
    price: 80,
    hourlyRate: 80,
  },
];

const MentorList: React.FC = () => {
  const navigation = useNavigation<MentorListScreenNavigationProp>();
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('');
  const [priceFilter, setPriceFilter] = useState<string>('');

  const filteredMentors = mockMentors.filter((mentor) => {
    const matchesDomain = domainFilter ? mentor.domain?.toLowerCase().includes(domainFilter.toLowerCase()) : true;
    const matchesAvailability = availabilityFilter ? mentor.availability?.toLowerCase().includes(availabilityFilter.toLowerCase()) : true;
    const matchesPrice = priceFilter ? (mentor.price !== undefined && mentor.price <= parseInt(priceFilter)) : true;
    return matchesDomain && matchesAvailability && matchesPrice;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mentors</Text>

      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by Domain"
          value={domainFilter}
          onChangeText={setDomainFilter}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by Availability (e.g., Weekdays)"
          value={availabilityFilter}
          onChangeText={setAvailabilityFilter}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by Max Price"
          value={priceFilter}
          onChangeText={setPriceFilter}
          keyboardType="numeric"
        />
      </View>

      <FlatList
        data={filteredMentors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('MentorProfile', { mentorId: item.id })}>
            <MentorCard mentor={item} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  filterInput: {
    flex: 1,
    minWidth: '48%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 5,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default MentorList; 