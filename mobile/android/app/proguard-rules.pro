# ── React Native ──────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ── Google Maps ────────────────────────────────────────────────
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.google.maps.android.** { *; }

# ── Firebase ───────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ── Razorpay ───────────────────────────────────────────────────
-keep class com.razorpay.** { *; }
-keep interface com.razorpay.** { *; }
-dontwarn com.razorpay.**
-optimizations !method/inlining/*

# ── OkHttp / Retrofit (used by React Native fetch) ────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ── AsyncStorage ───────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ── Geolocation ────────────────────────────────────────────────
-keep class com.agontuk.RNFusedLocation.** { *; }

# ── Image Picker ───────────────────────────────────────────────
-keep class com.imagepicker.** { *; }

# ── Lottie ─────────────────────────────────────────────────────
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**

# ── Keep all Parcelable implementations ────────────────────────
-keep class * implements android.os.Parcelable { *; }
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ── Keep BuildConfig ───────────────────────────────────────────
-keep class com.mkapp.BuildConfig { *; }

# ── Suppress common warnings ───────────────────────────────────
-dontwarn java.lang.invoke.**
-dontwarn **$$Lambda$*
-dontwarn javax.**
