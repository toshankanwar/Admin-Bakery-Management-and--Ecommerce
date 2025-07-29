'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebase'; // adjust if your path differs
import { format } from 'date-fns';

const TABLE_HEADERS = [
  { label: 'Order Date', key: 'orderDate', align: 'left', width: '110px' },
  { label: 'Order Time', key: 'orderTime', align: 'left', width: '110px' },
  { label: 'Order ID', key: 'orderId', align: 'left', width: '160px' },
  { label: 'User ID', key: 'userId', align: 'left', width: '140px' },
  { label: 'Name', key: 'name', align: 'left', width: '140px' },
  { label: 'Email', key: 'email', align: 'left', width: '180px' },
  { label: 'Item Name', key: 'itemName', align: 'left', width: '180px' },
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

// Utility to download CSV file
function downloadCSV(data, headers, filename = 'orders-detailed.csv') {
  const csvRows = [];
  csvRows.push(headers.map((h) => `"${h.label}"`).join(','));
  data.forEach((row) => {
    csvRows.push(
      headers
        .map((h) => {
          const val = row[h.key] ?? '';
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

  // Multi-sorting: array of { key, direction ('asc' | 'desc') }
  const [sorts, setSorts] = useState([{ key: 'orderDate', direction: 'desc' }]);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // exact date YYYY-MM-DD
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Multi-select filters
  const [selectedOrderStatuses, setSelectedOrderStatuses] = useState([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);

  // Numeric filters: quantity and totalPrice
  const [quantityCondition, setQuantityCondition] = useState(''); // '<=', '>=', '='
  const [quantityValue, setQuantityValue] = useState('');
  const [totalPriceCondition, setTotalPriceCondition] = useState('');
  const [totalPriceValue, setTotalPriceValue] = useState('');

  // Options for filters
  const ORDER_STATUS_OPTIONS = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];
  const PAYMENT_METHOD_OPTIONS = ['UPI', 'COD', 'Card', 'Wallet', 'NetBanking'];

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

  // Filter and sort combined function
  function filteredAndSortedRows() {
    let rows = [...orderItemsRows];

    // Search filter on multiple fields
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

    // Filter exact date (orderDate)
    if (dateFilter) rows = rows.filter((row) => row.orderDate === dateFilter);

    // Date range
    if (dateFrom) rows = rows.filter((row) => row.orderDate >= dateFrom);
    if (dateTo) rows = rows.filter((row) => row.orderDate <= dateTo);

    // Filter by selected order statuses (multi-select)
    if (selectedOrderStatuses.length > 0) {
      const selectedSet = new Set(selectedOrderStatuses.map((s) => s.toLowerCase()));
      rows = rows.filter((row) => selectedSet.has((row.orderStatus || '').toLowerCase()));
    }

    // Filter by selected payment methods (multi-select)
    if (selectedPaymentMethods.length > 0) {
      const selectedSet = new Set(selectedPaymentMethods.map((s) => s.toLowerCase()));
      rows = rows.filter((row) => selectedSet.has((row.paymentMethod || '').toLowerCase()));
    }

    // Quantity filter
    const qVal = Number(quantityValue);
    if (!isNaN(qVal) && quantityCondition) {
      rows = rows.filter((row) => {
        const q = Number(row.quantity);
        switch (quantityCondition) {
          case '<=':
            return q <= qVal;
          case '>=':
            return q >= qVal;
          case '=':
            return q === qVal;
          default:
            return true;
        }
      });
    }

    // Total price filter
    const pVal = Number(totalPriceValue);
    if (!isNaN(pVal) && totalPriceCondition) {
      rows = rows.filter((row) => {
        const p = Number(row.totalPrice);
        switch (totalPriceCondition) {
          case '<=':
            return p <= pVal;
          case '>=':
            return p >= pVal;
          case '=':
            return p === pVal;
          default:
            return true;
        }
      });
    }

    // Multi-parameter sorting
    if (sorts.length > 0) {
      rows.sort((a, b) => {
        for (const { key, direction } of sorts) {
          let aVal = a[key];
          let bVal = b[key];

          // Custom sorting:
          // For orderTime: parse as HH:mm:ss to number seconds to compare
          if (key === 'orderTime') {
            aVal = timeStringToSeconds(aVal);
            bVal = timeStringToSeconds(bVal);
          }

          // For price or totalPrice: numeric comparison
          if (
            ['quantity', 'price', 'totalPrice'].includes(key) ||
            (key === 'orderTime' && typeof aVal === 'number' && typeof bVal === 'number')
          ) {
            if (aVal === undefined || aVal === null) aVal = 0;
            if (bVal === undefined || bVal === null) bVal = 0;
            var comp = aVal - bVal;
          } else {
            // Fallback string compare
            comp = (aVal ?? '').toString().localeCompare((bVal ?? '').toString());
          }

          if (comp !== 0) {
            return direction === 'asc' ? comp : -comp;
          }
        }
        return 0;
      });
    }

    return rows;
  }

  // Convert HH:mm:ss to seconds for time comparison
  function timeStringToSeconds(t) {
    if (!t) return 0;
    const parts = t.split(':');
    if (parts.length !== 3) return 0;
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }

  // Sorting UI handler: cycles asc -> desc -> remove
  function handleSort(key) {
    setSorts((prevSorts) => {
      const idx = prevSorts.findIndex((s) => s.key === key);
      if (idx === -1) {
        return [{ key, direction: 'asc' }, ...prevSorts];
      }
      const current = prevSorts[idx];
      if (current.direction === 'asc') {
        const newSorts = [...prevSorts];
        newSorts.splice(idx, 1);
        newSorts.unshift({ key, direction: 'desc' });
        return newSorts;
      }
      // direction === 'desc' => remove key from sort
      const newSorts = [...prevSorts];
      newSorts.splice(idx, 1);
      return newSorts;
    });
  }

  // Get current sort direction for UI icon
  function getSortDirection(key) {
    const entry = sorts.find((s) => s.key === key);
    return entry ? entry.direction : null;
  }

  // Memoized filtering + sorting result
  const filteredRows = useMemo(filteredAndSortedRows, [
    orderItemsRows,
    search,
    dateFilter,
    dateFrom,
    dateTo,
    selectedOrderStatuses,
    selectedPaymentMethods,
    quantityCondition,
    quantityValue,
    totalPriceCondition,
    totalPriceValue,
    sorts,
  ]);

  // Data summary useful for business insights
  const dataSummary = useMemo(() => {
    if (!filteredRows.length) return null;

    const validStatusesForOrdersAndQuantity = new Set([
      'confirmed',
      'delivered',
      'processing',
      'shipped',
    ]);
    const revenueStatus = 'delivered';

    const validRowsForOrdersAndQuantity = filteredRows.filter((r) =>
      validStatusesForOrdersAndQuantity.has(r.orderStatus.toLowerCase())
    );

    // Revenue calc - only delivered
    const validRowsForRevenue = filteredRows.filter(
      (r) => r.orderStatus.toLowerCase() === revenueStatus
    );

    const uniqueOrderIds = new Set(validRowsForOrdersAndQuantity.map((r) => r.orderId));
    const totalOrders = uniqueOrderIds.size;

    // Sum prices per order
    const orderTotalsMap = validRowsForRevenue.reduce((acc, item) => {
      const orderId = item.orderId;
      const price = parseFloat(item.totalPrice);
      if (!acc[orderId]) acc[orderId] = 0;
      acc[orderId] += price;
      return acc;
    }, {});

    // Total revenue with shipping charge when applicable
    const totalRevenue = Object.values(orderTotalsMap).reduce((sum, orderTotal) => {
      // Shipping charge logic: add Rs 10 for orders with total < 100
      return sum + (orderTotal < 100 ? orderTotal + 10 : orderTotal);
    }, 0);

    const totalQuantity = validRowsForOrdersAndQuantity.reduce(
      (sum, r) => sum + Number(r.quantity),
      0
    );

    const uniqueUsers = new Set(filteredRows.map((r) => r.userId));
    const totalUsers = uniqueUsers.size;

    // Additional insights: Average order value:
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    // Average items per order:
    const orderItemCount = validRowsForOrdersAndQuantity.reduce((acc, r) => {
      acc[r.orderId] = (acc[r.orderId] || 0) + Number(r.quantity);
      return acc;
    }, {});
    const avgItemsPerOrder =
      totalOrders > 0
        ? Object.values(orderItemCount).reduce((a, b) => a + b, 0) / totalOrders
        : 0;

    // Most popular item by quantity in filtered data
    const itemQuantityMap = filteredRows.reduce((acc, r) => {
      const name = r.itemName || 'Unknown';
      acc[name] = (acc[name] || 0) + Number(r.quantity);
      return acc;
    }, {});
    const popularItem = Object.entries(itemQuantityMap).reduce(
      (max, entry) => (entry[1] > max[1] ? entry : max),
      ['', 0]
    )[0];

    return {
      totalOrders,
      totalRevenue,
      totalQuantity,
      totalUsers,
      avgOrderValue,
      avgItemsPerOrder,
      popularItem,
    };
  }, [filteredRows]);

  // Simple multi-select UI component with checkboxes
  function MultiSelect({ options, selected, onChange, label, placeholder }) {
    const toggleOption = (option) => {
      if (selected.includes(option)) {
        onChange(selected.filter((o) => o !== option));
      } else {
        onChange([...selected, option]);
      }
    };

    return (
      <div className="flex flex-col w-48">
        <label className="text-purple-700 font-semibold text-sm mb-1">{label}</label>
        <div className="border border-purple-300 rounded-lg bg-white max-h-48 overflow-auto shadow-sm p-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center space-x-2 cursor-pointer select-none py-0.5"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)}
                className="cursor-pointer"
              />
              <span className="text-gray-700">{opt}</span>
            </label>
          ))}
          {selected.length === 0 && (
            <div className="text-gray-400 italic text-xs mt-1">{placeholder}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="max-w-[98vw] mx-auto space-y-6 flex flex-col select-none">
        <h1 className="text-4xl font-extrabold mb-4 tracking-tight text-purple-800 drop-shadow-sm">
          All Orders Detailed Table
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Date range */}
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

          {/* Specific date */}
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

          {/* Order Status multi-select */}
          <MultiSelect
            options={ORDER_STATUS_OPTIONS}
            selected={selectedOrderStatuses}
            onChange={setSelectedOrderStatuses}
            label="Order Status"
            placeholder="Select order statuses"
          />

          {/* Payment Method multi-select */}
          <MultiSelect
            options={PAYMENT_METHOD_OPTIONS}
            selected={selectedPaymentMethods}
            onChange={setSelectedPaymentMethods}
            label="Payment Method"
            placeholder="Select payment methods"
          />

          {/* Quantity filter */}
          <label className="flex flex-col text-purple-700 font-semibold text-sm w-40">
            Quantity Condition
            <select
              className="mt-1 border border-purple-300 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={quantityCondition}
              onChange={(e) => setQuantityCondition(e.target.value)}
              aria-label="Quantity condition"
              title="Filter by quantity condition"
            >
              <option value="">Any</option>
              <option value="<=">Less than or equal to</option>
              <option value=">=">Greater than or equal to</option>
              <option value="=">Equal to</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Value"
              className="mt-1 border border-purple-300 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              disabled={!quantityCondition}
              aria-label="Quantity filter value"
              title="Value for quantity filter"
            />
          </label>

          {/* Total Price filter */}
          <label className="flex flex-col text-purple-700 font-semibold text-sm w-40">
            Total Price Condition
            <select
              className="mt-1 border border-purple-300 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={totalPriceCondition}
              onChange={(e) => setTotalPriceCondition(e.target.value)}
              aria-label="Total price condition"
              title="Filter by total price condition"
            >
              <option value="">Any</option>
              <option value="<=">Less than or equal to</option>
              <option value=">=">Greater than or equal to</option>
              <option value="=">Equal to</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Value"
              className="mt-1 border border-purple-300 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              value={totalPriceValue}
              onChange={(e) => setTotalPriceValue(e.target.value)}
              disabled={!totalPriceCondition}
              aria-label="Total price filter value"
              title="Value for total price filter"
            />
          </label>

          {/* Search box */}
          <input
            type="text"
            className="flex-grow min-w-[200px] border border-purple-300 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, users, items..."
            aria-label="Search orders"
            title="Search by order ID, user, email, item, or status"
          />

          {/* Clear filters button */}
          <button
            onClick={() => {
              setDateFilter('');
              setDateFrom('');
              setDateTo('');
              setSearch('');
              setSelectedOrderStatuses([]);
              setSelectedPaymentMethods([]);
              setQuantityCondition('');
              setQuantityValue('');
              setTotalPriceCondition('');
              setTotalPriceValue('');
              setSorts([{ key: 'orderDate', direction: 'desc' }]);
            }}
            className="bg-purple-700 text-white px-5 py-2 rounded-lg shadow hover:bg-purple-800 transition font-semibold select-none"
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            Clear Filters
          </button>

          {/* Download CSV */}
          <button
            onClick={() => downloadCSV(filteredRows, TABLE_HEADERS, 'orders-detailed.csv')}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-semibold select-none"
            aria-label="Download CSV"
            title="Download filtered data as CSV"
          >
            Download CSV
          </button>
        </div>

        {/* Data summary */}
        {dataSummary && (
          <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 mb-4 text-purple-900 shadow-sm w-full max-w-full space-y-1">
            <strong>Data Summary:</strong>
            <div>Total Orders: {dataSummary.totalOrders}</div>
            <div>Total Revenue: ₹{dataSummary.totalRevenue.toFixed(2)}</div>
            <div>Total Quantity Sold: {dataSummary.totalQuantity}</div>
            <div>Total Unique Users: {dataSummary.totalUsers}</div>
            <div>Avg Order Value: ₹{dataSummary.avgOrderValue.toFixed(2)}</div>
            <div>Avg Items Per Order: {dataSummary.avgItemsPerOrder.toFixed(2)}</div>
            <div>Most Popular Item: {dataSummary.popularItem || 'N/A'}</div>
          </div>
        )}

        {/* Table */}
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
                      sorts.find((s) => s.key === key)
                        ? sorts.find((s) => s.key === key).direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    title={`Sort by ${label}`}
                    style={{ width, minWidth, whiteSpace: wrap ? 'normal' : 'nowrap' }}
                  >
                    <div className="flex items-center gap-2 select-none">
                      {label}
                      <SortIcon direction={getSortDirection(key)} />
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
                    key={`${row.orderId}-${row._idx ?? idx}`}
                    className={`border-b border-purple-300 transition hover:bg-purple-50 cursor-default ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-purple-50'
                    }`}
                    style={{ animation: `fadeIn 0.25s ease forwards` }}
                    tabIndex={0}
                    aria-rowindex={idx + 2}
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

      {/* Scrollbar styles */}
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
          background: #c4b5fd;
          border-radius: 10px;
        }
        div[aria-label='Orders table']::-webkit-scrollbar-thumb:hover {
          background: #7c3aed;
        }
      `}</style>
    </div>
  );
}

// Helper: render sort icon for table headers
function SortIcon({ direction }) {
  if (!direction) {
    return (
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
    );
  }
  if (direction === 'asc') {
    return (
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
    );
  }
  if (direction === 'desc') {
    return (
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
    );
  }
  return null;
}
