'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  PencilIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  TagIcon,
  ArchiveBoxIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ChevronDownIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const CURRENT_TIMESTAMP = '2025-06-13 01:34:28';
const CURRENT_USER = 'Kala-bot-apk';

const categories = [
  { id: 'all', name: 'All Categories', icon: FunnelIcon },
  { id: 'cakes', name: 'Cakes', count: 0 },
  { id: 'pastries', name: 'Pastries', count: 0 },
  { id: 'breads', name: 'Breads', count: 0 },
  { id: 'cookies', name: 'Cookies', count: 0 },
  { id: 'beverages', name: 'Beverages', count: 0 }
];

const dropdownVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / 1000 / 60);
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return `${time} - ${dateStr}`;
};

const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 }
};

const ProductList = ({ products, loading, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredId, setHoveredId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [categoryStats, setCategoryStats] = useState({});
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const stats = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});
    setCategoryStats(stats);
  }, [products]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      (selectedCategory === 'all' || product.category === selectedCategory) &&
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchClear = () => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-purple-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-purple-600 font-medium">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 bg-white p-6 rounded-xl shadow-sm border border-purple-100"
      >
        <div className="relative flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 w-full h-12 rounded-xl border-2 border-purple-100 shadow-sm focus:border-purple-500 focus:ring-purple-500 transition-all duration-200 text-gray-600 placeholder-gray-400"
            />
            {searchTerm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </motion.button>
            )}
          </div>
          {searchTerm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-3 -bottom-6 text-sm text-purple-600 font-medium"
            >
              Found {filteredProducts.length} result(s)
            </motion.div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full sm:w-64 h-12 px-4 bg-white border-2 border-purple-100 rounded-xl flex items-center justify-between text-gray-700 hover:border-purple-500 transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-purple-500"
          >
            <div className="flex items-center">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-purple-500 mr-2" />
              <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
            </div>
            <ChevronDownIcon className={`h-5 w-5 text-purple-500 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-100 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 transition-colors ${
                        selectedCategory === category.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        {category.icon ? (
                          <category.icon className="h-5 w-5 text-purple-500 mr-2" />
                        ) : (
                          <TagIcon className="h-5 w-5 text-purple-500 mr-2" />
                        )}
                        <span>{category.name}</span>
                      </div>
                      <span className="text-sm text-purple-500 font-medium">
                        {category.id === 'all' 
                          ? products.length 
                          : categoryStats[category.id] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-purple-100">
        <AnimatePresence>
          {filteredProducts.length > 0 ? (
            <ul className="divide-y divide-purple-100">
              {filteredProducts.map((product) => (
                <motion.li
                  key={product.id}
                  layout
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onHoverStart={() => setHoveredId(product.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  className="relative group"
                >
                  <div className="px-6 py-6 flex items-center group-hover:bg-purple-50/30 transition-colors duration-200">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center">
                        <motion.div
                          className="relative flex-shrink-0 h-24 w-24 group"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Image
                            src={product.imageUrl || '/placeholder-product.png'}
                            alt={product.name}
                            fill
                            className="object-cover rounded-lg shadow-md transition-transform group-hover:shadow-lg"
                          />
                        </motion.div>
                        <div className="ml-6">
                          <motion.h3
                            layout
                            className="text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors"
                          >
                            {product.name}
                          </motion.h3>
                          <div className="mt-2 flex flex-wrap gap-4">
                            <div className="flex items-center text-gray-600">
                              <TagIcon className="h-4 w-4 text-purple-500 mr-1" />
                              <span className="text-sm">{product.category}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <CurrencyDollarIcon className="h-4 w-4 text-purple-500 mr-1" />
                              <span className="text-sm font-medium">
                              ₹{Number(product.price).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <ArchiveBoxIcon className="h-4 w-4 text-purple-500 mr-1" />
                              <span className="text-sm">
                                Qty: {product.quantity}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-600 group relative">
                              <ClockIcon className="h-4 w-4 text-purple-500 mr-1" />
                              <motion.span 
                                className="text-sm whitespace-nowrap"
                                whileHover={{ scale: 1.02 }}
                              >
                                {formatDateTime(product.updatedAt)}
                              </motion.span>
                              
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileHover={{ opacity: 1, y: 0 }}
                                className="absolute bottom-full left-0 mb-2 hidden group-hover:block"
                              >
                                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                  {new Date(product.updatedAt).toLocaleString('en-GB', {
                                    hour12: false,
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </div>
                              </motion.div>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                product.inStock
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {product.inStock ? `In Stock (${product.quantity})` : 'Out of Stock'}
                            </span>
                            {product.isNew && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: hoveredId === product.id ? 1 : 0.6 }}
                      className="ml-6 flex-shrink-0"
                    >
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onEdit(product)}
                        className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-full transition-colors"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <ShoppingBagIcon className="mx-auto h-12 w-12 text-purple-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProductList;