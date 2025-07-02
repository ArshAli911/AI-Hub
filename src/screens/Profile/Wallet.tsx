import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { AppButton } from '../../components';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  date: number;
  description: string;
}

const mockTransactions: Transaction[] = [
  {
    id: 't1',
    type: 'credit',
    amount: 50.00,
    date: Date.now() - 3600000 * 24 * 7, // 1 week ago
    description: 'Mentoring session payment received',
  },
  {
    id: 't2',
    type: 'debit',
    amount: 15.00,
    date: Date.now() - 3600000 * 24 * 3, // 3 days ago
    description: 'Purchased AI tool subscription',
  },
  {
    id: 't3',
    type: 'credit',
    amount: 120.00,
    date: Date.now() - 3600000 * 24 * 14, // 2 weeks ago
    description: 'Prototype monetization payout',
  },
];

const Wallet: React.FC = () => {
  const currentBalance = mockTransactions.reduce((acc, transaction) => {
    return transaction.type === 'credit' ? acc + transaction.amount : acc - transaction.amount;
  }, 0);

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.transactionAmount, item.type === 'credit' ? styles.credit : styles.debit]}>
        {item.type === 'credit' ? '+' : '-'}${(item.amount).toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>${currentBalance.toFixed(2)}</Text>
        </View>

        <Text style={styles.transactionsTitle}>Recent Transactions</Text>
        <FlatList
          data={mockTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          scrollEnabled={false} // Disable FlatList scrolling as it's inside a ScrollView
        />

        <View style={styles.actionsContainer}>
          <AppButton title="Add Funds" onPress={() => { /* Handle adding funds */ }} />
          <AppButton title="Withdraw Funds" onPress={() => { /* Handle withdrawing funds */ }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollViewContent: {
    padding: 15,
    paddingBottom: 20, // Add some bottom padding
  },
  balanceCard: {
    backgroundColor: '#007BFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  credit: {
    color: 'green',
  },
  debit: {
    color: 'red',
  },
  actionsContainer: {
    marginTop: 20,
  },
});

export default Wallet; 