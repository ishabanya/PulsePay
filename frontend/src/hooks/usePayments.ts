import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Transaction, DashboardStats, PaymentIntentData } from '../types';
import { toast } from 'react-hot-toast';

export const usePayments = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching transactions from API...');
      const response = await api.get('/transactions');
      console.log('✅ Transactions response:', response.data);
      // Extract transactions from the nested data structure
      const transactions = response.data.data?.transactions || response.data.transactions || response.data;
      setTransactions(transactions);
      setError(null);
    } catch (err: any) {
      console.error('❌ Failed to fetch transactions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch transactions');
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching dashboard stats from API...');
      const response = await api.get('/dashboard/stats');
      console.log('✅ Dashboard stats response:', response.data);
      // Extract stats from the nested data structure
      const stats = response.data.data || response.data;
      setStats(stats);
    } catch (err: any) {
      console.error('❌ Failed to fetch stats:', err.response?.data?.message || err.message);
    }
  };

  const createPaymentIntent = async (data: PaymentIntentData) => {
    try {
      console.log('Creating payment intent with data:', data);
      const response = await api.post('/payments/create-payment-intent', data);
      console.log('Payment intent response:', response.data);
      return response.data;
    } catch (err: any) {
      console.error('Payment intent error:', err.response?.data || err.message);
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to create payment intent';
      toast.error(message);
      throw new Error(message);
    }
  };

  const confirmPayment = async (paymentIntentId: string) => {
    try {
      const response = await api.post('/payments/confirm', { paymentIntentId });
      toast.success('Payment confirmed successfully');
      fetchTransactions();
      fetchStats();
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to confirm payment';
      toast.error(message);
      throw new Error(message);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  return {
    transactions,
    stats,
    loading,
    error,
    createPaymentIntent,
    confirmPayment,
    refetch: () => {
      fetchTransactions();
      fetchStats();
    },
  };
};