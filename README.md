# 🏠 Slot App — Complete Urban Company Clone
### Full-Stack · 5 Apps · React Native iOS+Android · Docker · Redis · Firebase

## 📦 What's Inside
```
slot-app/
├── backend/           Node.js + Express + MongoDB + Redis + Firebase
├── frontend/          React 18 web (pixel-perfect UC UI)
├── mobile/            React Native customer app (iOS + Android)
├── professional-app/  React Native pro app (iOS + Android)
├── docker-compose.yml Full production stack (5 containers)
├── nginx/nginx.conf   SSL + rate-limiting + Socket.IO proxy
└── scripts/deploy.sh  One-command deployment
```

## 🚀 Quick Start
```bash
# Backend
cd backend && cp .env.example .env && npm install && npm run seed && npm run dev

# Web Frontend
cd frontend && npm install && npm start

# Docker (everything)
cp .env.example .env && ./scripts/deploy.sh prod
```

## 🧪 Test Credentials (after seed)
| Role | Phone | OTP |
|------|-------|-----|
| Admin | 9000000000 | 1234 |
| Customer | 9876543210 | 1234 |
| Professional | 9123456789 | 1234 |

Coupons: **SLOTWELCOME** (20% off) · **SLOT100** (₹100 flat) · **AUTOCARE** (15% off auto)

## 📱 Mobile Setup
```bash
# Customer App
cd mobile && npm install
cd ios && pod install && cd .. && npx react-native run-ios
# OR
npx react-native run-android

# Professional App
cd professional-app && npm install && npx react-native run-android
```

## 🔥 Firebase Setup
1. Firebase Console → Project → Cloud Messaging
2. Backend: add service account vars to .env (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
3. Web: add REACT_APP_FIREBASE_* vars to frontend/.env
4. Mobile: drop google-services.json (Android) and GoogleService-Info.plist (iOS) into each app

## 💳 Razorpay Setup
```
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
# Test card: 4111 1111 1111 1111 | UPI: success@razorpay
```

## 🐳 Docker Commands
```bash
./scripts/deploy.sh prod      # Start production
./scripts/deploy.sh dev       # With Mongo Express + Redis Commander
./scripts/deploy.sh stop      # Stop all
./scripts/deploy.sh logs      # Stream all logs
./scripts/deploy.sh backup    # MongoDB backup
./scripts/deploy.sh seed      # Seed database
```

## 🌟 Full Feature List
- OTP Phone Login (Twilio), JWT refresh tokens
- 20+ services: AC, Cleaning, Salon, Electrician + 🚗 Automotive (Battery, Jump Start, Oil Change)
- Razorpay payments (UPI/Cards/Wallets) + Cash on delivery
- Real-time tracking via Socket.IO + Google Maps
- Firebase push notifications (FCM) — web, iOS, Android
- Redis caching: services (10min), categories (1hr), OTP, rate limiting
- Google Places address autocomplete
- Coupon engine with discount rules
- Admin dashboard with analytics
- Docker: Mongo 7 + Redis 7 + Node backend + React frontend + Nginx
- Nginx: SSL/TLS, gzip, rate limiting, security headers, WebSocket upgrade
- Professional app: online toggle, GPS sharing, job management, earnings

## 🏗️ Tech Stack
Node.js · Express · MongoDB · Redis · React 18 · React Native 0.73
Socket.IO · Razorpay · Firebase FCM · Twilio · Google Maps/Places
Docker · Nginx · Let's Encrypt · JWT · Mongoose

Built with ❤️ — Slot Technologies © 2026
# slot-app
