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
} from "@heroicons/react/24/outline";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/firebase/firebase";
import { useAuth } from "@/contexts/AuthContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

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

function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  // 0: Sunday, so we want Monday as start
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getStartOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getStartOfYear(date = new Date()) {
  const d = new Date(date);
  d.setMonth(0, 1); // January 1st
  d.setHours(0, 0, 0, 0);
  return d;
}

function getTimeLabels(type) {
  if (type === "today") return Array.from({ length: 24 }, (_, i) => `${i}:00`);
  if (type === "week") return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  if (type === "month") {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => (i + 1).toString());
  }
  if (type === "year") return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return [];
}

const useDateTime = () => {
  const [dateTime, setDateTime] = useState({ date: '', time: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateTime({
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return dateTime;
};

// Helper for per-time-unit most ordered bakery item
function getPerTimeMostOrderedItem(periodOrdersAll, period, labels) {
  // Map: [time unit idx] -> { [itemName]: qty }
  const perTimeMap = Array(labels.length).fill(0).map(() => ({}));
  periodOrdersAll.forEach(order => {
    let idx = 0;
    if (period === "today") {
      idx = order.createdAt.getHours();
    } else if (period === "week") {
      let day = order.createdAt.getDay();
      idx = (day + 6) % 7;
    } else if (period === "month") {
      idx = order.createdAt.getDate() - 1;
    } else if (period === "year") {
      idx = order.createdAt.getMonth();
    }
    (order.items || []).forEach(item => {
      if (!perTimeMap[idx][item.name]) perTimeMap[idx][item.name] = 0;
      perTimeMap[idx][item.name] += Number(item.quantity) || 1;
    });
  });

  // For each time unit idx, get the item name with max qty
  return perTimeMap.map(obj => {
    let maxItem = null, maxQty = 0;
    for (const [item, qty] of Object.entries(obj)) {
      if (qty > maxQty) {
        maxQty = qty;
        maxItem = item;
      }
    }
    return { item: maxItem, qty: maxQty };
  });
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { date, time } = useDateTime();

  // Stats
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics period: today | week | month | year
  const [period, setPeriod] = useState("today");
  // Advanced Analytics
  const [topItems, setTopItems] = useState([]);
  const [allTimeTopItems, setAllTimeTopItems] = useState([]);
  const [topItemsChart, setTopItemsChart] = useState({ labels: [], datasets: [] });
  const [allTimeTopItemsChart, setAllTimeTopItemsChart] = useState({ labels: [], datasets: [] });
  const [topCustomers, setTopCustomers] = useState([]);
  const [customerChartData, setCustomerChartData] = useState({ labels: [], datasets: [] });
  const [ordersChartData, setOrdersChartData] = useState({ labels: [], datasets: [] });
  const [revenueChartData, setRevenueChartData] = useState({ labels: [], datasets: [] });
  const [ordersCount, setOrdersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [newUsersBarData, setNewUsersBarData] = useState({ labels: [], datasets: [] });
  const [newUsersTotal, setNewUsersTotal] = useState(0);
  const [customerSegments, setCustomerSegments] = useState({
    topByOrders: [],
    topBySpend: [],
    inactive: [],
  });

  // Per-time-unit analytics for most ordered bakery item
  const [perTimeMostOrdered, setPerTimeMostOrdered] = useState([]);
  const [perTimeMostOrderedChart, setPerTimeMostOrderedChart] = useState({ labels: [], datasets: [] });

  // Helpers to get period range and time labels
  function getPeriodRange(type) {
    const now = new Date();
    if (type === "today") {
      const start = getStartOfDay(now);
      const end = new Date(start); end.setDate(start.getDate() + 1);
      return { start, end, labels: getTimeLabels("today") };
    }
    if (type === "week") {
      const start = getStartOfWeek(now);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      return { start, end, labels: getTimeLabels("week") };
    }
    if (type === "month") {
      const now = new Date();
      const start = getStartOfMonth(now);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      return { start, end, labels: getTimeLabels("month") };
    }
    if (type === "year") {
      const now = new Date();
      const start = getStartOfYear(now);
      const end = new Date(start);
      end.setFullYear(start.getFullYear() + 1);
      return { start, end, labels: getTimeLabels("year") };
    }
    return { start: now, end: now, labels: [] };
  }

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(true);
      setError(null);

      Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'bakeryItems')),
        getDocs(collection(db, 'users')),
      ]).then(([ordersSnap, productsSnap, usersSnap]) => {
        // --- Basic Stats ---
        let totalRevenue = 0;
        let totalOrders = 0;
        ordersSnap.forEach(doc => {
          const order = doc.data();
          if (order.orderStatus !== 'cancelled') totalOrders++;
          if (order.orderStatus === 'delivered' && order.total) {
            totalRevenue += Number(order.total) || 0;
          }
        });
        const activeProducts = productsSnap.docs.filter(doc => doc.data().inStock).length;
        const customerCount = usersSnap.docs.filter(doc => doc.data().role === 'user').length;

        setStats({
          revenue: totalRevenue,
          orders: totalOrders,
          products: activeProducts,
          customers: customerCount,
        });

        // --- Analytics by period ---
        const { start, end, labels } = getPeriodRange(period);

        // Orders in period (delivered for revenue, all except cancelled for all analytics except revenue)
        let periodOrdersRevenue = [];
        let periodOrdersAll = [];
        ordersSnap.forEach(doc => {
          const order = doc.data();
          if (!order.createdAt) return;
          const createdAt = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          if (createdAt >= start && createdAt < end) {
            if (order.orderStatus === 'delivered') {
              periodOrdersRevenue.push({ ...order, createdAt });
            }
            if (order.orderStatus !== 'cancelled') {
              periodOrdersAll.push({ ...order, createdAt });
            }
          }
        });

        // All time delivered orders for allTimeTopItems
        const allDeliveredOrders = ordersSnap.docs
          .map(doc => doc.data())
          .filter(order => order.orderStatus === 'delivered');
        // All time non-cancelled orders for stats/analytics
        const allNonCancelledOrders = ordersSnap.docs
          .map(doc => doc.data())
          .filter(order => order.orderStatus !== 'cancelled');

        // --- All Time Top Items (by quantity) ---
        const allItemStats = {};
        allDeliveredOrders.forEach(order => {
          (order.items || []).forEach(item => {
            if (!allItemStats[item.name]) allItemStats[item.name] = 0;
            allItemStats[item.name] += Number(item.quantity) || 1;
          });
        });
        const allTop5 = Object.entries(allItemStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        setAllTimeTopItems(allTop5);
        setAllTimeTopItemsChart({
          labels: allTop5.map(([name]) => name),
          datasets: [{
            label: "Orders",
            data: allTop5.map(([, qty]) => qty),
            backgroundColor: "#f472b6",
          }]
        });

        // --- Orders and Revenue Chart Data by Time ---
        let ordersByTime = Array(labels.length).fill(0);
        let revenueByTime = Array(labels.length).fill(0);

        // For orders: use all except cancelled; for revenue: only delivered
        periodOrdersAll.forEach(order => {
          let idx = 0;
          if (period === "today") {
            idx = order.createdAt.getHours();
          } else if (period === "week") {
            let day = order.createdAt.getDay();
            idx = (day + 6) % 7;
          } else if (period === "month") {
            idx = order.createdAt.getDate() - 1;
          } else if (period === "year") {
            idx = order.createdAt.getMonth();
          }
          ordersByTime[idx]++;
        });

        periodOrdersRevenue.forEach(order => {
          let idx = 0;
          if (period === "today") {
            idx = order.createdAt.getHours();
          } else if (period === "week") {
            let day = order.createdAt.getDay();
            idx = (day + 6) % 7;
          } else if (period === "month") {
            idx = order.createdAt.getDate() - 1;
          } else if (period === "year") {
            idx = order.createdAt.getMonth();
          }
          revenueByTime[idx] += Number(order.total) || 0;
        });

        setOrdersChartData({
          labels,
          datasets: [{
            label: "Orders",
            data: ordersByTime,
            backgroundColor: "#a78bfa",
          }]
        });

        setRevenueChartData({
          labels,
          datasets: [{
            label: "Revenue (₹)",
            data: revenueByTime,
            backgroundColor: "#8b5cf6",
          }]
        });

        setOrdersCount(periodOrdersAll.length);
        setRevenue(periodOrdersRevenue.reduce((sum, o) => sum + (Number(o.total) || 0), 0));

        // --- Top 5 Products (by quantity ordered) for period ---
        const itemStats = {};
        periodOrdersAll.forEach(order => {
          (order.items || []).forEach(item => {
            if (!itemStats[item.name]) itemStats[item.name] = 0;
            itemStats[item.name] += Number(item.quantity) || 1;
          });
        });
        const top5 = Object.entries(itemStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        setTopItems(top5);
        setTopItemsChart({
          labels: top5.map(([name]) => name),
          datasets: [{
            label: "Items Ordered",
            data: top5.map(([, qty]) => qty),
            backgroundColor: "#f472b6",
          }]
        });

        // --- Top 5 Customers (by spend) for period ---
        const customerStats = {};
        periodOrdersAll.forEach(order => {
          if (!order.userEmail) return;
          if (!customerStats[order.userEmail]) customerStats[order.userEmail] = { spend: 0, items: 0 };
          customerStats[order.userEmail].spend += Number(order.total) || 0;
          customerStats[order.userEmail].items += (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
        });
        const top5Customers = Object.entries(customerStats)
          .sort((a, b) => b[1].spend - a[1].spend)
          .slice(0, 5);
        setTopCustomers(top5Customers);

        setCustomerChartData({
          labels: top5Customers.map(([email]) => email),
          datasets: [{
            label: "Total Spend (₹)",
            data: top5Customers.map(([, v]) => v.spend),
            backgroundColor: "#fbbf24",
          }]
        });

        // --- New Users (by time unit for period) ---
        let usersInPeriod = usersSnap.docs.filter(doc => {
          const user = doc.data();
          if (!user.createdAt) return false;
          const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          return createdAt >= start && createdAt < end;
        });

        // New users bar by time unit (hour/day/month)
        let newUsersByTime = Array(labels.length).fill(0);
        usersInPeriod.forEach(userDoc => {
          const user = userDoc.data();
          let createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          let idx = 0;
          if (period === "today") {
            idx = createdAt.getHours();
          } else if (period === "week") {
            let day = createdAt.getDay();
            idx = (day + 6) % 7;
          } else if (period === "month") {
            idx = createdAt.getDate() - 1;
          } else if (period === "year") {
            idx = createdAt.getMonth();
          }
          newUsersByTime[idx]++;
        });
        setNewUsersBarData({
          labels,
          datasets: [{
            label: "New Users",
            data: newUsersByTime,
            backgroundColor: "#10b981",
          }]
        });
        setNewUsersTotal(usersInPeriod.length);

        // --- Per-time-unit most ordered bakery item for the current period ---
        const perTimeMost = getPerTimeMostOrderedItem(periodOrdersAll, period, labels);
        setPerTimeMostOrdered(perTimeMost);
        setPerTimeMostOrderedChart({
          labels,
          datasets: [{
            label: "Most Ordered Item (Qty)",
            data: perTimeMost.map(mo => mo.qty || 0),
            backgroundColor: "#f59e42",
          }]
        });

        // --- User Segmentation (All Time) ---
        const allOrders = ordersSnap.docs
          .map(doc => doc.data())
          .filter(o => o.userEmail && o.orderStatus === "delivered");

        const buyers = {};
        allOrders.forEach(order => {
          if (!buyers[order.userEmail]) buyers[order.userEmail] = { orders: 0, spend: 0, items: 0 };
          buyers[order.userEmail].orders++;
          buyers[order.userEmail].spend += Number(order.total) || 0;
          buyers[order.userEmail].items += (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
        });
        const topByOrders = Object.entries(buyers).sort((a, b) => b[1].orders - a[1].orders).slice(0, 5);
        const topBySpend = Object.entries(buyers).sort((a, b) => b[1].spend - a[1].spend).slice(0, 5);
        setCustomerSegments({
          topByOrders,
          topBySpend,
          inactive: [],
        });

        setLoading(false);
      }).catch(error => {
        setError("Failed to load dashboard statistics. Please try again.");
        setLoading(false);
      });
    }
  }, [user, authLoading, period]);

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
            onClick={() => window.location.reload()}
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Advanced Analytics Overview
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

        {/* Stats Cards */}
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

        {/* Analytics Period Selector */}
        <div className="flex gap-4 my-6">
          {["today", "week", "month", "year"].map((val) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold shadow transition 
                ${period === val ? "bg-purple-600 text-white" : "bg-white text-gray-900 hover:bg-purple-100"}`}
            >
              {val === "today" ? "Today" : val === "week" ? "This Week" : val === "month" ? "This Month" : "This Year"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
          {/* Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Orders Over {period === "today" ? "Today (Hourly)" : period === "week" ? "This Week (Daily)" : period === "month" ? "This Month (Datewise)" : "This Year (Monthly)"}
            </h2>
            <Bar data={ordersChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true },
                }
              }}
              height={220}
            />
            <div className="mt-4 text-sm text-gray-500">
              Orders: <span className="font-bold text-gray-700">{ordersCount}</span>
            </div>
          </motion.div>

          {/* Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Revenue Over {period === "today" ? "Today (Hourly)" : period === "week" ? "This Week (Daily)" : period === "month" ? "This Month (Datewise)" : "This Year (Monthly)"}
            </h2>
            <Bar data={revenueChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true },
                }
              }}
              height={220}
            />
            <div className="mt-4 text-sm text-gray-500">
              Revenue: <span className="font-bold text-gray-700">₹{revenue.toFixed(2)}</span>
            </div>
          </motion.div>
        </div>
        {/* Advanced Analytics Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
          {/* Top 5 Items by period */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Top 5 Most Ordered Bakery Items ({period === "today" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : "This Year"})
            </h2>
            <Bar data={topItemsChart}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true },
                }
              }}
              height={260}
            />
            <ul className="mt-4 space-y-2">
              {topItems.map(([name, qty], i) => (
                <li key={name} className="flex justify-between">
                  <span className="font-medium">{i + 1}. {name}</span>
                  <span className="text-purple-600">{qty} ordered</span>
                </li>
              ))}
            </ul>
          </motion.div>
          {/* Top 5 Items All Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Top 5 Most Ordered Bakery Items (All Time)
            </h2>
            <Bar data={allTimeTopItemsChart}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true },
                }
              }}
              height={260}
            />
            <ul className="mt-4 space-y-2">
              {allTimeTopItems.map(([name, qty], i) => (
                <li key={name} className="flex justify-between">
                  <span className="font-medium">{i + 1}. {name}</span>
                  <span className="text-purple-600">{qty} ordered</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <div className="grid grid-cols-1 gap-8 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Most Ordered Bakery Item by {period === "today" ? "Hour" : period === "week" ? "Day" : period === "month" ? "Date" : "Month"}
            </h2>
            <Bar
              data={{
                labels: getTimeLabels(period),
                datasets: [
                  {
                    label: "Most Ordered Item (Qty)",
                    data: perTimeMostOrdered.map((x) => x.qty || 0),
                    backgroundColor: "#f59e42",
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true },
                },
              }}
              height={220}
            />
            <ul className="mt-4 space-y-2">
              {perTimeMostOrdered.map((x, i) =>
                x.item ? (
                  <li key={i} className="flex justify-between">
                    <span className="font-medium">
                      {getTimeLabels(period)[i]}: {x.item}
                    </span>
                    <span className="text-orange-600">{x.qty} ordered</span>
                  </li>
                ) : (
                  <li key={i} className="flex justify-between text-gray-400">
                    <span className="font-medium">
                      {getTimeLabels(period)[i]}: No orders
                    </span>
                  </li>
                )
              )}
            </ul>
          </motion.div>
        </div>
          {/* Top 5 Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Top 5 Customers ({period === "today" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : "This Year"})
            </h2>
            <Bar data={customerChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true },
                }
              }}
              height={260}
            />
            <ul className="mt-4 space-y-2">
              {topCustomers.map(([email, { spend }], i) => (
                <li key={email} className="flex justify-between">
                  <span className="font-medium">{i + 1}. {email}</span>
                  <span className="text-amber-600">₹{spend.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          
        </div>
        {/* Most Ordered Bakery Item by Time Unit (Hour/Day/Date/Month) */}
     
        {/* User Segmentation */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
          {/* Top 5 by Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Top 5 Customers by Orders (All Time)
            </h2>
            <Bar
              data={{
                labels: customerSegments.topByOrders.map(([email]) => email),
                datasets: [
                  {
                    label: 'Orders',
                    data: customerSegments.topByOrders.map(([, stats]) => stats.orders),
                    backgroundColor: '#8b5cf6',
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
              height={220}
            />
          </motion.div>
          {/* Top 5 by Spend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Top 5 Customers by Spend (All Time)
            </h2>
            <Bar
              data={{
                labels: customerSegments.topBySpend.map(([email]) => email),
                datasets: [
                  {
                    label: 'Spend (₹)',
                    data: customerSegments.topBySpend.map(([, stats]) => stats.spend),
                    backgroundColor: '#f59e0b',
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function (value) {
                        return '₹' + value;
                      },
                    },
                  },
                },
              }}
              height={220}
            />
          </motion.div>
          {/* New Users Joined Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              New Users Joined ({period === "today" ? "Hourly" : period === "week" ? "Daily" : period === "month" ? "Datewise" : "Monthly"})
            </h2>
            <Bar data={newUsersBarData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: { display: false }
                },
                scales: {
                  y: { beginAtZero: true },
                }
              }}
              height={220}
            />
            <div className="mt-4 text-sm text-gray-500">
              Total New Users: <span className="font-bold text-purple-700">{newUsersTotal}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}