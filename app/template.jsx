// app/template.jsx
import { Metadata } from 'next';

export const metadata = {
  metadataBase: new URL('https://bakery.toshankanwar.website'),
  title: {
    default: 'Bakery Admin Dashboard',
    template: '%s | Bakery Admin'
  },
  description: 'Secure admin dashboard for managing bakery orders, products, and customers',
  keywords: [
    'bakery',
    'admin',
    'dashboard',
    'orders',
    'products',
    'management',
    'inventory'
  ],
  authors: [{ name: 'Toshan Bakery' }],
  creator: 'Toshan Bakery',
  publisher: 'Toshan Bakery',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-touch-icon-precomposed.png',
    },
  },
  manifest: '/site.webmanifest',
  applicationName: 'Bakery Admin',
  appleWebApp: {
    capable: true,
    title: 'Bakery Admin',
    statusBarStyle: 'default',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
  category: 'business',
  verification: {
    google: 'your-google-site-verification',
    other: {
      me: ['your-domain@email.com'],
    },
  },
  other: {
    'last-modified': '2025-06-12 17:43:18',
    'cache-control': 'no-cache',
    'x-ua-compatible': 'IE=edge',
    'x-frame-options': 'DENY',
  },
};

export default function Template({ children }) {
  return (
    <>
      {children}
    </>
  );
}