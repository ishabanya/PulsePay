import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  loading = false,
}) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-4 w-20"></div>
            <div className="skeleton h-8 w-24"></div>
            <div className="skeleton h-3 w-16"></div>
          </div>
          <div className="skeleton h-12 w-12 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="p-3 bg-primary-100 rounded-full">
            <Icon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;