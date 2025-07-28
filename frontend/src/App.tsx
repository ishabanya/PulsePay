import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import Subscriptions from './pages/Subscriptions';
import SplitPayments from './pages/SplitPayments';
import PaymentLinks from './pages/PaymentLinks';
import QRCodes from './pages/QRCodes';
import BulkPayments from './pages/BulkPayments';
import ScheduledPayments from './pages/ScheduledPayments';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="split-payments" element={<SplitPayments />} />
              <Route path="payment-links" element={<PaymentLinks />} />
              <Route path="qr-codes" element={<QRCodes />} />
              <Route path="bulk-payments" element={<BulkPayments />} />
              <Route path="scheduled-payments" element={<ScheduledPayments />} />
              <Route path="customers" element={<Customers />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;