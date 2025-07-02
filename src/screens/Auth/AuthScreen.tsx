import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Button from '../../components/Button';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { signIn } = useAuth();

  const handleAuth = () => {
    if (isLogin) {
      signIn({ email, password }); // Placeholder for actual login
      console.log('Logging in...', { email, password });
    } else {
      // Placeholder for actual registration
      console.log('Registering...', { email, password });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>{isLogin ? 'Login' : 'Register'}</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button title={isLogin ? 'Login' : 'Register'} onPress={handleAuth} style={styles.button} />

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: Colors.text,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: '100%',
    marginTop: 10,
  },
  toggleButton: {
    marginTop: 20,
  },
  toggleButtonText: {
    color: Colors.primary,
    fontSize: 16,
  },
});

export default AuthScreen; 