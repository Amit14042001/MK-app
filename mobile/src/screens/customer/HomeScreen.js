import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Image, TextInput, Animated, RefreshControl,
  StatusBar, Dimensions, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Common, Screen } from '../../utils/theme';
import { servicesAPI, categoriesAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const CITIES = ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune'];

const BANNERS = [
  { bg: ['#1A1A2E', '#0F3460'], title: '🚗 Automotive Services', sub: 'Battery, jump start & oil change', cta: 'Explore', cat: 'automotive' },
  { bg: ['#E94560', '#C0392B'], title: '💄 Salon at Home', sub: 'Rated 4.9★ by 2M+ women', cta: 'Book Now', cat: 'beauty' },
  { bg: ['#27AE60', '#1E8449'], title: '🧹 Deep Clean', sub: '₹999 for 1BHK', cta: 'Book Now', cat: 'cleaning' },
];

const TRUST_ITEMS = [
  { icon: '🛡️', label: 'Verified\nPros' },
  { icon: '💰', label: 'Fixed\nPrices' },
  { icon: '⭐', label: '4.8★\nRating' },
  { icon: '🔄', label: 'Free\nRedo' },
];

function ServiceCard({ service, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.serviceCard}>
        <Text style={styles.serviceIcon}>{service.icon}</Text>
        <Text style={styles.serviceName} numberOfLines={2}>{service.name}</Text>
        <View style={styles.serviceRating}>
          <Text style={styles.ratingStars}>★</Text>
          <Text style={styles.ratingValue}>{service.rating || 4.8}</Text>
        </View>
        <Text style={styles.servicePrice}>₹{service.startingPrice}+</Text>
        {service.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        {service.isPopular && (
          <View style={[styles.newBadge, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.newBadgeText, { color: Colors.success }]}>Popular</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function BannerSlider({ banners, onCatPress, onBannerPress }) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef();

  useEffect(() => {
    const t = setInterval(() => {
      const next = (idx + 1) % banners.length;
      setIdx(next);
      scrollRef.current?.scrollTo({ x: next * (Screen.W - 32), animated: true });
    }, 3500);
    return () => clearInterval(t);
  }, [idx]);

  return (
    <View style={styles.bannerContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setIdx(Math.round(e.nativeEvent.contentOffset.x / (Screen.W - 32)));
        }}
        decelerationRate="fast"
        snapToInterval={Screen.W - 32}
        contentContainerStyle={{ gap: 12 }}>
        {banners.map((b, i) => (
          <LinearGradient
            key={i}
            colors={b.bg}
            style={[styles.banner, { width: Screen.W - 32 }]}>
            <TouchableOpacity
              onPress={() => onBannerPress ? onBannerPress(b) : onCatPress(b.cat)}
              activeOpacity={0.92}
              style={{ flex: 1 }}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSub}>{b.sub}</Text>
                <View style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnText}>{b.cta} →</Text>
                </View>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {banners.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { width: i === idx ? 20 : 6, backgroundColor: i === idx ? Colors.primary : Colors.lightGray }]}
          />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { city, setCity, cartCount } = useCart();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['transparent', Colors.white],
    extrapolate: 'clamp',
  });
  const headerShadow = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 4],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadData();
  }, [city]);

  // Search debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await servicesAPI.search(searchQuery, city);
        setSearchResults(data.services?.slice(0, 6) || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [catRes, svcRes] = await Promise.all([
        categoriesAPI.getAll(),
        servicesAPI.getFeatured(city),
      ]);
      setCategories(catRes.data.categories || []);
      setServices(svcRes.data.services || []);
    } catch {}
    // Fetch active booking for home screen banner
    try {
      const { bookingsAPI } = require('../../utils/api');
      const { data } = await bookingsAPI.getAll({ status: 'in_progress,professional_arriving,professional_arrived,professional_assigned', limit: 1 });
      const active = (data.bookings || [])[0] || null;
      if (active && active.tracking) {
        // Attach ETA if available from tracking data
        active._eta = active.tracking.estimatedArrival || null;
      }
      setActiveBooking(active);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const filterByCategory = async (slug) => {
    setActiveCategory(slug);
    if (slug === 'all') {
      loadData();
      return;
    }
    try {
      const { data } = await servicesAPI.getByCategory(slug);
      setServices(data.services || []);
    } catch {}
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [city]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Sticky header */}
      <Animated.View style={[styles.header, { backgroundColor: headerBg, elevation: headerShadow }]}>
        {/* City + Notifications */}
        <View style={Common.rowBetween}>
          <TouchableOpacity onPress={() => setCityModalVisible(true)} style={styles.cityBtn}>
            <Text style={styles.cityIcon}>📍</Text>
            <Text style={styles.cityName}>{city}</Text>
            <Text style={styles.cityChevron}>▾</Text>
          </TouchableOpacity>

          <View style={Common.row}>
            {user && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={styles.iconBtn}>
                <Text style={styles.iconBtnIcon}>🔔</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={styles.iconBtn}>
              <Text style={styles.iconBtnIcon}>🛒</Text>
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search services in ${city}...`}
            placeholderTextColor={Colors.lightGray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Text style={{ fontSize: 18, color: Colors.midGray }}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.searchDropdown}>
            {searchResults.map((s) => (
              <TouchableOpacity
                key={s._id}
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  navigation.navigate('ServiceDetail', { serviceId: s.slug || s._id });
                }}
                style={styles.searchItem}>
                <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={Typography.bodyMed}>{s.name}</Text>
                  <Text style={Typography.small}>₹{s.startingPrice}+ · ★ {s.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.heroBg}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreet}>
              {user ? `Hey ${user.name?.split(' ')[0]} 👋` : 'Welcome to Slot 👋'}
            </Text>
            <Text style={styles.heroTitle}>What service{'\n'}do you need?</Text>
          </View>
        </LinearGradient>

        {/* Active Booking Banner — shown when a booking is in progress */}
        {activeBooking && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Tracking', { bookingId: activeBooking._id })}
            style={styles.activeBanner}
            activeOpacity={0.9}>
            <View style={styles.activeBannerLeft}>
              <View style={styles.activePulse} />
              <View>
                <Text style={styles.activeBannerTitle}>
                  {activeBooking.status === 'professional_assigned' ? '👷 Professional Assigned' :
                   activeBooking.status === 'professional_arriving' ? '🚗 Professional is on the way!' :
                   activeBooking.status === 'professional_arrived'  ? '🔔 Professional has arrived!' :
                   '🔧 Service in progress'}
                </Text>
                <Text style={styles.activeBannerSub}>
                  {activeBooking.service?.name}
                  {activeBooking._eta
                    ? ` · ~${Math.round(activeBooking._eta)} min away`
                    : ' · Tap to track'}
                </Text>
              </View>
            </View>
            <Text style={styles.activeBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        <View style={styles.mainContent}>
          {/* Trust strip */}
          <View style={styles.trustStrip}>
            {TRUST_ITEMS.map((t) => (
              <View key={t.label} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{t.icon}</Text>
                <Text style={styles.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>

          {/* Promo banners */}
          <BannerSlider
            banners={BANNERS}
            onCatPress={(cat) => {
              if (cat === 'automotive') {
                navigation.navigate('Automotive');
              } else {
                filterByCategory(cat);
                // Scroll to services section
              }
            }}
            onBannerPress={(banner) => {
              if (banner.serviceSlug) {
                navigation.navigate('ServiceDetail', { serviceId: banner.serviceSlug });
              } else if (banner.cat === 'automotive') {
                navigation.navigate('Automotive');
              } else {
                filterByCategory(banner.cat);
              }
            }}
          />

          {/* ── New Features: AR Try-On + Store ───────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                onPress={() => navigation.navigate('ARBeauty')}
                activeOpacity={0.9}
              >
                <View style={{ backgroundColor: '#1A1A2E', padding: 16, borderRadius: 16, gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>💄</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>AR Try-On</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Preview beauty looks live</Text>
                  <View style={{ backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 5, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>Try Now →</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                onPress={() => navigation.navigate('Store')}
                activeOpacity={0.9}
              >
                <View style={{ backgroundColor: '#E94560', padding: 16, borderRadius: 16, gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>🛍️</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Slot Store</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Cleaning, beauty & tools</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingVertical: 5, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>Shop Now →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* AI Chat + Pro Bidding row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                onPress={() => navigation.navigate('AIChat')}
                activeOpacity={0.9}
              >
                <View style={{ backgroundColor: '#0A0A2E', padding: 16, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' }}>
                  <Text style={{ fontSize: 28 }}>🤖</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>AI Assistant</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>"Book AC Sunday 10am"</Text>
                  <View style={{ backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: 8, paddingVertical: 5, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#C4B5FD', fontWeight: '700' }}>Chat Now →</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}
                onPress={() => navigation.navigate('ProBidding')}
                activeOpacity={0.9}
              >
                <View style={{ backgroundColor: '#0F3460', padding: 16, borderRadius: 16, gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>🏷️</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Pro Bidding</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Pros compete for you</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 5, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>Get Bids →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* AI Diagnosis + Photo Quote + Festival row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 13, gap: 4, borderWidth: 1, borderColor: 'rgba(233,69,96,0.3)' }}
                onPress={() => navigation.navigate('AIDiagnosis')}
                activeOpacity={0.9}>
                <Text style={{ fontSize: 22 }}>🔍</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Diagnose</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>AI finds your fix</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#0D2137', borderRadius: 14, padding: 13, gap: 4, borderWidth: 1, borderColor: 'rgba(33,150,243,0.3)' }}
                onPress={() => navigation.navigate('PhotoToQuote')}
                activeOpacity={0.9}>
                <Text style={{ fontSize: 22 }}>📸</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Photo Quote</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Snap → get price</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#1A0A00', borderRadius: 14, padding: 13, gap: 4, borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)' }}
                onPress={() => navigation.navigate('FestivalBooking')}
                activeOpacity={0.9}>
                <Text style={{ fontSize: 22 }}>🪔</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Festival</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Pre-book, save 20%</Text>
              </TouchableOpacity>
            </View>

            {/* Neighbourhood + Calendar + Video Consult row */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#0A2218', borderRadius: 14, padding: 13, gap: 4, borderWidth: 1, borderColor: 'rgba(29,158,117,0.3)' }}
                onPress={() => navigation.navigate('NeighbourhoodTrust')}
                activeOpacity={0.9}>
                <Text style={{ fontSize: 22 }}>🏘️</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Neighbours</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Trusted nearby pros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#12100E', borderRadius: 14, padding: 13, gap: 4, borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)' }}
                onPress={() => navigation.navigate('MaintenanceCalendar')}
                activeOpacity={0.9}>
                <Text style={{ fontSize: 22 }}>📅</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Calendar</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Service schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#0C0A1E', borderRadius: 14, padding: 13, gap: 4, borderWidth: 1, borderColor: 'rgba(156,39,176,0.3)' }}
                onPress={() => navigation.navigate('VideoConsult')}
                activeOpacity={0.9}>
                <Text style={{ fontSize: 22 }}>📹</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Video Call</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>₹99 diagnosis</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category pills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
              <TouchableOpacity
                onPress={() => filterByCategory('all')}
                style={[styles.catPill, activeCategory === 'all' && styles.catPillActive]}>
                <Text style={[styles.catPillText, activeCategory === 'all' && styles.catPillTextActive]}>
                  🌟 All
                </Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c._id}
                  onPress={() => filterByCategory(c.slug)}
                  style={[styles.catPill, activeCategory === c.slug && styles.catPillActive]}>
                  <Text style={[styles.catPillText, activeCategory === c.slug && styles.catPillTextActive]}>
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Services Grid */}
          <View style={styles.section}>
            <View style={Common.rowBetween}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'all' ? 'Popular Services' : categories.find(c => c.slug === activeCategory)?.name || 'Services'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Services')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : (
              <View style={styles.servicesGrid}>
                {services.map((s) => (
                  <ServiceCard
                    key={s._id}
                    service={s}
                    onPress={() => navigation.navigate('ServiceDetail', { serviceId: s.slug || s._id })}
                  />
                ))}
              </View>
            )}
          </View>

          {/* How it works */}
          <View style={[styles.section, styles.howItWorks]}>
            <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 24 }]}>How Slot Works</Text>
            {[
              { n: '01', icon: '📱', title: 'Choose Service', desc: 'Browse 200+ services & pick what you need' },
              { n: '02', icon: '📅', title: 'Schedule Slot', desc: 'Pick date & time that suits you best' },
              { n: '03', icon: '👷', title: 'Expert Arrives', desc: 'Verified pro at your door, on time' },
              { n: '04', icon: '⭐', title: 'Rate & Review', desc: 'Share feedback to help the community' },
            ].map((step) => (
              <View key={step.n} style={styles.howStep}>
                <View style={styles.howNum}>
                  <Text style={styles.howNumText}>{step.n}</Text>
                </View>
                <View style={styles.howIcon}>
                  <Text style={{ fontSize: 26 }}>{step.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.howTitle}>{step.title}</Text>
                  <Text style={styles.howDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      {/* City selector modal */}
      {cityModalVisible && (
        <View style={styles.cityModal}>
          <TouchableOpacity style={styles.cityModalOverlay} onPress={() => setCityModalVisible(false)} />
          <View style={styles.cityModalCard}>
            <Text style={styles.cityModalTitle}>Select Your City</Text>
            {CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => { setCity(c); setCityModalVisible(false); }}
                style={[styles.cityOption, city === c && styles.cityOptionActive]}>
                <Text style={styles.cityOptionIcon}>📍</Text>
                <Text style={[styles.cityOptionText, city === c && { color: Colors.primary }]}>{c}</Text>
                {city === c && <Text style={{ color: Colors.primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  // Active booking banner
  activeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, marginHorizontal: 16, marginTop: -8,
    borderRadius: 14, padding: 14, ...Shadows.sm, zIndex: 10,
  },
  activeBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activePulse: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
    opacity: 0.9, flexShrink: 0,
  },
  activeBannerTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  activeBannerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  activeBannerArrow: { fontSize: 20, color: '#fff', fontWeight: '700' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 56 : StatusBar.currentHeight + 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  cityBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityIcon: { fontSize: 16 },
  cityName: { fontSize: 15, fontWeight: '700', color: Colors.black, marginHorizontal: 4 },
  cityChevron: { fontSize: 12, color: Colors.midGray },
  iconBtn: { marginLeft: 8, position: 'relative', padding: 8 },
  iconBtnIcon: { fontSize: 22 },
  cartBadge: {
    position: 'absolute', top: 2, right: 2, width: 18, height: 18,
    borderRadius: 9, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 10, ...Shadows.md,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.black },
  searchDropdown: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    marginTop: 4, ...Shadows.lg, overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
  },

  heroBg: {
    paddingTop: Platform.OS === 'ios' ? 120 : 110,
    paddingBottom: 48, paddingHorizontal: 16,
  },
  heroContent: {},
  heroGreet: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 4 },
  heroTitle: { color: Colors.white, fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },

  mainContent: { backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 8 },

  trustStrip: {
    flexDirection: 'row', backgroundColor: Colors.white,
    margin: 16, borderRadius: Radius.xl, padding: 16,
    justifyContent: 'space-around', ...Shadows.card,
  },
  trustItem: { alignItems: 'center' },
  trustIcon: { fontSize: 24, marginBottom: 4 },
  trustLabel: { fontSize: 11, fontWeight: '600', color: Colors.midGray, textAlign: 'center' },

  bannerContainer: { marginHorizontal: 16, marginBottom: 8 },
  banner: { borderRadius: Radius.xl, padding: 20, minHeight: 120 },
  bannerContent: {},
  bannerTitle: { color: Colors.white, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 12 },
  bannerBtn: { backgroundColor: Colors.white, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 7, alignSelf: 'flex-start' },
  bannerBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 10 },
  dot: { height: 6, borderRadius: 3, transition: 'width 0.3s' },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { ...Typography.h3, marginBottom: 14 },
  seeAll: { color: Colors.primary, fontWeight: '600', fontSize: 14 },

  catPill: {
    backgroundColor: Colors.white, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    ...Shadows.sm,
  },
  catPillActive: { backgroundColor: Colors.primary },
  catPillText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  catPillTextActive: { color: Colors.white },

  servicesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  serviceCard: {
    width: (Screen.W - 32 - 24) / 3,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: 12, margin: 4, alignItems: 'center',
    ...Shadows.card,
  },
  serviceIcon: { fontSize: 36, marginBottom: 8 },
  serviceName: { fontSize: 12, fontWeight: '600', color: Colors.black, textAlign: 'center', marginBottom: 4, lineHeight: 16 },
  serviceRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingStars: { color: Colors.star, fontSize: 11 },
  ratingValue: { fontSize: 11, color: Colors.midGray },
  servicePrice: { color: Colors.primary, fontWeight: '700', fontSize: 13, marginTop: 4 },
  newBadge: {
    backgroundColor: Colors.infoLight, borderRadius: Radius.pill,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  newBadgeText: { color: Colors.info, fontSize: 9, fontWeight: '700' },

  howItWorks: {
    backgroundColor: Colors.white, borderRadius: Radius.xxl,
    marginHorizontal: 16, padding: 20, marginBottom: 32, ...Shadows.card,
  },
  howStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  howNum: { position: 'absolute', opacity: 0.07 },
  howNumText: { fontSize: 48, fontWeight: '900', color: Colors.black },
  howIcon: {
    width: 52, height: 52, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  howTitle: { ...Typography.h4, marginBottom: 2 },
  howDesc: { ...Typography.small, lineHeight: 16 },

  cityModal: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  cityModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  cityModalCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
  },
  cityModalTitle: { ...Typography.h3, marginBottom: 20, textAlign: 'center' },
  cityOption: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.offWhite, gap: 12,
  },
  cityOptionActive: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, paddingHorizontal: 8, marginHorizontal: -8 },
  cityOptionIcon: { fontSize: 18 },
  cityOptionText: { ...Typography.bodyMed, flex: 1 },
});
