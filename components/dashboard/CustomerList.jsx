'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '@/utils/dateUtils';

const CustomerList = ({ customers, loading, selectedCustomerId, onSelectCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const filteredCustomers = customers
    .filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'orders':
          return b.orderCount - a.orderCount;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="recent">Most Recent</option>
          <option value="name">Name</option>
          <option value="orders">Most Orders</option>
        </select>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredCustomers.map((customer) => (
            <motion.li
              key={customer.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={() => onSelectCustomer(customer)}
                className={`w-full text-left px-6 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                  selectedCustomerId === customer.id ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {customer.photoURL ? (
                      <img
                        src={customer.photoURL}
                        alt={customer.name}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <UserCircleIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-purple-600">
                        {customer.name}
                      </p>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Joined {formatDate(customer.createdAt)}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.orderCount} orders
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            </motion.li>
          ))}
        </ul>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;