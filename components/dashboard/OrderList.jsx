'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  ArrowLongRightIcon,
} from '@heroicons/react/24/outline';
import { db } from '@/firebase/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import jsPDF from 'jspdf';

const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Order Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: ClockIcon,
    nextStatus: ['confirmed', 'cancelled'],
  },
  confirmed: {
    label: 'Order Confirmed',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: CheckCircleIcon,
    nextStatus: ['processing', 'cancelled'],
  },
  processing: {
    label: 'Processing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: TruckIcon,
    nextStatus: ['shipped', 'cancelled'],
  },
  shipped: {
    label: 'Shipped',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: TruckIcon,
    nextStatus: ['delivered', 'cancelled'],
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircleIcon,
    nextStatus: [],
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircleIcon,
    nextStatus: [],
  },
};

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const PAYMENT_STATUS_CONFIG = {
  pending: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    text: 'Payment Pending',
  },
  confirmed: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    text: 'Payment Confirmed',
  },
  cancelled: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    text: 'Payment Cancelled',
  },
};

const SearchInput = ({ value, onChange }) => (
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
        aria-label="Clear search input"
        type="button"
      >
        <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
      </button>
    )}
  </div>
);

const SortSelect = ({ value, onChange, options }) => (
  <div className="relative w-full sm:w-auto">
    <select
      value={value}
      onChange={onChange}
      className="appearance-none w-full bg-white pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg
                focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                hover:border-purple-300 transition-all duration-200 cursor-pointer
                font-medium text-gray-700"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
    </div>
  </div>
);

const StatusFlowIndicator = ({ currentStatus, onStatusChange }) => {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="flex items-center space-x-4 py-4 overflow-x-auto" aria-label="Order status progress">
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
              ${isCurrent ? `${config.bgColor} ${config.color}` : isActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-400'}
              transition-all duration-200 hover:opacity-80
              ${index > currentIndex + 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {config.icon && <config.icon className="h-5 w-5" />}
              <span className="text-sm font-medium whitespace-nowrap">{config.label}</span>
            </motion.button>
            {index < STATUS_FLOW.length - 1 && (
              <ArrowLongRightIcon
                className={`h-5 w-5 mx-2 ${index < currentIndex ? 'text-purple-400' : 'text-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const StatusChangeDialog = ({ isOpen, onClose, order, onConfirm, newStatus, isUpdating }) => {
  if (!isOpen) return null;
  const statusConfig = ORDER_STATUS_CONFIG[newStatus];
  const currentConfig = ORDER_STATUS_CONFIG[order.orderStatus];

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 max-w-md w-full border border-purple-100"
      >
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${currentConfig.bgColor}`}>
              {currentConfig.icon && <currentConfig.icon className={`h-6 w-6 ${currentConfig.color}`} />}
            </div>
            <ArrowLongRightIcon className="h-6 w-6 text-purple-400" />
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${statusConfig.bgColor}`}>
              {statusConfig.icon && <statusConfig.icon className={`h-6 w-6 ${statusConfig.color}`} />}
            </div>
          </div>
          <h3 id="dialog-title" className="mt-4 text-lg font-medium text-gray-900">
            Update Order Status
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Are you sure you want to change the order status from{' '}
            <span className={`font-medium ${currentConfig.color}`}>{currentConfig.label}</span> to{' '}
            <span className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</span>?
          </p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isUpdating && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
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

// Order Details Dialog with invoice download and payment status update on delivered
const OrderDetailsDialog = ({ order, onClose, onStatusChange }) => {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [invoiceHtml, setInvoiceHtml] = useState('');
  const invoiceContainerRef = useRef(null);

  if (!order) return null;

  // Last 8 chars for display
  const orderShortId = order.id.slice(-8);

  const handleStatusChange = (newStatus) => {
    setSelectedStatus(newStatus);
    setIsStatusDialogOpen(true);
  };

  const handleStatusConfirm = async () => {
    try {
      setIsUpdating(true);
      const orderRef = doc(db, 'orders', order.id);
      const updates = { orderStatus: selectedStatus, updatedAt: new Date() };
      if (selectedStatus === 'delivered') {
        updates.paymentStatus = 'confirmed';
      }
      await updateDoc(orderRef, updates);
      await onStatusChange(order.id, selectedStatus, updates.paymentStatus);
      setIsStatusDialogOpen(false);
      toast.success(`Order status updated to ${ORDER_STATUS_CONFIG[selectedStatus].label}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const generateInvoiceHtml = () => {
    const address = order.address || {};
    const items = order.items || [];
    const formattedDate = order.createdAt ? order.createdAt.toLocaleString() : 'N/A';
    const deliveryDateFormatted = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A';
    const orderDisplayId = order.id.slice(-8);

    const itemsRows = items
      .map(
        (item, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align:right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ccc; text-align:right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div style="font-family:Arial, sans-serif; color:#000; max-width:600px; margin:auto; padding:20px;">
        <h1 style="text-align:center; margin-bottom:20px;">Invoice</h1>
        <p><strong>Order ID:</strong> ${orderDisplayId}</p>
        <p><strong>Order Date:</strong> ${formattedDate}</p>
        <p><strong>Delivery Date:</strong> ${deliveryDateFormatted}</p>
        <h2>Shipping Address</h2>
        <p>${address.name || ''}</p>
        <p>${address.address || ''} ${address.apartment || ''}</p>
        <p>${address.city || ''}, ${address.state || ''}, PIN: ${address.pincode || ''}</p>
        <p>Mobile: ${address.mobile || ''}</p>
        <h2>Order Items</h2>
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
          <thead style="background:#eee;">
            <tr>
              <th style="border:1px solid #ccc; padding:8px;">#</th>
              <th style="border:1px solid #ccc; padding:8px;">Product</th>
              <th style="border:1px solid #ccc; padding:8px;">Qty</th>
              <th style="border:1px solid #ccc; padding:8px;">Price</th>
              <th style="border:1px solid #ccc; padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div style="text-align:right; margin-top:20px;">
          <p><strong>Subtotal:</strong> ₹${order.subtotal?.toFixed(2) ?? '0.00'}</p>
          <p><strong>Shipping:</strong> ₹${order.shipping?.toFixed(2) ?? '0.00'}</p>
          <p><strong>Total:</strong> ₹${order.total?.toFixed(2) ?? '0.00'}</p>
        </div>
        <p style="text-align:center; margin-top:40px;">Thank you for your purchase!</p>
      </div>
    `;
  };

  const handleDownloadInvoice = () => {
    setInvoiceHtml(generateInvoiceHtml());
  };

  useEffect(() => {
    if (!invoiceHtml) return;
    const generatePdf = async () => {
      if (!invoiceContainerRef.current) return;
      const pdf = new jsPDF('p', 'pt', 'a4');
      try {
        await pdf.html(invoiceContainerRef.current, {
          callback: (doc) => {
            doc.save(`Invoice-${order.id.slice(-8)}.pdf`);
            setInvoiceHtml('');
          },
          x: 10,
          y: 10,
          html2canvas: { scale: 1 },
        });
      } catch (err) {
        toast.error('Failed to generate invoice PDF');
        console.error('PDF generation error:', err);
        setInvoiceHtml('');
      }
    };
    generatePdf();
  }, [invoiceHtml, order.id]);

  return (
    <>
      {invoiceHtml && (
        <div
          ref={invoiceContainerRef}
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '595px', backgroundColor: '#fff', padding: 20 }}
          dangerouslySetInnerHTML={{ __html: invoiceHtml }}
        />
      )}
      {/* The Dialog as previously rendered, show order id as last 8 chars everywhere */}      
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative border border-purple-100"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-purple-100 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-4">
              <h3 id="order-detail-title" className="text-lg font-medium text-gray-900">
                Order #{orderShortId}
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                  ${ORDER_STATUS_CONFIG[order.orderStatus]?.bgColor || 'bg-gray-200'} 
                  ${ORDER_STATUS_CONFIG[order.orderStatus]?.color || 'text-gray-500'}`}
              >
                {ORDER_STATUS_CONFIG[order.orderStatus]?.label || order.orderStatus}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close order details"
              className="text-gray-400 hover:text-gray-500 transition-colors p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              type="button"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-purple-100 p-4 m-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Order Progress</h4>
            <StatusFlowIndicator currentStatus={order.orderStatus} onStatusChange={handleStatusChange} />
          </div>
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-100 mx-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-purple-600 font-medium">Order Date</p>
              <p className="text-sm text-gray-900">{order.createdAt?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Delivery Date</p>
              <p className="text-sm text-gray-900">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Items</p>
              <p className="text-sm text-gray-900">{order.items?.length || 0} items</p>
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Payment Method</p>
              <p className="text-sm text-gray-900">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'UPI Payment'}</p>
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Amount</p>
              <p className="text-lg font-bold text-purple-600">₹{order.total?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
          {/* Items */}
          <section className="mx-6 mb-6">
            <h4 className="text-sm font-medium text-gray-900 border-b border-purple-100 pb-2 mb-4">Order Items</h4>
            <div className="space-y-4">
              {order.items?.map((item, idx) => (
                <motion.div
                  key={`${item.id || idx}-${item.name}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={item.image || '/default-product.png'} alt={item.name || 'Product Image'} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-gray-900 truncate">{item.name}</h5>
                    <div className="mt-1 flex items-center space-x-4">
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-500">Price: ₹{item.price.toFixed(2)}</p>
                    </div>
                    {item.specialRequest && <p className="mt-1 text-sm text-purple-600 truncate">Note: {item.specialRequest}</p>}
                  </div>
                  <div className="text-right font-medium text-gray-900">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
          {/* Shipping and Payment Info */}
          <section className="mx-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-900 mb-4">
                <MapPinIcon className="h-5 w-5 text-purple-500" />
                <h4>Shipping Address</h4>
              </div>
              <div className="text-sm space-y-3 pl-7">
                <p className="font-medium text-gray-900">{order.address?.name || 'N/A'}</p>
                <div className="space-y-1 text-gray-600">
                  <p>{order.address?.address || ''} {order.address?.apartment || ''}</p>
                  <p>{order.address?.city || ''}, {order.address?.state || ''}</p>
                  <p>PIN: {order.address?.pincode || ''}</p>
                </div>
                <p className="flex items-center text-purple-600 mt-2">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  {order.address?.mobile || ''}
                </p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-900 mb-4">
                <BanknotesIcon className="h-5 w-5 text-purple-500" />
                <h4>Payment Details</h4>
              </div>
              <div className="space-y-4 pl-7">
                <div className="text-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Status</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_CONFIG[order.paymentStatus || 'pending']?.bgColor} ${PAYMENT_STATUS_CONFIG[order.paymentStatus || 'pending']?.color}`}>
                      {PAYMENT_STATUS_CONFIG[order.paymentStatus || 'pending']?.text}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-600">₹{order.subtotal?.toFixed(2) ?? '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Shipping</span>
                    <span>
                      {order.shipping === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span className="text-gray-600">{`₹${order.shipping?.toFixed(2) ?? '0.00'}`}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-purple-100">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="text-lg font-bold text-purple-600">₹{order.total?.toFixed(2) ?? '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Download Invoice Button */}
          <div className="mx-6 mb-8 flex justify-end">
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Download Invoice (PDF)
            </button>
          </div>
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
        </motion.div>
      </div>
    </>
  );
};

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const ordersPerPage = 10;

  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot || !Array.isArray(querySnapshot.docs)) {
        throw new Error('Invalid orders data');
      }

      const fetchedOrders = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
          orderStatus: data.orderStatus || 'pending',
          total: data.total || 0,
          items: data.items || [],
          customerName: data.customerName || 'Anonymous',
          paymentStatus: data.paymentStatus || 'pending',
          deliveryDate: data.deliveryDate || null,
          subtotal: data.subtotal || 0,
          shipping: data.shipping || 0,
          paymentMethod: data.paymentMethod || 'COD',
          address: data.address || {},
        };
      });

      setOrders(fetchedOrders);
      if (showRefreshingState) toast.success('Orders refreshed successfully');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus, newPaymentStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              orderStatus: newStatus,
              paymentStatus: newPaymentStatus !== undefined ? newPaymentStatus : order.paymentStatus,
            }
          : order
      )
    );
    setSelectedOrder((prev) =>
      prev && prev.id === orderId
        ? { ...prev, orderStatus: newStatus, paymentStatus: newPaymentStatus !== undefined ? newPaymentStatus : prev.paymentStatus }
        : prev
    );
  };

  const processedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    let result = [...orders];

    result = result.filter(
      (order) =>
        (statusFilter === 'all' || order.orderStatus === statusFilter) &&
        (searchTerm.trim() === '' ||
          order.id.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
          (order.customerName?.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
          (order.address?.email?.toLowerCase().includes(searchTerm.trim().toLowerCase()) || false))
    );

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'date':
          cmp = (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
          break;
        case 'total':
          cmp = (b.total || 0) - (a.total || 0);
          break;
        default:
          cmp = (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      }
      return sortOrder === 'asc' ? -cmp : cmp;
    });

    return result.slice(0, page * ordersPerPage);
  }, [orders, statusFilter, searchTerm, sortBy, sortOrder, page]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-purple-200" />
          <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
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
          className="mt-4 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          type="button"
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
              type="button"
            >
              <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Orders'}
            </motion.button>
          </div>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <div className="flex gap-4">
                  <SortSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Orders' },
                      ...Object.entries(ORDER_STATUS_CONFIG).map(([value, config]) => ({
                        value,
                        label: config.label,
                      })),
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
                      { value: 'total-asc', label: 'Lowest Amount' },
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ORDER_STATUS_CONFIG[statusFilter]?.bgColor || ''
                      } ${ORDER_STATUS_CONFIG[statusFilter]?.color || ''}`}
                    >
                      {ORDER_STATUS_CONFIG[statusFilter]?.label}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 text-xs font-medium">
                      Search: "{searchTerm}"
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Orders list */}
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
                      className="group hover:bg-purple-50/80 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedOrder(order);
                      }}
                      aria-label={`View details for order ${order.id}`}
                      role="button"
                    >
                      <div className="p-6 grid grid-cols-[1fr_6rem_5rem_6rem_6rem] items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-purple-600 truncate">{order.id.slice(-8)}</p>
                          <p className="text-xs text-gray-600 truncate">{order.customerName}</p>
                        </div>
                        <div className="text-sm text-gray-500 text-right">{order.createdAt.toLocaleString()}</div>
                        <div className="text-sm text-gray-500 text-center">
                          {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${ORDER_STATUS_CONFIG[order.orderStatus]?.bgColor || 'bg-gray-200'} 
                            ${ORDER_STATUS_CONFIG[order.orderStatus]?.color || 'text-gray-500'}`}
                          >
                            {ORDER_STATUS_CONFIG[order.orderStatus]?.label || order.orderStatus}
                          </span>
                        </div>
                        <div className="text-right font-semibold text-gray-900">₹{order.total?.toFixed(2)}</div>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  {searchTerm || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders found'}
                </div>
              )}
            </AnimatePresence>
            {/* Load more button */}
            {processedOrders.length < orders.length && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm"
                  type="button"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Order details dialog */}
        <AnimatePresence>
          {selectedOrder && (
            <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default OrderList;
