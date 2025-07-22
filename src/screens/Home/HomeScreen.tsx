import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/routers';
import { Ionicons } from '@expo/vector-icons';

import { Colors, AppRoutes } from '../../constants';
import { AppButton, MentorCard, PostCard, ProductTile } from '../../components';
import { Mentor, Post, Product } from '../../types';
import usePaginatedData from '../../hooks/usePaginatedData';

// Define your navigation parameter lists
// Import the types from navigation instead of redefining them
import { RootTabParamList, MentorsStackParamList, CommunityStackParamList, PrototypeStackParamList } from '../../navigation/AppNavigator';

// Define the navigation prop for HomeScreen
type HomeScreenNavigationProp = NavigationProp<
  RootTabParamList,
  keyof RootTabParamList // The top-level routes that HomeScreen can navigate to
>;

const mockMentors: Mentor[] = [
  {
    _id: '101',
    id: '101',
    firstName: 'Dr. Anya',
    lastName: 'Sharma',
    name: 'Dr. Anya Sharma',
    title: 'AI Ethics & Governance',
    specialty: 'AI Ethics',
    bio: 'Specializing in responsible AI development and policy.',
    imageUrl: 'https://via.placeholder.com/100/FF5733/FFFFFF?text=AS',
  },
  {
    _id: '102',
    id: '102',
    firstName: 'Mark',
    lastName: 'Jansen',
    name: 'Mark Jansen',
    title: 'Machine Learning Engineer',
    specialty: 'Machine Learning',
    bio: 'Expert in natural language processing and computer vision.',
    imageUrl: 'https://via.placeholder.com/100/33FF57/FFFFFF?text=MJ',
  },
];

const mockTrendingPosts: Post[] = [
  {
    id: '201',
    title: 'The Future of Generative AI in Art',
    content: 'Exploring the new frontiers where AI meets creativity.',
    authorId: 'userArt',
    authorName: 'CreativeAI',
    createdAt: Date.now() - 3600000 * 24 * 2,
  },
  {
    id: '202',
    title: 'Decentralized AI: A New Paradigm?',
    content: 'Discussing the implications of blockchain on AI development.',
    authorId: 'userDecentral',
    authorName: 'BlockBrain',
    createdAt: Date.now() - 3600000 * 24 * 3,
  },
  {
    id: '203',
    title: 'AI in Healthcare: A Revolution in Progress',
    content: 'Examining the impact of AI on diagnostics and patient care.',
    authorId: 'userHealth',
    authorName: 'MediMind',
    createdAt: Date.now() - 3600000 * 24 * 4,
  },
  {
    id: '204',
    title: 'The Role of AI in Climate Change Mitigation',
    content: 'How artificial intelligence can help combat environmental challenges.',
    authorId: 'userClimate',
    authorName: 'EcoAI',
    createdAt: Date.now() - 3600000 * 24 * 5,
  },
  {
    id: '205',
    title: 'Personalized Learning AI: A New Paradigm?',
    content: 'Discussing the implications of blockchain on AI development.',
    authorId: 'userDecentral',
    authorName: 'BlockBrain',
    createdAt: Date.now() - 3600000 * 24 * 6,
  },
  {
    id: '206',
    title: 'AI in Healthcare: A Revolution in Progress',
    content: 'Examining the impact of AI on diagnostics and patient care.',
    authorId: 'userHealth',
    authorName: 'MediMind',
    createdAt: Date.now() - 3600000 * 24 * 7,
  },
  {
    id: '207',
    title: 'The Role of AI in Climate Change Mitigation',
    content: 'How artificial intelligence can help combat environmental challenges.',
    authorId: 'userClimate',
    authorName: 'EcoAI',
    createdAt: Date.now() - 3600000 * 24 * 8,
  },
];

const mockTrendingPrototypes: Product[] = [
  {
    id: '301',
    name: 'Emotion Recognition API',
    description: 'A new API that analyzes facial expressions for sentiment.',
    price: 0,
    imageUrl: 'https://via.placeholder.com/150/3366FF/FFFFFF?text=ER',
  },
  {
    id: '302',
    name: 'Personalized Learning AI',
    description: 'Adaptive AI platform for customized educational paths.',
    price: 0,
    imageUrl: 'https://via.placeholder.com/150/FF33CC/FFFFFF?text=PL',
  },
];

const mockEvents = [
  {
    id: 'e1',
    title: 'AI Ethics Summit',
    date: 'Nov 15-17, 2023',
    location: 'Virtual',
  },
  {
    id: 'e2',
    title: 'Robotics & AI Webinar',
    date: 'Dec 1, 2023',
    location: 'Online',
  },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Simulate fetching posts from an API with pagination
  const fetchPosts = async (page: number, limit: number): Promise<Post[]> => {
    // In a real app, you'd make an API call here, e.g., communityApi.getThreads(page, limit)
    console.log(`Fetching posts - Page: ${page}, Limit: ${limit}`);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = mockTrendingPosts.slice(startIndex, endIndex);
    return new Promise((resolve) => setTimeout(() => resolve(paginatedPosts), 1000)); // Simulate network delay
  };

  const { data: trendingPosts, loading: loadingPosts, hasMore: hasMorePosts, loadMore: loadMorePosts } = usePaginatedData({ fetchData: fetchPosts, initialLimit: 3 });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.header}>AI Hub</Text>

        {/* Quick Access Buttons */}
        <View style={styles.quickAccessContainer}>
          <AppButton
            title="Post Idea"
            onPress={() => navigation.navigate('Community', { screen: 'CreatePost' })}
            color={Colors.primary}
          />
          <AppButton
            title="Upload Prototype"
            onPress={() => navigation.navigate('Prototype', { screen: 'UploadPrototype' })}
            color={Colors.accent}
          />
        </View>

        {/* Personalized Feed - Mentor Highlights */}
        <Text style={styles.sectionTitle}>Featured Mentors</Text>
        <FlatList
          data={mockMentors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MentorCard mentor={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
        />

        {/* Upcoming Events */}
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        <View style={styles.sectionContainer}>
          {mockEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventMeta}>{event.date} | {event.location}</Text>
            </View>
          ))}
        </View>

        {/* Trending Discussions */}
        <Text style={styles.sectionTitle}>Trending Discussions</Text>
        <FlatList
          data={trendingPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            loadingPosts && hasMorePosts ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          )}
        />

        {/* Trending Prototypes */}
        <Text style={styles.sectionTitle}>Trending Prototypes</Text>
        <FlatList
          data={mockTrendingPrototypes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductTile product={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
        />
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
    paddingTop: 15,
    paddingHorizontal: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.text,
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 15,
    marginBottom: 10,
  },
  horizontalListContent: {
    paddingRight: 15,
  },
  sectionContainer: {
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
  eventCard: {
    marginBottom: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  eventMeta: {
    fontSize: 14,
    color: Colors.lightText,
  },
});

export default HomeScreen; 