'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  XMarkIcon, 
  CheckIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  TagIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { addProduct, updateProduct } from '@/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Constants for styling
const inputClasses = "mt-2 block w-full rounded-lg border-gray-300 shadow-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:ring-offset-2 placeholder-gray-400";
const labelClasses = "block text-sm font-medium text-gray-700";
const fieldGroupClasses = "relative space-y-2 mb-6";

// Current timestamp and user
const CURRENT_TIMESTAMP = '2025-06-12 20:52:53';
const CURRENT_USER = 'Kala-bot-apk';

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp.replace(' ', 'T'));
  
  // Format: HH:MM:SS - DD/MM/YYYY
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return `${time} - ${dateStr}`;
};

const categories = [
  { id: 'cakes', name: 'Cakes' },
  { id: 'pastries', name: 'Pastries' },
  { id: 'breads', name: 'Breads' },
  { id: 'cookies', name: 'Cookies' },
  { id: 'beverages', name: 'Beverages' }
];

// Safe Image component with loading and error states
const SafeImage = ({ src, alt, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className} rounded-lg overflow-hidden`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-purple-50">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={error ? '/placeholder-image.jpg' : src}
        alt={alt}
        width={128}
        height={128}
        className={`object-cover transition-all duration-300 h-full w-full ${
          loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        unoptimized
      />
      {error && (
        <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center">
          <ExclamationCircleIcon className="h-8 w-8 text-red-400" />
        </div>
      )}
    </div>
  );
};

export default function ProductForm({ isOpen, onClose, product, onSuccess }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    quantity: 0,
    description: '',
    inStock: true,
    isNew: false,
    imageUrl: '',
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        quantity: product.quantity || 0,
        imageUrl: product.imageUrl || '',
      });
      setImageError(false);
    } else {
      resetForm();
    }
  }, [product]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      quantity: 0,
      description: '',
      inStock: true,
      isNew: false,
      imageUrl: '',
      createdAt: '',
      createdBy: '',
      updatedAt: '',
      updatedBy: ''
    });
    setError('');
    setImageError(false);
  };

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return blob.type.startsWith('image/');
    } catch {
      return false;
    }
  };

  const validateForm = async () => {
    setError('');
    setImageError(false);

    if (!user) {
      setError('You must be logged in to perform this action');
      return false;
    }

    if (!formData.name.trim()) {
      setError('Product name is required');
      return false;
    }

    if (!formData.category) {
      setError('Category is required');
      return false;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return false;
    }

    if (formData.quantity < 0) {
      setError('Quantity cannot be negative');
      return false;
    }

    if (!formData.imageUrl) {
      setError('Product image URL is required');
      return false;
    }

    const isValidImage = await validateImageUrl(formData.imageUrl);
    if (!isValidImage) {
      setError('Please provide a valid image URL');
      setImageError(true);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!(await validateForm())) return;

    setLoading(true);
    setError('');

    try {
      const dataToSubmit = {
        name: formData.name.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        description: formData.description.trim(),
        inStock: parseInt(formData.quantity) > 0,
        isNew: Boolean(formData.isNew),
        imageUrl: formData.imageUrl,
        updatedAt: CURRENT_TIMESTAMP,
        updatedBy: CURRENT_USER
      };

      if (!product) {
        dataToSubmit.createdAt = CURRENT_TIMESTAMP;
        dataToSubmit.createdBy = CURRENT_USER;
      }

      const result = product
        ? await updateProduct(product.id, dataToSubmit)
        : await addProduct(dataToSubmit);

      if (result.success) {
        console.log(`Product ${product ? 'updated' : 'added'} successfully:`, {
          name: dataToSubmit.name,
          timestamp: CURRENT_TIMESTAMP,
          user: CURRENT_USER
        });
        onSuccess();
        resetForm();
        onClose();
      } else {
        setError(result.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', {
        error: error.message,
        timestamp: CURRENT_TIMESTAMP,
        user: CURRENT_USER
      });
      setError('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle">
          &#8203;
        </span>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative inline-block transform overflow-hidden rounded-xl bg-white/95 backdrop-blur-sm px-6 pt-5 pb-6 text-left align-bottom shadow-2xl ring-1 ring-gray-900/5 transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-8 sm:align-middle"
        >
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 bg-white/50 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="w-full">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900">
                {product ? 'Edit Product' : 'Add New Product'}
              </h3>

              {product && (
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full">
                    <ClockIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                    {formatDateTime(product.updatedAt)}
                  </div>
                  <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full">
                    <UserCircleIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                    {product.updatedBy}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-red-50 p-4 border border-red-200"
                >
                  <div className="flex items-center">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="ml-3 text-sm text-red-700">{error}</p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Image URL Input */}
                  <div className={fieldGroupClasses}>
                    <label className={labelClasses}>
                      Product Image
                      <span className="text-purple-500 ml-1">*</span>
                    </label>
                    <div className="mt-2">
                      <div className="flex">
                        <div className="grow">
                          <input
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => {
                              setFormData({ ...formData, imageUrl: e.target.value });
                              setImageError(false);
                            }}
                            placeholder="Enter image URL"
                            className={`${inputClasses} ${
                              imageError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                    {formData.imageUrl ? (
                      <div className="mt-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <SafeImage
                            src={formData.imageUrl}
                            alt="Product preview"
                            className="h-48 w-full"
                          />
                          {imageError && (
                            <div className="mt-3 flex items-center text-sm text-red-600">
                              <ExclamationCircleIcon className="h-5 w-5 mr-1.5 flex-shrink-0" />
                              <span>Failed to load image. Please check the URL.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                          <PhotoIcon className="h-12 w-12 mb-2" />
                          <p className="text-sm">Enter a URL to preview the image</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Name */}
                  <div className={fieldGroupClasses}>
                    <label className={labelClasses}>
                      Product Name
                      <span className="text-purple-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter product name"
                      className={inputClasses}
                    />
                  </div>

                  {/* Description */}
                  <div className={fieldGroupClasses}>
                    <label className={labelClasses}>
                      Description
                    </label>
                    <textarea
                      rows="4"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Enter product description"
                      className={inputClasses}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Category */}
                  <div className={fieldGroupClasses}>
                    <label className={labelClasses}>
                      Category
                      <span className="text-purple-500 ml-1">*</span>
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className={`${inputClasses} ${!formData.category ? 'text-gray-400' : ''}`}
                    >
                      <option value="" className="text-gray-400">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price and Quantity Row */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Price */}
                    <div className={fieldGroupClasses}>
                      <label className={labelClasses}>
                        Price
                        <span className="text-purple-500 ml-1">*</span>
                      </label>
                      <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          placeholder="0.00"
                          className={`${inputClasses} pl-7`}
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className={fieldGroupClasses}>
                      <label className={labelClasses}>
                        Quantity
                        <span className="text-purple-500 ml-1">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 0;
                          setFormData({
                            ...formData,
                            quantity: newQuantity,
                            inStock: newQuantity > 0
                          });
                        }}
                        placeholder="0"
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-4">
                    <div className={`${formData.quantity > 0 ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border transition-colors`}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.quantity > 0}
                          disabled
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="ml-3">
                          <label className="font-medium text-sm text-gray-900">
                            In Stock
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Based on quantity ({formData.quantity} items)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, isNew: !formData.isNew })}
                      className={`${formData.isNew ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'} rounded-lg p-4 border cursor-pointer transition-colors`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isNew}
                          onChange={(e) =>
                            setFormData({ ...formData, isNew: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="ml-3">
                          <label className="font-medium text-sm text-gray-900 cursor-pointer">
                            Mark as New
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Product will be highlighted as new
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 sm:mt-0 inline-flex justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center rounded-lg border border-transparent bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      'Save Product'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}