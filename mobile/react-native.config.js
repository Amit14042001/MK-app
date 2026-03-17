/**
 * MK App — React Native CLI Config
 * Tells the RN CLI which native modules need linking
 * Run: npx react-native link (or auto-linked on build)
 */
module.exports = {
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
  assets: ['./src/assets/fonts'],
  dependencies: {
    // Google Maps
    'react-native-maps': {
      platforms: {
        android: {
          packageImportPath: 'import com.google.android.gms.maps.MapsInitializer;',
        },
      },
    },
    // Razorpay payment SDK
    'react-native-razorpay': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // Vision camera
    'react-native-vision-camera': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // In-app review
    'react-native-in-app-review': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // HTML to PDF
    'react-native-html-to-pdf': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // Google Sign-In
    '@react-native-google-signin/google-signin': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // Apple Auth
    '@invertase/react-native-apple-authentication': {
      platforms: {
        ios: null,
      },
    },
    // Voice (if added later)
    '@react-native-voice/voice': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // View shot
    'react-native-view-shot': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
