'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CustomerList from '@/components/dashboard/CustomerList';
import CustomerDetails from '@/components/dashboard/CustomerDetails';
import { getCustomers } from '@/firebase/firebase';
import Toast from '@/components/Toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notification, setNotification] = useState({
    message: '',
    type: ''
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const fetchCustomers = async () => {
    try {
      const fetchedCustomers = await getCustomers();
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', {
        error: error.message,
        timestamp: '2025-06-12 16:08:39',
        user: 'Kala-bot-apk'
      });
      showNotification('Failed to fetch customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <Toast
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:flex-1">
          <CustomerList
            customers={customers}
            loading={loading}
            selectedCustomerId={selectedCustomer?.id}
            onSelectCustomer={setSelectedCustomer}
          />
        </div>
        
        {selectedCustomer && (
          <div className="lg:w-96">
            <CustomerDetails
              customer={selectedCustomer}
              onClose={() => setSelectedCustomer(null)}
              onUpdate={() => {
                fetchCustomers();
                showNotification('Customer information updated');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}