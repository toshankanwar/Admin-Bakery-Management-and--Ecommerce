'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import Image from 'next/image';
import Link from 'next/link';
import {
  PencilSquareIcon,
  TrashIcon,
  ExclamationCircleIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const CURRENT_TIMESTAMP = '2025-06-13 01:29:03';
const CURRENT_USER = 'Kala-bot-apk';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const productsQuery = query(
        collection(db, 'bakeryItems'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(productsQuery);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setProducts(productsData);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price || 0);
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <span className="ml-3 text-red-800">{error}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-4 text-sm text-red-600 hover:text-red-500 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">
              Products
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your bakery products and inventory
            </p>
            <div className="mt-1 flex items-center text-xs text-gray-500">
              <span>Last updated: {CURRENT_TIMESTAMP}</span>
              <span className="mx-2">•</span>
              <span>by {CURRENT_USER}</span>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className={`ml-2 p-1 rounded-full hover:bg-gray-200 ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh products"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Add Product
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-lg shadow-sm p-4 animate-pulse"
                >
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <div className="rounded-full bg-purple-100 p-3 mx-auto w-fit">
                <PlusIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No products</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new product
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/products/new"
                  className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                >
                  <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  Add Product
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div className="aspect-w-3 aspect-h-2">
                    <Image
                      src={product.imageUrl || '/placeholder-product.jpg'}
                      alt={product.name}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover"
                      priority={false}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatPrice(product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.inStock 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {product.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Link
                        href={`/dashboard/products/edit/${product.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <PencilSquareIcon className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                      <button
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;