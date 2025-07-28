import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, CreditCard, TrendingUp, Users, Plus, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from '../components/StatsCard';
import { usePayments } from '../hooks/usePayments';
import { formatCurrency, formatDate, formatPercentage, getStatusColor } from '../utils/formatters';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { stats, transactions, loading, error, refetch } = usePayments();
  const [testLoading, setTestLoading] = useState(false);

  const createTestPayment = async () => {
    setTestLoading(true);
    try {
      const response = await api.post('/payments/create-test-payment', {
        amount: Math.floor(Math.random() * 10000) + 500, // Random amount between $5-$100
        description: `Test payment ${new Date().toLocaleTimeString()}`
      });
      
      toast.success('Test payment created successfully!');
      refetch(); // Refresh the dashboard
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create test payment');
    } finally {
      setTestLoading(false);
    }
  };

  const cleanupSampleData = async () => {
    if (!confirm('Are you sure you want to delete all sample/test data? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await api.delete('/admin/cleanup-sample-data');
      toast.success(`Cleaned up ${response.data.deletedCount} sample transactions`);
      refetch(); // Refresh the dashboard
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cleanup sample data');
    }
  };

  const chartData = transactions?.slice(0, 7).reverse().map(transaction => ({
    date: new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: transaction.amount / 100,
  })) || [];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={createTestPayment}
            disabled={testLoading}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>{testLoading ? 'Creating...' : 'Create Test Payment'}</span>
          </button>
          {transactions && transactions.length > 0 && (
            <button
              onClick={cleanupSampleData}
              className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Cleanup Sample Data</span>
            </button>
          )}
          <div className="text-sm text-gray-500">
            Last updated: {formatDate(new Date())}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.totalRevenue) : '$0'}
          change={stats ? formatPercentage(stats.revenueGrowth) : undefined}
          changeType={stats && stats.revenueGrowth >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          loading={loading}
        />
        <StatsCard
          title="Transactions"
          value={stats?.totalTransactions || 0}
          icon={CreditCard}
          loading={loading}
        />
        <StatsCard
          title="Success Rate"
          value={stats ? `${stats.successRate.toFixed(1)}%` : '0%'}
          icon={TrendingUp}
          loading={loading}
        />
        <StatsCard
          title="Active Users"
          value={transactions?.length || 0}
          icon={Users}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="skeleton h-32 w-full"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  formatter={(value: number) => [`$${value}`, 'Amount']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="skeleton h-8 w-8 rounded-full"></div>
                    <div className="space-y-1">
                      <div className="skeleton h-4 w-24"></div>
                      <div className="skeleton h-3 w-16"></div>
                    </div>
                  </div>
                  <div className="skeleton h-6 w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {transactions?.slice(0, 5).map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.customerName}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </motion.div>
              ))}
              {!transactions?.length && (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 mb-4">No transactions yet</p>
                  <button
                    onClick={createTestPayment}
                    disabled={testLoading}
                    className="btn-primary"
                  >
                    Create Your First Payment
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;