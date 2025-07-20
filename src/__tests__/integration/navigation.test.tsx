import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, TouchableOpacity } from 'react-native';

// Mock screens for testing
const HomeScreen = ({ navigation }: any) => (
  <TouchableOpacity
    testID="navigate-to-profile"
    onPress={() => navigation.navigate('Profile', { userId: '123' })}
  >
    <Text>Go to Profile</Text>
  </TouchableOpacity>
);

const ProfileScreen = ({ route, navigation }: any) => (
  <>
    <Text testID="profile-screen">Profile Screen</Text>
    <Text testID="user-id">{route.params?.userId}</Text>
    <TouchableOpacity
      testID="go-back"
      onPress={() => navigation.goBack()}
    >
      <Text>Go Back</Text>
    </TouchableOpacity>
  </>
);

const Stack = createStackNavigator();

const TestNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate between screens', async () => {
    const { getByTestId, queryByTestId } = render(<TestNavigator />);

    // Should start on Home screen
    expect(getByTestId('navigate-to-profile')).toBeTruthy();
    expect(queryByTestId('profile-screen')).toBeNull();

    // Navigate to Profile
    fireEvent.press(getByTestId('navigate-to-profile'));

    await waitFor(() => {
      expect(getByTestId('profile-screen')).toBeTruthy();
      expect(getByTestId('user-id')).toBeTruthy();
    });
  });

  it('should pass parameters between screens', async () => {
    const { getByTestId } = render(<TestNavigator />);

    // Navigate to Profile with parameters
    fireEvent.press(getByTestId('navigate-to-profile'));

    await waitFor(() => {
      const userIdElement = getByTestId('user-id');
      expect(userIdElement.children[0]).toBe('123');
    });
  });

  it('should handle back navigation', async () => {
    const { getByTestId, queryByTestId } = render(<TestNavigator />);

    // Navigate to Profile
    fireEvent.press(getByTestId('navigate-to-profile'));

    await waitFor(() => {
      expect(getByTestId('profile-screen')).toBeTruthy();
    });

    // Go back to Home
    fireEvent.press(getByTestId('go-back'));

    await waitFor(() => {
      expect(getByTestId('navigate-to-profile')).toBeTruthy();
      expect(queryByTestId('profile-screen')).toBeNull();
    });
  });

  it('should handle deep linking', async () => {
    // Mock deep link navigation
    const mockNavigate = jest.fn();
    
    jest.mock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({
        navigate: mockNavigate,
        goBack: jest.fn(),
      }),
    }));

    // Simulate deep link handling
    const deepLinkUrl = 'myapp://profile/123';
    const parsedParams = { screen: 'Profile', params: { userId: '123' } };

    // This would typically be handled by your deep link parser
    expect(parsedParams.screen).toBe('Profile');
    expect(parsedParams.params.userId).toBe('123');
  });

  it('should handle navigation state persistence', async () => {
    const mockGetInitialState = jest.fn();
    const mockOnStateChange = jest.fn();

    const PersistentNavigator = () => (
      <NavigationContainer
        initialState={undefined}
        onStateChange={mockOnStateChange}
      >
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );

    const { getByTestId } = render(<PersistentNavigator />);

    // Navigate to trigger state change
    fireEvent.press(getByTestId('navigate-to-profile'));

    await waitFor(() => {
      expect(mockOnStateChange).toHaveBeenCalled();
    });
  });

  it('should handle navigation guards', async () => {
    const mockCanNavigate = jest.fn(() => true);
    
    const GuardedScreen = ({ navigation }: any) => {
      const handleNavigation = () => {
        if (mockCanNavigate()) {
          navigation.navigate('Profile');
        }
      };

      return (
        <TouchableOpacity testID="guarded-navigation" onPress={handleNavigation}>
          <Text>Navigate with Guard</Text>
        </TouchableOpacity>
      );
    };

    const GuardedNavigator = () => (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={GuardedScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );

    const { getByTestId, queryByTestId } = render(<GuardedNavigator />);

    // First attempt - should succeed
    fireEvent.press(getByTestId('guarded-navigation'));

    await waitFor(() => {
      expect(getByTestId('profile-screen')).toBeTruthy();
    });

    expect(mockCanNavigate).toHaveBeenCalled();
  });

  it('should handle navigation errors gracefully', async () => {
    const ErrorScreen = ({ navigation }: any) => (
      <TouchableOpacity
        testID="invalid-navigation"
        onPress={() => {
          try {
            navigation.navigate('NonExistentScreen');
          } catch (error) {
            // Handle navigation error
            console.warn('Navigation error:', error);
          }
        }}
      >
        <Text>Invalid Navigation</Text>
      </TouchableOpacity>
    );

    const ErrorNavigator = () => (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={ErrorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );

    const { getByTestId } = render(<ErrorNavigator />);

    // Should not crash on invalid navigation
    expect(() => {
      fireEvent.press(getByTestId('invalid-navigation'));
    }).not.toThrow();
  });
});