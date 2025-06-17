'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  CogIcon,
  GlobeAsiaAustraliaIcon,
  CurrencyRupeeIcon,
  TruckIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SettingSection = ({ title, children, icon: Icon }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-purple-600" />
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, disabled = false }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
        focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 
        disabled:cursor-not-allowed sm:text-sm"
    />
  </div>
);

const ToggleSwitch = ({ label, enabled, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`${
        enabled ? 'bg-purple-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 
        border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
        focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
    >
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow 
          ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  </div>
);

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const [settings, setSettings] = useState({
    // Store Information
    storeName: '',
    storeEmail: '',
    storePhone: '',
    storeAddress: '',
    
    // Regional Settings
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24',
    
    // Order Settings
    minimumOrderAmount: 0,
    maximumOrderAmount: 10000,
    orderCancellationTime: 30, // minutes
    
    // Delivery Settings
    deliveryRadius: 10, // km
    deliveryCharges: 40,
    freeDeliveryThreshold: 500,
    
    // Notification Settings
    enableOrderNotifications: true,
    enableLowStockAlerts: true,
    enableCustomerReviewNotifications: true,
    
    // System Settings
    maintenanceMode: false,
    debugMode: false,
    enableBackups: true
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        
        if (settingsDoc.exists()) {
          setSettings(prev => ({
            ...prev,
            ...settingsDoc.data()
          }));
        }
      } catch (error) {
        console.error('Error fetching settings:', {
          error: error.message,
          timestamp: '2025-06-17 17:27:10',
          user: 'Kala-bot-apk'
        });
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'settings', 'general'), settings);
      showNotification('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', {
        error: error.message,
        timestamp: '2025-06-17 17:27:10',
        user: 'Kala-bot-apk'
      });
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CogIcon className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">General Settings (Page is just prototype it is not functional)</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent 
              rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 
              hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
              focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : 'Save Changes'}
          </motion.button>
        </div>

        {/* Notification */}
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-md ${
              notification.type === 'error' ? 'bg-red-50' : 'bg-green-50'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'error' ? (
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              )}
              <span className={`ml-3 text-sm font-medium ${
                notification.type === 'error' ? 'text-red-800' : 'text-green-800'
              }`}>
                {notification.message}
              </span>
            </div>
          </motion.div>
        )}

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store Information */}
          <SettingSection title="Store Information" icon={GlobeAsiaAustraliaIcon}>
            <div className="space-y-4">
              <InputField
                label="Store Name"
                value={settings.storeName}
                onChange={e => setSettings(prev => ({ ...prev, storeName: e.target.value }))}
                placeholder="Enter store name"
              />
              <InputField
                label="Store Email"
                type="email"
                value={settings.storeEmail}
                onChange={e => setSettings(prev => ({ ...prev, storeEmail: e.target.value }))}
                placeholder="Enter store email"
              />
              <InputField
                label="Store Phone"
                value={settings.storePhone}
                onChange={e => setSettings(prev => ({ ...prev, storePhone: e.target.value }))}
                placeholder="Enter store phone"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Store Address
                </label>
                <textarea
                  value={settings.storeAddress}
                  onChange={e => setSettings(prev => ({ ...prev, storeAddress: e.target.value }))}
                  placeholder="Enter store address"
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md 
                    shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
            </div>
          </SettingSection>

          {/* Order Settings */}
          <SettingSection title="Order Settings" icon={CurrencyRupeeIcon}>
            <div className="space-y-4">
              <InputField
                label="Minimum Order Amount (₹)"
                type="number"
                value={settings.minimumOrderAmount}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  minimumOrderAmount: Number(e.target.value) 
                }))}
              />
              <InputField
                label="Maximum Order Amount (₹)"
                type="number"
                value={settings.maximumOrderAmount}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  maximumOrderAmount: Number(e.target.value) 
                }))}
              />
              <InputField
                label="Order Cancellation Time (minutes)"
                type="number"
                value={settings.orderCancellationTime}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  orderCancellationTime: Number(e.target.value) 
                }))}
              />
            </div>
          </SettingSection>

          {/* Delivery Settings */}
          <SettingSection title="Delivery Settings" icon={TruckIcon}>
            <div className="space-y-4">
              <InputField
                label="Delivery Radius (km)"
                type="number"
                value={settings.deliveryRadius}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  deliveryRadius: Number(e.target.value) 
                }))}
              />
              <InputField
                label="Delivery Charges (₹)"
                type="number"
                value={settings.deliveryCharges}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  deliveryCharges: Number(e.target.value) 
                }))}
              />
              <InputField
                label="Free Delivery Threshold (₹)"
                type="number"
                value={settings.freeDeliveryThreshold}
                onChange={e => setSettings(prev => ({ 
                  ...prev, 
                  freeDeliveryThreshold: Number(e.target.value) 
                }))}
              />
            </div>
          </SettingSection>

          {/* Notification Settings */}
          <SettingSection title="Notification Settings" icon={BellIcon}>
            <div className="space-y-4">
              <ToggleSwitch
                label="Order Notifications"
                enabled={settings.enableOrderNotifications}
                onChange={value => setSettings(prev => ({ 
                  ...prev, 
                  enableOrderNotifications: value 
                }))}
              />
              <ToggleSwitch
                label="Low Stock Alerts"
                enabled={settings.enableLowStockAlerts}
                onChange={value => setSettings(prev => ({ 
                  ...prev, 
                  enableLowStockAlerts: value 
                }))}
              />
              <ToggleSwitch
                label="Customer Review Notifications"
                enabled={settings.enableCustomerReviewNotifications}
                onChange={value => setSettings(prev => ({ 
                  ...prev, 
                  enableCustomerReviewNotifications: value 
                }))}
              />
            </div>
          </SettingSection>

          {/* Contact Information */}
          <SettingSection title="Contact Information" icon={EnvelopeIcon}>
            <div className="space-y-4">
              <InputField
                label="Support Email"
                type="email"
                value={settings.storeEmail}
                onChange={e => setSettings(prev => ({ ...prev, storeEmail: e.target.value }))}
                placeholder="Enter support email"
              />
              <InputField
                label="Support Phone"
                value={settings.storePhone}
                onChange={e => setSettings(prev => ({ ...prev, storePhone: e.target.value }))}
                placeholder="Enter support phone"
              />
            </div>
          </SettingSection>

          {/* System Settings */}
          <SettingSection title="System Settings" icon={DevicePhoneMobileIcon}>
            <div className="space-y-4">
              <ToggleSwitch
                label="Maintenance Mode"
                enabled={settings.maintenanceMode}
                onChange={value => setSettings(prev => ({ 
                  ...prev, 
                  maintenanceMode: value 
                }))}
              />
              <ToggleSwitch
                label="Debug Mode"
                enabled={settings.debugMode}
                onChange={value => setSettings(prev => ({ 
                  ...prev, 
                  debugMode: value 
                }))}
              />
              <ToggleSwitch
                label="Enable Automatic Backups"
                enabled={settings.enableBackups}
                onChange={value => setSettings(prev => ({ 
                  ...prev, 
                  enableBackups: value 
                }))}
              />
            </div>
          </SettingSection>
        </div>
      </div>
    </div>
  );
}