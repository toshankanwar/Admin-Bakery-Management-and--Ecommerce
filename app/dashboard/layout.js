'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HomeIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CircleStackIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { logoutAdmin } from "@/firebase/firebase";

const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Deep Analysis", href: "/dashboard/deep-analysis", icon: ClipboardDocumentListIcon },
  { name: "Products", href: "/dashboard/products", icon: ShoppingBagIcon },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardDocumentListIcon },
  { name: "DataBase", href: "/dashboard/database", icon: CircleStackIcon },

  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const result = await logoutAdmin();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  // Sidebar animation variants for smooth slide-in
  const sidebarVariants = {
    closed: { x: '-100%', opacity: 0 },
    open: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 350, damping: 38 } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.25 } }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-2xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Toshan Bakery
                </span>
              </h1>
            </div>
            <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-purple-100 text-purple-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 flex-shrink-0 ${
                        isActive
                          ? 'text-purple-600'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="group block w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <ArrowLeftOnRectangleIcon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="flex md:hidden">
        <button
          type="button"
          className="inline-flex items-center p-2 mt-4 ml-4 text-gray-400 hover:text-gray-500"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span className="sr-only">Open menu</span>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </div>

      {/* Mobile animated sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Blurred BG overlay */}
            <motion.div
              key="mobile-sidebar-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm"
            />
            {/* Sidebar panel */}
            <motion.div
              key="mobile-sidebar-panel"
              initial="closed"
              animate="open"
              exit="exit"
              variants={sidebarVariants}
              className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-xs bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 pt-5 pb-2">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Toshan Bakery</h1>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <nav className="mt-5 flex-1 space-y-1 px-2">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive
                          ? 'bg-purple-100 text-purple-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={`mr-4 h-6 w-6 flex-shrink-0 ${
                          isActive
                            ? 'text-purple-600'
                            : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex flex-shrink-0 border-t border-gray-200 p-4 mt-auto">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="group block w-full flex items-center px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                >
                  <ArrowLeftOnRectangleIcon className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col md:pl-64">
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}