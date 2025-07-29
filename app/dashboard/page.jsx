'use client';

import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, onSnapshot, query, orderBy as fbOrderBy } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { format, getDaysInMonth, startOfMonth, addDays } from "date-fns";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { motion } from "framer-motion";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const COLOR_PALETTES = {
  vibrantSet: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#8AE234"],
  pastelPurples: ["#A7ABA9", "#C4BFDD", "#D1D0FE"],
  pastelPinks: ["#F472B6", "#FB7185", "#FBD1D8"],
  pastelGreens: ["#86EFAC", "#4ADE80", "#22B360"],
  pastelBlues: ["#60A2EB", "#3982F6", "#91CDFD"],
  pastelGolds: ["#FBBF24", "#FAC415", "#FDBA90"],
};

const LiveIndicator = () => (
  <motion.div
    initial={{ opacity: 0.6, scale: 1 }}
    animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.15, 1] }}
    transition={{ repeat: Infinity, duration: 2 }}
    className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2 shadow-lg"
    aria-label="Live data fetching"
  />
);

function safePieData(data, fallbackLabel) {
  if (data?.datasets?.length === 1 && Array.isArray(data.datasets[0].data)) return data;
  if (!data || !data.datasets) return data;
  let merged = [];
  data.datasets.forEach(ds => {
    ds.data.forEach((val, idx) => {
      merged[idx] = (merged[idx] || 0) + (typeof val === "number" ? val : 0);
    });
  });
  return {
    labels: data.labels,
    datasets: [{
      label: fallbackLabel || "Data",
      data: merged,
      backgroundColor: COLOR_PALETTES.vibrantSet,
      borderColor: "#fff",
      borderWidth: 1,
    }],
  };
}

const Heatmap = ({ dataPoints, xLabels, yLabels, xLabelTitle = "", yLabelTitle = "", tableAriaLabel }) => {
  const max = Math.max(...dataPoints.map(p => p.v), 1);
  const rows = yLabels.length;
  const cols = xLabels.length;
  const matrix = Array(rows).fill(null).map(() => Array(cols).fill(0));
  dataPoints.forEach(({ x, y, v }) => {
    if (y < rows && x < cols) matrix[y][x] = v;
  });
  return (
    <div
      className="rounded-lg shadow-inner border border-gray-300 overflow-auto max-w-full"
      role="region"
      aria-label={tableAriaLabel || "Heatmap"}
    >
      <table className="table-fixed w-full text-center text-sm border-collapse">
        <thead className="bg-indigo-100 sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 bg-indigo-100 z-20 px-3 py-1">{yLabelTitle}</th>
            {xLabels.map((label, i) => (
              <th key={i} className="border px-2 py-1" title={label} aria-label={label}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yLabels.map((rowLabel, rowIdx) => (
            <tr key={rowIdx}>
              <th
                className="sticky left-0 bg-indigo-50 font-semibold px-3 py-1 z-10"
                aria-label={yLabelTitle ? `${yLabelTitle} ${rowLabel}` : rowLabel}
              >
                {rowLabel}
              </th>
              {matrix[rowIdx].map((val, colIdx) => {
                const intensity = val / max;
                const bgColor = `rgba(67, 56, 202, ${0.1 + 0.8 * intensity})`;
                return (
                  <td
                    key={colIdx}
                    className="border px-2 py-1 whitespace-nowrap cursor-default select-none"
                    style={{ backgroundColor: bgColor }}
                    title={`${rowLabel} ${xLabels[colIdx]}: Quantity Sold ${val}`}
                    aria-label={`${rowLabel} ${xLabels[colIdx]} quantity sold ${val}`}
                  >
                    {val > 0 ? val : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function AdvancedAnalyticsDashboard() {
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filterDate, setFilterDate] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [sortKey, setSortKey] = useState("orderDate");
  const [sortDir, setSortDir] = useState("desc");

  const [analysisMode, setAnalysisMode] = useState("overall");
  const [selectedItem, setSelectedItem] = useState("");

  const [activeChartType, setActiveChartType] = useState("bar");

  // Set default year/month/week based on current date
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-based
  const currentDate = today.getDate();
  // Calculate week number in month (1 to 4)
  const currentWeek = Math.min(4, Math.floor((currentDate - 1) / 7) + 1);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedYearForMonthlyHeatmap, setSelectedYearForMonthlyHeatmap] = useState(currentYear);

  const snapshotUnsubscribe = useRef(null);
  const lastFetch = useRef(0);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(collection(db, "orders"), fbOrderBy("createdAt", "desc"));
    snapshotUnsubscribe.current = onSnapshot(
      q,
      snapshot => {
        const now = Date.now();
        if (now - lastFetch.current < 10000 && snapshot.size === orderItems.length) return;
        lastFetch.current = now;

        const rows = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const id = doc.id;
          const created = data.createdAt?.toDate?.() ?? (data.createdAt ? new Date(data.createdAt) : new Date());
          (data.items || []).forEach(item => {
            rows.push({
              orderId: id,
              userId: data.userId || "",
              itemName: item.name || item.productId || "Unknown",
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
              totalPrice: (Number(item.quantity) * Number(item.price)).toFixed(2),
              orderStatus: (data.orderStatus || "unknown").toLowerCase(),
              paymentMethod: data.paymentMethod || "unknown",
              createdAt: created,
              orderDate: format(created, "yyyy-MM-dd"),
              orderTime: format(created, "HH:mm"),
            });
          });
        });
        setOrderItems(rows);
        setLoading(false);
      },
      error => {
        setError("Failed to fetch data");
        setLoading(false);
      }
    );

    return () => snapshotUnsubscribe.current?.();
  }, [orderItems.length]);

  const filteredRows = useMemo(() => {
    let data = [...orderItems];
    if (filterDate) {
      data = data.filter(d => d.orderDate === filterDate);
    } else {
      if (dateRange.from) data = data.filter(d => d.orderDate >= dateRange.from);
      if (dateRange.to) data = data.filter(d => d.orderDate <= dateRange.to);
    }
    data.sort((a, b) => {
      const aV = a[sortKey],
        bV = b[sortKey];
      if (["orderDate", "orderTime", "orderId"].includes(sortKey))
        return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      if (!isNaN(aV) && !isNaN(bV)) return sortDir === "asc" ? aV - bV : bV - aV;
      return sortDir === "asc" ? String(aV).localeCompare(bV) : String(bV).localeCompare(aV);
    });
    return data;
  }, [orderItems, filterDate, dateRange, sortKey, sortDir]);

  const uniqueItems = useMemo(() => [...new Set(orderItems.map(i => i.itemName))].sort(), [orderItems]);

  const validStatuses = useMemo(() => new Set(["confirmed", "delivered", "processing", "shipped"]), []);

  const isSingleDay = useMemo(() => {
    if (filterDate) return true;
    if (dateRange.from && dateRange.to && dateRange.from === dateRange.to) return true;
    return false;
  }, [filterDate, dateRange]);

  // KPIs with unique orders & revenue
  const dataSummary = useMemo(() => {
    if (filteredRows.length === 0) return null;
    const filteredValid = filteredRows.filter(r => validStatuses.has(r.orderStatus));
    const filteredData = analysisMode === "item" && selectedItem ? filteredValid.filter(r => r.itemName === selectedItem) : filteredValid;

    const uniqueOrderIds = [...new Set(filteredData.map(r => r.orderId))];
    const revenuePerOrder = {};
    filteredData.forEach(r => {
      if (r.orderStatus === "delivered") {
        if (!revenuePerOrder[r.orderId]) revenuePerOrder[r.orderId] = 0;
        revenuePerOrder[r.orderId] += Number(r.totalPrice);
      }
    });
    const totalRevenue = Object.values(revenuePerOrder).reduce((acc, v) => acc + (v < 100 ? v + 10 : v), 0);
    const totalQuantity = filteredData.reduce((acc, r) => acc + r.quantity, 0);
    const uniqueUsers = new Set(filteredRows.map(r => r.userId)).size;

    return {
      totalOrders: uniqueOrderIds.length,
      totalRevenue,
      totalQuantity,
      uniqueUsers,
      avgOrderValue: uniqueOrderIds.length ? totalRevenue / uniqueOrderIds.length : 0,
    };
  }, [filteredRows, analysisMode, selectedItem, validStatuses]);

  // Order status counts by unique order IDs
  const orderStatusCounts = useMemo(() => {
    const orderMap = {};
    filteredRows.forEach(r => {
      if (!orderMap[r.orderId]) orderMap[r.orderId] = r.orderStatus;
    });
    const counts = {};
    Object.values(orderMap).forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [filteredRows]);

  const categorizedStatusCounts = useMemo(() => {
    const cat = { delivered: 0, pending: 0, cancelled: 0, others: 0 };
    for (const [k, v] of Object.entries(orderStatusCounts)) {
      const key = k.toLowerCase();
      if (key === "delivered") cat.delivered += v;
      else if (key === "pending") cat.pending += v;
      else if (key === "cancelled") cat.cancelled += v;
      else cat.others += v;
    }
    return cat;
  }, [orderStatusCounts]);

  // Helper chart builders
  function buildDailyData(rows) {
    const orders = {};
    rows.forEach(r => {
      if (!orders[r.orderId]) {
        orders[r.orderId] = { date: r.orderDate, quantity: 0, revenue: 0 };
      }
      orders[r.orderId].quantity += r.quantity;
      orders[r.orderId].revenue += Number(r.totalPrice);
    });

    const qtyByDate = {};
    const revByDate = {};
    Object.values(orders).forEach(({ date, quantity, revenue }) => {
      qtyByDate[date] = (qtyByDate[date] || 0) + quantity;
      revByDate[date] = (revByDate[date] || 0) + revenue;
    });

    const sortedDates = Object.keys(qtyByDate).sort();

    const avgOrderValueData = sortedDates.map(date => {
      const orderCount = Object.values(orders).filter(o => o.date === date).length || 1;
      return revByDate[date] / orderCount;
    });

    return {
      labels: sortedDates,
      datasets: [
        {
          type: "bar",
          label: "Quantity Sold",
          data: sortedDates.map(date => qtyByDate[date]),
          backgroundColor: COLOR_PALETTES.vibrantSet[0],
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Avg Order Value",
          data: avgOrderValueData,
          borderColor: COLOR_PALETTES.vibrantSet[1],
          backgroundColor: COLOR_PALETTES.vibrantSet[1] + "88",
          tension: 0.3,
          fill: false,
          yAxisID: "y1",
          pointRadius: 3,
        },
      ],
    };
  }

  function buildTopProducts(rows) {
    const productCounts = {};
    for (const r of rows) {
      productCounts[r.itemName] = (productCounts[r.itemName] || 0) + r.quantity;
    }
    const sortedProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      labels: sortedProducts.map(([name]) => name),
      datasets: [
        {
          label: "Quantity Sold",
          data: sortedProducts.map(([, qty]) => qty),
          backgroundColor: COLOR_PALETTES.vibrantSet,
        },
      ],
    };
  }

  function buildOrderStatus(countsObj = {}) {
    const labels = Object.keys(countsObj);
    const data = labels.map(label => countsObj[label]);

    return {
      labels,
      datasets: [
        {
          label: "Order Count",
          data,
          backgroundColor: COLOR_PALETTES.pastelPinks,
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    };
  }

  function buildPaymentMethods(rows) {
    const payments = {};
    for (const r of rows) {
      const pm = r.paymentMethod || "unknown";
      payments[pm] = (payments[pm] || 0) + 1;
    }
    const keys = Object.keys(payments);
    return {
      labels: keys,
      datasets: [
        {
          label: "Count",
          data: keys.map(k => payments[k]),
          backgroundColor: COLOR_PALETTES.pastelGolds,
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    };
  }

  function buildCustomerFrequency() {
    const userCounts = {};
    for (const r of orderItems) {
      if (!r.userId) continue;
      userCounts[r.userId] = (userCounts[r.userId] || 0) + 1;
    }
    const freqBuckets = {};
    for (const cnt of Object.values(userCounts)) {
      freqBuckets[cnt] = (freqBuckets[cnt] || 0) + 1;
    }
    const sortedKeys = Object.keys(freqBuckets).sort((a, b) => Number(a) - Number(b));
    return {
      labels: sortedKeys,
      datasets: [
        {
          label: "Number of Customers",
          data: sortedKeys.map(k => freqBuckets[k]),
          backgroundColor: COLOR_PALETTES.pastelGreens,
        },
      ],
    };
  }

  // Original heatmap data
  const originalHeatmapData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));
    orderItems.forEach(r => {
      if (!r.createdAt) return;
      let d = r.createdAt.getDay();
      d = d === 0 ? 6 : d - 1;
      matrix[d][r.createdAt.getHours()] += r.quantity;
    });
    const points = [];
    for (let y = 0; y < days.length; y++) {
      for (let x = 0; x < 24; x++) {
        points.push({ x, y, v: matrix[y][x] });
      }
    }
    return { days, points };
  }, [orderItems]);

  // Helper to get week range by year, month, week
  function getWeekRange(year, month, week) {
    const first = startOfMonth(new Date(year, month - 1));
    const daysInMonth = getDaysInMonth(first);
    const startDay = 1 + (week - 1) * 7;
    // For last week, end day is end of month
    const endDay = week < 4 ? startDay + 6 : daysInMonth;
    return { start: addDays(first, startDay - 1), end: addDays(first, endDay - 1) };
  }

  // Weekly heatmap data
  const weeklyHeatmapData = useMemo(() => {
    if (!selectedYear || !selectedMonth || !selectedWeek) return { days: [], points: [] };
    const { start, end } = getWeekRange(selectedYear, selectedMonth, selectedWeek);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));

    orderItems.forEach(r => {
      if (!r.createdAt) return;
      if (r.orderStatus === 'cancelled' || r.orderStatus === 'pending') return; // <-- exclude these statuses
    
      if (r.createdAt < start || r.createdAt > end) return;
      let d = r.createdAt.getDay();
      d = d === 0 ? 6 : d - 1;
      matrix[d][r.createdAt.getHours()] += r.quantity;
    });
    

    const points = [];
    for (let y = 0; y < days.length; y++) {
      for (let x = 0; x < 24; x++) {
        points.push({ x, y, v: matrix[y][x] });
      }
    }
    return { days, points };
  }, [orderItems, selectedYear, selectedMonth, selectedWeek]);

  // Monthly heatmap data
  const monthlyHeatmapData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (!selectedYearForMonthlyHeatmap) return { days: [], points: [], months };
    const maxDays = 31;
    const matrix = Array(maxDays).fill(null).map(() => Array(12).fill(0));

    orderItems.forEach(r => {
      if (!r.createdAt) return;
      if (r.orderStatus === 'cancelled' || r.orderStatus === 'pending') return; // Exclude cancelled and pending
      if (r.createdAt.getFullYear() !== selectedYearForMonthlyHeatmap) return;
      const m = r.createdAt.getMonth();
      const d = r.createdAt.getDate() - 1;
      if (d < maxDays) matrix[d][m] += r.quantity;
    });
    
    const days = Array.from({ length: maxDays }, (_, i) => (i + 1).toString());
    const points = [];
    for (let y = 0; y < days.length; y++) {
      for (let x = 0; x < months.length; x++) {
        points.push({ x, y, v: matrix[y][x] });
      }
    }
    return { days, points, months };
  }, [orderItems, selectedYearForMonthlyHeatmap]);

  // chartData memo grouping all chart datasets
  const chartData = useMemo(() => {
    const filteredValid = filteredRows.filter(r => validStatuses.has(r.orderStatus));
    const filteredData = analysisMode === "item" && selectedItem ? filteredValid.filter(r => r.itemName === selectedItem) : filteredValid;

    // Map unique orders for hourly charts
    const uniqueMap = new Map();
    filteredData.forEach(r => {
      if (!uniqueMap.has(r.orderId)) uniqueMap.set(r.orderId, r);
    });
    const uniques = Array.from(uniqueMap.values());

    // Build counts and revenue by hour
    const ordersCount = Array(24).fill(0);
    const revenueByHour = Array(24).fill(0);
    const deliveredOrders = new Set();

    const allowedStatuses = new Set(["confirmed", "delivered", "processing", "shipped"]);
    uniques.forEach(r => {
      if (allowedStatuses.has(r.orderStatus)) ordersCount[r.createdAt.getHours()]++;
      if (r.orderStatus === "delivered" && !deliveredOrders.has(r.orderId)) {
        revenueByHour[r.createdAt.getHours()] += Number(r.totalPrice);
        deliveredOrders.add(r.orderId);
      }
    });

    return {
      dailyData: buildDailyData(filteredData),
      topProducts: buildTopProducts(filteredData),
      orderStatus: buildOrderStatus(orderStatusCounts),
      paymentMethods: buildPaymentMethods(filteredData),
      customerFrequency: buildCustomerFrequency(),
      heatmap: originalHeatmapData,
      ordersByHour: isSingleDay
        ? { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ label: "Orders", data: ordersCount, backgroundColor: COLOR_PALETTES.pastelBlues }] }
        : null,
      revenueByHour: isSingleDay
        ? { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ label: "Revenue", data: revenueByHour, backgroundColor: COLOR_PALETTES.pastelGolds }] }
        : null,
    };
  }, [filteredRows, analysisMode, selectedItem, validStatuses, orderItems, isSingleDay, orderStatusCounts, originalHeatmapData]);

  const showChartsForSingleDay = isSingleDay;

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  function ChartContainer({ children, title }) {
    return (
      <motion.div
        className="bg-white rounded-lg shadow-lg p-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        role="region"
        aria-label={title}
      >
        <h2 className="text-lg font-semibold mb-3 truncate">{title}</h2>
        {children}
      </motion.div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 p-8 max-w-screen-xl mx-auto font-sans text-gray-900 select-none">
      <header className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight drop-shadow text-indigo-900 flex items-center select-none">
          <LiveIndicator /> Advanced Analytics Dashboard
        </h1>
        {loading && (
          <div className="flex items-center space-x-2 text-green-600 text-sm select-none">
            <LiveIndicator />
            <span>Fetching data...</span>
          </div>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </header>

      <motion.section className="flex flex-wrap gap-4 items-center mb-8" initial="hidden" animate="visible" variants={containerVariants}>
        <label className="flex flex-col w-40 text-indigo-800 font-medium" htmlFor="filterDate">
          Specific Date
          <input
            id="filterDate"
            type="date"
            value={filterDate}
            onChange={e => {
              setFilterDate(e.target.value);
              if (e.target.value) setDateRange({ from: "", to: "" });
            }}
            className="mt-1 rounded border border-indigo-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col w-40 text-indigo-800 font-medium" htmlFor="filterFrom">
          From
          <input
            id="filterFrom"
            type="date"
            value={dateRange.from}
            onChange={e => {
              setDateRange(d => ({ ...d, from: e.target.value }));
              setFilterDate("");
            }}
            className="mt-1 rounded border border-indigo-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col w-40 text-indigo-800 font-medium" htmlFor="filterTo">
          To
          <input
            id="filterTo"
            type="date"
            value={dateRange.to}
            onChange={e => {
              setDateRange(d => ({ ...d, to: e.target.value }));
              setFilterDate("");
            }}
            className="mt-1 rounded border border-indigo-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col max-w-xs text-indigo-800 font-medium" htmlFor="analysisMode">
          Analysis Mode
          <select
            id="analysisMode"
            value={analysisMode}
            onChange={e => {
              setAnalysisMode(e.target.value);
              if (e.target.value === "overall") setSelectedItem("");
            }}
            className="mt-1 rounded border border-indigo-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="overall">Overall</option>
            <option value="item">By Item</option>
          </select>
        </label>
        {analysisMode === "item" && (
          <label className="flex flex-col w-full md:w-auto text-indigo-800 font-medium" htmlFor="selectedItem">
            Select Item
            <select
              id="selectedItem"
              value={selectedItem}
              onChange={e => setSelectedItem(e.target.value)}
              className="mt-1 rounded border border-indigo-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {uniqueItems.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col w-40 text-indigo-800 font-medium" htmlFor="chartType">
          Chart Type
          <select
            id="chartType"
            value={activeChartType}
            onChange={e => setActiveChartType(e.target.value)}
            className="mt-1 rounded border border-indigo-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="doughnut">Doughnut</option>
          </select>
        </label>
      </motion.section>

      {dataSummary && (
        <motion.section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" initial="hidden" animate="visible" variants={containerVariants}>
          {[...[
            {
              title: "Total Orders",
              value: dataSummary.totalOrders,
              bg: "bg-gradient-to-tr from-pink-400 to-yellow-400",
              icon: (
                <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M3 10h1.5M3 14h1.5M20.5 10H22M20.5 14H22" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              ),
            },
            {
              title: "Total Revenue",
              value: `₹${dataSummary.totalRevenue.toFixed(2)}`,
              bg: "bg-gradient-to-tr from-indigo-400 to-purple-600",
              icon: (
                <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M9 5h6a2 2 0 0 1 0 4H7a2 2 0 0 0 0 4h8" />
                </svg>
              ),
            },
            {
              title: "Total Quantity",
              value: dataSummary.totalQuantity,
              bg: "bg-gradient-to-tr from-green-400 to-teal-500",
              icon: (
                <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              ),
            },
            {
              title: "Unique Customers",
              value: dataSummary.uniqueUsers,
              bg: "bg-gradient-to-tr from-yellow-400 to-red-400",
              icon: (
                <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM5 20a7 7 0 0 1 14 0v-1H5v1z" />
                </svg>
              ),
            },
          ]].map(({ title, value, bg, icon }) =>
            <motion.div key={title} className={`${bg} rounded-lg shadow-lg p-4 flex items-center gap-5 cursor-default`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} title={title} tabIndex={-1}>
              <div>{icon}</div>
              <div>
                <h3 className="text-white font-semibold">{title}</h3>
                <p className="text-white text-2xl font-bold">{value.toLocaleString()}</p>
              </div>
            </motion.div>
          )}
        </motion.section>
      )}

      <motion.section
        aria-label="Order status counts"
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {Object.entries(categorizedStatusCounts).map(([key, count]) => {
          if (count === 0) return null;
          let bg =
            key === "delivered"
              ? "bg-green-600"
              : key === "pending"
                ? "bg-yellow-500"
                : key === "cancelled"
                  ? "bg-red-600"
                  : "bg-gray-400";
          return (
            <motion.div key={key} className={`${bg} text-white rounded-lg shadow-lg p-4 flex flex-col items-center`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} title={`${key.charAt(0).toUpperCase() + key.slice(1)} Orders`}>
              <span className="uppercase font-semibold">{key}</span>
              <span className="text-3xl font-bold">{count.toLocaleString()}</span>
            </motion.div>
          );
        })}
      </motion.section>

      <motion.section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8">
        {/* Daily Quantity and Avg Order Value */}
        <ChartContainer title={`Daily Quantity Sold${analysisMode === "item" && selectedItem ? ` - ${selectedItem}` : ""} & Avg Order Value`}>
          {activeChartType === "pie" || activeChartType === "doughnut" ? (
            activeChartType === "pie" ? (
              <Pie data={safePieData(chartData.dailyData, "Quantity Sold")} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            ) : (
              <Doughnut data={safePieData(chartData.dailyData, "Quantity Sold")} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            )
          ) : activeChartType === "line" ? (
            <Line data={chartData.dailyData} options={{
              responsive: true,
              interaction: { mode: "nearest", intersect: false },
              stacked: false,
              plugins: { legend: { position: "top" }, tooltip: { mode: "index", intersect: false } },
              scales: {
                y: { type: "linear", display: true, position: "left", title: { display: true, text: "Quantity Sold" }, min: 0 },
                y1: { type: "linear", display: true, position: "right", grid: { drawOnArea: false }, title: { display: true, text: "Avg Order Value" }, min: 0 },
              },
            }} height={380} />
          ) : (
            <Bar data={chartData.dailyData} options={{
              responsive: true,
              interaction: { mode: "nearest", intersect: false },
              stacked: false,
              plugins: { legend: { position: "top" }, tooltip: { mode: "index", intersect: false } },
              scales: {
                y: { beginAtZero: true, position: "left", title: { display: true, text: "Quantity Sold" }, stacked: false },
                y1: { beginAtZero: true, position: "right", grid: { drawOnArea: false }, title: { display: true, text: "Avg Order Value" }, stacked: false },
              },
            }} height={380} />
          )}
        </ChartContainer>

        {/* Top 5 Products */}
        <ChartContainer title="Top 5 Products">
          {activeChartType === "pie" || activeChartType === "doughnut" ? (
            activeChartType === "pie" ? (
              <Pie data={safePieData(chartData.topProducts, "Quantity Sold")} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            ) : (
              <Doughnut data={safePieData(chartData.topProducts, "Quantity Sold")} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            )
          ) : (
            <Bar data={chartData.topProducts} options={{
              responsive: true,
              plugins: { legend: { position: "none" } },
              scales: { y: { beginAtZero: true, title: { display: true, text: "Quantity Sold" } } },
              interaction: { mode: "nearest", intersect: false },
            }} height={380} />
          )}
        </ChartContainer>

        {/* Order Status */}
        <ChartContainer title="Order Status">
          {activeChartType === "pie" || activeChartType === "doughnut" ? (
            activeChartType === "pie" ? (
              <Pie data={safePieData(chartData.orderStatus)} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            ) : (
              <Doughnut data={safePieData(chartData.orderStatus)} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            )
          ) : (
            <Bar data={chartData.orderStatus} options={{
              responsive: true,
              plugins: { legend: { position: "none" } },
              scales: { y: { beginAtZero: true, title: { display: true, text: "Order Count" } } },
              interaction: { mode: "nearest", intersect: false },
            }} height={380} />
          )}
        </ChartContainer>

        {/* Payment Methods */}
        <ChartContainer title="Payment Methods">
          {activeChartType === "pie" || activeChartType === "doughnut" ? (
            activeChartType === "pie" ? (
              <Pie data={safePieData(chartData.paymentMethods)} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            ) : (
              <Doughnut data={safePieData(chartData.paymentMethods)} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            )
          ) : (
            <Bar data={chartData.paymentMethods} options={{
              responsive: true,
              plugins: { legend: { position: "none" } },
              scales: { y: { beginAtZero: true, title: { display: true, text: "Count" } } },
              interaction: { mode: "nearest", intersect: false },
            }} height={380} />
          )}
        </ChartContainer>

        {/* Customer Frequency */}
        <ChartContainer title="Customer Frequency">
          <Bar data={chartData.customerFrequency} options={{
            responsive: true,
            plugins: { legend: { position: "none" } },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: "Number of Customers" } },
              x: { title: { display: true, text: "Number of Orders" } },
            },
            interaction: { mode: "nearest", intersect: false },
          }} height={380} />
        </ChartContainer>

        {showChartsForSingleDay ? (
          <>
            <ChartContainer title="Orders by Hour (Valid Orders Only)">
              <Bar data={chartData.ordersByHour} options={{
                responsive: true,
                plugins: { legend: { position: "none" } },
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: "Order Count" } },
                  x: { title: { display: true, text: "Hour of Day" } },
                },
                interaction: { mode: "nearest", intersect: false },
              }} height={380} />
            </ChartContainer>
            <ChartContainer title="Revenue by Hour (Delivered Only)">
              <Bar data={chartData.revenueByHour} options={{
                responsive: true,
                plugins: {
                  legend: { position: "none" },
                  tooltip: { callbacks: { label: ctx => `₹${ctx.parsed.y.toFixed(2)}` } },
                },
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: "Revenue (₹)" }, ticks: { callback: v => `₹${v}` } },
                  x: { title: { display: true, text: "Hour of Day" } },
                },
                interaction: { mode: "nearest", intersect: false },
              }} height={380} />
            </ChartContainer>
          </>
        ) : (
          <div className="col-span-full bg-yellow-100 rounded p-6 text-center text-yellow-900 font-semibold mt-8">
            Please filter to a single date to see hourly analytics.
          </div>
        )}
      </motion.section>

      {/* Weekly heatmap section */}
      <section className="mt-12 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Weekly Heatmap</h2>
        <div className="flex flex-wrap gap-6 items-center mb-6">
          <label className="flex flex-col w-28">
            Year
            <select
              className="mt-1 rounded border border-indigo-300 px-3 py-2"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              aria-label="Select year for weekly heatmap"
            >
              {Array.from({ length: 6 }, (_, i) => currentYear + i).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col w-28">
            Month
            <select
              className="mt-1 rounded border border-indigo-300 px-3 py-2"
              value={selectedMonth}
              onChange={e => {
                setSelectedMonth(Number(e.target.value));
                setSelectedWeek(1);
              }}
              aria-label="Select month for weekly heatmap"
            >
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col w-28">
            Week
            <select
              className="mt-1 rounded border border-indigo-300 px-3 py-2"
              value={selectedWeek}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              aria-label="Select week for weekly heatmap"
            >
              {[1, 2, 3, 4].map(w => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Heatmap
          dataPoints={weeklyHeatmapData.points}
          xLabels={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
          yLabels={weeklyHeatmapData.days}
          xLabelTitle="Hour"
          yLabelTitle="Day"
          tableAriaLabel="Weekly heatmap quantity sold by hour and day"
        />
      </section>

      {/* Monthly heatmap section */}
      <section className="mt-12 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Monthly Heatmap</h2>
        <div className="flex flex-wrap gap-6 items-center mb-6">
          <label className="flex flex-col w-28">
            Year
            <select
              className="mt-1 rounded border border-indigo-300 px-3 py-2"
              value={selectedYearForMonthlyHeatmap}
              onChange={e => setSelectedYearForMonthlyHeatmap(Number(e.target.value))}
              aria-label="Select year for monthly heatmap"
            >
              {Array.from({ length: 6 }, (_, i) => currentYear + i).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Heatmap
          dataPoints={monthlyHeatmapData.points}
          xLabels={monthlyHeatmapData.months}
          yLabels={monthlyHeatmapData.days}
          xLabelTitle="Month"
          yLabelTitle="Date"
          tableAriaLabel="Monthly heatmap quantity sold by date and month"
        />
      </section>
    </main>
  );
}

function ChartContainer({ children, title }) {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-lg p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-label={title}
    >
      <h2 className="text-lg font-semibold mb-3 truncate">{title}</h2>
      {children}
    </motion.div>
  );
}
