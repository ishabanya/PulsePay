import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (splitPayment: any) => void;
  splitPayment?: any;
  title: string;
}

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  splitPayment,
  title,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalAmount: '',
    currency: 'USD',
    status: 'pending'
  });

  const [participants, setParticipants] = useState([
    { name: '', email: '', amount: '', status: 'pending' }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (splitPayment) {
      setFormData({
        title: splitPayment.title || '',
        description: splitPayment.description || '',
        totalAmount: splitPayment.totalAmount?.toString() || '',
        currency: splitPayment.currency || 'USD',
        status: splitPayment.status || 'pending'
      });
      setParticipants(splitPayment.participants || [{ name: '', email: '', amount: '', status: 'pending' }]);
    } else {
      setFormData({
        title: '',
        description: '',
        totalAmount: '',
        currency: 'USD',
        status: 'pending'
      });
      setParticipants([{ name: '', email: '', amount: '', status: 'pending' }]);
    }
  }, [splitPayment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const splitPaymentData = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount),
        participants: participants.map(p => ({
          ...p,
          amount: parseFloat(p.amount) || 0
        }))
      };

      await onSave(splitPaymentData);
      onClose();
      toast.success(splitPayment ? 'Split payment updated successfully!' : 'Split payment created successfully!');
    } catch (error) {
      console.error('Error saving split payment:', error);
      toast.error('Failed to save split payment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleParticipantChange = (index: number, field: string, value: string) => {
    setParticipants(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const addParticipant = () => {
    setParticipants(prev => [...prev, { name: '', email: '', amount: '', status: 'pending' }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(prev => prev.filter((_, i) => i !== index));
    }
  };

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
                        Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g. Dinner at Restaurant"
                      />
                    </div>

                    <div>
                      <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-2">
                        Total Amount *
                      </label>
                      <input
                        type="number"
                        id="totalAmount"
                        name="totalAmount"
                        value={formData.totalAmount}
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
                        <option value="partial">Partial</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-span-2">
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
                      placeholder="Description of the split payment"
                    />
                  </div>

                  {/* Participants Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-900">Participants</h4>
                      <button
                        type="button"
                        onClick={addParticipant}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
                      >
                        <Plus className="h-4 w-4" />
                        Add Participant
                      </button>
                    </div>

                    <div className="space-y-3">
                      {participants.map((participant, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-gray-200 rounded-lg">
                          <div>
                            <input
                              type="text"
                              value={participant.name}
                              onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                              placeholder="Name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <input
                              type="email"
                              value={participant.email}
                              onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                              placeholder="Email"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={participant.amount}
                              onChange={(e) => handleParticipantChange(index, 'amount', e.target.value)}
                              placeholder="Amount"
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={participant.status}
                              onChange={(e) => handleParticipantChange(index, 'status', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                            </select>
                            {participants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeParticipant(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
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
                      {loading ? 'Saving...' : splitPayment ? 'Update Split Payment' : 'Create Split Payment'}
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

export default SplitPaymentModal;