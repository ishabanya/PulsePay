import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Repeat, Calendar, DollarSign, Users, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import SubscriptionModal from '../components/SubscriptionModal';

const Subscriptions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions');
      
      // Ensure we always have an array
      let subscriptionData = response.data;
      if (Array.isArray(subscriptionData)) {
        setSubscriptions(subscriptionData);
      } else if (subscriptionData && Array.isArray(subscriptionData.subscriptions)) {
        setSubscriptions(subscriptionData.subscriptions);
      } else {
        console.warn('Unexpected subscriptions data format:', subscriptionData);
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
      setSubscriptions([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (subscriptionData: any) => {
    try {
      const response = await api.post('/subscriptions', subscriptionData);
      setSubscriptions(prev => [...prev, response.data]);
      setModalOpen(false);
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  };

  const handleUpdateSubscription = async (subscriptionData: any) => {
    try {
      const response = await api.put(`/subscriptions/${editingSubscription.id}`, subscriptionData);
      setSubscriptions(prev => 
        prev.map(sub => sub.id === editingSubscription.id ? response.data : sub)
      );
      setEditingSubscription(null);
      setModalOpen(false);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    
    try {
      await api.delete(`/subscriptions/${id}`);
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
      toast.success('Subscription deleted successfully');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
    }
  };

  const openCreateModal = () => {
    setEditingSubscription(null);
    setModalOpen(true);
  };

  const openEditModal = (subscription: any) => {
    setEditingSubscription(subscription);
    setModalOpen(true);
  };

  const filteredSubscriptions = (Array.isArray(subscriptions) ? subscriptions : []).filter(sub =>
    sub.planName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = [
    {
      title: 'Active Subscriptions',
      value: subscriptions.filter(s => s.status === 'active').length,
      icon: Repeat,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Monthly Revenue',
      value: `$${subscriptions.filter(s => s.status === 'active' && s.interval === 'monthly').reduce((sum, s) => sum + (s.amount || 0), 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Customers',
      value: subscriptions.length,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Upcoming Renewals',
      value: subscriptions.filter(s => {
        if (!s.nextBilling) return false;
        const nextBilling = new Date(s.nextBilling);
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return nextBilling <= weekFromNow;
      }).length,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600">Manage recurring payments and subscription plans</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Subscription
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
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Subscriptions Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading subscriptions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Interval</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Next Billing</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((subscription, index) => (
                  <motion.tr
                    key={subscription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{subscription.planName}</p>
                        <p className="text-sm text-gray-500">
                          Since {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{subscription.customer}</p>
                        <p className="text-sm text-gray-500">{subscription.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">
                        ${subscription.amount} {subscription.currency}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-600 capitalize">{subscription.interval}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-600">
                        {subscription.nextBilling ? new Date(subscription.nextBilling).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openEditModal(subscription)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Edit subscription"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubscription(subscription.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete subscription"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredSubscriptions.length === 0 && !loading && (
          <div className="text-center py-8">
            <Repeat className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-500">Get started by creating your first subscription plan.</p>
          </div>
        )}
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSubscription(null);
        }}
        onSave={editingSubscription ? handleUpdateSubscription : handleCreateSubscription}
        subscription={editingSubscription}
        title={editingSubscription ? 'Edit Subscription' : 'Create New Subscription'}
      />
    </div>
  );
};

export default Subscriptions;