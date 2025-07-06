import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Group } from '../../types';

const mockGroups: Group[] = [
  {
    id: 'g1',
    name: 'Machine Learning Enthusiasts',
    description: 'A group for discussing advanced machine learning concepts.',
    members: ['user1', 'user2', 'user3'],
    isPrivate: true,
    threads: ['t1', 't2'],
  },
  {
    id: 'g2',
    name: 'AI Ethics Roundtable',
    description: 'Discussions on the ethical implications of AI development.',
    members: ['user1', 'user4'],
    isPrivate: false,
    threads: ['t3'],
  },
  {
    id: 'g3',
    name: 'Robotics Project Collaboration',
    description: 'A private group for members collaborating on robotics projects.',
    members: ['user2', 'user5'],
    isPrivate: true,
    threads: [],
  },
];

interface GroupListProps {
  navigation: any;
}

const GroupList: React.FC<GroupListProps> = ({ navigation }) => {
  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity style={styles.groupCard} onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}> {/* Assuming GroupDetails is the route for group details */}
      <Text style={styles.groupName}>{item.name}</Text>
      <Text style={styles.groupDescription}>{item.description}</Text>
      <Text style={styles.groupMembers}>{item.members.length} Members</Text>
      {item.isPrivate && <Text style={styles.privateTag}>Private</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Groups</Text>
      <FlatList
        data={mockGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroupItem}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={styles.createGroupButton} onPress={() => navigation.navigate('CreateGroup')}> {/* Assuming CreateGroup is the route for creating groups */}
        <Text style={styles.createGroupButtonText}>+</Text>
      </TouchableOpacity>
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
  listContent: {
    paddingBottom: 20,
  },
  groupCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  groupMembers: {
    fontSize: 12,
    color: '#888',
  },
  privateTag: {
    fontSize: 12,
    color: '#007BFF',
    fontWeight: 'bold',
    marginTop: 5,
  },
  createGroupButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007BFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 30,
  },
});

export default GroupList; 