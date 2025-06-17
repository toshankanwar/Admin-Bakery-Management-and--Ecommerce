'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderList from '@/components/dashboard/OrderList';
import { getOrders, updateOrderStatus } from '@/firebase/firebase';
import Toast from '@/components/Toast';

const OrderDetails = ({ order, onClose, onStatusUpdate }) => {
  if (!order) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Order #{order.id?.slice(-6)}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 transition-colors"
        >
          <span className="sr-only">Close panel</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Order Details Content */}
      <div className="space-y-4">
        <div className="border-t border-gray-200 pt-4">
          <dl className="divide-y divide-gray-200">
            <div className="py-3 flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm text-gray-900">{order.status}</dd>
            </div>
            <div className="py-3 flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="text-sm text-gray-900">{order.customerName || 'Anonymous'}</dd>
            </div>
            <div className="py-3 flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="text-sm font-medium text-gray-900">₹{order.total?.toFixed(2) || '0.00'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notification, setNotification] = useState({
    message: '',
    type: ''
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await getOrders();
      
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data.map(order => ({
          ...order,
          // Ensure required fields have default values
          id: order.id || `temp-${Date.now()}`,
          status: order.status || 'pending',
          customerName: order.customerName || 'Anonymous',
          total: parseFloat(order.total || 0),
          createdAt: order.createdAt || new Date().toISOString()
        })));
      } else {
        console.error('Invalid orders data:', {
          error: result.error || 'Unknown error',
          timestamp: '2025-06-17 16:54:09',
          user: 'Kala-bot-apk'
        });
        setOrders([]); // Set empty array instead of throwing error
  
      }
    } catch (error) {
      console.error('Fetch orders error:', {
        error: error.message,
        timestamp: '2025-06-17 16:54:09',
        user: 'Kala-bot-apk'
      });
      setOrders([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Refresh orders every 5 minutes
    const interval = setInterval(fetchOrders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (!orderId || !newStatus) {
      showNotification('Invalid order update data', 'error');
      return;
    }

    try {
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (result.success) {
        await fetchOrders();
        showNotification('Order status updated successfully');
        
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({
            ...prev,
            status: newStatus,
            updatedAt: new Date().toISOString()
          }));
        }
      } else {
        showNotification(result.error || 'Failed to update order status', 'error');
      }
    } catch (error) {
      console.error('Update order status error:', {
        error: error.message,
        orderId,
        newStatus,
        timestamp: '2025-06-17 16:54:09',
        user: 'Kala-bot-apk'
      });
      showNotification('Failed to update order status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <Toast
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Orders Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <OrderList
            orders={orders || []} // Ensure orders is always an array
            loading={loading}
            selectedOrderId={selectedOrder?.id}
            onSelectOrder={setSelectedOrder}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>

        {/* Order Details */}
        <div className="lg:col-span-1">
  <AnimatePresence mode="wait">
    {selectedOrder && (
      <motion.div
        key="order-details"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      </motion.div>
    )}
  </AnimatePresence>
</div>
      </div>
    </div>
  );
}