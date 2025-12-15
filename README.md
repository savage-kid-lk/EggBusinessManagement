# Egg Stock Control System
A modern, mobile-first inventory and sales management application designed specifically for egg distribution businesses. This application allows for real-time tracking of stock, dynamic pricing logic (including bulk discounts), and secure staff access control via Google and Phone authentication.

## Key Features

Stock & Sales Management

Real-Time Inventory: Instantly updates stock levels across all devices as sales are made.

## Smart Pricing Engine:

Standard Price: Default per-tray pricing (e.g., R60).

Bulk Discounts: Automatically applies reduced pricing (e.g., R55) when 20+ trays are sold.

Special Offers: Schedule promotional prices with automatic start and end dates.

Profit Tracking: Automatically calculates net profit based on cost price vs. selling price.

## Advanced Security (Whitelist Access)

Unlike standard apps, this system uses a "Closed Access" model to prevent unauthorized usage and unnecessary SMS costs:

Pre-Flight Phone Check: Checks the database before sending an SMS OTP to ensure only whitelisted numbers can trigger a verification code (saving Firebase costs).

Google Auth Gatekeeper: Automatically signs out unauthorized Google accounts if they are not listed in the staff database.

Admin Dashboard: Dedicated interface for the owner to add/remove staff access instantly.

## Progressive Web App (PWA)

Installable: Works like a native app on Android and iOS (Add to Home Screen).

Mobile Optimized: Touch-friendly buttons, responsive layouts, and "Redirect" login flows to prevent popup blocking on mobile browsers.

## Tech Stack

Frontend: React.js

Backend: Firebase (Firestore, Authentication, Hosting)

Styling: Custom CSS3 (Responsive & Mobile-First)

## Key Libraries:

react-firebase-hooks

date-fns (Date management)

sweetalert2 (Professional UI alerts)

# Installation & Setup

## 1. Clone the Repository

git clone https://github.com/your-username/egg-stock-control.git

cd egg-stock-control

## 2. Install Dependencies

npm install

## 3. Environment Configuration

Create a .env.local file in the root directory and add your Firebase credentials:

Code snippet:

REACT_APP_FIREBASE_API_KEY=your_api_key

REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com

REACT_APP_FIREBASE_PROJECT_ID=your_project_id

REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com

REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

REACT_APP_FIREBASE_APP_ID=your_app_id

REACT_APP_ADMIN_EMAIL=youremail@gmail.com(update the emal in Login.js on line 42 to your superadmin email)

## 4. Run Locally

npm start

Note: Access via http://127.0.0.1:3000 to prevent Firebase Auth domain errors.

# Database Permissions (Firestore Rules)

To make the cost-saving security features work, apply these rules in your Firebase Console:

JavaScript:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow public to check if THEIR number exists (Read-only single doc)
    // This enables the "Pre-flight" check before sending SMS
    match /allowed_numbers/{phoneNumber} {
      allow get: if true;
      allow list: if false;
    }

    // Secure all other data to logged-in users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

# Mobile Installation Guide

## Android (Chrome):

Open the app link in Chrome.

Tap the menu (⋮) -> "Install App" or tap the prompt at the bottom.

## iOS (Safari):

Open the app link in Safari.

Tap the Share button (box with arrow).

Scroll down and select "Add to Home Screen".

# Author

## Letago Kekana Web Developer & Computer Science graduate
