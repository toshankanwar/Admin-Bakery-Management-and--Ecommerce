'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderList from '@/components/dashboard/OrderList';
import { getOrders, updateOrderStatus } from '@/firebase/firebase';
import Toast from '@/components/Toast';

const OrderDetails = ({ order, onClose, onStatusUpdate }) => {
  if (!order) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 w-full max-w-2xl mx-auto border border-purple-100">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-purple-800 flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">Order</span>
          #{order.id?.slice(-6)}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-purple-500 transition-colors"
        >
          <span className="sr-only">Close panel</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Order Details Content */}
      <div className="space-y-5">
        <dl className="divide-y divide-gray-200 text-base">
          <div className="py-3 flex justify-between">
            <dt className="text-gray-500 font-medium">Status</dt>
            <dd className="text-gray-900">{order.status}</dd>
          </div>
          <div className="py-3 flex justify-between">
            <dt className="text-gray-500 font-medium">Customer</dt>
            <dd className="text-gray-900">{order.customerName || 'Anonymous'}</dd>
          </div>
          <div className="py-3 flex justify-between">
            <dt className="text-gray-500 font-medium">Total Amount</dt>
            <dd className="font-semibold text-purple-700">
              ₹{order.total?.toFixed(2) || '0.00'}
            </dd>
          </div>
          <div className="py-3 flex justify-between">
            <dt className="text-gray-500 font-medium">Delivery Date</dt>
            <dd className="text-gray-900">
              {order.deliveryDate
                ? (typeof order.deliveryDate === "string"
                    ? new Date(order.deliveryDate).toLocaleDateString()
                    : (order.deliveryDate.toDate?.() || order.deliveryDate).toLocaleDateString())
                : '—'}
            </dd>
          </div>
          <div className="py-3 flex justify-between">
            <dt className="text-gray-500 font-medium">Created</dt>
            <dd className="text-gray-900">
              {order.createdAt
                ? (typeof order.createdAt === "string"
                    ? new Date(order.createdAt).toLocaleString()
                    : (order.createdAt.toDate?.() || order.createdAt).toLocaleString())
                : '—'}
            </dd>
          </div>
        </dl>
        {(order.items && order.items.length > 0) && (
          <div>
            <h3 className="font-semibold text-purple-700 mb-2">Items</h3>
            <ul className="space-y-1">
              {order.items.map((item, idx) => (
                <li key={idx} className="flex justify-between text-gray-700">
                  <span>{item.name}</span>
                  <span className="font-mono text-sm text-gray-500">x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          id: order.id || `temp-${Date.now()}`,
          status: order.status || 'pending',
          customerName: order.customerName || 'Anonymous',
          total: parseFloat(order.total || 0),
          createdAt: order.createdAt || new Date().toISOString(),
          deliveryDate: order.deliveryDate || '',
          items: Array.isArray(order.items) ? order.items : []
        })));
      } else {
        setOrders([]);
        console.error('Invalid orders data:', {
          error: result.error || 'Unknown error',
          timestamp: new Date().toISOString(),
          user: 'Kala-bot-apk'
        });
      }
    } catch (error) {
      setOrders([]);
      console.error('Fetch orders error:', {
        error: error.message,
        timestamp: new Date().toISOString(),
        user: 'Kala-bot-apk'
      });
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
      showNotification('Failed to update order status', 'error');
      console.error('Update order status error:', {
        error: error.message,
        orderId,
        newStatus,
        timestamp: new Date().toISOString(),
        user: 'Kala-bot-apk'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-200 p-0">
      <Toast
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <div className="max-w-full w-full mx-auto">
        <div className="flex items-center justify-between px-6 pt-8 pb-4">
          <h1 className="text-3xl font-extrabold text-purple-800">Orders Management</h1>
        </div>
        <div className="flex flex-col lg:flex-row gap-8 px-6 pb-8">
          {/* Orders List */}
          <div className={`w-full ${selectedOrder ? 'lg:w-2/3' : ''} transition-all`}>
            <OrderList
              orders={orders || []}
              loading={loading}
              selectedOrderId={selectedOrder?.id}
              onSelectOrder={setSelectedOrder}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
          {/* Order Details (full width on mobile, right panel on desktop) */}
          <AnimatePresence mode="wait">
            {selectedOrder && (
              <motion.div
                key="order-details"
                initial={{ opacity: 0, x: 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 48 }}
                transition={{ type: "spring", damping: 16 }}
                className="w-full lg:w-1/3 flex-shrink-0"
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
      <style jsx global>{`
        body {
          background: linear-gradient(to bottom right, #faf5ff 0%, #a78bfa 100%);
        }
      `}</style>
    </div>
  );
}