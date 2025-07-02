// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/Home/HomeScreen';
import MentorsScreen from '../screens/Mentors/MentorsScreen';
// Import other screens as they are created

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Mentors" component={MentorsScreen} />
        {/* Add more tabs here */}
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 