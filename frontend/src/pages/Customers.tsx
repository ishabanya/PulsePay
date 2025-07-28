import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users as UsersIcon, Mail, DollarSign } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers');
      console.log('Customers API response:', response.data);
      
      // Handle API response structure: { success: true, data: { customers, count } }
      let customers = [];
      if (response.data.success && response.data.data?.customers) {
        customers = response.data.data.customers;
      } else if (response.data.customers) {
        customers = response.data.customers;
      } else if (Array.isArray(response.data)) {
        customers = response.data;
      } else {
        // If no customers, try to generate them from transactions
        console.warn('No customers found, checking for transactions to generate customers...');
        try {
          const transactionResponse = await api.get('/transactions');
          console.log('Transaction response for customer generation:', transactionResponse.data);
          
          if (transactionResponse.data && Array.isArray(transactionResponse.data)) {
            // Generate customers from transactions
            const customerMap = new Map();
            
            transactionResponse.data.forEach((transaction: any) => {
              const email = transaction.customerEmail;
              if (!email) return;
              
              if (customerMap.has(email)) {
                const customer = customerMap.get(email);
                customer.totalSpent += transaction.status === 'succeeded' ? (transaction.amount || 0) : 0;
                customer.transactionCount += 1;
              } else {
                customerMap.set(email, {
                  id: email,
                  email: transaction.customerEmail,
                  name: transaction.customerName || 'Unknown Customer',
                  totalSpent: transaction.status === 'succeeded' ? (transaction.amount || 0) : 0,
                  transactionCount: 1,
                  createdAt: transaction.createdAt || new Date().toISOString()
                });
              }
            });
            
            customers = Array.from(customerMap.values());
            console.log('Generated customers from transactions:', customers);
          }
        } catch (error) {
          console.error('Error generating customers from transactions:', error);
        }
      }
      
      setCustomers(customers);
    } catch (error: any) {
      toast.error('Failed to fetch customers');
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="text-sm text-gray-500">
          {customers.length} total customers
        </div>
      </div>

      <div className="card">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="skeleton h-12 w-12 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="skeleton h-4 w-24"></div>
                    <div className="skeleton h-3 w-32"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="skeleton h-3 w-20"></div>
                  <div className="skeleton h-4 w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-primary-600">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{customer.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-3 w-3 mr-1" />
                      {customer.email}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Spent</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Transactions</span>
                    <span className="font-medium text-gray-900">
                      {customer.transactionCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Since</span>
                    <span className="text-sm text-gray-600">
                      {formatDate(customer.createdAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search criteria' 
                : 'Customers will appear here after their first transaction'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;