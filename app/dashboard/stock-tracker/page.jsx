"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Converts Firestore timestamp/string to JS Date for comparison.
function toDate(val) {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (val instanceof Date) return val;
  return null;
}

const TIME_RANGES = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

function getRange(dateStr, rangeType) {
  const base = new Date(dateStr + "T00:00:00");
  let start, end;
  switch (rangeType) {
    case "week": {
      const day = base.getDay();
      start = new Date(base);
      start.setDate(base.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month": {
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    default: // day
      start = new Date(dateStr + "T00:00:00");
      end = new Date(dateStr + "T23:59:59.999");
  }
  return { start, end };
}

export default function StockTracker() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeRange, setTimeRange] = useState("day");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();

  // Admin authentication check using role in users collection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAdminLoading(true);
      setIsAdmin(false);
      setAuthError("");
      if (!user) {
        setAuthError("You must be logged in to access this page.");
        setAdminLoading(false);
        router.replace("/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
          setAdminLoading(false);
        } else {
          setAuthError("Access denied. Admins only.");
          setAdminLoading(false);
          router.replace("/");
        }
      } catch (err) {
        setAuthError("Failed to verify admin role: " + err.message);
        setAdminLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch all items
  useEffect(() => {
    if (!isAdmin) return;
    const fetchItems = async () => {
      try {
        const snap = await getDocs(collection(db, "bakeryItems"));
        setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setAuthError("Failed to fetch items: " + err.message);
      }
    };
    fetchItems();
  }, [isAdmin]);

  // Fetch orders for the selected date/range
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    const fetchOrders = async () => {
      try {
        const { start, end } = getRange(date, timeRange);
        let q = query(
          collection(db, "orders"),
          where("createdAt", ">=", start),
          where("createdAt", "<=", end)
        );
        let snap = await getDocs(q);

        // Fallback to client-side filter if needed
        let docs = snap.docs.length
          ? snap.docs
          : (await getDocs(collection(db, "orders"))).docs;

        const filtered = docs
          .map(doc => ({ ...doc.data(), docId: doc.id }))
          .filter(order => {
            const orderDate = toDate(order.createdAt);
            if (!orderDate) return false;
            return orderDate >= start && orderDate <= end;
          });

        setOrders(filtered);
      } catch (error) {
        setAuthError(
          "Get orders error: " +
            (error && error.message ? error.message : JSON.stringify(error))
        );
      }
      setLoading(false);
    };
    fetchOrders();
  }, [date, isAdmin, timeRange]);

  // Calculate sold quantities for each item
  const soldMap = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const pid = item.productId || item.id;
      soldMap[pid] = (soldMap[pid] || 0) + (item.quantity || 1);
    });
  });

  // UI
  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-purple-200">
        <div className="p-8 rounded-xl shadow-xl bg-white">
          <h1 className="text-3xl font-extrabold text-purple-700 mb-2">Bakery Stock Tracker</h1>
          <p className="text-purple-500">Checking admin access...</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-purple-200">
        <div className="p-8 rounded-xl shadow-xl bg-white">
          <h1 className="text-3xl font-extrabold text-purple-700 mb-2">Bakery Stock Tracker</h1>
          <p className="text-red-600 font-bold">{authError || "Access denied."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-200 p-4 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl p-10 mt-10 border border-purple-100">
        <h1 className="text-4xl font-extrabold text-purple-800 mb-10 flex items-center gap-4 tracking-tight">
          <span role="img" aria-label="bakery" className="text-3xl">🍞</span>
          Bakery Stock Tracker
        </h1>
        <div className="flex flex-col md:flex-row md:items-end md:gap-10 gap-4 mb-10">
          <div>
            <label className="block text-purple-700 font-semibold mb-2 text-base">
              Select Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border-2 border-purple-200 px-3 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-purple-700 font-semibold mb-2 text-base">
              Track By
            </label>
            <div className="flex gap-2">
              {TIME_RANGES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`rounded-lg px-5 py-2 font-bold shadow-sm border-2 transition text-base
                    ${timeRange === r.value
                      ? "bg-purple-700 text-white border-purple-800"
                      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-200"}
                  `}
                  onClick={() => setTimeRange(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="py-16 flex justify-center">
            <span className="px-8 py-3 bg-purple-100 text-purple-700 rounded-lg font-bold shadow text-lg">Loading...</span>
          </div>
        ) : authError ? (
          <div className="py-16 flex justify-center">
            <span className="px-8 py-3 bg-red-100 text-red-700 rounded-lg font-bold shadow text-lg">{authError}</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="p-4 text-left text-purple-900 font-bold rounded-l-lg text-lg">Item</th>
                    <th className="p-4 text-left text-purple-900 font-bold text-lg">Initial Stock</th>
                    <th className="p-4 text-left text-purple-900 font-bold text-lg">Sold ({TIME_RANGES.find(r => r.value === timeRange)?.label})</th>
                    <th className="p-4 text-left text-purple-900 font-bold rounded-r-lg text-lg">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-purple-300 font-bold text-lg">
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const sold = soldMap[item.id] || 0;
                      const available = (item.quantity || 0) - sold;
                      return (
                        <tr key={item.id} className="bg-white hover:bg-purple-50 transition border-b border-purple-50">
                          <td className="p-4 font-semibold text-purple-800 text-base">{item.name}</td>
                          <td className="p-4 text-purple-700 text-base">{item.quantity}</td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-base">{sold}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-base">{available}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-14">
              <h2 className="text-2xl font-bold text-purple-800 mb-4">Order Tracking <span className="font-normal text-purple-400">({orders.length} orders)</span></h2>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="p-3 text-purple-900 font-semibold rounded-l-lg">Order ID</th>
                      <th className="p-3 text-purple-900 font-semibold">Date</th>
                      <th className="p-3 text-purple-900 font-semibold">Items</th>
                      <th className="p-3 text-purple-900 font-semibold rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-8 text-purple-300 font-semibold">
                          No orders found for this range.
                        </td>
                      </tr>
                    ) : (
                      orders.map(order => (
                        <tr key={order.docId} className="bg-white hover:bg-purple-50 transition border-b border-purple-50">
                          <td className="p-3 font-mono">{order.docId?.slice(-6) || "—"}</td>
                          <td className="p-3">{toDate(order.createdAt)?.toLocaleString() || "—"}</td>
                          <td className="p-3">
                            <ul className="list-disc ml-4">
                              {(order.items || []).map((item, idx) => (
                                <li key={idx} className="text-purple-700">
                                  {item.name} <span className="text-purple-300">x</span> <span className="font-bold">{item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-3 font-bold text-green-700">₹{order.total?.toFixed(2) || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx global>{`
        body {
          background: linear-gradient(to bottom right, #faf5ff 0%, #a78bfa 100%);
        }
      `}</style>
    </div>
  );
}