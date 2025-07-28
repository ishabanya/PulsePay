import { db } from '../config/firebase';
import { Customer, Transaction } from '../types';
import { createError } from '../middleware/errorHandler';

export class CustomerService {
  static async getCustomers(userId: string): Promise<Customer[]> {
    try {
      console.log('Fetching customers for user:', userId);
      
      // Try to find transactions by userId first
      let transactionsSnapshot = await db.collection('transactions')
        .where('userId', '==', userId)
        .get();

      // If no transactions found by userId, try by email for backward compatibility
      if (transactionsSnapshot.empty) {
        console.log('No transactions found by userId for customers, trying by email: yadaginishabanya@gmail.com');
        transactionsSnapshot = await db.collection('transactions')
          .where('customerEmail', '==', 'yadaginishabanya@gmail.com')
          .get();
      }
      
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Transaction[];

      console.log(`Found ${transactions.length} transactions for customer generation`);

      if (transactions.length === 0) {
        console.log('No transactions found, returning empty customers array');
        return [];
      }

      const customerMap = new Map<string, Customer>();

      transactions.forEach(transaction => {
        const email = transaction.customerEmail;
        
        if (customerMap.has(email)) {
          const customer = customerMap.get(email)!;
          customer.totalSpent += transaction.status === 'succeeded' ? transaction.amount : 0;
          customer.transactionCount += 1;
        } else {
          customerMap.set(email, {
            id: email,
            email: transaction.customerEmail,
            name: transaction.customerName,
            totalSpent: transaction.status === 'succeeded' ? transaction.amount : 0,
            transactionCount: 1,
            preferredCurrency: 'USD',
            timezone: 'UTC',
            createdAt: transaction.createdAt,
          });
        }
      });

      const customers = Array.from(customerMap.values()).sort((a, b) => 
        b.totalSpent - a.totalSpent
      );

      console.log(`Generated ${customers.length} customers from transactions`);
      if (customers.length > 0) {
        console.log('Sample customer:', customers[0]);
      }

      return customers;
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      throw createError('Failed to fetch customers', 500);
    }
  }

  static async getCustomerById(customerId: string, userId: string): Promise<Customer | null> {
    try {
      const customers = await this.getCustomers(userId);
      return customers.find(customer => customer.id === customerId) || null;
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      throw createError('Failed to fetch customer', 500);
    }
  }

  static async getCustomerTransactions(customerId: string, userId: string): Promise<Transaction[]> {
    try {
      // Filter by both userId and customerEmail - can't use compound query without index
      // So we'll filter by userId first, then filter by customerEmail in code
      const snapshot = await db.collection('transactions')
        .where('userId', '==', userId)
        .get();

      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Transaction[];

      // Filter by customer email and sort by date
      return transactions
        .filter(transaction => transaction.customerEmail === customerId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      console.error('Error fetching customer transactions:', error);
      throw createError('Failed to fetch customer transactions', 500);
    }
  }
}