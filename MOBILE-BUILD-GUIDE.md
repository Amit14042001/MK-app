# 📱 MK App — Mobile Native Build Guide
### Android (Play Store) + iOS (App Store) — Both Apps

---

## 🚀 Quick Setup (One Command)

```bash
chmod +x scripts/setup-native.sh
./scripts/setup-native.sh
```

This script automatically:
- Checks Node.js, Java, Xcode, CocoaPods
- Installs npm dependencies for both apps
- Generates Android debug keystores
- Installs iOS CocoaPods
- Creates `.env` files

---

## 📋 Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| Java (JDK) | 17 | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |
| Xcode | 15+ | Mac App Store |
| CocoaPods | Latest | `sudo gem install cocoapods` |
| react-native-cli | Latest | `npm install -g @react-native/cli` |

---

## 🔥 Firebase Setup (Required for Push Notifications)

### Step 1 — Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create project: **"MK App"**
3. Enable **Cloud Messaging** (FCM)

### Step 2 — Add Android Apps
Add two Android apps:
- **Package name:** `com.mkapp` (Customer App)
- **Package name:** `com.mkpro` (Professional App)

Download `google-services.json` for each:
```
mobile/android/app/google-services.json          ← com.mkapp
professional-app/android/app/google-services.json ← com.mkpro
```

### Step 3 — Add iOS Apps
Add two iOS apps:
- **Bundle ID:** `com.mkapp` (Customer App)
- **Bundle ID:** `com.mkpro` (Professional App)

Download `GoogleService-Info.plist` for each:
```
mobile/ios/MKApp/GoogleService-Info.plist          ← com.mkapp
professional-app/ios/MKPro/GoogleService-Info.plist ← com.mkpro
```

### Step 4 — Get VAPID Key (Web Push)
Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
Add to `frontend/.env` as `REACT_APP_FIREBASE_VAPID_KEY`

---

## 🗺️ Google Maps Setup (Required for Tracking)

1. Go to https://console.cloud.google.com
2. Create/select project, enable these APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
   - **Places API** (address autocomplete)
   - **Directions API** (route to customer)
3. Create API Key (restrict to your app package names)

### Add key to Android
```xml
<!-- mobile/android/app/src/main/AndroidManifest.xml -->
<!-- professional-app/android/app/src/main/AndroidManifest.xml -->
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ACTUAL_KEY_HERE" />
```

### Add key to iOS
```objc
// mobile/ios/MKApp/AppDelegate.mm
// professional-app/ios/MKPro/AppDelegate.mm
[GMSServices provideAPIKey:@"YOUR_ACTUAL_KEY_HERE"];
```
```xml
<!-- mobile/ios/MKApp/Info.plist -->
<!-- professional-app/ios/MKPro/Info.plist -->
<key>GMSApiKey</key>
<string>YOUR_ACTUAL_KEY_HERE</string>
```

---

## 🤖 Android Build

### Run on Emulator / Device
```bash
# Start Metro bundler first
cd mobile && npx react-native start

# In another terminal — Customer App
cd mobile && npx react-native run-android

# Professional App
cd professional-app && npx react-native run-android
```

### Build Debug APK (for testing)
```bash
# Customer App
cd mobile/android && ./gradlew assembleDebug
# Output: mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Professional App
cd professional-app/android && ./gradlew assembleDebug
```

### Build Release AAB (for Play Store)

**Step 1 — Generate release keystore (once only)**
```bash
# Customer App
keytool -genkey -v \
  -keystore mobile/android/app/release.keystore \
  -alias mkapp-release \
  -keyalg RSA -keysize 4096 -validity 25000

# Professional App
keytool -genkey -v \
  -keystore professional-app/android/app/release.keystore \
  -alias mkpro-release \
  -keyalg RSA -keysize 4096 -validity 25000
```

**Step 2 — Create keystore.properties**
```properties
# mobile/android/keystore.properties  (DO NOT COMMIT)
storeFile=app/release.keystore
storePassword=your_store_password
keyAlias=mkapp-release
keyPassword=your_key_password
```

**Step 3 — Build AAB**
```bash
# Customer App
cd mobile/android && ./gradlew bundleRelease
# Output: mobile/android/app/build/outputs/bundle/release/app-release.aab

# Professional App
cd professional-app/android && ./gradlew bundleRelease
```

**Step 4 — Upload to Play Console**
- Go to https://play.google.com/console
- Create app → Production → Upload AAB
- Fill store listing, screenshots, content rating

---

## 🍎 iOS Build

### Run on Simulator
```bash
# Install pods first (one-time)
cd mobile/ios && pod install && cd ../..

# Customer App
cd mobile && npx react-native run-ios
# Or specify device:
npx react-native run-ios --simulator="iPhone 15 Pro"

# Professional App
cd professional-app/ios && pod install && cd ../..
cd professional-app && npx react-native run-ios
```

### Run on Physical Device
```bash
# Customer App — open in Xcode
open mobile/ios/MKApp.xcworkspace
# Select your device → Run (▶)

# Professional App
open professional-app/ios/MKPro.xcworkspace
```

### Build for App Store

**Step 1 — Apple Developer Account**
- Enroll at https://developer.apple.com ($99/year)

**Step 2 — Certificates & Profiles (Xcode manages this)**
```
Xcode → Preferences → Accounts → Add Apple ID
Then: Project → Signing & Capabilities → Team → Select your team
Enable "Automatically manage signing"
```

**Step 3 — App Store Connect**
- Go to https://appstoreconnect.apple.com
- Create two new apps:
  - **MK** (Bundle ID: com.mkapp)
  - **MK Pro** (Bundle ID: com.mkpro)

**Step 4 — Archive & Upload**
```
# Customer App
open mobile/ios/MKApp.xcworkspace
# Xcode → Product → Archive
# Organizer → Distribute App → App Store Connect → Upload
# Wait ~30 min → Submit for Review

# Professional App
open professional-app/ios/MKPro.xcworkspace
# Same process
```

**Or via command line:**
```bash
# Build archive
xcodebuild \
  -workspace mobile/ios/MKApp.xcworkspace \
  -scheme MKApp \
  -configuration Release \
  -archivePath mobile/ios/build/MKApp.xcarchive \
  archive

# Export IPA
xcodebuild \
  -exportArchive \
  -archivePath mobile/ios/build/MKApp.xcarchive \
  -exportOptionsPlist mobile/ios/ExportOptions.plist \
  -exportPath mobile/ios/build/
```

---

## 📦 App Store / Play Store Checklist

### Before Submitting

- [ ] Replace all `YOUR_GOOGLE_MAPS_API_KEY` with real key
- [ ] Add `google-services.json` to both Android apps
- [ ] Add `GoogleService-Info.plist` to both iOS apps
- [ ] Change API_URL from `http://10.0.2.2:5000` to `https://api.mkapp.in`
- [ ] Test OTP login with real phone number
- [ ] Test Razorpay payment (use test keys first, then live)
- [ ] Test Google Maps tracking on real device
- [ ] Test Firebase push notifications
- [ ] Set `NODE_ENV=production` in backend

### App Metadata Needed
| Item | Customer App | Professional App |
|------|-------------|-----------------|
| App Name | MK | MK Pro |
| Bundle ID | com.mkapp | com.mkpro |
| Category | Lifestyle | Business |
| Age Rating | 4+ | 4+ |
| Screenshots | 5 per device size | 5 per device size |
| Privacy URL | https://mkapp.in/privacy | Same |
| Support URL | https://mkapp.in/help | Same |

---

## 🔧 Common Issues & Fixes

### Android
```bash
# Gradle build fails
cd mobile/android && ./gradlew clean && cd ../..
npx react-native run-android

# Metro bundler port conflict
npx react-native start --port 8082
npx react-native run-android --port 8082

# Cannot connect to backend (emulator)
# Use 10.0.2.2 (not localhost) in mobile/.env
API_URL=http://10.0.2.2:5000/api/v1

# App installed but shows blank screen
adb logcat | grep -E "(ReactNative|MKApp|Error)"
```

### iOS
```bash
# Pod install fails
cd mobile/ios && pod deintegrate && pod install

# Simulator won't launch
xcrun simctl erase all

# Build fails — "module not found"
cd mobile && npx react-native clean
cd ios && pod install

# Cannot connect to backend (simulator)
# Use localhost in mobile/.env for iOS simulator
API_URL=http://localhost:5000/api/v1
```

### Both
```bash
# Clear all caches (nuclear option)
cd mobile
npx react-native clean
rm -rf node_modules && npm install
cd ios && pod install && cd ..
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
```

---

## 📊 CI/CD — GitHub Actions

The `.github/workflows/build.yml` automatically:
- Builds debug APK on every PR
- Builds release AAB + IPA on every `v*` tag push

```bash
# Trigger release build
git tag v1.0.0
git push origin v1.0.0
```

Required GitHub Secrets (Settings → Secrets → Actions):
```
GOOGLE_SERVICES_JSON           # Customer Android Firebase config
GOOGLE_SERVICES_JSON_PRO       # Professional Android Firebase config
GOOGLE_SERVICE_INFO_PLIST      # Customer iOS Firebase config (base64)
GOOGLE_SERVICE_INFO_PLIST_PRO  # Professional iOS Firebase config (base64)
RELEASE_KEYSTORE_BASE64        # Release keystore (base64)
KEYSTORE_PASSWORD              # Keystore password
KEY_ALIAS                      # Key alias
KEY_PASSWORD                   # Key password
```

Encode files for secrets:
```bash
base64 -i mobile/android/app/release.keystore | pbcopy   # macOS
base64 mobile/android/app/release.keystore               # Linux
```

---

## 📱 Supported Devices

| Platform | Min Version | Coverage |
|----------|------------|---------|
| Android | 7.0 (API 24) | 97%+ of Android devices |
| iOS | 13.4 | 98%+ of iPhones |
