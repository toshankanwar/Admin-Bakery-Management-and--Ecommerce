# Admin Dashboard

An enhanced React-based Admin Dashboard for efficient order management, built with Next.js, Firebase, and Tailwind CSS. This dashboard allows admins to view, filter, and update orders with a clean UI and powerful features.

## Table of Contents

- [Overview](#overview)  
- [Features](#features)  
- [Technology Stack](#technology-stack)  
- [Functionalities](#functionalities)  
- [Getting Started](#getting-started)  
- [Usage](#usage)  
- [Folder Structure](#folder-structure)  
- [Contributing](#contributing)  
- [Contact](#contact)  
- [License](#license)  

## Overview

This project provides a centralized interface for admins to manage customer orders, track order statuses, update payment information, and generate professional invoices in PDF format. It includes secure authentication and a responsive design.

https://admin.bakery.toshankanwar.website/readmeimg/overview.png
https://admin.bakery.toshankanwar.website/readmeimg/product.png
https://admin.bakery.toshankanwar.website/readmeimg/orders.png
https://admin.bakery.toshankanwar.website/readmeimg/db.png


## Features

- **Admin Authentication** with Firebase and role-based access control.  
- **Order Listing** with search, filter, sort, and pagination.  
- **Order Status Management** through an interactive status flow and confirmation dialog.  
- **Automatic Payment Status Update** when an order is marked as delivered.  
- **Invoice Generation** and download as PDF files.  
- **Responsive and Accessible UI** with Tailwind CSS and Framer Motion animations.  
- **Real-time Data Fetching** from Firebase Firestore.  

## Technology Stack

| Technology              | Purpose                              |
| ----------------------- | ---------------------------------- |
| Next.js                 | React framework with SSR and routing |
| React                   | UI library                         |
| Tailwind CSS            | Utility-first CSS for styling      |
| Framer Motion           | Animation and transitions          |
| Firebase Firestore      | NoSQL database                     |
| Firebase Authentication | User auth                         |
| jsPDF                   | PDF generation                     |
| Heroicons               | SVG icons                         |
| React Hot Toast         | Notifications                     |

## Functionalities

### 1. Authentication

- Secure login for admin users.  
- Role validation via Firestore to restrict dashboard access to admins only.  
- Auto redirect if already authenticated.

### 2. Order Management

- Displays orders with details: customer info, items, status, payment, and dates.  
- Filters: Status, search by ID, customer name, or email.  
- Sorting: By date or total amount.  
- Pagination support.

### 3. Order Status Control

- Interactive status progression with constraints on allowed transitions.  
- Confirmation dialogs to prevent accidental status changes.  
- Auto update of payment status to "confirmed" when order marked "delivered".

### 4. Invoice Management

- Generate and download professional PDF invoices.  
- Invoices include all order details and shipping info.

### 5. User Interface

- Responsive design with Tailwind CSS.  
- Smooth animations and transitions with Framer Motion.  
- Notification feedback (success, error) with React Hot Toast.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)  
- Firebase project with Firestore and Authentication enabled  
- Environment variables configured (see below)

### Installation

```git clone https://github.com/toshankanwar/Admin-Bakery-Management-and--Ecommerce.git```
```cd admin-dashboard```
```npm install```

### Environment Variables

Create a `.env.local` file at your project root:

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

### Run Locally


Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

- Access `/login` for admin login.  
- Manage orders in the dashboard.  
- Filter and search orders.  
- Update order statuses and generate invoices.

## Folder Structure
/app
/login
page.jsx # Login page
/dashboard
page.jsx # Dashboard page
/components
OrderList.jsx # Orders list component
OrderDetailsDialog.jsx # Order detail modal
StatusChangeDialog.jsx # Status update confirmation modal
/firebase
firebase.js # Firebase config and initialization
/styles
globals.css # Global CSS including Tailwind setup


## Contributing

Contributions are welcome!  
Please fork the repository, create a feature branch, and submit pull requests.

## Contact

For questions or support, please reach out:

- **Email:** contact@toshankanwar.website
- **GitHub:** [https://github.com/toshankanwar](https://github.com/toshankanwar)  
- **Website:** [https://toshankanwar.website/](https://toshankanwar.website/)  

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Feel free to open issues or discussions for assistance or feature requests.*

