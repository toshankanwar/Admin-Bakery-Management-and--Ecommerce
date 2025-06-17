'use client';

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  PencilSquareIcon,
  BellIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { collection, query, getDocs, orderBy, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

// Constants
const STATS_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const TIME_REFRESH_INTERVAL = 1000; // 1 second in milliseconds
const getCurrentTimestamp = () => {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', ' ');
};

const CURRENT_TIMESTAMP = '2025-06-17 17:11:01';
const CURRENT_USER = 'Kala-bot-apk';

const ACTIVITY_TYPES = {
  USER_SIGNUP: 'USER_SIGNUP',
  NEW_ORDER: 'NEW_ORDER',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE'
};

const formatDateTime = (date) => {
  const d = new Date(date);
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');

  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}:${seconds}`,
    fullDateTime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  };
};

const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';

  return formatDateTime(date).date;
};

const useDateTime = () => {
  const [dateTime, setDateTime] = useState(formatDateTime(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(formatDateTime(new Date()));
    }, TIME_REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  return dateTime;
};

const statsItems = [
  {
    id: 'revenue',
    name: "Total Revenue",
    icon: CurrencyDollarIcon,
    formatter: (value) => `₹${Number(value).toFixed(2)}`,
    gradient: "from-violet-500 to-violet-600",
  },
  {
    id: 'orders',
    name: "Total Orders",
    icon: ClipboardDocumentListIcon,
    formatter: (value) => Number(value).toString(),
    gradient: "from-purple-500 to-purple-600",
  },
  {
    id: 'products',
    name: "Active Products",
    icon: ShoppingBagIcon,
    formatter: (value) => Number(value).toString(),
    gradient: "from-fuchsia-500 to-fuchsia-600",
  },
  {
    id: 'customers',
    name: "Total Customers",
    icon: UserGroupIcon,
    formatter: (value) => Number(value).toString(),
    gradient: "from-pink-500 to-pink-600",
  },
];

const ActivityItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case ACTIVITY_TYPES.USER_SIGNUP:
        return (
          <div className="rounded-full bg-blue-100 p-2">
            <UserPlusIcon className="h-5 w-5 text-blue-600" />
          </div>
        );
      case ACTIVITY_TYPES.NEW_ORDER:
        return (
          <div className="rounded-full bg-green-100 p-2">
            <ShoppingCartIcon className="h-5 w-5 text-green-600" />
          </div>
        );
      case ACTIVITY_TYPES.PRODUCT_UPDATE:
        return (
          <div className="rounded-full bg-purple-100 p-2">
            <PencilSquareIcon className="h-5 w-5 text-purple-600" />
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-100 p-2">
            <BellIcon className="h-5 w-5 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
    >
      {getActivityIcon(activity.type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {activity.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-600">
            {activity.user}
          </span>
          <span className="text-xs text-gray-500">•</span>
          <time dateTime={activity.timestamp} className="text-xs text-gray-500">
            {formatRelativeTime(activity.timestamp)}
          </time>
        </div>
      </div>
      {activity.metadata && (
        <div className="flex-shrink-0">
          {activity.type === ACTIVITY_TYPES.PRODUCT_UPDATE ? (
            <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden">
              <Image
                src={activity.metadata.imageUrl || '/placeholder-product.jpg'}
                alt={activity.metadata.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          ) : activity.type === ACTIVITY_TYPES.NEW_ORDER ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ₹{activity.metadata.total}
            </span>
          ) : null}
        </div>
      )}
    </motion.div>
  );
};

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeCallbacks = [];

    // Listen for new user signups
    const userSubscription = onSnapshot(
      query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(5)
      ),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const userData = change.doc.data();
            setActivities((prev) => [
              {
                id: change.doc.id,
                type: ACTIVITY_TYPES.USER_SIGNUP,
                message: `New user ${userData.displayName || userData.email} joined`,
                timestamp: userData.createdAt,
                user: userData.email,
              },
              ...prev.filter(a => a.id !== change.doc.id)
            ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
          }
        });
      }
    );
    unsubscribeCallbacks.push(userSubscription);

    // Listen for new orders
    const orderSubscription = onSnapshot(
      query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(5)
      ),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const orderData = change.doc.data();
            setActivities((prev) => [
              {
                id: change.doc.id,
                type: ACTIVITY_TYPES.NEW_ORDER,
                message: `New order #${change.doc.id.slice(-6)} placed`,
                timestamp: orderData.createdAt,
                user: orderData.userEmail,
                metadata: {
                  total: orderData.total,
                  items: orderData.items.length
                }
              },
              ...prev.filter(a => a.id !== change.doc.id)
            ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
          }
        });
      }
    );
    unsubscribeCallbacks.push(orderSubscription);

    // Listen for product updates only
    const productSubscription = onSnapshot(
      query(
        collection(db, 'bakeryItems'),
        orderBy('updatedAt', 'desc'),
        limit(5)
      ),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const productData = change.doc.data();
          if (change.type === 'modified') {
            setActivities((prev) => [
              {
                id: change.doc.id,
                type: ACTIVITY_TYPES.PRODUCT_UPDATE,
                message: `Product "${productData.name}" updated`,
                timestamp: productData.updatedAt,
                user: productData.updatedBy || CURRENT_USER,
                metadata: {
                  name: productData.name,
                  imageUrl: productData.imageUrl
                }
              },
              ...prev.filter(a => a.id !== change.doc.id)
            ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
          }
        });
      }
    );
    unsubscribeCallbacks.push(productSubscription);

    setLoading(false);

    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            Live Updates
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              New activities will appear here as they happen.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => {/* Implement view all logic */}}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View all activity
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { date, time, fullDateTime } = useDateTime();
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
  
      // Create basic queries without complex where clauses
      const ordersRef = collection(db, 'orders');
      const productsRef = collection(db, 'bakeryItems');
      const customersRef = collection(db, 'users');
  
      try {
        // Get all orders first
        const ordersSnapshot = await getDocs(query(ordersRef, orderBy('createdAt', 'desc')));
        
        // Calculate stats from the snapshots
        let totalRevenue = 0;
        let activeOrders = 0;
  
        ordersSnapshot.forEach(doc => {
          const order = doc.data();
          if (order && order.orderStatus) {
            // Count non-cancelled orders
            if (order.orderStatus !== 'cancelled') {
              activeOrders++;
            }
            // Sum revenue from delivered orders
            if (order.orderStatus === 'delivered' && order.total) {
              totalRevenue += Number(order.total) || 0;
            }
          }
        });
  
        // Get products and customers count
        const [productsSnapshot, customersSnapshot] = await Promise.all([
          getDocs(query(productsRef, where('inStock', '==', true))),
          getDocs(query(customersRef, where('role', '==', 'user')))
        ]);
  
        setStats({
          revenue: totalRevenue,
          orders: activeOrders,
          products: productsSnapshot.size,
          customers: customersSnapshot.size
        });
  
        setLastFetchTime(new Date());
  
      } catch (queryError) {
        console.error("Query execution error:", {
          error: queryError.message,
          code: queryError.code,
          timestamp: '2025-06-17 17:19:16',
          user: 'Kala-bot-apk'
        });
        throw queryError;
      }
  
    } catch (error) {
      console.error("Error fetching dashboard stats:", {
        error: error.message,
        stack: error.stack,
        timestamp: '2025-06-17 17:19:16',
        user: user?.email || 'Kala-bot-apk'
      });
      setError("Failed to load dashboard statistics. Please try again.");
      setStats({
        revenue: 0,
        orders: 0,
        products: 0,
        customers: 0
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading && (!lastFetchTime || new Date() - lastFetchTime > STATS_REFRESH_INTERVAL)) {
      fetchDashboardStats();
    }

    const intervalId = setInterval(() => {
      if (!authLoading && user) {
        fetchDashboardStats();
      }
    }, STATS_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user, authLoading]);

  if (error) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 rounded-lg p-4"
        >
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <span className="ml-3 text-red-800">{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardStats()}
            className="mt-4 text-sm text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              <CalendarIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-gray-700 font-medium">
                {date}
              </span>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span className="text-gray-700 font-medium">
                {time}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="relative overflow-hidden rounded-2xl shadow-lg"
            >
              <div className={`bg-gradient-to-br ${item.gradient} p-6`}>
                <div className="flex items-center">
                  <div className="rounded-lg bg-white/20 p-3">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 text-white">
                  <p className="text-sm opacity-90">{item.name}</p>
                  <div className="mt-2 flex items-baseline">
                    {loading ? (
                      <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
                    ) : (
                      <h3 className="text-2xl font-bold">
                        {item.formatter(stats[item.id])}
                      </h3>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <RecentActivity />
      </div>
    </div>
  );
}