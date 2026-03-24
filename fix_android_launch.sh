#!/bin/bash
# Script to regenerate the android native folder quickly
set -e

echo "Starting Android fix..."

# Use Node 20
source ~/.nvm/nvm.sh
nvm use 20

# Create a temporary empty RN 0.73 project
cd /Users/amitmaharana/Downloads/mk-app
echo "Downloading React Native 0.73 template. This will take ~30 seconds..."
npx react-native@0.73.4 init SlotApp --version 0.73.4 

echo "Copying working Gradle template files to mobile/android..."
# Copy the working gradlew scripts and wrapper
cp -r SlotApp/android/gradle* mobile/android/
cp SlotApp/android/gradlew* mobile/android/
cp SlotApp/android/build.gradle mobile/android/
cp SlotApp/android/settings.gradle mobile/android/

# Clean up
rm -rf SlotApp

# Make gradle executable
chmod +x mobile/android/gradlew

echo "Fix applied! Launching the Android Native App..."
cd mobile
# Launch Android Emulator
npx react-native run-android
