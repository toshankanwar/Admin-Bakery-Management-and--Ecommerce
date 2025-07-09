'use client';

import { useEffect, useState } from "react";
import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/firebase/firebase";
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Helper to group and aggregate order data by day
function groupOrdersByDay(orders) {
  const dayMap = {};
  orders.forEach(order => {
    if (!order.createdAt) return;
    const dt = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const dayKey = format(dt, "yyyy-MM-dd");
    if (!dayMap[dayKey]) {
      dayMap[dayKey] = {
        date: dayKey,
        orders: [],
        deliveredOrders: [],
        totalItems: 0,
        deliveredItems: 0,
        revenue: 0,
        highestOrderAmt: 0,
        totalOrderAmt: 0,
        itemStats: {},
        deliveredItemStats: {},
      };
    }
    const o = dayMap[dayKey];

    // Only add non-cancelled orders for all total columns
    if (order.orderStatus !== 'cancelled') {
      o.orders.push(order);

      // All items (only non-cancelled orders)
      let orderItemCount = 0;
      (order.items || []).forEach(item => {
        o.itemStats[item.name] = (o.itemStats[item.name] || 0) + (Number(item.quantity) || 1);
        orderItemCount += Number(item.quantity) || 1;
      });
      o.totalItems += orderItemCount;

      const orderAmt = Number(order.total) || 0;
      o.totalOrderAmt += orderAmt;

      if (orderAmt > o.highestOrderAmt) {
        o.highestOrderAmt = orderAmt;
      }
    }

    // Delivered orders
    if (order.orderStatus === 'delivered') {
      o.deliveredOrders.push(order);
      let deliveredItemCount = 0;
      (order.items || []).forEach(item => {
        o.deliveredItemStats[item.name] = (o.deliveredItemStats[item.name] || 0) + (Number(item.quantity) || 1);
        deliveredItemCount += Number(item.quantity) || 1;
      });
      o.deliveredItems += deliveredItemCount;
      o.revenue += Number(order.total) || 0;
    }
  });

  // After grouping, map to array of summary objects with all combinations
  return Object.values(dayMap).map(day => {
    // Most ordered item (non-cancelled orders)
    let mostOrderedItem = '', mostOrderedQty = 0;
    Object.entries(day.itemStats).forEach(([name, qty]) => {
      if (qty > mostOrderedQty) {
        mostOrderedQty = qty;
        mostOrderedItem = name;
      }
    });
    // Most delivered item
    let mostDeliveredItem = '', mostDeliveredQty = 0;
    Object.entries(day.deliveredItemStats).forEach(([name, qty]) => {
      if (qty > mostDeliveredQty) {
        mostDeliveredQty = qty;
        mostDeliveredItem = name;
      }
    });

    return {
      date: day.date,
      totalOrders: day.orders.length,
      deliveredOrders: day.deliveredOrders.length,
      mostOrderedItem: mostOrderedItem,
      mostOrderedQty: mostOrderedQty,
      mostDeliveredItem: mostDeliveredItem,
      mostDeliveredQty: mostDeliveredQty,
      totalItemsSold: day.totalItems,
      totalDeliveredItems: day.deliveredItems,
      totalRevenueDelivered: day.revenue,
      totalOrderAmt: day.totalOrderAmt,
      highestOrderAmt: day.highestOrderAmt,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

function downloadCSV(data, headers, filename = "bakery-daily-data.csv") {
  const csvRows = [];
  csvRows.push(headers.map(h => `"${h.label}"`).join(','));
  data.forEach(row => {
    csvRows.push(headers.map(h => `"${row[h.key] ?? ""}"`).join(','));
  });
  const csvStr = csvRows.join('\n');
  const blob = new Blob([csvStr], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TABLE_HEADERS = [
  { label: "Date", key: "date", align: 'left' },
  { label: "Total Orders", key: "totalOrders", align: 'center' }, // non-cancelled
  { label: "Delivered Orders", key: "deliveredOrders", align: 'center' },

  { label: "Most Ordered Item", key: "mostOrderedItem", align: 'left' },
  { label: "Most Ordered Qty", key: "mostOrderedQty", align: 'center' },

  { label: "Most Delivered Item", key: "mostDeliveredItem", align: 'left' },
  { label: "Most Delivered Qty", key: "mostDeliveredQty", align: 'center' },

  { label: "Total Items Sold", key: "totalItemsSold", align: 'center' }, // non-cancelled
  { label: "Total Delivered Items", key: "totalDeliveredItems", align: 'center' },

  { label: "Total Order Amount", key: "totalOrderAmt", align: 'right' }, // non-cancelled
  { label: "Revenue (Delivered)", key: "totalRevenueDelivered", align: 'right' },
  { label: "Highest Order Amount (non-cancelled)", key: "highestOrderAmt", align: 'right' },
];

export default function BakeryDatabasePage() {
  const [orderRows, setOrderRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    getDocs(collection(db, 'orders')).then(orderSnap => {
      const orders = [];
      orderSnap.forEach(doc => orders.push(doc.data()));
      setOrderRows(groupOrdersByDay(orders));
      setLoading(false);
    });
  }, []);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function filteredRows() {
    let rows = [...orderRows];
    if (search) {
      rows = rows.filter(row =>
        TABLE_HEADERS.some(h => (row[h.key] + '').toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (dateFilter) {
      rows = rows.filter(row => row.date === dateFilter);
    }
    if (dateFrom) {
      rows = rows.filter(row => row.date >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter(row => row.date <= dateTo);
    }
    rows.sort((a, b) => {
      if (sortKey === 'date') {
        return sortDir === 'asc'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      }
      if (typeof a[sortKey] === "number")
        return sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
      return sortDir === 'asc'
        ? (a[sortKey] + '').localeCompare(b[sortKey] + '')
        : (b[sortKey] + '').localeCompare(a[sortKey] + '');
    });
    return rows;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Daily Orders Database</h1>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="date"
              className="border px-3 py-1.5 rounded-lg shadow-sm text-sm"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              className="border px-3 py-1.5 rounded-lg shadow-sm text-sm"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="To"
            />
            <input
              type="date"
              className="border px-3 py-1.5 rounded-lg shadow-sm text-sm"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              placeholder="Specific date"
            />
            <input
              type="text"
              className="border px-3 py-1.5 rounded-lg shadow-sm text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
            />
            <button
              onClick={() => downloadCSV(filteredRows(), TABLE_HEADERS)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold shadow"
            >
              <ArrowDownTrayIcon className="h-5 w-5" /> Download CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl shadow bg-white">
          <table className="min-w-full divide-y divide-purple-100 text-xs md:text-sm">
            <thead className="bg-purple-50 sticky top-0 z-10">
              <tr>
                {TABLE_HEADERS.map(h => (
                  <th key={h.key}
                      className={`px-4 py-3 font-bold text-purple-700 text-left whitespace-nowrap cursor-pointer select-none ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : ''}`}
                      onClick={() => handleSort(h.key)}>
                    <span className="flex items-center gap-1">
                      {h.label}
                      {sortKey === h.key && (
                        <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} className="text-center py-12 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows().length === 0 ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} className="text-center py-12 text-gray-400">
                    No data found for your criteria.
                  </td>
                </tr>
              ) : (
                filteredRows().map(row => (
                  <tr key={row.date} className="hover:bg-purple-50 transition">
                    {TABLE_HEADERS.map(h => (
                      <td key={h.key} className={`px-4 py-3 whitespace-nowrap ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : ''}`}>
                        {h.key === "totalRevenueDelivered" || h.key === "totalOrderAmt" || h.key === "highestOrderAmt"
                          ? `₹${Number(row[h.key] || 0).toFixed(2)}`
                          : row[h.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 text-right pt-2">
          Click header to sort. Use the filters above for date range, specific date, or search.
        </div>
      </div>
    </div>
  );
}