import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Link2, Copy, Eye, DollarSign, MousePointer } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentLinkModal from '../components/PaymentLinkModal';

const PaymentLinks: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPaymentLink, setEditingPaymentLink] = useState<any>(null);

  // Real payment links data - currently empty, will be populated from backend
  const paymentLinks: any[] = [];

  const filteredLinks = paymentLinks.filter(link =>
    link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.description.toLowerCase().includes(searchTerm.toLowerCase())
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

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Payment link copied to clipboard!');
  };

  const handleCreatePaymentLink = () => {
    setEditingPaymentLink(null);
    setModalOpen(true);
  };

  const handleSavePaymentLink = async (paymentLinkData: any) => {
    try {
      // TODO: Implement API call to save payment link
      console.log('Saving payment link:', paymentLinkData);
      
      // For now, just simulate success
      // In real implementation, you would call:
      // const response = await api.post('/payment-links', paymentLinkData);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving payment link:', error);
      throw error;
    }
  };

  const stats = [
    {
      title: 'Total Links',
      value: 0,
      icon: Link2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Revenue',
      value: '$0.00',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Clicks',
      value: 0,
      icon: MousePointer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Conversion Rate',
      value: '0.0%',
      icon: Eye,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Links</h1>
          <p className="text-gray-600">Create shareable payment links for easy transactions</p>
        </div>
        <button 
          onClick={handleCreatePaymentLink}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Payment Link
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
              placeholder="Search payment links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Payment Links Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Link Details</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Performance</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Expires</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.map((link, index) => (
                <motion.tr
                  key={link.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{link.title}</p>
                      <p className="text-sm text-gray-500">{link.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{link.url}</code>
                        <button
                          onClick={() => copyToClipboard(link.url)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">
                      ${link.amount} {link.currency}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Clicks:</span>
                        <span className="font-medium">{link.clicks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Conversions:</span>
                        <span className="font-medium text-green-600">{link.conversions}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rate:</span>
                        <span className="font-medium">{((link.conversions / link.clicks) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(link.status)}`}>
                      {link.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-600">
                      {new Date(link.expiresAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLinks.length === 0 && (
          <div className="text-center py-8">
            <Link2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payment links found</h3>
            <p className="text-gray-500">Create your first payment link to start accepting payments.</p>
          </div>
        )}
      </div>

      {/* Payment Link Modal */}
      <PaymentLinkModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPaymentLink(null);
        }}
        onSave={handleSavePaymentLink}
        paymentLink={editingPaymentLink}
        title={editingPaymentLink ? 'Edit Payment Link' : 'Create New Payment Link'}
      />
    </div>
  );
};

export default PaymentLinks;