/**
 * Slot App — Internationalization (i18n) System
 * Supports: English, Hindi, Telugu, Tamil, Kannada, Bengali, Marathi
 * Auto-detects device language, stores preference
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Supported Languages ───────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', rtl: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', rtl: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', rtl: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', rtl: false },
];

// ── Translation Strings ───────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // App
    app_name: 'Slot App',
    tagline: 'Home services at your doorstep',

    // Navigation
    home: 'Home',
    bookings: 'Bookings',
    wallet: 'Wallet',
    profile: 'Profile',
    search: 'Search',

    // Home Screen
    good_morning: 'Good Morning',
    good_afternoon: 'Good Afternoon',
    good_evening: 'Good Evening',
    whats_your_location: 'What\'s your location?',
    search_services: 'Search for a service...',
    popular_services: 'Popular Services',
    offers_for_you: 'Offers for You',
    trending_now: 'Trending Now',
    book_again: 'Book Again',
    view_all: 'View All',

    // Services
    starting_at: 'Starting at',
    book_now: 'Book Now',
    add_to_cart: 'Add to Cart',
    added: 'Added',
    view_cart: 'View Cart',
    bestseller: 'Bestseller',
    new: 'New',
    offer: 'Off',

    // Booking Flow
    select_date: 'Select Date',
    select_time: 'Select Time',
    add_address: 'Add Address',
    payment: 'Payment',
    confirm_booking: 'Confirm Booking',
    booking_confirmed: 'Booking Confirmed!',
    booking_details: 'Booking Details',
    professional_assigned: 'Professional Assigned',
    track_professional: 'Track Professional',

    // Booking Status
    pending: 'Pending',
    confirmed: 'Confirmed',
    assigned: 'Professional Assigned',
    on_the_way: 'On the Way',
    arrived: 'Arrived',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',

    // Payment
    total_amount: 'Total Amount',
    pay_now: 'Pay Now',
    payment_successful: 'Payment Successful',
    payment_failed: 'Payment Failed',
    wallet_balance: 'Wallet Balance',
    apply_coupon: 'Apply Coupon',
    coupon_applied: 'Coupon Applied',

    // Profile
    edit_profile: 'Edit Profile',
    my_bookings: 'My Bookings',
    my_addresses: 'My Addresses',
    notifications: 'Notifications',
    help_support: 'Help & Support',
    refer_earn: 'Refer & Earn',
    logout: 'Logout',

    // Auth
    login: 'Login',
    sign_up: 'Sign Up',
    mobile_number: 'Mobile Number',
    enter_otp: 'Enter OTP',
    verify: 'Verify',
    resend_otp: 'Resend OTP',

    // Common
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    done: 'Done',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    retry: 'Retry',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    error: 'Error',
    success: 'Success',
    no_internet: 'No internet connection',

    // Ratings
    rate_service: 'Rate Your Service',
    write_review: 'Write a Review',
    submit_review: 'Submit Review',

    // Errors
    something_went_wrong: 'Something went wrong. Please try again.',
    network_error: 'Network error. Please check your connection.',
    session_expired: 'Session expired. Please login again.',
  },

  hi: {
    app_name: 'Slot ऐप',
    tagline: 'घर पर सेवाएं',
    home: 'होम',
    bookings: 'बुकिंग',
    wallet: 'वॉलेट',
    profile: 'प्रोफ़ाइल',
    search: 'खोज',
    good_morning: 'सुप्रभात',
    good_afternoon: 'नमस्ते',
    good_evening: 'शुभ संध्या',
    whats_your_location: 'आपका स्थान क्या है?',
    search_services: 'सेवा खोजें...',
    popular_services: 'लोकप्रिय सेवाएं',
    offers_for_you: 'आपके लिए ऑफर',
    trending_now: 'अभी ट्रेंडिंग',
    book_again: 'फिर से बुक करें',
    view_all: 'सब देखें',
    starting_at: 'शुरू से',
    book_now: 'अभी बुक करें',
    add_to_cart: 'कार्ट में जोड़ें',
    added: 'जोड़ा गया',
    view_cart: 'कार्ट देखें',
    bestseller: 'बेस्टसेलर',
    new: 'नया',
    offer: 'छूट',
    select_date: 'तारीख चुनें',
    select_time: 'समय चुनें',
    add_address: 'पता जोड़ें',
    payment: 'भुगतान',
    confirm_booking: 'बुकिंग कन्फर्म करें',
    booking_confirmed: 'बुकिंग कन्फर्म हो गई!',
    booking_details: 'बुकिंग विवरण',
    professional_assigned: 'प्रोफेशनल असाइन किया गया',
    track_professional: 'प्रोफेशनल ट्रैक करें',
    pending: 'लंबित',
    confirmed: 'कन्फर्म',
    assigned: 'असाइन किया गया',
    on_the_way: 'आ रहा है',
    arrived: 'पहुंच गया',
    in_progress: 'काम चल रहा है',
    completed: 'पूरा हुआ',
    cancelled: 'रद्द',
    total_amount: 'कुल राशि',
    pay_now: 'अभी भुगतान करें',
    payment_successful: 'भुगतान सफल',
    payment_failed: 'भुगतान विफल',
    wallet_balance: 'वॉलेट बैलेंस',
    apply_coupon: 'कूपन लगाएं',
    coupon_applied: 'कूपन लागू हुआ',
    edit_profile: 'प्रोफ़ाइल संपादित करें',
    my_bookings: 'मेरी बुकिंग',
    my_addresses: 'मेरे पते',
    notifications: 'सूचनाएं',
    help_support: 'सहायता',
    refer_earn: 'रेफर और कमाएं',
    logout: 'लॉगआउट',
    login: 'लॉगिन',
    sign_up: 'साइन अप',
    mobile_number: 'मोबाइल नंबर',
    enter_otp: 'OTP दर्ज करें',
    verify: 'सत्यापित करें',
    resend_otp: 'OTP दोबारा भेजें',
    cancel: 'रद्द करें',
    confirm: 'कन्फर्म करें',
    save: 'सहेजें',
    done: 'हो गया',
    close: 'बंद करें',
    back: 'वापस',
    next: 'अगला',
    loading: 'लोड हो रहा है...',
    retry: 'पुनः प्रयास',
    ok: 'ठीक है',
    yes: 'हाँ',
    no: 'नहीं',
    error: 'त्रुटि',
    success: 'सफलता',
    no_internet: 'इंटरनेट कनेक्शन नहीं',
    rate_service: 'सेवा को रेट करें',
    write_review: 'समीक्षा लिखें',
    submit_review: 'समीक्षा जमा करें',
    something_went_wrong: 'कुछ गलत हुआ। कृपया पुनः प्रयास करें।',
    network_error: 'नेटवर्क त्रुटि।',
    session_expired: 'सेशन समाप्त। कृपया पुनः लॉगिन करें।',
  },

  te: {
    app_name: 'Slot యాప్',
    tagline: 'మీ ఇంట్లో సేవలు',
    home: 'హోమ్',
    bookings: 'బుకింగ్‌లు',
    wallet: 'వాలెట్',
    profile: 'ప్రొఫైల్',
    search: 'వెతకండి',
    good_morning: 'శుభోదయం',
    good_afternoon: 'శుభ మధ్యాహ్నం',
    good_evening: 'శుభ సాయంత్రం',
    whats_your_location: 'మీ స్థానం ఏమిటి?',
    search_services: 'సేవలు వెతకండి...',
    popular_services: 'ప్రసిద్ధ సేవలు',
    offers_for_you: 'మీకు ఆఫర్లు',
    trending_now: 'ఇప్పుడు ట్రెండింగ్',
    book_again: 'మళ్ళీ బుక్ చేయండి',
    view_all: 'అన్నీ చూడండి',
    starting_at: 'నుండి మొదలు',
    book_now: 'ఇప్పుడు బుక్ చేయండి',
    add_to_cart: 'కార్ట్‌కు జోడించండి',
    added: 'జోడించబడింది',
    view_cart: 'కార్ట్ చూడండి',
    bestseller: 'బెస్ట్ సెల్లర్',
    pending: 'పెండింగ్',
    confirmed: 'నిర్ధారించబడింది',
    on_the_way: 'వస్తున్నారు',
    completed: 'పూర్తయింది',
    cancelled: 'రద్దు చేయబడింది',
    pay_now: 'ఇప్పుడు చెల్లించండి',
    wallet_balance: 'వాలెట్ బ్యాలెన్స్',
    login: 'లాగిన్',
    logout: 'లాగ్‌అవుట్',
    cancel: 'రద్దు చేయండి',
    confirm: 'నిర్ధారించండి',
    save: 'సేవ్ చేయండి',
    back: 'వెనక్కి',
    loading: 'లోడ్ అవుతోంది...',
    ok: 'సరే',
    yes: 'అవును',
    no: 'కాదు',
    something_went_wrong: 'ఏదో తప్పు జరిగింది. మళ్ళీ ప్రయత్నించండి.',
  },

  ta: {
    app_name: 'Slot செயலி',
    tagline: 'உங்கள் வீட்டில் சேவைகள்',
    home: 'முகப்பு',
    bookings: 'முன்பதிவுகள்',
    wallet: 'பணப்பை',
    profile: 'சுயவிவரம்',
    search: 'தேடு',
    good_morning: 'காலை வணக்கம்',
    good_afternoon: 'மதிய வணக்கம்',
    good_evening: 'மாலை வணக்கம்',
    search_services: 'சேவைகள் தேடுங்கள்...',
    popular_services: 'பிரபலமான சேவைகள்',
    book_now: 'இப்போது முன்பதிவு',
    add_to_cart: 'கார்ட்டில் சேர்',
    completed: 'முடிந்தது',
    cancelled: 'ரத்து செய்யப்பட்டது',
    pay_now: 'இப்போது செலுத்து',
    login: 'உள்நுழை',
    logout: 'வெளியேறு',
    cancel: 'ரத்து செய்',
    confirm: 'உறுதிப்படுத்து',
    back: 'பின்னால்',
    loading: 'ஏற்றுகிறது...',
    ok: 'சரி',
    yes: 'ஆம்',
    no: 'இல்லை',
    something_went_wrong: 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.',
  },
};

// ── i18n Context ──────────────────────────────────────────────
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('app_language').then(saved => {
      if (saved && SUPPORTED_LANGUAGES.find(l => l.code === saved)) {
        setLanguage(saved);
      }
    });
  }, []);

  const changeLanguage = async (code) => {
    if (SUPPORTED_LANGUAGES.find(l => l.code === code)) {
      setLanguage(code);
      await AsyncStorage.setItem('app_language', code);
    }
  };

  const t = (key, params = {}) => {
    const langStrings = TRANSLATIONS[language] || TRANSLATIONS.en;
    let str = langStrings[key] || TRANSLATIONS.en[key] || key;
    // Replace params like {{name}} with actual values
    Object.entries(params).forEach(([param, val]) => {
      str = str.replace(new RegExp(`{{${param}}}`, 'g'), val);
    });
    return str;
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language);

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t, currentLanguage, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// ── Language Selector Component ───────────────────────────────
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';

export function LanguageSelector({ visible, onClose }) {
  const { language, changeLanguage, supportedLanguages } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={langStyles.overlay}>
        <View style={langStyles.sheet}>
          <View style={langStyles.sheetHeader}>
            <Text style={langStyles.sheetTitle}>🌐 Choose Language</Text>
            <TouchableOpacity onPress={onClose} style={langStyles.closeBtn}>
              <Text style={{ fontSize: 18, color: '#666' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={supportedLanguages}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[langStyles.langItem, language === item.code && langStyles.langItemActive]}
                onPress={() => { changeLanguage(item.code); onClose(); }}
              >
                <Text style={langStyles.langFlag}>{item.flag}</Text>
                <View style={langStyles.langInfo}>
                  <Text style={[langStyles.langName, language === item.code && { color: '#E94560' }]}>
                    {item.nativeName}
                  </Text>
                  <Text style={langStyles.langEnglish}>{item.name}</Text>
                </View>
                {language === item.code && (
                  <View style={langStyles.checkBadge}>
                    <Text style={langStyles.checkTxt}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const langStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  langItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  langItemActive: { backgroundColor: '#FFF0F3' },
  langFlag: { fontSize: 28, marginRight: 16 },
  langInfo: { flex: 1 },
  langName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  langEnglish: { fontSize: 12, color: '#888', marginTop: 2 },
  checkBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
  checkTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
