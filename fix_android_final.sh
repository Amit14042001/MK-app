#!/bin/bash
set -e
source ~/.nvm/nvm.sh
nvm use 20

cd /Users/amitmaharana/Downloads/mk-app

# 1. Regenerate pristine 0.73 native folders without overwriting res and src!
npx react-native@0.73.4 init SlotApp --version 0.73.4 

cp -r SlotApp/android/gradle* mobile/android/
cp SlotApp/android/gradlew* mobile/android/
cp SlotApp/android/build.gradle mobile/android/
cp SlotApp/android/settings.gradle mobile/android/
# ALSO copy app/build.gradle to get the new PackageList autolinking configs
cp SlotApp/android/app/build.gradle mobile/android/app/build.gradle

rm -rf SlotApp

# 2. Add Google Services to the top level build.gradle
sed -i '' '/buildscript {/a\
    dependencies {\
        classpath("com.google.gms:google-services:4.4.1")\
        classpath("com.google.firebase:firebase-crashlytics-gradle:2.9.9")\
    }\
' mobile/android/build.gradle

# 3. Add push notification and Razorpay configs to the bottom of app/build.gradle
cat << 'APP_GRADLE' >> mobile/android/app/build.gradle

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.google.firebase:firebase-crashlytics'
    implementation 'com.google.android.gms:play-services-maps:18.2.0'
    implementation 'com.google.android.gms:play-services-location:21.1.0'
    implementation 'com.razorpay:checkout:1.6.33'
    implementation "androidx.core:core-splashscreen:1.0.1"
}
apply plugin: "com.google.gms.google-services"
apply plugin: "com.google.firebase.crashlytics"
APP_GRADLE

cd mobile
# Launch
npx react-native run-android
