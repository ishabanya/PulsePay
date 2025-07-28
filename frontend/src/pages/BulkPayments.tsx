import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Upload, Users2, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BulkPaymentModal from '../components/BulkPaymentModal';

const BulkPayments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBulkPayment, setEditingBulkPayment] = useState<any>(null);

  // Real bulk payments data - currently empty, will be populated from backend
  const bulkPayments: any[] = [];

  const filteredPayments = bulkPayments.filter(payment =>
    payment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Clock;
      case 'pending':
        return Clock;
      case 'failed':
        return XCircle;
      default:
        return Clock;
    }
  };

  const handleCreateBulkPayment = () => {
    setEditingBulkPayment(null);
    setModalOpen(true);
  };

  const handleUploadCSV = () => {
    setEditingBulkPayment(null);
    setModalOpen(true);
    // Pre-populate with CSV upload mode
    toast.info('Use the CSV upload feature in the modal');
  };

  const handleSaveBulkPayment = async (bulkPaymentData: any) => {
    try {
      // TODO: Implement API call to save bulk payment
      console.log('Saving bulk payment:', bulkPaymentData);
      
      // For now, just simulate success
      // In real implementation, you would call:
      // const response = await api.post('/bulk-payments', bulkPaymentData);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving bulk payment:', error);
      throw error;
    }
  };

  const stats = [
    {
      title: 'Total Batches',
      value: 0,
      icon: Users2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Amount Processed',
      value: '$0',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Recipients',
      value: 0,
      icon: Users2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Success Rate',
      value: '0.0%',
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Payments</h1>
          <p className="text-gray-600">Process multiple payments efficiently in batches</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleUploadCSV}
            className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 flex items-center gap-2 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </button>
          <button 
            onClick={handleCreateBulkPayment}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Bulk Payment
          </button>
        </div>
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
              placeholder="Search bulk payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Bulk Payments List */}
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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{payment.title}</h3>
                    <div className="flex items-center gap-2">
                      {React.createElement(getStatusIcon(payment.status), { 
                        className: `h-4 w-4 ${payment.status === 'completed' ? 'text-green-600' : payment.status === 'failed' ? 'text-red-600' : 'text-blue-600'}` 
                      })}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{payment.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created by {payment.createdBy}</span>
                    <span>•</span>
                    <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                    {payment.processedAt && (
                      <>
                        <span>•</span>
                        <span>Processed {new Date(payment.processedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${payment.totalAmount.toLocaleString()} {payment.currency}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Recipients</p>
                  <p className="text-xl font-bold text-gray-900">{payment.recipients}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-xl font-bold text-green-600">{payment.successfulPayments}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-xl font-bold text-red-600">{payment.failedPayments}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {payment.status === 'processing' && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing Progress</span>
                    <span>{payment.successfulPayments}/{payment.recipients}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(payment.successfulPayments / payment.recipients) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8">
            <Users2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bulk payments found</h3>
            <p className="text-gray-500">Create your first bulk payment to process multiple transactions efficiently.</p>
          </div>
        )}
      </div>

      {/* Bulk Payment Modal */}
      <BulkPaymentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBulkPayment(null);
        }}
        onSave={handleSaveBulkPayment}
        bulkPayment={editingBulkPayment}
        title={editingBulkPayment ? 'Edit Bulk Payment' : 'Create New Bulk Payment'}
      />
    </div>
  );
};

export default BulkPayments;