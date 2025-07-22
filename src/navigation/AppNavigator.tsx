// src/navigation/AppNavigator.tsx

import React from "react";
import {
  NavigationContainer,
  RouteProp,
  NavigatorScreenParams,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons"; // Assuming you use Expo/Ionicons
import { ParamListBase } from "@react-navigation/routers"; // Import ParamListBase

import {
  HomeScreen,
  LoginScreen,
  RegisterScreen,
  SplashScreen,
  MentorListScreen,
  MentorProfileScreen,
  ForumHomeScreen,
  ThreadViewScreen,
  CreatePostScreen,
  MarketHomeScreen,
  ProductDetailsScreen,
  UploadProductScreen,
  UploadPrototypeScreen,
  FeedbackScreen,
  UserProfileScreen,
  EditProfileScreen,
} from "../screens/LazyScreens";
import { Colors } from "../constants";
import { useAuth } from "../context";

// Define individual stack param lists
export type AuthStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Register: undefined;
};
export type HomeStackParamList = {
  Home: undefined;
};

export type MentorsStackParamList = {
  Mentors: undefined;
  MentorProfile: { mentorId: string };
};

export type CommunityStackParamList = {
  Community: undefined;
  ThreadView: { postId: string };
  CreatePost: undefined;
};

export type MarketplaceStackParamList = {
  Marketplace: undefined;
  ProductDetails: { productId: string };
  UploadProduct: undefined;
};

export type PrototypeStackParamList = {
  Prototype: undefined;
  FeedbackScreen: { prototypeId: string };
  UploadPrototype: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
};
// Define the Root Tab Navigator's param list
export type RootTabParamList = {
  
  Home: NavigatorScreenParams<HomeStackParamList>;
  Mentors: NavigatorScreenParams<MentorsStackParamList>;
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Marketplace: NavigatorScreenParams<MarketplaceStackParamList>;
  Prototype: NavigatorScreenParams<PrototypeStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};
// Remove RootStackParamList and AppScreenProps for now, as they were causing issues.
// We'll define specific types for navigation where needed.

const AuthStack = createStackNavigator<AuthStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();

const MentorsStack = createStackNavigator<MentorsStackParamList>();
const CommunityStack = createStackNavigator<CommunityStackParamList>();
const MarketplaceStack = createStackNavigator<MarketplaceStackParamList>();
const PrototypeStack = createStackNavigator<PrototypeStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const AuthNavigator = () => (
<AuthStack.Navigator screenOptions={{ headerShown: false }}>
    
    <AuthStack.Screen name="Splash" component={SplashScreen} />
    <AuthStack.Screen name="Auth" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);
const HomeNavigator = () => (
<HomeStack.Navigator>
    
    <HomeStack.Screen name="Home" component={HomeScreen} />
  </HomeStack.Navigator>
);
const MentorsNavigator = () => (
<MentorsStack.Navigator>
    
    <MentorsStack.Screen name="Mentors" component={MentorListScreen} />
    <MentorsStack.Screen
      name="MentorProfile"
      component={MentorProfileScreen}
    />
  </MentorsStack.Navigator>
);
const CommunityNavigator = () => (
<CommunityStack.Navigator>
    
    <CommunityStack.Screen name="Community" component={ForumHomeScreen} />
    <CommunityStack.Screen
      name="ThreadView"
      component={(props: any) => <ThreadViewScreen {...props} />}
    />
    <CommunityStack.Screen name="CreatePost" component={CreatePostScreen} />
  </CommunityStack.Navigator>
);
const MarketplaceNavigator = () => (
<MarketplaceStack.Navigator>
    
    <MarketplaceStack.Screen name="Marketplace" component={MarketHomeScreen} />
    <MarketplaceStack.Screen
      name="ProductDetails"
      component={(props: any) => <ProductDetailsScreen {...props} />}
    />
    <MarketplaceStack.Screen
      name="UploadProduct"
      component={UploadProductScreen}
    />
  </MarketplaceStack.Navigator>
);

const PrototypeNavigator = () => (
  <PrototypeStack.Navigator>
    <PrototypeStack.Screen name="Prototype" component={UploadPrototypeScreen} />
    <PrototypeStack.Screen
      name="FeedbackScreen"
      component={(props: any) => <FeedbackScreen {...props} />}
    />
    <PrototypeStack.Screen
      name="UploadPrototype"
      component={UploadPrototypeScreen}
    />
  </PrototypeStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen name="Profile" component={UserProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
  </ProfileStack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth(); // Get user and loading state from useAuth

  if (loading) {
    return <SplashScreen />; // Show splash screen while auth state is loading
  }

  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator
          screenOptions={({
            route,
          }: {
            route: RouteProp<ParamListBase, string>;
          }) => ({
            tabBarIcon: ({
              focused,
              color,
              size,
            }: {
              focused: boolean;
              color: string;
              size: number;
            }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === "Home") {
                iconName = focused ? "home" : "home-outline";
              } else if (route.name === "Mentors") {
                iconName = focused ? "people" : "people-outline";
              } else if (route.name === "Community") {
                iconName = focused ? "chatbubbles" : "chatbubbles-outline";
              } else if (route.name === "Marketplace") {
                iconName = focused ? "cart" : "cart-outline";
              } else if (route.name === "Profile") {
                iconName = focused ? "person" : "person-outline";
              } else if (route.name === "Prototype") {
                iconName = focused ? "cube" : "cube-outline";
              } else {
                iconName = "help-circle"; // Default icon
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.gray,
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeNavigator} />
          <Tab.Screen name="Mentors" component={MentorsNavigator} />
          <Tab.Screen name="Community" component={CommunityNavigator} />
          <Tab.Screen name="Marketplace" component={MarketplaceNavigator} />
          <Tab.Screen name="Prototype" component={PrototypeNavigator} />
          <Tab.Screen name="Profile" component={ProfileNavigator} />
        </Tab.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
