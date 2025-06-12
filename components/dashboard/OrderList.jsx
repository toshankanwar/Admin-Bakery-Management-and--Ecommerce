'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/dateUtils';

const OrderList = ({ orders, loading, selectedOrderId, onSelectOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Memoized filtered and sorted orders
  const processedOrders = useMemo(() => {
    let result = [...orders];

    // Apply filters
    result = result.filter(
      (order) =>
        (statusFilter === 'all' || order.status === statusFilter) &&
        (searchTerm === '' ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (order.customerEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
    );

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
          break;
        case 'total':
          comparison = b.total - a.total;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600" />
        <p className="text-sm text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="total-desc">Highest Amount</option>
              <option value="total-asc">Lowest Amount</option>
              <option value="status-asc">Status (A-Z)</option>
              <option value="status-desc">Status (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Filter summary */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FunnelIcon className="h-4 w-4" />
          <span>
            Showing {processedOrders.length} of {orders.length} orders
            {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
            {searchTerm && ` • Search: "${searchTerm}"`}
          </span>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <AnimatePresence>
          {processedOrders.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {processedOrders.map((order) => (
                <motion.li
                  key={order.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => onSelectOrder(order)}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors ${
                      selectedOrderId === order.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-purple-600">
                            Order #{order.id.slice(-6)}
                          </p>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">
                            {order.customerName || 'Anonymous'}
                          </p>
                          {order.customerEmail && (
                            <p className="text-sm text-gray-500">{order.customerEmail}</p>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <p className="text-gray-500">
                            {formatDate(order.createdAt)}
                          </p>
                          <p className="font-medium text-gray-900">
                            ${order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </button>
                </motion.li>
              ))}
            </ul>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <p className="text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'No orders match your filters'
                  : 'No orders found'}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-sm text-purple-600 hover:text-purple-500"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderList;