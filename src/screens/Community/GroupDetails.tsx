import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Group, Thread } from '../../types';
import { AppButton } from '../../components';

type GroupDetailsRouteProp = RouteProp<{ GroupDetails: { groupId: string } }, 'GroupDetails'>;

interface GroupDetailsProps {
  route: GroupDetailsRouteProp;
  navigation: any;
}

// Mock Data - In a real app, fetch from API
const mockGroups: Group[] = [
  {
    id: 'g1',
    name: 'Machine Learning Enthusiasts',
    description: 'A group for discussing advanced machine learning concepts, research papers, and implementation details.',
    members: ['user1', 'user2', 'user3', 'user5'],
    isPrivate: true,
    threads: ['t1', 't2'],
  },
  {
    id: 'g2',
    name: 'AI Ethics Roundtable',
    description: 'Open discussions on the ethical implications of AI development, bias in algorithms, and responsible AI practices.',
    members: ['user1', 'user4'],
    isPrivate: false,
    threads: ['t3'],
  },
];

const mockThreads: Thread[] = [
  {
    id: 't1',
    title: 'Deep Learning for Image Recognition',
    content: 'Exploring the latest breakthroughs in CNNs and their applications.',
    authorId: 'user1',
    authorName: 'Alice',
    createdAt: Date.now() - 3600000 * 2,
    categoryId: 'ml',
    comments: [], upvotes: [], bookmarks: [], views: 50,
  },
  {
    id: 't2',
    title: 'Reinforcement Learning Basics',
    content: 'A beginner-friendly introduction to RL algorithms.',
    authorId: 'user2',
    authorName: 'Bob',
    createdAt: Date.now() - 3600000 * 8,
    categoryId: 'ml',
    comments: [], upvotes: [], bookmarks: [], views: 30,
  },
  {
    id: 't3',
    title: 'AI Bias in Healthcare Algorithms',
    content: 'Discussing fairness and accountability in AI applications for healthcare.',
    authorId: 'user4',
    authorName: 'David',
    createdAt: Date.now() - 3600000 * 1,
    categoryId: 'ethics',
    comments: [], upvotes: [], bookmarks: [], views: 70,
  },
];

const GroupDetails: React.FC<GroupDetailsProps> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const currentUserId = 'user1'; // Mock current user

  const group = mockGroups.find(g => g.id === groupId);

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Group not found.</Text>
      </View>
    );
  }

  const isMember = group.members.includes(currentUserId);
  const groupThreads = mockThreads.filter(thread => group.threads.includes(thread.id));

  const handleJoinLeaveGroup = () => {
    if (isMember) {
      Alert.alert('Leave Group', `You have left ${group.name}.`);
      // In a real app: API call to leave group
    } else {
      Alert.alert('Join Group', `You have joined ${group.name}.`);
      // In a real app: API call to join group
    }
    // For mock data, you might update the mockGroups array here if needed
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.groupDescription}>{group.description}</Text>
      <Text style={styles.memberCount}>{group.members.length} Members</Text>
      {group.isPrivate && <Text style={styles.privateTag}>Private Group</Text>}

      <AppButton
        title={isMember ? "Leave Group" : "Join Group"}
        onPress={handleJoinLeaveGroup}
        buttonStyle={isMember ? styles.leaveButton : styles.joinButton}
      />

      <Text style={styles.threadsTitle}>Group Threads</Text>
      {groupThreads.length === 0 ? (
        <Text style={styles.noThreadsText}>No threads in this group yet.</Text>
      ) : (
        groupThreads.map(thread => (
          <TouchableOpacity
            key={thread.id}
            style={styles.threadCard}
            onPress={() => navigation.navigate('ThreadView', { threadId: thread.id })}
          >
            <Text style={styles.threadTitleCard}>{thread.title}</Text>
            <Text style={styles.threadAuthorCard}>By {thread.authorName}</Text>
          </TouchableOpacity>
        ))
      )}

      {isMember && (
        <AppButton
          title="Create New Group Thread"
          onPress={() => navigation.navigate('CreatePost', { categoryId: group.id, isGroupThread: true })} // Pass group ID for new thread
          buttonStyle={styles.createThreadButton}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  groupName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  groupDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 10,
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  privateTag: {
    fontSize: 14,
    color: '#007BFF',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  joinButton: {
    backgroundColor: '#28a745',
    marginBottom: 20,
  },
  leaveButton: {
    backgroundColor: '#dc3545',
    marginBottom: 20,
  },
  threadsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
    color: '#333',
  },
  threadCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  threadTitleCard: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  threadAuthorCard: {
    fontSize: 13,
    color: '#666',
  },
  noThreadsText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  createThreadButton: {
    marginTop: 20,
    backgroundColor: '#007BFF',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: 'red',
  },
});

export default GroupDetails; 