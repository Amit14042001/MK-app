/**
 * MK Professional App — React Native CLI Config
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
    'react-native-maps': {
      platforms: {
        android: {
          packageImportPath: 'import com.google.android.gms.maps.MapsInitializer;',
        },
      },
    },
    'react-native-vision-camera': {
      platforms: { android: null, ios: null },
    },
    '@react-native-google-signin/google-signin': {
      platforms: { android: null, ios: null },
    },
    'react-native-html-to-pdf': {
      platforms: { android: null, ios: null },
    },
    '@react-native-async-storage/async-storage': {
      platforms: { android: null, ios: null },
    },
    'react-native-view-shot': {
      platforms: { android: null, ios: null },
    },
  },
};
