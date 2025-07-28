import { Request as ExpressRequest } from 'express';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  timezone: string;
  preferredCurrency: string;
  country: string;
  createdAt: Date;
  updatedAt?: Date;
  stripeCustomerId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    uid: string;
    email: string;
    name: string;
  };
}

export interface Transaction {
  id: string;
  userId: string; // Add userId field
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'scheduled' | 'processing';
  type: 'payment' | 'subscription' | 'split' | 'bulk' | 'link' | 'qr';
  description: string;
  customerEmail: string;
  customerName: string;
  stripePaymentIntentId?: string;
  subscriptionId?: string;
  splitPaymentId?: string;
  bulkPaymentId?: string;
  paymentLinkId?: string;
  qrCodeId?: string;
  scheduledDate?: Date;
  taxAmount?: number;
  taxRate?: number;
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'sepa' | 'ach' | 'local_wallet';
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: Address;
  totalSpent: number;
  transactionCount: number;
  preferredCurrency: string;
  timezone: string;
  createdAt: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
  type?: 'payment' | 'subscription' | 'split' | 'bulk' | 'link' | 'qr';
  scheduledDate?: Date;
  taxRate?: number;
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'sepa' | 'ach';
  splitParticipants?: SplitParticipant[];
}

export interface SplitParticipant {
  email: string;
  name: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
}

export interface SplitPayment {
  id: string;
  totalAmount: number;
  currency: string;
  description: string;
  createdBy: string;
  participants: SplitParticipant[];
  status: 'pending' | 'partial' | 'completed' | 'failed';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  status: 'active' | 'canceled' | 'paused' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextPaymentDate: Date;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentLink {
  id: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  url: string;
  status: 'active' | 'expired' | 'used';
  expiresAt?: Date;
  maxUses?: number;
  usedCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRCode {
  id: string;
  amount?: number;
  currency: string;
  description: string;
  merchantName: string;
  qrData: string;
  status: 'active' | 'expired' | 'disabled';
  usageCount: number;
  maxUses?: number;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkPayment {
  id: string;
  totalAmount: number;
  currency: string;
  description: string;
  payments: BulkPaymentItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  successCount: number;
  failureCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkPaymentItem {
  customerEmail: string;
  customerName: string;
  amount: number;
  description?: string;
  status: 'pending' | 'succeeded' | 'failed';
  transactionId?: string;
  errorMessage?: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

export interface DashboardStats {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  revenueGrowth: number;
  recentTransactions: Transaction[];
}

