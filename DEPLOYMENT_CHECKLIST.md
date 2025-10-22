# Production Deployment Checklist

## 🚨 Critical Security Steps

### 1. Remove Development-Only Features
- [ ] Remove `/auth/promote-to-admin` endpoint from backend
- [ ] Remove `PromoteToAdmin.jsx` component
- [ ] Remove promote-to-admin route from App.js
- [ ] Set up proper admin users in Firebase

### 2. Environment Variables Setup

#### Frontend (.env.production)
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### Backend Environment Variables
```env
FIREBASE_CREDENTIALS={"type":"service_account",...}
CORS_ORIGINS=https://your-frontend-domain.com
PORT=8000
```

### 3. Firebase Configuration
- [ ] Create production Firebase project
- [ ] Set up Firestore security rules
- [ ] Configure authentication providers
- [ ] Set up service account for backend

### 4. Database Security Rules

#### Firestore Rules (firestore.rules)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Only super admins can manage events
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Players - read for all authenticated, write for admins
    match /players/{playerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'team_admin'];
    }
    
    // Teams - similar rules
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Auction state - read for all, write for admins
    match /auction_state/{stateId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Bids - read for all, write for team admins and super admins
    match /bids/{bidId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'team_admin'];
    }
  }
}
```

## 🚀 Deployment Options

### Option 1: Separate Deployment (Recommended)

#### Frontend: Vercel
1. Connect GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `build`
4. Add environment variables
5. Deploy

#### Backend: Railway/Render
1. Connect GitHub repository
2. Set start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Add environment variables
4. Deploy

### Option 2: Full-Stack Deployment

#### Railway (Both Frontend & Backend)
1. Create monorepo structure
2. Configure build settings for both
3. Set up proper routing
4. Deploy

## 🔒 Security Checklist

- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS properly configured
- [ ] Firebase security rules implemented
- [ ] Environment variables secured
- [ ] No sensitive data in code
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Authentication required for all protected routes

## 🧪 Testing Checklist

- [ ] Test all authentication flows
- [ ] Test auction functionality
- [ ] Test player management
- [ ] Test team management
- [ ] Test responsive design
- [ ] Test error handling
- [ ] Performance testing
- [ ] Cross-browser testing

## 📊 Monitoring Setup

- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics (Google Analytics)
- [ ] Set up uptime monitoring
- [ ] Set up performance monitoring
- [ ] Set up database monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions Example (.github/workflows/deploy.yml)
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Build
        run: cd frontend && npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        uses: railway-app/railway-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          working-directory: ./backend
```

## 📝 Post-Deployment Tasks

- [ ] Test all functionality in production
- [ ] Set up monitoring alerts
- [ ] Create admin users manually
- [ ] Import initial data (teams, players)
- [ ] Set up backup procedures
- [ ] Document API endpoints
- [ ] Create user documentation
- [ ] Set up support channels

## 🆘 Rollback Plan

- [ ] Keep previous deployment versions
- [ ] Database backup before major changes
- [ ] Quick rollback procedure documented
- [ ] Emergency contact information
- [ ] Incident response plan
