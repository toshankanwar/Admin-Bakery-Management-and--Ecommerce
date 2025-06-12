'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import OrderList from '@/components/dashboard/OrderList';
import OrderDetails from '@/components/dashboard/OrderDetails';
import { getOrders, updateOrderStatus } from '@/firebase/firebase'; // Updated import path
import Toast from '@/components/Toast';

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
      
      if (result.success) {
        setOrders(result.data);
      } else {
        showNotification('Failed to fetch orders', 'error');
        console.error('Fetch orders error:', {
          error: result.error,
          timestamp: '2025-06-12 17:09:26',
          user: 'Kala-bot-apk'
        });
      }
    } catch (error) {
      console.error('Fetch orders error:', {
        error: error.message,
        timestamp: '2025-06-12 17:09:26',
        user: 'Kala-bot-apk'
      });
      showNotification('Failed to fetch orders', 'error');
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
    try {
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (result.success) {
        await fetchOrders();
        showNotification('Order status updated successfully');
        // Update the selected order if it's currently being viewed
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({
            ...selectedOrder,
            status: newStatus,
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        showNotification('Failed to update order status', 'error');
      }
    } catch (error) {
      console.error('Update order status error:', {
        error: error.message,
        timestamp: '2025-06-12 17:09:26',
        user: 'Kala-bot-apk'
      });
      showNotification('Failed to update order status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Toast
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <OrderList
            orders={orders}
            loading={loading}
            selectedOrderId={selectedOrder?.id}
            onSelectOrder={setSelectedOrder}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>

        {/* Order Details */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <OrderDetails
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onStatusUpdate={handleStatusUpdate}
              />
            </motion.div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Select an order to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}