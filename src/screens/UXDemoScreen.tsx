import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import {
  Button,
  TextInput,
  LoadingSpinner,
  SkeletonLoader,
  SkeletonCard,
  SkeletonList,
  Alert as CustomAlert,
  Modal,
  ConfirmationModal,
  SearchInput,
  TabView,
  TabPanel,
  OfflineIndicator,
  CompactOfflineIndicator,
  Form,
  FormField,
  FormSubmitButton,
  ErrorBoundary,
  ComponentErrorBoundary,
} from '../components';
import { useOffline } from '../hooks/useOffline';
import { useAccessibility } from '../hooks/useAccessibility';
import { validateEmail, validatePassword, validateRequired } from '../utils/validation';

const UXDemoScreen: React.FC = () => {
  // State for various demo components
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [activeTab, setActiveTab] = useState('components');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Hooks
  const { isOnline, pendingActions, queueAction } = useOffline();
  const { announce, isScreenReaderEnabled } = useAccessibility();

  // Demo functions
  const handleLoadingDemo = useCallback(async () => {
    setLoading(true);
    await announce('Loading demo started', 'medium');
    
    setTimeout(() => {
      setLoading(false);
      announce('Loading demo completed', 'medium');
    }, 3000);
  }, [announce]);

  const handleSkeletonDemo = useCallback(() => {
    setShowSkeleton(true);
    setTimeout(() => {
      setShowSkeleton(false);
    }, 2000);
  }, []);

  const handleOfflineAction = useCallback(async () => {
    try {
      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        Alert.alert('Success', 'Action completed successfully!');
      } else {
        // Queue for offline
        await queueAction('CREATE', '/api/demo', { action: 'demo_action' });
        Alert.alert('Queued', 'Action queued for when you\'re back online!');
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed. Please try again.');
    }
  }, [isOnline, queueAction]);

  const handleFormSubmit = useCallback(async (data: any) => {
    await announce('Form submitted successfully', 'medium');
    Alert.alert('Form Submitted', JSON.stringify(data, null, 2));
  }, [announce]);

  const handleSearch = useCallback(async (query: string) => {
    // Simulate search API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Searching for:', query);
  }, []);

  const searchSuggestions = [
    { id: '1', title: 'React Native', subtitle: 'Mobile framework' },
    { id: '2', title: 'TypeScript', subtitle: 'Programming language' },
    { id: '3', title: 'Accessibility', subtitle: 'UX feature' },
    { id: '4', title: 'Offline Support', subtitle: 'UX feature' },
  ];

  const tabs = [
    { key: 'components', title: 'Components', badge: 5 },
    { key: 'forms', title: 'Forms' },
    { key: 'offline', title: 'Offline', badge: pendingActions },
    { key: 'accessibility', title: 'A11y' },
  ];

  // Error component for testing error boundaries
  const ErrorComponent = () => {
    const [shouldError, setShouldError] = useState(false);
    
    if (shouldError) {
      throw new Error('Demo error for testing error boundary');
    }
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Boundary Test</Text>
        <Button
          title="Trigger Error"
          onPress={() => setShouldError(true)}
          variant="danger"
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>UX Enhancements Demo</Text>
        <Text style={styles.subtitle}>
          Comprehensive showcase of all UX improvements
        </Text>
      </View>

      {/* Offline Indicator */}
      <OfflineIndicator position="top" />

      {/* Tab Navigation */}
      <TabView
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
        style={styles.tabView}
      >
        {/* Components Tab */}
        <TabPanel tabKey="components" activeTab={activeTab}>
          <ScrollView style={styles.tabContent}>
            {/* Loading States Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Loading States</Text>
              
              <View style={styles.row}>
                <Button
                  title="Show Loading"
                  onPress={handleLoadingDemo}
                  loading={loading}
                  style={styles.button}
                />
                <Button
                  title="Show Skeleton"
                  onPress={handleSkeletonDemo}
                  style={styles.button}
                />
              </View>

              {loading && (
                <View style={styles.loadingContainer}>
                  <LoadingSpinner
                    variant="dots"
                    text="Loading demo content..."
                    size="large"
                  />
                </View>
              )}

              {showSkeleton ? (
                <View style={styles.skeletonContainer}>
                  <SkeletonCard />
                  <SkeletonList itemCount={3} />
                </View>
              ) : (
                <View style={styles.contentContainer}>
                  <Text style={styles.contentText}>
                    This is the actual content that appears after loading.
                  </Text>
                </View>
              )}
            </View>

            {/* Buttons Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enhanced Buttons</Text>
              
              <View style={styles.buttonGrid}>
                <Button title="Primary" variant="primary" size="small" onPress={() => {}} />
                <Button title="Secondary" variant="secondary" size="small" onPress={() => {}} />
                <Button title="Outline" variant="outline" size="small" onPress={() => {}} />
                <Button title="Danger" variant="danger" size="small" onPress={() => {}} />
              </View>
              
              <Button
                title="Disabled Button"
                disabled
                onPress={() => {}}
                style={styles.fullWidthButton}
              />
            </View>

            {/* Modals Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Modals & Alerts</Text>
              
              <View style={styles.row}>
                <Button
                  title="Show Modal"
                  onPress={() => setShowModal(true)}
                  style={styles.button}
                />
                <Button
                  title="Show Alert"
                  onPress={() => setShowAlert(true)}
                  style={styles.button}
                />
              </View>
              
              <Button
                title="Confirmation Modal"
                onPress={() => setShowConfirmModal(true)}
                variant="outline"
                style={styles.fullWidthButton}
              />
            </View>

            {/* Search Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enhanced Search</Text>
              
              <SearchInput
                placeholder="Search with suggestions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSearch={handleSearch}
                suggestions={searchSuggestions}
                style={styles.searchInput}
              />
            </View>
          </ScrollView>
        </TabPanel>

        {/* Forms Tab */}
        <TabPanel tabKey="forms" activeTab={activeTab}>
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enhanced Forms</Text>
              
              <Form
                onSubmit={handleFormSubmit}
                validationSchema={{
                  email: validateEmail,
                  password: validatePassword,
                  name: (value) => validateRequired(value, 'Name'),
                }}
                style={styles.form}
              >
                <FormField name="name">
                  {({ value, error, onChange, onBlur }) => (
                    <TextInput
                      label="Full Name"
                      value={value as string || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={error}
                      required
                      style={styles.formInput}
                    />
                  )}
                </FormField>

                <FormField name="email">
                  {({ value, error, onChange, onBlur }) => (
                    <TextInput
                      label="Email Address"
                      value={value as string || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={error}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      required
                      style={styles.formInput}
                    />
                  )}
                </FormField>

                <FormField name="password">
                  {({ value, error, onChange, onBlur }) => (
                    <TextInput
                      label="Password"
                      value={value as string || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={error}
                      secureTextEntry
                      required
                      style={styles.formInput}
                    />
                  )}
                </FormField>

                <FormSubmitButton
                  title="Submit Form"
                  style={styles.submitButton}
                />
              </Form>
            </View>
          </ScrollView>
        </TabPanel>

        {/* Offline Tab */}
        <TabPanel tabKey="offline" activeTab={activeTab}>
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Offline Functionality</Text>
              
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Connection Status:</Text>
                <Text style={[styles.statusValue, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>

              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Pending Actions:</Text>
                <Text style={styles.statusValue}>{pendingActions}</Text>
              </View>

              <Button
                title={isOnline ? 'Perform Action' : 'Queue Action'}
                onPress={handleOfflineAction}
                style={styles.fullWidthButton}
              />

              <View style={styles.offlineIndicators}>
                <Text style={styles.sectionSubtitle}>Offline Indicators:</Text>
                <CompactOfflineIndicator />
              </View>
            </View>
          </ScrollView>
        </TabPanel>

        {/* Accessibility Tab */}
        <TabPanel tabKey="accessibility" activeTab={activeTab}>
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accessibility Features</Text>
              
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Screen Reader:</Text>
                <Text style={styles.statusValue}>
                  {isScreenReaderEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>

              <Text style={styles.accessibilityText}>
                All components include proper accessibility labels, hints, and states.
                Navigation is optimized for screen readers and keyboard users.
              </Text>

              <Button
                title="Test Announcement"
                onPress={() => announce('This is a test announcement for screen readers', 'medium')}
                style={styles.fullWidthButton}
                accessibilityHint="Double tap to hear a test announcement"
              />
            </View>

            {/* Error Boundary Demo */}
            <ComponentErrorBoundary isolate>
              <ErrorComponent />
            </ComponentErrorBoundary>
          </ScrollView>
        </TabPanel>
      </TabView>

      {/* Modals */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Demo Modal"
        size="medium"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            This is a demo modal with accessibility support, animations, and proper focus management.
          </Text>
          <Button
            title="Close Modal"
            onPress={() => setShowModal(false)}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Action"
        message="Are you sure you want to perform this action?"
        onConfirm={() => {
          setShowConfirmModal(false);
          Alert.alert('Confirmed', 'Action confirmed!');
        }}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Custom Alert */}
      {showAlert && (
        <CustomAlert
          type="info"
          title="Demo Alert"
          message="This is a custom alert component with accessibility support."
          onClose={() => setShowAlert(false)}
          actions={[
            {
              text: 'OK',
              onPress: () => setShowAlert(false),
            },
          ]}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  tabView: {
    flex: 1,
    marginTop: 20,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullWidthButton: {
    marginTop: 12,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  skeletonContainer: {
    marginTop: 12,
  },
  contentContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  searchInput: {
    marginTop: 8,
  },
  form: {
    marginTop: 8,
  },
  formInput: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  offlineIndicators: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  accessibilityText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalContent: {
    alignItems: 'center',
    paddingTop: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalButton: {
    minWidth: 120,
  },
});

export default UXDemoScreen;