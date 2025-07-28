import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, UserPlus, DollarSign, Users, Clock, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import SplitPaymentModal from '../components/SplitPaymentModal';

const SplitPayments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [splitPayments, setSplitPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  useEffect(() => {
    fetchSplitPayments();
  }, []);

  const fetchSplitPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/split-payments');
      // Extract splitPayments from the nested data structure
      const splitPayments = response.data.data?.splitPayments || response.data.splitPayments || response.data || [];
      setSplitPayments(splitPayments);
    } catch (error) {
      console.error('Error fetching split payments:', error);
      toast.error('Failed to fetch split payments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (paymentData: any) => {
    try {
      const response = await api.post('/split-payments', paymentData);
      // Extract the created payment from nested response
      const newPayment = response.data.data || response.data;
      setSplitPayments(prev => [...prev, newPayment]);
      setModalOpen(false);
    } catch (error) {
      console.error('Error creating split payment:', error);
      throw error;
    }
  };

  const handleUpdate = async (paymentData: any) => {
    try {
      const response = await api.put(`/split-payments/${editingPayment.id}`, paymentData);
      setSplitPayments(prev => 
        prev.map(payment => payment.id === editingPayment.id ? response.data : payment)
      );
      setEditingPayment(null);
      setModalOpen(false);
    } catch (error) {
      console.error('Error updating split payment:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this split payment?')) return;
    
    try {
      await api.delete(`/split-payments/${id}`);
      setSplitPayments(prev => prev.filter(payment => payment.id !== id));
      toast.success('Split payment deleted successfully');
    } catch (error) {
      console.error('Error deleting split payment:', error);
      toast.error('Failed to delete split payment');
    }
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    setModalOpen(true);
  };

  const openEditModal = (payment: any) => {
    setEditingPayment(payment);
    setModalOpen(true);
  };

  const filteredPayments = splitPayments.filter(payment =>
    payment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.participants?.some((p: any) => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = [
    {
      title: 'Total Split Payments',
      value: splitPayments.length,
      icon: UserPlus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Amount',
      value: `$${splitPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Participants',
      value: splitPayments.reduce((sum, p) => sum + (p.participants?.length || 0), 0),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Pending Payments',
      value: splitPayments.filter(p => p.status === 'pending' || p.status === 'partial').length,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Split Payments</h1>
          <p className="text-gray-600">Split expenses among multiple participants</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Split Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search split payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Split Payments List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading split payments...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{payment.title}</h3>
                    <p className="text-sm text-gray-500">
                      Created on {payment.createdAt ? new Date(payment.createdAt.seconds ? payment.createdAt.seconds * 1000 : payment.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openEditModal(payment)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Edit split payment"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete split payment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">${payment.totalAmount} {payment.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Participants:</span>
                        <span className="font-medium">{payment.participants?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium">
                          ${payment.participants?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium text-orange-600">
                          ${payment.participants?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Participants</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {payment.participants?.map((participant: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                            <p className="text-xs text-gray-500">{participant.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">${participant.amount}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              participant.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {participant.status}
                            </span>
                          </div>
                        </div>
                      )) || []}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredPayments.length === 0 && !loading && (
          <div className="text-center py-8">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No split payments found</h3>
            <p className="text-gray-500">Create your first split payment to share expenses with others.</p>
          </div>
        )}
      </div>

      {/* Split Payment Modal */}
      <SplitPaymentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPayment(null);
        }}
        onSave={editingPayment ? handleUpdate : handleCreate}
        splitPayment={editingPayment}
        title={editingPayment ? 'Edit Split Payment' : 'Create New Split Payment'}
      />
    </div>
  );
};

export default SplitPayments;