'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase'; // adjust if your path differs
import { format } from 'date-fns';

const TABLE_HEADERS = [
  { label: 'Order Date', key: 'orderDate', align: 'left', width: '110px' },
  { label: 'Order Time', key: 'orderTime', align: 'left', width: '100px' },
  { label: 'Order ID', key: 'orderId', align: 'left', width: '160px' },
  { label: 'User ID', key: 'userId', align: 'left', width: '140px' },
  { label: 'Name', key: 'name', align: 'left', width: '140px' },
  { label: 'Email', key: 'email', align: 'left', width: '180px' },
  { label: 'Item Name', key: 'itemName', align: 'left', width: '160px' },
  { label: 'Quantity', key: 'quantity', align: 'center', width: '70px' },
  { label: 'Item Price', key: 'price', align: 'right', width: '90px' },
  { label: 'Total Price', key: 'totalPrice', align: 'right', width: '100px' },
  { label: 'Pincode', key: 'pincode', align: 'left', width: '90px' },
  { label: 'State', key: 'state', align: 'left', width: '100px' },
  {
    label: 'Order Status',
    key: 'orderStatus',
    align: 'center',
    width: '110px',
    minWidth: '110px',
  },
  {
    label: 'Payment Status',
    key: 'paymentStatus',
    align: 'center',
    width: '140px',
    minWidth: '140px',
  },
  {
    label: 'Razorpay Payment ID',
    key: 'razorpayPaymentId',
    align: 'left',
    width: '250px',
    minWidth: '250px',
    wrap: true,
  },
  { label: 'Payment Method', key: 'paymentMethod', align: 'left', width: '130px' },
];

// Utility: download CSV from array of objects and headers definition
function downloadCSV(data, headers, filename = 'orders-detailed.csv') {
  const csvRows = [];
  // Add headers row
  csvRows.push(headers.map((h) => `"${h.label}"`).join(','));
  data.forEach((row) => {
    csvRows.push(
      headers
        .map((h) => {
          const val = row[h.key] ?? '';
          // Escape double quotes by doubling them
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    );
  });
  const csvStr = csvRows.join('\n');
  const blob = new Blob([csvStr], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OrdersDetailedTable() {
  const [orderItemsRows, setOrderItemsRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState('orderDate');
  const [sortDir, setSortDir] = useState('desc');

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // exact date
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        let rows = [];

        ordersSnap.forEach((docSnap) => {
          const orderData = docSnap.data();
          const docId = docSnap.id;

          let createdAtDate;
          if (orderData.createdAt?.toDate)
            createdAtDate = orderData.createdAt.toDate();
          else if (orderData.createdAt)
            createdAtDate = new Date(orderData.createdAt);
          else createdAtDate = new Date();

          const { address = {} } = orderData;
          const { pincode = '', state = '', name = '', email = '' } = address;

          (orderData.items || []).forEach((item, index) => {
            const quantity = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            const totalPrice = quantity * price;

            rows.push({
              orderDate: format(createdAtDate, 'yyyy-MM-dd'),
              orderTime: format(createdAtDate, 'HH:mm:ss'),
              orderId: docId,
              userId: orderData.userId || '',
              name,
              email,
              itemName: item.name || item.productId || 'Unknown',
              quantity,
              price: price.toFixed(2),
              totalPrice: totalPrice.toFixed(2),
              pincode,
              state,
              orderStatus: orderData.orderStatus || '',
              paymentStatus: orderData.paymentStatus || '',
              razorpayPaymentId: orderData.razorpayPaymentId || '',
              paymentMethod: orderData.paymentMethod || '',
              _idx: index,
            });
          });
        });

        setOrderItemsRows(rows);
      } catch (error) {
        console.error('Failed to load orders:', error);
        setOrderItemsRows([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function filteredAndSortedRows() {
    let rows = [...orderItemsRows];

    if (search.trim()) {
      const lower = search.toLowerCase();
      rows = rows.filter((row) =>
        [
          'orderId',
          'userId',
          'name',
          'email',
          'itemName',
          'orderStatus',
          'paymentStatus',
          'paymentMethod',
          'razorpayPaymentId',
        ].some((k) => (row[k] + '').toLowerCase().includes(lower))
      );
    }

    if (dateFilter) rows = rows.filter((row) => row.orderDate === dateFilter);
    if (dateFrom) rows = rows.filter((row) => row.orderDate >= dateFrom);
    if (dateTo) rows = rows.filter((row) => row.orderDate <= dateTo);

    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (sortKey === 'orderDate' || sortKey === 'orderTime' || sortKey === 'orderId') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
        return sortDir === 'asc'
          ? parseFloat(aVal) - parseFloat(bVal)
          : parseFloat(bVal) - parseFloat(aVal);
      }

      return sortDir === 'asc'
        ? (aVal + '').localeCompare(bVal + '')
        : (bVal + '').localeCompare(aVal + '');
    });

    return rows;
  }

  // Memoized filtered rows for analysis and CSV export
  const filteredRows = useMemo(() => filteredAndSortedRows(), [
    orderItemsRows,
    search,
    dateFilter,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
  ]);

  // Data analysis summary: with per-order shipping charge logic for revenue
  const dataSummary = useMemo(() => {
    if (!filteredRows.length) return null;

    const validStatusesForOrdersAndQuantity = new Set(['confirmed', 'delivered', 'processing', 'shipped']);
    const revenueStatus = 'delivered';

    const validRowsForOrdersAndQuantity = filteredRows.filter((r) =>
      validStatusesForOrdersAndQuantity.has(r.orderStatus.toLowerCase())
    );

    // Filter for revenue calc - delivered only
    const validRowsForRevenue = filteredRows.filter(
      (r) => r.orderStatus.toLowerCase() === revenueStatus
    );

    // Unique orders count for total orders
    const uniqueOrderIds = new Set(validRowsForOrdersAndQuantity.map((r) => r.orderId));
    const totalOrders = uniqueOrderIds.size;

    // Group delivered order items by orderId and sum per order
    const orderTotalsMap = validRowsForRevenue.reduce((acc, item) => {
      const orderId = item.orderId;
      const price = parseFloat(item.totalPrice);
      if (!acc[orderId]) acc[orderId] = 0;
      acc[orderId] += price;
      return acc;
    }, {});

    // Sum total revenue with one-time shipping charge added per order if total < 100
    const totalRevenue = Object.values(orderTotalsMap).reduce((sum, orderTotal) => {
      return sum + (orderTotal < 100 ? orderTotal + 10 : orderTotal);
    }, 0);

    // Total quantity sold for valid statuses
    const totalQuantity = validRowsForOrdersAndQuantity.reduce(
      (sum, r) => sum + Number(r.quantity),
      0
    );

    // Unique users for all filtered rows
    const uniqueUsers = new Set(filteredRows.map((r) => r.userId));
    const totalUsers = uniqueUsers.size;

    return {
      totalOrders,
      totalRevenue,
      totalQuantity,
      totalUsers,
    };
  }, [filteredRows]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="max-w-[95vw] mx-auto space-y-6 flex flex-col select-none">
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight text-purple-800 drop-shadow-sm">
          All Orders Detailed Table
        </h1>

        {/* Filters and search */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <label className="flex flex-col text-purple-700 font-semibold text-sm w-40">
            From Date
            <input
              type="date"
              className="mt-1 border border-purple-300 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter orders from date"
              title="Filter orders from this date (inclusive)"
            />
          </label>

          <label className="flex flex-col text-purple-700 font-semibold text-sm w-40">
            To Date
            <input
              type="date"
              className="mt-1 border border-purple-300 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter orders to date"
              title="Filter orders until this date (inclusive)"
            />
          </label>

          <label className="flex flex-col text-purple-700 font-semibold text-sm w-48">
            Specific Date
            <input
              type="date"
              className="mt-1 border border-purple-300 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter orders for a specific date"
              title="Filter orders for this exact date"
            />
          </label>

          <input
            type="text"
            className="flex-grow min-w-[200px] border border-purple-300 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, users, items..."
            aria-label="Search orders"
            title="Search by order ID, user, email, item or status"
          />

          <button
            onClick={() => {
              setDateFilter('');
              setDateFrom('');
              setDateTo('');
              setSearch('');
            }}
            className="bg-purple-700 text-white px-5 py-2 rounded-lg shadow hover:bg-purple-800 transition font-semibold select-none"
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            Clear Filters
          </button>

          <button
            onClick={() =>
              downloadCSV(filteredRows, TABLE_HEADERS, 'orders-detailed.csv')
            }
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-semibold select-none"
            aria-label="Download CSV"
            title="Download filtered data as CSV"
          >
            Download CSV
          </button>
        </div>

        {/* Data analysis summary */}
        {dataSummary && (
          <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 mb-4 text-purple-900 shadow-sm w-full max-w-full">
            <strong>Data Summary:</strong>{' '}
            <span className="mr-4">Total Orders: {dataSummary.totalOrders}</span>
            <span className="mr-4">
              Total Revenue: ₹{dataSummary.totalRevenue.toFixed(2)}
            </span>
            <span className="mr-4">
              Total Quantity Sold: {dataSummary.totalQuantity}
            </span>
            <span>Total Unique Users: {dataSummary.totalUsers}</span>
          </div>
        )}

        {/* Table wrapper with fixed height + scroll */}
        <div
          className="overflow-auto border border-purple-300 rounded-lg shadow-lg bg-white"
          style={{ maxHeight: '75vh', minHeight: '400px' }}
          tabIndex={0}
          aria-label="Orders table"
        >
          <table
            className="min-w-max w-full border-collapse"
            style={{ tableLayout: 'fixed' }}
          >
            <thead className="bg-purple-100 sticky top-0 z-20 drop-shadow-sm">
              <tr>
                {TABLE_HEADERS.map(({ label, key, align, width, minWidth, wrap }) => (
                  <th
                    key={key}
                    className={`px-3 py-3 font-semibold text-purple-800 select-none cursor-pointer whitespace-nowrap border-b border-purple-300
                      ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}
                      hover:bg-purple-200 transition`}
                    onClick={() => handleSort(key)}
                    aria-sort={
                      sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    title={`Sort by ${label}`}
                    style={{ width, minWidth, whiteSpace: wrap ? 'normal' : 'nowrap' }}
                  >
                    <div className="flex items-center gap-2 select-none">
                      {label}
                      <span className="inline-block w-4">
                        {sortKey === key ? (
                          sortDir === 'asc' ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                              className="h-4 w-4 text-purple-700"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                              className="h-4 w-4 text-purple-700"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          )
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1}
                            className="h-3 w-3 text-purple-400 opacity-50"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 9l7 7 7-7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={TABLE_HEADERS.length}
                    className="text-center text-gray-400 py-12 font-semibold text-lg"
                  >
                    Loading orders...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_HEADERS.length}
                    className="text-center text-gray-400 py-12 font-semibold text-lg"
                  >
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={`${row.orderId}-${row._idx ?? idx}`} // unique key with index to avoid collisions
                    className={`border-b border-purple-300 transition hover:bg-purple-50 cursor-default ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-purple-50'
                    }`}
                    style={{ animation: `fadeIn 0.25s ease forwards` }}
                    tabIndex={0}
                    aria-rowindex={idx + 2} // +2 because header is row 1
                  >
                    {TABLE_HEADERS.map(({ key, align, width, minWidth, wrap }) => (
                      <td
                        key={key}
                        className={`px-3 py-2 whitespace-pre-wrap text-sm md:text-base ${
                          align === 'right'
                            ? 'text-right'
                            : align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                        style={{
                          width,
                          minWidth,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: wrap ? 'normal' : 'nowrap',
                        }}
                        title={row[key]}
                      >
                        {key === 'price' || key === 'totalPrice' ? `₹${row[key]}` : row[key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-gray-600 text-right mt-2 select-none">
          {`Total rows: ${filteredRows.length}`}
        </div>
      </div>

      {/* Fade-in animation keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Custom scrollbar for WebKit browsers */}
      <style jsx>{`
        div[aria-label='Orders table']::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        div[aria-label='Orders table']::-webkit-scrollbar-track {
          background: #f9f5ff;
          border-radius: 10px;
        }
        div[aria-label='Orders table']::-webkit-scrollbar-thumb {
          background: #c4b5fd; /* purple-300 */
          border-radius: 10px;
        }
        div[aria-label='Orders table']::-webkit-scrollbar-thumb:hover {
          background: #7c3aed; /* purple-700 */
        }
      `}</style>
    </div>
  );
}
