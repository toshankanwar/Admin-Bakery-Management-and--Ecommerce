'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  ChevronDownIcon,
  Squares2X2Icon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import ProductForm from '@/components/dashboard/ProductForm';
import ProductList from '@/components/dashboard/ProductList';
import { getProducts } from '@/firebase/firebase';
import Toast from '@/components/Toast';

const CURRENT_TIMESTAMP = '2025-06-12 19:57:36';
const CURRENT_USER = 'Kala-bot-apk';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState({
    message: '',
    type: ''
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const fetchProducts = async () => {
    try {
      setRefreshing(true);
      const result = await getProducts();
      if (result.success) {
        setProducts(result.data);
      } else {
        showNotification('Failed to fetch products', 'error');
      }
    } catch (error) {
      console.error('Error fetching products:', {
        error: error.message,
        timestamp: CURRENT_TIMESTAMP,
        user: CURRENT_USER
      });
      showNotification('Failed to fetch products', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    fetchProducts();
    showNotification(
      editingProduct ? 'Product updated successfully' : 'Product added successfully'
    );
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8 py-8"
    >
      <Toast
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <motion.div
        variants={containerVariants}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl shadow-sm p-6 border border-purple-100"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Squares2X2Icon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your product inventory
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchProducts}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingProduct(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Products List Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden"
        >
          <ProductList
            products={products}
            loading={loading}
            onEdit={handleEdit}
            onDeleteSuccess={() => {
              fetchProducts();
              showNotification('Product deleted successfully');
            }}
          />
        </motion.div>
      </motion.div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <ProductForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setEditingProduct(null);
            }}
            product={editingProduct}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}