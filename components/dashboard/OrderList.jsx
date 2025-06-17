'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
  PhoneIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  ArrowLongRightIcon
} from '@heroicons/react/24/outline';
import { db } from '@/firebase/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

// Enhanced Order Status Configuration with Flow Logic
const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Order Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: ClockIcon,
    nextStatus: ['confirmed', 'cancelled']
  },
  confirmed: {
    label: 'Order Confirmed',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircleIcon,
    nextStatus: ['processing', 'cancelled']
  },
  processing: {
    label: 'Processing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: TruckIcon,
    nextStatus: ['shipped', 'cancelled']
  },
  shipped: {
    label: 'Shipped',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: TruckIcon,
    nextStatus: ['delivered', 'cancelled']
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircleIcon,
    nextStatus: []
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircleIcon,
    nextStatus: []
  }
};

// Status Flow Steps
const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const PAYMENT_STATUS_CONFIG = {
  pending: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    text: 'Payment Pending'
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    text: 'Payment Completed'
  },
  failed: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    text: 'Payment Failed'
  }
};

// Enhanced Search Input Component
const SearchInput = ({ value, onChange }) => {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search orders by ID, customer name, or email..."
        className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg
          focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          hover:border-purple-300 transition-all duration-200
          placeholder-gray-400"
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: '' } })}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
};

// Enhanced Sort Select Component
const SortSelect = ({ value, onChange, options }) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none w-full bg-white pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg
          focus:ring-2 focus:ring-purple-500 focus:border-purple-500
          hover:border-purple-300 transition-all duration-200 cursor-pointer
          font-medium text-gray-700"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
};

// Status Flow Indicator Component with Enhanced Animations
const StatusFlowIndicator = ({ currentStatus, onStatusChange }) => {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  
  return (
    <div className="flex items-center space-x-4 py-4 overflow-x-auto">
      {STATUS_FLOW.map((status, index) => {
        const config = ORDER_STATUS_CONFIG[status];
        const isActive = index <= currentIndex;
        const isCurrent = status === currentStatus;
        
        return (
          <div key={status} className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStatusChange(status)}
              disabled={index > currentIndex + 1}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full
                ${isCurrent ? `${config.bgColor} ${config.color}` : 
                  isActive ? 'bg-purple-100 text-purple-600' : 
                  'bg-gray-50 text-gray-400'}
                transition-all duration-200 hover:opacity-80
                ${index > currentIndex + 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              <config.icon className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">{config.label}</span>
            </motion.button>
            {index < STATUS_FLOW.length - 1 && (
              <ArrowLongRightIcon className={`h-5 w-5 mx-2 
                ${index < currentIndex ? 'text-purple-400' : 'text-gray-200'}`} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Enhanced Status Change Dialog with Backdrop Blur
const StatusChangeDialog = ({ isOpen, onClose, order, onConfirm, newStatus, isUpdating }) => {
  if (!isOpen) return null;

  const statusConfig = ORDER_STATUS_CONFIG[newStatus];
  const currentConfig = ORDER_STATUS_CONFIG[order.orderStatus];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 20 }}
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 max-w-md w-full 
          border border-purple-100"
      >
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${currentConfig.bgColor}`}>
              <currentConfig.icon className={`h-6 w-6 ${currentConfig.color}`} />
            </div>
            <ArrowLongRightIcon className="h-6 w-6 text-purple-400" />
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${statusConfig.bgColor}`}>
              <statusConfig.icon className={`h-6 w-6 ${statusConfig.color}`} />
            </div>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Update Order Status
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Are you sure you want to change the order status from{' '}
            <span className={`font-medium ${currentConfig.color}`}>
              {currentConfig.label}
            </span>{' '}
            to{' '}
            <span className={`font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>?
          </p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
              rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
              focus:ring-purple-500 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUpdating}
            className={`px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg
              hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
              focus:ring-purple-500 transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
          >
            {isUpdating && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                />
              </svg>
            )}
            Confirm Update
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Enhanced Order Details Dialog with Backdrop Blur
const OrderDetailsDialog = ({ order, onClose, onStatusChange }) => {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!order) return null;

  const handleStatusChange = async (newStatus) => {
    try {
      setSelectedStatus(newStatus);
      setIsStatusDialogOpen(true);
    } catch (error) {
      console.error('Error updating order status:', {
        error: error.message,
        timestamp: '2025-06-17 16:20:40',
        user: 'Kala-bot-apk'
      });
      toast.error('Failed to initiate status update');
    }
  };

  const handleStatusConfirm = async () => {
    try {
      setIsUpdating(true);
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        orderStatus: selectedStatus,
        updatedAt: new Date()
      });
      await onStatusChange(order.id, selectedStatus);
      setIsStatusDialogOpen(false);
      toast.success(`Order status updated to ${ORDER_STATUS_CONFIG[selectedStatus].label}`);
    } catch (error) {
      console.error('Error confirming status update:', {
        error: error.message,
        timestamp: '2025-06-17 16:20:40',
        user: 'Kala-bot-apk'
      });
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 20 }}
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] 
          overflow-y-auto relative border border-purple-100"
      >
        <div className="sticky top-0 bg-white border-b border-purple-100 px-6 py-4 flex items-center 
          justify-between z-10"
        >
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              Order #{order.id.slice(-6)}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
              ${ORDER_STATUS_CONFIG[order.orderStatus].bgColor} 
              ${ORDER_STATUS_CONFIG[order.orderStatus].color}`}
            >
              {ORDER_STATUS_CONFIG[order.orderStatus].label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors p-2 rounded-full
              hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Status Flow */}
          <div className="bg-white rounded-lg border border-purple-100 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Order Progress</h4>
            <StatusFlowIndicator 
              currentStatus={order.orderStatus}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-purple-600 font-medium">Order Date</p>
                <p className="text-sm text-gray-900">
                  {order.createdAt.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-purple-600 font-medium">Total Items</p>
                <p className="text-sm text-gray-900">
                  {order.items?.length || 0} items
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-purple-600 font-medium">Payment Method</p>
                <p className="text-sm text-gray-900">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'UPI Payment'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-purple-600 font-medium">Total Amount</p>
                <p className="text-lg font-bold text-purple-600">
                  ₹{order.total?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 border-b border-purple-100 pb-2">
              Order Items
            </h4>
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-purple-100 
                    hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image || '/default-product.png'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-gray-900 truncate">{item.name}</h5>
                    <div className="mt-1 flex items-center space-x-4">
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-500">Price: ₹{item.price.toFixed(2)}</p>
                    </div>
                    {item.specialRequest && (
                      <p className="mt-1 text-sm text-purple-600 truncate">
                        Note: {item.specialRequest}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Shipping and Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipping Address */}
            <div className="bg-white p-6 rounded-lg border border-purple-100 hover:border-purple-200 
              transition-colors"
            >
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-900 mb-4">
                <MapPinIcon className="h-5 w-5 text-purple-500" />
                <h4>Shipping Address</h4>
              </div>
              <div className="text-sm space-y-3 pl-7">
                <div className="flex items-start">
                  <p className="font-medium text-gray-900">{order.address?.name}</p>
                </div>
                <div className="space-y-1 text-gray-600">
                  <p>{order.address?.address}</p>
                  {order.address?.apartment && (
                    <p>{order.address.apartment}</p>
                  )}
                  <p>{order.address?.city}, {order.address?.state}</p>
                  <p>PIN: {order.address?.pincode}</p>
                </div>
                <p className="flex items-center text-purple-600 mt-2">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  {order.address?.mobile}
                </p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white p-6 rounded-lg border border-purple-100 hover:border-purple-200 
              transition-colors"
            >
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-900 mb-4">
                <BanknotesIcon className="h-5 w-5 text-purple-500" />
                <h4>Payment Details</h4>
              </div>
              <div className="space-y-4 pl-7">
                <div className="text-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Status</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      PAYMENT_STATUS_CONFIG[order.paymentStatus || 'pending'].bgColor
                    } ${PAYMENT_STATUS_CONFIG[order.paymentStatus || 'pending'].color}`}>
                      {PAYMENT_STATUS_CONFIG[order.paymentStatus || 'pending'].text}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Shipping</span>
                    <span>
                      {order.shipping === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        `₹${order.shipping?.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-purple-100">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="text-lg font-bold text-purple-600">
                      ₹{order.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
       
        </div>
      </motion.div>

      <AnimatePresence>
        {isStatusDialogOpen && (
          <StatusChangeDialog
            isOpen={isStatusDialogOpen}
            onClose={() => setIsStatusDialogOpen(false)}
            order={order}
            newStatus={selectedStatus}
            onConfirm={handleStatusConfirm}
            isUpdating={isUpdating}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Main OrderList Component
const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ordersPerPage = 10;

  const fetchOrders = async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        orderBy('createdAt', 'desc')
      );

      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (queryError) {
        console.error('Error executing orders query:', {
          error: queryError.message,
          code: queryError.code,
          timestamp: '2025-06-17 16:20:40',
          user: 'Kala-bot-apk'
        });
      }

      const fetchedOrders = querySnapshot.docs.map(doc => {
        try {
          const data = doc.data();
          if (!data) {
            throw new Error(`Invalid document data for order ${doc.id}`);
          }

          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? 
              data.createdAt.toDate() : 
              new Date(data.createdAt || Date.now()),
            orderStatus: data.orderStatus || 'pending',
            total: data.total || 0,
            items: data.items || [],
            customerName: data.customerName || 'Anonymous',
            paymentStatus: data.paymentStatus || 'pending'
          };
        } catch (docError) {
          console.error('Error processing order document:', {
            error: docError.message,
            orderId: doc.id,
            timestamp: '2025-06-17 16:20:40',
            user: 'Kala-bot-apk'
          });
          return {
            id: doc.id,
            createdAt: new Date(),
            orderStatus: 'pending',
            total: 0,
            items: [],
            customerName: 'Anonymous',
            paymentStatus: 'pending'
          };
        }
      });

      if (!Array.isArray(fetchedOrders)) {
        throw new Error('Invalid orders data structure');
      }

      setOrders(fetchedOrders);
      setHasMore(fetchedOrders.length > page * ordersPerPage);

      if (showRefreshingState) {
        toast.success('Orders refreshed successfully');
      }
    } catch (error) {
      console.error('Error fetching orders:', {
        error: error.message,
        stack: error.stack,
        timestamp: '2025-06-17 16:20:40',
        user: 'Kala-bot-apk'
      });
      
      setError('Failed to load orders');
      
      
      setOrders([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, orderStatus: newStatus } : order
    );
    setOrders(updatedOrders);
    setSelectedOrder(prev => prev ? { ...prev, orderStatus: newStatus } : null);
  };

  const processedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    try {
      let result = [...orders];

      // Apply filters
      result = result.filter(
        (order) =>
          (statusFilter === 'all' || order.orderStatus === statusFilter) &&
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
            comparison = (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
            break;
          case 'total':
            comparison = (b.total || 0) - (a.total || 0);
            break;
          default:
            comparison = (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
        }
        return sortOrder === 'asc' ? -comparison : comparison;
      });

      return result.slice(0, page * ordersPerPage);
    } catch (error) {
      console.error('Error processing orders:', error);
      return [];
    }
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder, page]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-purple-200" />
          <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent 
            animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="rounded-full bg-red-50 p-4">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">{error}</p>
          <p className="mt-1 text-sm text-gray-500">Please try again</p>
        </div>
        <motion.button
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => fetchOrders()}
                   className="mt-4 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                     transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 
                     focus:ring-purple-500 focus:ring-offset-2"
                 >
                   Retry Loading
                 </motion.button>
               </div>
             );
           }
         
           return (
             <>
               <div className="min-h-screen bg-gray-50 py-8">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                   <div className="flex justify-between items-center">
                     <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
                     <motion.button
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => fetchOrders(true)}
                       disabled={refreshing}
                       className={`inline-flex items-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-medium
                         ${refreshing ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
                         text-white transition-all duration-200 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-purple-500`}
                     >
                       <ArrowPathIcon 
                         className={`-ml-1 mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} 
                       />
                       {refreshing ? 'Refreshing...' : 'Refresh Orders'}
                     </motion.button>
                   </div>
         
                   <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                     {/* Enhanced Search and Filters */}
                     <div className="p-6 space-y-6">
                       <div className="flex flex-col sm:flex-row gap-6">
                         <SearchInput 
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                         />
                         <div className="flex gap-4">
                           <SortSelect
                             value={statusFilter}
                             onChange={(e) => setStatusFilter(e.target.value)}
                             options={[
                               { value: 'all', label: 'All Orders' },
                               ...Object.entries(ORDER_STATUS_CONFIG).map(([value, config]) => ({
                                 value,
                                 label: config.label
                               }))
                             ]}
                           />
                           <SortSelect
                             value={`${sortBy}-${sortOrder}`}
                             onChange={(e) => {
                               const [newSortBy, newSortOrder] = e.target.value.split('-');
                               setSortBy(newSortBy);
                               setSortOrder(newSortOrder);
                             }}
                             options={[
                               { value: 'date-desc', label: 'Newest First' },
                               { value: 'date-asc', label: 'Oldest First' },
                               { value: 'total-desc', label: 'Highest Amount' },
                               { value: 'total-asc', label: 'Lowest Amount' }
                             ]}
                           />
                         </div>
                       </div>
         
                       <div className="flex items-center gap-3 text-sm text-gray-500">
                         <FunnelIcon className="h-4 w-4 text-purple-500" />
                         <div className="flex items-center gap-2 flex-wrap">
                           <span>
                             Showing {processedOrders.length} of {orders.length} orders
                           </span>
                           {statusFilter !== 'all' && (
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                               ${ORDER_STATUS_CONFIG[statusFilter].bgColor} 
                               ${ORDER_STATUS_CONFIG[statusFilter].color}`}
                             >
                               {ORDER_STATUS_CONFIG[statusFilter].label}
                             </span>
                           )}
                           {searchTerm && (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full 
                               bg-purple-50 text-purple-600 text-xs font-medium">
                               Search: "{searchTerm}"
                             </span>
                           )}
                         </div>
                       </div>
                     </div>
         
                     {/* Enhanced Orders List */}
                     <div className="border-t border-purple-100">
                       <AnimatePresence mode="wait">
                         {processedOrders.length > 0 ? (
                           <motion.ul
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{ opacity: 0 }}
                             className="divide-y divide-purple-100"
                           >
                             {processedOrders.map((order, index) => (
                               <motion.li
                                 key={order.id}
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: -20 }}
                                 transition={{ delay: index * 0.05 }}
                                 className="group hover:bg-purple-50/80 transition-colors duration-200"
                               >
                                 <div 
                                   onClick={() => setSelectedOrder(order)}
                                   className="p-6 cursor-pointer"
                                 >
                                   <div className="flex items-start justify-between">
                                     <div className="flex-1 space-y-4">
                                       <div className="flex items-center justify-between">
                                         <div className="flex items-center space-x-3">
                                           <span className="text-sm font-medium text-purple-600">
                                             #{order.id.slice(-6)}
                                           </span>
                                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                             ${ORDER_STATUS_CONFIG[order.orderStatus].bgColor} 
                                             ${ORDER_STATUS_CONFIG[order.orderStatus].color}`}
                                           >
                                             {ORDER_STATUS_CONFIG[order.orderStatus].label}
                                           </span>
                                         </div>
                                         <ChevronRightIcon className="h-5 w-5 text-purple-400 
                                           opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                       </div>
                                       <div className="flex items-center justify-between">
                                         <div>
                                           <p className="text-sm font-medium text-gray-900">
                                             {order.customerName || 'Anonymous'}
                                           </p>
                                           {order.customerEmail && (
                                             <p className="text-sm text-gray-500">{order.customerEmail}</p>
                                           )}
                                         </div>
                                         <div className="text-right">
                                           <p className="text-sm text-gray-500">
                                             {order.createdAt.toLocaleString()}
                                           </p>
                                           <p className="text-base font-bold text-purple-600">
                                             ₹{order.total.toFixed(2)}
                                           </p>
                                         </div>
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               </motion.li>
                             ))}
                           </motion.ul>
                         ) : (
                           <motion.div
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{ opacity: 0 }}
                             className="py-12 text-center"
                           >
                             <p className="text-sm text-gray-500">
                               {searchTerm || statusFilter !== 'all'
                                 ? 'No orders match your filters'
                                 : 'No orders found'}
                             </p>
                             {(searchTerm || statusFilter !== 'all') && (
                               <motion.button
                                 whileHover={{ scale: 1.02 }}
                                 whileTap={{ scale: 0.98 }}
                                 onClick={() => {
                                   setSearchTerm('');
                                   setStatusFilter('all');
                                 }}
                                 className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                               >
                                 Clear filters
                               </motion.button>
                             )}
                           </motion.div>
                         )}
                       </AnimatePresence>
         
                       {hasMore && processedOrders.length > 0 && (
                         <div className="p-6 border-t border-purple-100 text-center">
                           <motion.button
                             whileHover={{ scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => setPage(p => p + 1)}
                             className="px-6 py-2.5 border border-purple-200 rounded-lg text-sm font-medium 
                               text-purple-600 hover:bg-purple-50 hover:border-purple-300 
                               transition-all duration-200 shadow-sm hover:shadow"
                           >
                             Load More Orders
                           </motion.button>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
         
               <AnimatePresence>
                 {selectedOrder && (
                   <OrderDetailsDialog
                     order={selectedOrder}
                     onClose={() => setSelectedOrder(null)}
                     onStatusChange={handleStatusChange}
                   />
                 )}
               </AnimatePresence>
             </>
           );
         };
         
         export default OrderList;