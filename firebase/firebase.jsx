'use client';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDhSz3qCD1XL6tqb1httM0p4lnEQ9aEbyk",
    authDomain: "bakery-toshankanwar-website.firebaseapp.com",
    projectId: "bakery-toshankanwar-website",
    storageBucket: "bakery-toshankanwar-website.firebasestorage.app",
    messagingSenderId: "492744979011",
    appId: "1:492744979011:web:daaea7b4b746f5ce84daf6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Current timestamp and user
const CURRENT_TIMESTAMP = '2025-06-12 18:59:58';
const CURRENT_USER = 'Kala-bot-apk';

// Utility function to validate image URL
const isValidImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return contentType.startsWith('image/');
  } catch {
    return false;
  }
};

// Auth functions
const loginAdmin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      await signOut(auth);
      throw new Error('Unauthorized access');
    }

    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

const logoutAdmin = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

// Bakery items functions
const addProduct = async (productData) => {
  try {
    // Validate required fields
    if (!productData.name?.trim()) {
      throw new Error('Product name is required');
    }

    // Validate image URL
    if (productData.imageUrl) {
      const isValid = await isValidImageUrl(productData.imageUrl);
      if (!isValid) {
        throw new Error('Invalid image URL provided');
      }
    }

    const bakeryItemData = {
      name: productData.name.trim(),
      imageUrl: productData.imageUrl || '',
      description: productData.description || '',
      category: productData.category || 'other',
      price: parseFloat(productData.price) || 0,
      quantity: parseInt(productData.quantity) || 0,
      inStock: (parseInt(productData.quantity) || 0) > 0,
      isNew: Boolean(productData.isNew),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'bakeryItems'), bakeryItemData);

    console.log('Bakery item added:', {
      id: docRef.id,
      name: bakeryItemData.name,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });

    return { 
      success: true, 
      id: docRef.id,
      data: bakeryItemData
    };

  } catch (error) {
    console.error('Add bakery item error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

const updateProduct = async (productId, productData) => {
  try {
    // Validate required fields
    if (!productData.name?.trim()) {
      throw new Error('Product name is required');
    }

    // Validate image URL
    if (productData.imageUrl) {
      const isValid = await isValidImageUrl(productData.imageUrl);
      if (!isValid) {
        throw new Error('Invalid image URL provided');
      }
    }

    const updateData = {
      name: productData.name.trim(),
      imageUrl: productData.imageUrl || '',
      description: productData.description || '',
      category: productData.category || 'other',
      price: parseFloat(productData.price) || 0,
      quantity: parseInt(productData.quantity) || 0,
      inStock: (parseInt(productData.quantity) || 0) > 0,
      isNew: Boolean(productData.isNew),
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, 'bakeryItems', productId), updateData);

    console.log('Bakery item updated:', {
      id: productId,
      name: updateData.name,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });

    return { 
      success: true,
      data: updateData
    };
  } catch (error) {
    console.error('Update bakery item error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'bakeryItems', productId));
    
    console.log('Bakery item deleted:', {
      id: productId,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });

    return { success: true };
  } catch (error) {
    console.error('Delete bakery item error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

const getProducts = async () => {
  try {
    console.log('Fetching bakery items...');
    const querySnapshot = await getDocs(collection(db, 'bakeryItems'));
    console.log('Documents fetched:', querySnapshot.docs.length);

    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        imageUrl: data.imageUrl || '',
        description: data.description || '',
        category: data.category || 'other',
        price: parseFloat(data.price || 0),
        quantity: parseInt(data.quantity || 0),
        inStock: Boolean(data.inStock),
        isNew: Boolean(data.isNew),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString()),
      };
    });

    console.log('Processed products:', products.length);
    return { success: true, data: products };
  } catch (error) {
    console.error('Get bakery items error:', error);
    return { success: false, error: error.message || String(error) };
  }
};
// Orders functions
const getOrders = async () => {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      total: parseFloat(doc.data().total || 0),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || new Date().toISOString()
    }));

    return { success: true, data: orders };
  } catch (error) {
    console.error('Get orders error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

const updateOrderStatus = async (orderId, status) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp()
    });

    console.log('Order status updated:', {
      id: orderId,
      status,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });

    return { success: true };
  } catch (error) {
    console.error('Update order status error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { success: false, error: error.message };
  }
};

// Dashboard stats
const getDashboardStats = async () => {
  try {
    const [ordersSnapshot, productsSnapshot, customersSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'orders'), where('status', '!=', 'cancelled'))),
      getDocs(collection(db, 'bakeryItems')),
      getDocs(query(collection(db, 'users'), where('role', '==', 'user')))
    ]);

    const stats = {
      revenue: {
        total: parseFloat(ordersSnapshot.docs.reduce((sum, doc) => 
          sum + (parseFloat(doc.data().total) || 0), 0).toFixed(2)),
        formatted: `$${ordersSnapshot.docs.reduce((sum, doc) => 
          sum + (parseFloat(doc.data().total) || 0), 0).toFixed(2)}`
      },
      orders: {
        total: ordersSnapshot.size,
        completed: ordersSnapshot.docs.filter(doc => doc.data().status === 'completed').length,
        pending: ordersSnapshot.docs.filter(doc => doc.data().status === 'pending').length
      },
      products: {
        total: productsSnapshot.size,
        inStock: productsSnapshot.docs.filter(doc => doc.data().inStock).length,
        outOfStock: productsSnapshot.docs.filter(doc => !doc.data().inStock).length
      },
      customers: {
        total: customersSnapshot.size
      },
      lastUpdated: CURRENT_TIMESTAMP
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Get dashboard stats error:', {
      error: error.message,
      timestamp: CURRENT_TIMESTAMP,
      user: CURRENT_USER
    });
    return { 
      success: false, 
      error: 'Failed to fetch dashboard statistics',
      details: error.message 
    };
  }
};

// Export functions
export {
  auth,
  db,
  loginAdmin,
  logoutAdmin,
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getOrders,
  updateOrderStatus,
  getDashboardStats
};