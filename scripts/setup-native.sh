#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MK App — Complete Native Setup Script
# Sets up Android + iOS for both Customer App and Professional App
# Usage: ./scripts/setup-native.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()   { echo -e "${BLUE}[MK]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}${CYAN}══ $1 ══${NC}"; }

# ── Check prerequisites ────────────────────────────────────────
check_prereqs() {
    step "Checking Prerequisites"

    command -v node    >/dev/null 2>&1 && ok "Node.js $(node -v)" || error "Node.js not found. Install from https://nodejs.org"
    command -v npm     >/dev/null 2>&1 && ok "npm $(npm -v)"      || error "npm not found"
    command -v java    >/dev/null 2>&1 && ok "Java $(java -version 2>&1 | head -1)" || warn "Java not found — Android builds will fail"
    command -v adb     >/dev/null 2>&1 && ok "ADB found (Android ready)" || warn "ADB not found — install Android Studio"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        command -v xcodebuild >/dev/null 2>&1 && ok "Xcode $(xcodebuild -version | head -1)" || warn "Xcode not found — iOS builds will fail"
        command -v pod >/dev/null 2>&1 && ok "CocoaPods $(pod --version)" || {
            warn "CocoaPods not found. Installing..."
            sudo gem install cocoapods
        }
        command -v brew >/dev/null 2>&1 && ok "Homebrew found" || warn "Homebrew not found"
    else
        warn "Not on macOS — iOS builds skipped"
    fi
}

# ── Install JS dependencies ────────────────────────────────────
install_deps() {
    step "Installing JS Dependencies"

    log "Installing Customer App dependencies..."
    cd mobile && npm install --legacy-peer-deps
    ok "Customer App deps installed ($(ls node_modules | wc -l | tr -d ' ') packages)"
    cd ..

    log "Installing Professional App dependencies..."
    cd professional-app && npm install --legacy-peer-deps
    ok "Professional App deps installed"
    cd ..
}

# ── Generate Android debug keystores ──────────────────────────
generate_keystores() {
    step "Generating Android Debug Keystores"

    # Customer App
    if [ ! -f "mobile/android/app/debug.keystore" ]; then
        log "Generating customer app debug keystore..."
        keytool -genkey -v \
            -keystore mobile/android/app/debug.keystore \
            -storepass android \
            -alias androiddebugkey \
            -keypass android \
            -keyalg RSA \
            -keysize 2048 \
            -validity 10000 \
            -dname "CN=MK App Debug, OU=MK, O=MK Technologies, L=Hyderabad, ST=Telangana, C=IN" \
            2>/dev/null
        ok "Customer app debug.keystore created"
    else
        ok "Customer app debug.keystore already exists"
    fi

    # Professional App
    if [ ! -f "professional-app/android/app/debug.keystore" ]; then
        log "Generating professional app debug keystore..."
        keytool -genkey -v \
            -keystore professional-app/android/app/debug.keystore \
            -storepass android \
            -alias androiddebugkey \
            -keypass android \
            -keyalg RSA \
            -keysize 2048 \
            -validity 10000 \
            -dname "CN=MK Pro Debug, OU=MKPro, O=MK Technologies, L=Hyderabad, ST=Telangana, C=IN" \
            2>/dev/null
        ok "Professional app debug.keystore created"
    else
        ok "Professional app debug.keystore already exists"
    fi
}

# ── Generate release keystore (run once before Play Store upload)
generate_release_keystore() {
    step "Generating Release Keystores"
    warn "Keep these files SECURE — never commit to git!"

    if [ ! -f "mobile/android/app/release.keystore" ]; then
        log "Generating customer app RELEASE keystore..."
        keytool -genkey -v \
            -keystore mobile/android/app/release.keystore \
            -alias mkapp-release \
            -keyalg RSA \
            -keysize 4096 \
            -validity 25000 \
            -dname "CN=MK App, OU=MK, O=MK Technologies Pvt Ltd, L=Hyderabad, ST=Telangana, C=IN"
        ok "Customer app release.keystore created"
        echo ""
        warn "Add to mobile/android/keystore.properties:"
        echo "  storeFile=app/release.keystore"
        echo "  storePassword=<your_password>"
        echo "  keyAlias=mkapp-release"
        echo "  keyPassword=<your_key_password>"
    fi

    if [ ! -f "professional-app/android/app/release.keystore" ]; then
        log "Generating professional app RELEASE keystore..."
        keytool -genkey -v \
            -keystore professional-app/android/app/release.keystore \
            -alias mkpro-release \
            -keyalg RSA \
            -keysize 4096 \
            -validity 25000 \
            -dname "CN=MK Pro, OU=MKPro, O=MK Technologies Pvt Ltd, L=Hyderabad, ST=Telangana, C=IN"
        ok "Professional app release.keystore created"
    fi
}

# ── iOS CocoaPods install ──────────────────────────────────────
install_pods() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        warn "Skipping iOS pod install (not on macOS)"
        return
    fi

    step "Installing iOS CocoaPods"

    log "Installing Customer App pods..."
    cd mobile/ios
    pod install --repo-update
    ok "Customer App pods installed"
    cd ../..

    log "Installing Professional App pods..."
    cd professional-app/ios
    pod install --repo-update
    ok "Professional App pods installed"
    cd ../..
}

# ── Copy .env files ────────────────────────────────────────────
setup_env() {
    step "Setting Up Environment Files"

    [ ! -f mobile/.env ] && cp mobile/.env.example mobile/.env && \
        ok "Created mobile/.env" || ok "mobile/.env already exists"

    [ ! -f professional-app/.env ] && cp professional-app/.env.example professional-app/.env && \
        ok "Created professional-app/.env" || ok "professional-app/.env already exists"

    warn "Edit mobile/.env and professional-app/.env with your API URL and Google Maps key"
}

# ── Print next steps ───────────────────────────────────────────
print_next_steps() {
    echo ""
    echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${GREEN}  ✅ Setup Complete!${NC}"
    echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}Manual steps still required:${NC}"
    echo ""
    echo -e "${YELLOW}1. Google Maps API Key${NC}"
    echo "   • Go to: https://console.cloud.google.com"
    echo "   • Enable: Maps SDK for Android, Maps SDK for iOS, Places API"
    echo "   • Add key to:"
    echo "     - mobile/android/app/src/main/AndroidManifest.xml"
    echo "     - mobile/ios/MKApp/Info.plist  (GMSApiKey)"
    echo "     - mobile/ios/MKApp/AppDelegate.mm"
    echo "     - Same 3 files in professional-app/"
    echo ""
    echo -e "${YELLOW}2. Firebase Setup${NC}"
    echo "   • Go to: https://console.firebase.google.com"
    echo "   • Add Android app: com.mkapp → download google-services.json"
    echo "     → place at: mobile/android/app/google-services.json"
    echo "   • Add iOS app: com.mkapp → download GoogleService-Info.plist"
    echo "     → place at: mobile/ios/MKApp/GoogleService-Info.plist"
    echo "   • Repeat for Professional App (com.mkpro)"
    echo "     → professional-app/android/app/google-services.json"
    echo "     → professional-app/ios/MKPro/GoogleService-Info.plist"
    echo ""
    echo -e "${YELLOW}3. Run the apps${NC}"
    echo "   # Make sure backend is running first:"
    echo "   cd backend && npm run dev"
    echo ""
    echo "   # Customer App:"
    echo "   cd mobile && npx react-native run-android"
    echo "   cd mobile && npx react-native run-ios"
    echo ""
    echo "   # Professional App:"
    echo "   cd professional-app && npx react-native run-android"
    echo "   cd professional-app && npx react-native run-ios"
    echo ""
    echo -e "${YELLOW}4. For Play Store release build:${NC}"
    echo "   cd mobile/android && ./gradlew bundleRelease"
    echo "   # AAB at: mobile/android/app/build/outputs/bundle/release/"
    echo ""
    echo -e "${YELLOW}5. For App Store release build:${NC}"
    echo "   # Open mobile/ios/MKApp.xcworkspace in Xcode"
    echo "   # Product → Archive → Distribute App"
    echo ""
}

# ── Main ───────────────────────────────────────────────────────
main() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║     MK App — Native Setup Script     ║${NC}"
    echo -e "${BOLD}${BLUE}║   Android + iOS · Customer + Pro     ║${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════╝${NC}"
    echo ""

    # Navigate to project root (scripts/ is one level down)
    cd "$(dirname "$0")/.."

    check_prereqs
    install_deps
    setup_env
    generate_keystores

    # Ask about release keystore
    read -p "Generate release keystores for Play Store? (y/N) " gen_release
    if [[ "$gen_release" =~ ^[Yy]$ ]]; then
        generate_release_keystore
    fi

    install_pods
    print_next_steps
}

main "$@"
