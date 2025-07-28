import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, FileText, Filter } from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency, formatDateShort, getStatusColor } from '../utils/formatters';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Transform transactions into invoice-like data
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions');
      console.log('Transactions API response:', response.data);
      
      // Handle different possible response structures
      let transactions = [];
      if (response.data.success && response.data.data?.transactions) {
        transactions = response.data.data.transactions;
      } else if (response.data.transactions) {
        transactions = response.data.transactions;
      } else if (Array.isArray(response.data)) {
        transactions = response.data;
      } else {
        transactions = [];
        console.warn('Unexpected transactions data structure:', response.data);
      }
      
      // Transform transactions into invoice format
      const invoiceData = transactions.map((transaction: any) => ({
        id: transaction.id || transaction.stripePaymentIntentId || Math.random().toString(36).substr(2, 9),
        customerName: transaction.customerName || 'Unknown Customer',
        customerEmail: transaction.customerEmail || 'unknown@example.com',
        amount: transaction.amount || 0,
        currency: transaction.currency || 'USD',
        status: mapTransactionStatusToInvoiceStatus(transaction.status),
        dueDate: transaction.createdAt || new Date().toISOString(),
        createdAt: transaction.createdAt || new Date().toISOString()
      }));
      
      setInvoices(invoiceData);
    } catch (error: any) {
      toast.error('Failed to fetch invoices');
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map transaction status to invoice status
  const mapTransactionStatusToInvoiceStatus = (transactionStatus: string) => {
    switch (transactionStatus?.toLowerCase()) {
      case 'succeeded':
        return 'paid';
      case 'pending':
        return 'sent';
      case 'failed':
        return 'overdue';
      case 'canceled':
        return 'draft';
      default:
        return 'draft';
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = () => {
    toast.info('Invoice creation feature coming soon! For now, create payments in the Transactions page.');
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button 
          onClick={handleCreateInvoice}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
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
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="skeleton h-10 w-10 rounded-lg"></div>
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
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4 text-primary-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          #{invoice.id.slice(0, 8)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateShort(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900">
                        View
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first invoice to get started'
              }
            </p>
            <button 
              onClick={handleCreateInvoice}
              className="btn-primary mt-4 flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;