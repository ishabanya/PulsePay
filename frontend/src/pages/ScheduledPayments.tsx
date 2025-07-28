import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Calendar, DollarSign, Clock, Play, Pause, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ScheduledPaymentModal from '../components/ScheduledPaymentModal';

const ScheduledPayments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheduledPayment, setEditingScheduledPayment] = useState<any>(null);

  // Real scheduled payments data - currently empty, will be populated from backend
  const scheduledPayments: any[] = [];

  const filteredPayments = scheduledPayments.filter(payment =>
    payment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly';
      case 'bi-weekly':
        return 'Bi-weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return frequency;
    }
  };

  const getDaysUntilNext = (nextPayment: string) => {
    const days = Math.ceil((new Date(nextPayment).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleSchedulePayment = () => {
    setEditingScheduledPayment(null);
    setModalOpen(true);
  };

  const handleSaveScheduledPayment = async (scheduledPaymentData: any) => {
    try {
      // TODO: Implement API call to save scheduled payment
      console.log('Saving scheduled payment:', scheduledPaymentData);
      
      // For now, just simulate success
      // In real implementation, you would call:
      // const response = await api.post('/scheduled-payments', scheduledPaymentData);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving scheduled payment:', error);
      throw error;
    }
  };

  const stats = [
    {
      title: 'Active Schedules',
      value: 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Monthly Total',
      value: '$0',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Paid YTD',
      value: '$0',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Next Payment',
      value: 'N/A',
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
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Payments</h1>
          <p className="text-gray-600">Automate recurring and future payments</p>
        </div>
        <button 
          onClick={handleSchedulePayment}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Schedule Payment
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
              placeholder="Search scheduled payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Scheduled Payments Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Payment Details</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Amount & Frequency</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Next Payment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Total Paid</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{payment.title}</p>
                      <p className="text-sm text-gray-500">{payment.description}</p>
                      <p className="text-xs text-gray-400 mt-1">To: {payment.recipient}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        ${payment.amount.toLocaleString()} {payment.currency}
                      </p>
                      <p className="text-sm text-gray-500">{getFrequencyLabel(payment.frequency)}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(payment.nextPayment).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getDaysUntilNext(payment.nextPayment)} days
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        ${payment.totalPaid.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {payment.paymentsCount} payments
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {payment.status === 'active' ? (
                        <button className="text-yellow-600 hover:text-yellow-700 p-1">
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="text-green-600 hover:text-green-700 p-1">
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-red-600 hover:text-red-700 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled payments found</h3>
            <p className="text-gray-500">Create your first scheduled payment to automate recurring transactions.</p>
          </div>
        )}
      </div>

      {/* Scheduled Payment Modal */}
      <ScheduledPaymentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingScheduledPayment(null);
        }}
        onSave={handleSaveScheduledPayment}
        scheduledPayment={editingScheduledPayment}
        title={editingScheduledPayment ? 'Edit Scheduled Payment' : 'Create New Scheduled Payment'}
      />
    </div>
  );
};

export default ScheduledPayments;