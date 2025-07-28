export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export const formatDate = (date: Date | string | any): string => {
  let d: Date;
  
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date && typeof date.toDate === 'function') {
    // Firestore timestamp
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else {
    d = new Date();
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatDateShort = (date: Date | string | any): string => {
  let d: Date;
  
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date && typeof date.toDate === 'function') {
    // Firestore timestamp
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else {
    d = new Date();
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
};

export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'succeeded':
    case 'paid':
      return 'text-green-600 bg-green-100';
    case 'pending':
    case 'sent':
      return 'text-yellow-600 bg-yellow-100';
    case 'failed':
    case 'overdue':
      return 'text-red-600 bg-red-100';
    case 'canceled':
    case 'draft':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};