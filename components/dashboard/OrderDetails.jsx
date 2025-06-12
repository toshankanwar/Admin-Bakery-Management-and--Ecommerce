'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { formatDate, getRelativeTime } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const OrderDetails = ({ order, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      setError('');
      await onStatusUpdate(order.id, newStatus);
    } catch (error) {
      console.error('Error updating order status:', {
        error: error.message,
        timestamp: '2025-06-12 17:16:14',
        user: 'Kala-bot-apk'
      });
      setError('Failed to update order status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const subtotal = calculateSubtotal();
  const tax = order.tax || 0;
  const shipping = order.shipping || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white shadow rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Order #{order.id.slice(-6)}
            </h3>
            <p className="mt-1 text-sm text-gray-500 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              {getRelativeTime(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 sm:px-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          {/* Status */}
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                className={`mt-1 block w-full rounded-md border shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
                  statusColors[order.status] || 'border-gray-300'
                }`}
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {updating && (
                <p className="mt-1 text-sm text-gray-500">Updating status...</p>
              )}
            </dd>
          </div>

          {/* Customer Information */}
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Customer Information</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="font-medium">{order.customerName || 'Anonymous'}</p>
                {order.customerEmail && (
                  <p className="text-gray-500">{order.customerEmail}</p>
                )}
                {order.customerPhone && (
                  <p className="text-gray-500">{order.customerPhone}</p>
                )}
              </div>
            </dd>
          </div>

          {/* Delivery Address */}
          {order.shippingAddress && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Delivery Address</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="bg-gray-50 rounded-md p-4">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </dd>
            </div>
          )}

          {/* Order Items */}
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Order Items</dt>
            <dd className="mt-1">
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                {order.items.map((item) => (
                  <li key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </dd>
          </div>

          {/* Order Summary */}
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Order Summary</dt>
            <dd className="mt-1 text-sm">
              <div className="bg-gray-50 rounded-md p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-900">${tax.toFixed(2)}</span>
                  </div>
                )}
                {shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className="text-gray-900">${shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                  <span className="text-gray-900">Total</span>
                  <span className="text-purple-600">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </dd>
          </div>

          {/* Timestamps */}
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(order.createdAt)}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(order.updatedAt || order.createdAt)}
            </dd>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Notes</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="bg-gray-50 rounded-md p-4">
                  {order.notes}
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </motion.div>
  );
};

// Create a protected wrapper component
export const withProtection = (Component) => {
    return function ProtectedComponent(props) {
      const { user, isAdmin, loading } = useAuth();
      const router = useRouter();
  
      if (loading) {
        return (
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        );
      }
  
      if (!user || !isAdmin) {
        console.log('Unauthorized access attempt:', {
          timestamp: '2025-06-12 17:36:10',
          user: 'Kala-bot-apk'
        });
        router.push('/login');
        return null;
      }
  
      return <Component {...props} />;
    };
  };
  
  // Create and export the protected version
  const ProtectedOrderDetails = withProtection(OrderDetails);
  
  // Export both the base and protected versions
  export { OrderDetails as BaseOrderDetails };
  export default ProtectedOrderDetails;