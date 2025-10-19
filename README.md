# Sports Auction Web Application

A comprehensive web-based auction platform designed for sports team player selection with Firebase Firestore integration.

## Features

### Super Admin Module
- **Event Management**: Create and manage multiple auction events
- **Team Management**: Add teams, set budgets, manage team profiles
- **Player Management**: Import players, set categories and base prices
- **Category Configuration**: Create custom categories with specific rules
- **Auction Control**: Start, pause, resume, and control live auctions
- **Sponsor Management**: Add and manage sponsor branding
- **Analytics**: View detailed reports and auction statistics

### Team Module
- **Dashboard**: View budget, squad overview, and live stats
- **Bidding Interface**: Place real-time bids on players
- **Player Browser**: View available players with filters
- **My Squad**: Manage acquired players and track spending

### Public Display
- **Live Auction Screen**: Real-time bidding updates for public viewing
- **Player Information**: Display current player details
- **Team Overview**: Show all teams with budgets and players

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) 
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)

## Setup Instructions

### 1. Firebase Configuration Required

**Backend (`/app/backend/firebase-admin.json`):**
- Go to Firebase Console → Project Settings → Service Accounts
- Generate and download private key
- Save as `firebase-admin.json`

**Frontend (`/app/frontend/.env`):**
```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### 2. Enable Firebase Auth Methods
- Email/Password authentication
- Google OAuth

### 3. Restart Services
```bash
sudo supervisorctl restart backend frontend
```

## Key Features Implemented
✅ Firebase Auth integration (Email + Google)
✅ Event management system
✅ Team management with budget tracking
✅ Real-time auction state management
✅ Modern glass-morphism UI design
✅ Role-based access control
✅ Responsive design

## Access
- Login Page: Available when deployed
- Super Admin Dashboard: `/admin`
- Team Dashboard: `/team`
