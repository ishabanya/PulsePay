import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { usePayments } from '../hooks/usePayments';
import { formatCurrency, formatDate, getStatusColor } from '../utils/formatters';
import PaymentModal from '../components/PaymentModal';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const Transactions: React.FC = () => {
  const { transactions, loading, refetch } = usePayments();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [completingPayment, setCompletingPayment] = useState<string | null>(null);

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = 
      transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    refetch();
  };

  const handleCompletePayment = async (transactionId: string, paymentIntentId: string) => {
    try {
      setCompletingPayment(transactionId);
      
      // Call backend endpoint to manually complete the payment
      await api.post('/payments/complete-payment', {
        transactionId,
        paymentIntentId
      });
      
      toast.success('Payment completed successfully!');
      refetch(); // Refresh the transactions list
    } catch (error: any) {
      console.error('Error completing payment:', error);
      toast.error(error.response?.data?.error || 'Failed to complete payment');
    } finally {
      setCompletingPayment(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Payment</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="skeleton h-10 w-10 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-32"></div>
                    <div className="skeleton h-3 w-24"></div>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="skeleton h-4 w-20"></div>
                  <div className="skeleton h-6 w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-4">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {transaction.customerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.customerName}</p>
                    <p className="text-sm text-gray-500">{transaction.customerEmail}</p>
                    <p className="text-xs text-gray-400">{transaction.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <div className="flex items-center justify-end space-x-2 mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                    {transaction.status === 'pending' && (
                      <button
                        onClick={() => handleCompletePayment(transaction.id, transaction.stripePaymentIntentId)}
                        disabled={completingPayment === transaction.id}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center space-x-1"
                        title="Complete this payment"
                      >
                        {completingPayment === transaction.id ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>...</span>
                          </>
                        ) : (
                          <span>Complete</span>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first payment to get started'
              }
            </p>
          </div>
        )}
      </div>

      <PaymentModal 
        isOpen={paymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
      />
    </div>
  );
};

export default Transactions;