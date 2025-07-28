import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, QrCode, Download, Eye, DollarSign, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCodeModal from '../components/QRCodeModal';

const QRCodes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQRCode, setEditingQRCode] = useState<any>(null);

  // Real QR codes data - currently empty, will be populated from backend
  const qrCodes: any[] = [];

  const filteredQRCodes = qrCodes.filter(qr =>
    qr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qr.description.toLowerCase().includes(searchTerm.toLowerCase())
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

  const downloadQRCode = (qrCode: any) => {
    // In a real app, this would generate and download the QR code
    console.log('Downloading QR code for:', qrCode.title);
  };

  const handleCreateQRCode = () => {
    setEditingQRCode(null);
    setModalOpen(true);
  };

  const handleSaveQRCode = async (qrCodeData: any) => {
    try {
      // TODO: Implement API call to save QR code
      console.log('Saving QR code:', qrCodeData);
      
      // For now, just simulate success
      // In real implementation, you would call:
      // const response = await api.post('/qr-codes', qrCodeData);
      
      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error saving QR code:', error);
      throw error;
    }
  };

  const stats = [
    {
      title: 'Active QR Codes',
      value: 0,
      icon: QrCode,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Scans',
      value: 0,
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Successful Payments',
      value: 0,
      icon: DollarSign,
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
          <h1 className="text-2xl font-bold text-gray-900">QR Code Payments</h1>
          <p className="text-gray-600">Generate QR codes for quick in-person payments</p>
        </div>
        <button 
          onClick={handleCreateQRCode}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create QR Code
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
              placeholder="Search QR codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* QR Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQRCodes.map((qrCode, index) => (
            <motion.div
              key={qrCode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{qrCode.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{qrCode.description}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(qrCode.status)}`}>
                    {qrCode.status}
                  </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* QR Code Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-center">
                <div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                  <QrCode className="h-24 w-24 text-gray-400" />
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {qrCode.amount > 0 ? `$${qrCode.amount} ${qrCode.currency}` : 'Variable'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Scans:</span>
                  <span className="font-medium">{qrCode.scans}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payments:</span>
                  <span className="font-medium text-green-600">{qrCode.payments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Conversion:</span>
                  <span className="font-medium">{((qrCode.payments / qrCode.scans) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Used:</span>
                  <span className="font-medium">{new Date(qrCode.lastUsed).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQRCode(qrCode)}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredQRCodes.length === 0 && (
          <div className="text-center py-12">
            <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No QR codes found</h3>
            <p className="text-gray-500">Create your first QR code to start accepting in-person payments.</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingQRCode(null);
        }}
        onSave={handleSaveQRCode}
        qrCode={editingQRCode}
        title={editingQRCode ? 'Edit QR Code' : 'Create New QR Code'}
      />
    </div>
  );
};

export default QRCodes;