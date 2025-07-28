import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScheduledPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scheduledPayment: any) => void;
  scheduledPayment?: any;
  title: string;
}

const ScheduledPaymentModal: React.FC<ScheduledPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  scheduledPayment,
  title,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    recipientName: '',
    recipientEmail: '',
    amount: '',
    currency: 'USD',
    frequency: 'monthly',
    startDate: '',
    endDate: '',
    nextPayment: '',
    maxPayments: '',
    status: 'active'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (scheduledPayment) {
      setFormData({
        title: scheduledPayment.title || '',
        description: scheduledPayment.description || '',
        recipientName: scheduledPayment.recipientName || scheduledPayment.recipient || '',
        recipientEmail: scheduledPayment.recipientEmail || '',
        amount: scheduledPayment.amount?.toString() || '',
        currency: scheduledPayment.currency || 'USD',
        frequency: scheduledPayment.frequency || 'monthly',
        startDate: scheduledPayment.startDate || '',
        endDate: scheduledPayment.endDate || '',
        nextPayment: scheduledPayment.nextPayment || '',
        maxPayments: scheduledPayment.maxPayments?.toString() || '',
        status: scheduledPayment.status || 'active'
      });
    } else {
      // Set default start date to today and next payment to tomorrow
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      setFormData({
        title: '',
        description: '',
        recipientName: '',
        recipientEmail: '',
        amount: '',
        currency: 'USD',
        frequency: 'monthly',
        startDate: today,
        endDate: '',
        nextPayment: tomorrowStr,
        maxPayments: '',
        status: 'active'
      });
    }
  }, [scheduledPayment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduledPaymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        maxPayments: formData.maxPayments ? parseInt(formData.maxPayments) : null
      };

      await onSave(scheduledPaymentData);
      onClose();
      toast.success(scheduledPayment ? 'Scheduled payment updated successfully!' : 'Scheduled payment created successfully!');
    } catch (error) {
      console.error('Error saving scheduled payment:', error);
      toast.error('Failed to save scheduled payment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Calculate next payment date based on frequency
  const calculateNextPayment = (startDate: string, frequency: string) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const next = new Date(start);
    
    switch (frequency) {
      case 'weekly':
        next.setDate(start.getDate() + 7);
        break;
      case 'bi-weekly':
        next.setDate(start.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(start.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(start.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(start.getFullYear() + 1);
        break;
      default:
        next.setMonth(start.getMonth() + 1);
    }
    
    return next.toISOString().split('T')[0];
  };

  // Update next payment when start date or frequency changes
  useEffect(() => {
    if (formData.startDate && formData.frequency) {
      const nextPayment = calculateNextPayment(formData.startDate, formData.frequency);
      setFormData(prev => ({ ...prev, nextPayment }));
    }
  }, [formData.startDate, formData.frequency]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />

          <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6 sm:align-middle"
          >
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="sm:flex sm:items-start">
              <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                  {title}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g. Monthly Rent Payment"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional description for this scheduled payment"
                      />
                    </div>

                    <div>
                      <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Name *
                      </label>
                      <input
                        type="text"
                        id="recipientName"
                        name="recipientName"
                        value={formData.recipientName}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Recipient name"
                      />
                    </div>

                    <div>
                      <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Email *
                      </label>
                      <input
                        type="email"
                        id="recipientEmail"
                        name="recipientEmail"
                        value={formData.recipientEmail}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="recipient@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        id="currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Frequency *
                      </label>
                      <select
                        id="frequency"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="nextPayment" className="block text-sm font-medium text-gray-700 mb-2">
                        Next Payment Date
                      </label>
                      <input
                        type="date"
                        id="nextPayment"
                        name="nextPayment"
                        value={formData.nextPayment}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-calculated based on start date and frequency
                      </p>
                    </div>

                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty for indefinite payments
                      </p>
                    </div>

                    <div>
                      <label htmlFor="maxPayments" className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Payments
                      </label>
                      <input
                        type="number"
                        id="maxPayments"
                        name="maxPayments"
                        value={formData.maxPayments}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Unlimited"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty for unlimited payments
                      </p>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : scheduledPayment ? 'Update Scheduled Payment' : 'Create Scheduled Payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default ScheduledPaymentModal;