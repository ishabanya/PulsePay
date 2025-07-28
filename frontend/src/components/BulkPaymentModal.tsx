import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bulkPayment: any) => void;
  bulkPayment?: any;
  title: string;
}

interface Recipient {
  name: string;
  email: string;
  amount: string;
  description: string;
}

const BulkPaymentModal: React.FC<BulkPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  bulkPayment,
  title,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    currency: 'USD',
    executeDate: '',
    status: 'pending'
  });

  const [recipients, setRecipients] = useState<Recipient[]>([
    { name: '', email: '', amount: '', description: '' }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bulkPayment) {
      setFormData({
        title: bulkPayment.title || '',
        description: bulkPayment.description || '',
        currency: bulkPayment.currency || 'USD',
        executeDate: bulkPayment.executeDate || '',
        status: bulkPayment.status || 'pending'
      });
      setRecipients(bulkPayment.recipients || [{ name: '', email: '', amount: '', description: '' }]);
    } else {
      setFormData({
        title: '',
        description: '',
        currency: 'USD',
        executeDate: '',
        status: 'pending'
      });
      setRecipients([{ name: '', email: '', amount: '', description: '' }]);
    }
  }, [bulkPayment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validRecipients = recipients.filter(r => r.name && r.email && r.amount);
      if (validRecipients.length === 0) {
        toast.error('Please add at least one valid recipient');
        setLoading(false);
        return;
      }

      const bulkPaymentData = {
        ...formData,
        recipients: validRecipients.map(r => ({
          ...r,
          amount: parseFloat(r.amount)
        })),
        totalAmount: validRecipients.reduce((sum, r) => sum + parseFloat(r.amount), 0)
      };

      await onSave(bulkPaymentData);
      onClose();
      toast.success(bulkPayment ? 'Bulk payment updated successfully!' : 'Bulk payment created successfully!');
    } catch (error) {
      console.error('Error saving bulk payment:', error);
      toast.error('Failed to save bulk payment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRecipientChange = (index: number, field: keyof Recipient, value: string) => {
    setRecipients(prev => prev.map((recipient, i) => 
      i === index ? { ...recipient, [field]: value } : recipient
    ));
  };

  const addRecipient = () => {
    setRecipients(prev => [...prev, { name: '', email: '', amount: '', description: '' }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        const newRecipients: Recipient[] = [];
        
        // Skip header row if it exists
        const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const [name, email, amount, description] = lines[i].split(',').map(s => s.trim());
          if (name && email && amount) {
            newRecipients.push({ name, email, amount, description: description || '' });
          }
        }
        
        if (newRecipients.length > 0) {
          setRecipients(newRecipients);
          toast.success(`Loaded ${newRecipients.length} recipients from CSV`);
        } else {
          toast.error('No valid recipients found in CSV');
        }
      };
      reader.readAsText(file);
    }
  };

  const totalAmount = recipients
    .filter(r => r.amount)
    .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

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
            className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6 sm:align-middle"
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
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Batch Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g. Monthly Payroll"
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
                        placeholder="Optional description for this bulk payment batch"
                      />
                    </div>

                    <div>
                      <label htmlFor="executeDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Execution Date
                      </label>
                      <input
                        type="datetime-local"
                        id="executeDate"
                        name="executeDate"
                        value={formData.executeDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to execute immediately
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
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  {/* Recipients Section */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-900">Recipients</h4>
                      <div className="flex gap-2">
                        <label className="btn-secondary cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload CSV
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={addRecipient}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Recipient
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {recipients.map((recipient, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name *
                            </label>
                            <input
                              type="text"
                              value={recipient.name}
                              onChange={(e) => handleRecipientChange(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              placeholder="Recipient name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={recipient.email}
                              onChange={(e) => handleRecipientChange(index, 'email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              placeholder="email@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Amount *
                            </label>
                            <input
                              type="number"
                              value={recipient.amount}
                              onChange={(e) => handleRecipientChange(index, 'amount', e.target.value)}
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={recipient.description}
                              onChange={(e) => handleRecipientChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                              placeholder="Payment for..."
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeRecipient(index)}
                              disabled={recipients.length === 1}
                              className="w-full px-3 py-2 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Total Recipients:</span>
                        <span className="font-medium">{recipients.filter(r => r.name && r.email && r.amount).length}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Total Amount:</span>
                        <span className="font-medium">${totalAmount.toFixed(2)} {formData.currency}</span>
                      </div>
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
                      {loading ? 'Saving...' : bulkPayment ? 'Update Bulk Payment' : 'Create Bulk Payment'}
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

export default BulkPaymentModal;