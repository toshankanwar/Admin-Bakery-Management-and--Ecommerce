'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { logoutAdmin } from "@/firebase/firebase"; // Changed from logoutUser to logoutAdmin

const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "Products", href: "/dashboard/products", icon: ShoppingBagIcon },
  { name: "Orders", href: "/dashboard/orders", icon: ClipboardDocumentListIcon },
  { name: "Stock Tracker", href: "/dashboard/stock-tracker", icon: ClipboardDocumentListIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const result = await logoutAdmin(); // Changed from logoutUser to logoutAdmin
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', {
          error: result.error,
          timestamp: '2025-06-12 17:04:52',
          user: 'Kala-bot-apk'
        });
      }
    } catch (error) {
      console.error('Logout error:', {
        error: error.message,
        timestamp: '2025-06-12 17:04:52',
        user: 'Kala-bot-apk'
      });
    }
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

      {/* Mobile menu */}
      <div className="flex md:hidden">
        <button
          type="button"
          className="inline-flex items-center p-2 mt-4 ml-4 text-gray-400 hover:text-gray-500"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open menu</span>
          {isMobileMenuOpen ? (
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
          ) : (
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
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden"
        >
          <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75" />
          <div className="fixed inset-0 z-50 flex">
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4">
              <div className="flex items-center justify-between px-4">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={150}
                  height={40}
                  className="h-8 w-auto"
                />
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
              <div className="mt-5 h-0 flex-1 overflow-y-auto">
                <nav className="space-y-1 px-2">
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
              </div>
              <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                <button
                  onClick={handleLogout}
                  className="group block w-full flex items-center px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                >
                  <ArrowLeftOnRectangleIcon className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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