import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, FlatList, ActivityIndicator, StatusBar,
  Dimensions, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common, Screen } from '../../utils/theme';
import { servicesAPI, reviewsAPI } from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import ProPerformanceCard from '../../components/ProPerformanceCard';

const TIMES = [
  '08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM',
  '01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM',
  '06:00 PM','07:00 PM',
];

const TABS = ['Overview','Inclusions','Reviews','FAQ'];

// ── Sub-service row ──────────────────────────────────────────
function SubServiceRow({ item, selected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, tension: 300 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.subRow, selected && styles.subRowSelected]}>
        <View style={styles.subRowLeft}>
          <Text style={[styles.subRowCheck, selected && styles.subRowCheckSelected]}>
            {selected ? '●' : '○'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subName, selected && { color: Colors.primary }]}>{item.name}</Text>
            {item.duration ? (
              <Text style={styles.subDuration}>⏱ ~{item.duration} mins</Text>
            ) : null}
            {item.description ? (
              <Text style={styles.subDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.subRowRight}>
          <Text style={[styles.subPrice, selected && { color: Colors.primary }]}>
            ₹{item.price}
          </Text>
          {item.originalPrice ? (
            <Text style={styles.subOriginal}>₹{item.originalPrice}</Text>
          ) : null}
          {item.originalPrice ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {Math.round((1 - item.price / item.originalPrice) * 100)}% off
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Date selector ────────────────────────────────────────────
function DateSelector({ selected, onSelect }) {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: Spacing.sm }}>
      {dates.map((d, i) => {
        const val = d.toISOString().split('T')[0];
        const sel = selected === val;
        return (
          <TouchableOpacity key={i} onPress={() => onSelect(val)}
            style={[styles.dateChip, sel && styles.dateChipSelected]}>
            <Text style={[styles.dateDay, sel && styles.dateTextSelected]}>
              {i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' })}
            </Text>
            <Text style={[styles.dateNum, sel && styles.dateTextSelected]}>
              {d.getDate()}
            </Text>
            <Text style={[styles.dateMon, sel && { color: 'rgba(255,255,255,0.8)' }]}>
              {d.toLocaleDateString('en', { month: 'short' })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Time selector ────────────────────────────────────────────
function TimeSelector({ selected, onSelect }) {
  return (
    <View style={styles.timeGrid}>
      {TIMES.map(t => (
        <TouchableOpacity key={t} onPress={() => onSelect(t)}
          style={[styles.timeChip, selected === t && styles.timeChipSelected]}>
          <Text style={[styles.timeText, selected === t && styles.timeTextSelected]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Review card ──────────────────────────────────────────────
function ReviewCard({ review }) {
  const initials = review.customer?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'UC';
  return (
    <View style={styles.reviewCard}>
      <View style={Common.row}>
        <View style={[styles.reviewAvatar, { backgroundColor: Colors.primary }]}>
          <Text style={styles.reviewAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{review.customer?.name || 'Customer'}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.reviewStars}>
          {'★★★★★'.split('').slice(0, review.rating).map((s, i) => (
            <Text key={i} style={styles.starFilled}>{s}</Text>
          ))}
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
      {review.images?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
          {review.images.map((img, i) => (
            <View key={i} style={styles.reviewImagePlaceholder}>
              <Text style={{ fontSize: 20 }}>🖼️</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ── MAIN SCREEN ──────────────────────────────────────────────
export default function ServiceDetailScreen({ route, navigation }) {
  const { serviceId } = route.params;
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });

  useEffect(() => { loadService(); }, [serviceId]);

  const loadService = async () => {
    setLoading(true);
    try {
      const { data } = await servicesAPI.getOne(serviceId);
      setService(data.service);
      if (data.service.subServices?.length) setSelectedSub(data.service.subServices[0]);
      setReviews(data.recentReviews || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const openBookingSheet = () => {
    setBookingSheetOpen(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const closeBookingSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setBookingSheetOpen(false)
    );
  };

  const handleAddToCart = () => {
    if (!selectedDate || !selectedTime) return;
    addToCart({
      serviceId: service._id,
      serviceName: service.name,
      serviceIcon: service.icon,
      subServiceName: selectedSub?.name,
      price: selectedSub?.price || service.startingPrice,
      date: selectedDate,
      time: selectedTime,
    });
    closeBookingSheet();
    navigation.navigate('Cart');
  };

  const price = selectedSub?.price || service?.startingPrice || 0;
  const originalPrice = selectedSub?.originalPrice;

  if (loading) {
    return (
      <View style={[Common.container, Common.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[Common.container, Common.center]}>
        <Text style={Typography.h3}>Service not found</Text>
      </View>
    );
  }

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1], outputRange: [600, 0],
  });

  return (
    <View style={Common.container}>
      <StatusBar barStyle="light-content" />

      {/* Sticky header (appears on scroll) */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{service.name}</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Floating back button */}
      <View style={[styles.floatingBack, { top: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatingBackBtn}>
          <Text style={{ fontSize: 18, color: Colors.white }}>←</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#0F3460', '#E94560']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroIcon}>{service.icon}</Text>
          <View style={styles.heroBadges}>
            {service.isNew && (
              <View style={[styles.badge, { backgroundColor: 'rgba(33,150,243,0.25)' }]}>
                <Text style={[styles.badgeText, { color: '#90CAF9' }]}>NEW</Text>
              </View>
            )}
            {service.isPopular && (
              <View style={[styles.badge, { backgroundColor: 'rgba(76,175,80,0.25)' }]}>
                <Text style={[styles.badgeText, { color: '#A5D6A7' }]}>Popular</Text>
              </View>
            )}
            {service.warranty && (
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.badgeText, { color: Colors.white }]}>🛡️ {service.warranty}</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroTitle}>{service.name}</Text>
          <View style={[Common.row, { gap: Spacing.base, marginTop: Spacing.sm }]}>
            <View style={Common.row}>
              <Text style={{ color: Colors.star, fontSize: 16 }}>★</Text>
              <Text style={styles.heroRating}> {service.rating || 4.8}</Text>
            </View>
            <Text style={styles.heroReviews}>({service.totalRatings?.toLocaleString() || '1K+'} reviews)</Text>
            <Text style={styles.heroBookings}>📦 {service.totalBookings?.toLocaleString() || '10K+'} booked</Text>
          </View>
        </LinearGradient>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        {/* Sub-services */}
        {service.subServices?.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 0 }]}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.base }]}>Choose Package</Text>
            {service.subServices.filter(s => s.isActive !== false).map(sub => (
              <SubServiceRow
                key={sub._id || sub.name}
                item={sub}
                selected={selectedSub?.name === sub.name}
                onPress={() => setSelectedSub(sub)}
              />
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(i)} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
              {activeTab === i && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.section}>
          {activeTab === 0 && (
            <View style={styles.trustGrid}>
              {[
                ['🛡️', 'Verified Pros', 'Background checked'],
                ['💰', 'Fixed Pricing', 'No hidden charges'],
                ['⭐', 'Guarantee', 'Free redo if not happy'],
                ['📱', 'Live Tracking', 'Track your pro in realtime'],
                ['⏰', 'On Time', 'Or ₹50 off your next booking'],
                ['🔧', 'Pro Tools', 'Professional grade equipment'],
              ].map(([icon, title, sub]) => (
                <View key={title} style={styles.trustItem}>
                  <Text style={styles.trustIcon}>{icon}</Text>
                  <Text style={styles.trustTitle}>{title}</Text>
                  <Text style={styles.trustSub}>{sub}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 1 && (
            <View>
              {service.inclusions?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginBottom: Spacing.md }]}>✅ What's Included</Text>
                  {service.inclusions.map((item, i) => (
                    <View key={i} style={[Common.row, { marginBottom: Spacing.sm, gap: Spacing.sm }]}>
                      <Text style={{ color: Colors.success, fontWeight: '700' }}>✓</Text>
                      <Text style={Typography.body}>{item}</Text>
                    </View>
                  ))}
                </>
              )}
              {service.exclusions?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: Spacing.xl, marginBottom: Spacing.md }]}>❌ Not Included</Text>
                  {service.exclusions.map((item, i) => (
                    <View key={i} style={[Common.row, { marginBottom: Spacing.sm, gap: Spacing.sm }]}>
                      <Text style={{ color: Colors.error, fontWeight: '700' }}>✗</Text>
                      <Text style={Typography.body}>{item}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {activeTab === 2 && (
            <View>
              <View style={[Common.row, { gap: Spacing.xl, marginBottom: Spacing.xl }]}>
                <View style={Common.center}>
                  <Text style={styles.ratingBig}>{service.rating || 4.8}</Text>
                  <Text style={{ color: Colors.star, fontSize: 20, letterSpacing: 2 }}>★★★★★</Text>
                  <Text style={Typography.small}>{service.totalRatings?.toLocaleString() || '1K+'} reviews</Text>
                </View>
              </View>
              {reviews.length === 0 ? (
                <Text style={[Typography.body, { textAlign: 'center', padding: Spacing.xl }]}>No reviews yet</Text>
              ) : (
                reviews.map((r, i) => <ReviewCard key={i} review={r} />)
              )}
            </View>
          )}

          {/* Pro Performance Score — shown after Reviews */}
          {activeTab === 2 && service.topProfessional && (
            <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 }}>
                Top Professional Performance
              </Text>
              <ProPerformanceCard
                professionalId={service.topProfessional._id || service.topProfessional}
                proName={service.topProfessional.user?.name || 'Top Professional'}
                compact={false}
              />
            </View>
          )}

          {activeTab === 3 && (
            <View>
              {(service.faqs?.length > 0 ? service.faqs : [
                { question: 'How do I book?', answer: 'Select your package, choose a time slot and checkout. Payment can be online or cash after service.' },
                { question: 'Are professionals verified?', answer: 'Yes. All professionals undergo background checks, skill assessments and training.' },
                { question: 'What if I am not satisfied?', answer: "We offer a 100% re-do guarantee — if you're not happy, we'll send a pro back free of charge." },
                { question: 'Can I reschedule?', answer: 'Yes, up to 3 hours before your appointment. Free cancellation up to 24 hours in advance.' },
              ]).map((faq, i) => (
                <View key={i} style={styles.faqItem}>
                  <Text style={styles.faqQ}>Q: {faq.question}</Text>
                  <Text style={styles.faqA}>A: {faq.answer}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom booking bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.base }]}>
        <View>
          <Text style={styles.bottomPrice}>₹{price}</Text>
          {originalPrice && (
            <Text style={styles.bottomOriginal}>₹{originalPrice}</Text>
          )}
        </View>
        <TouchableOpacity onPress={openBookingSheet} style={styles.bookBtn} activeOpacity={0.85}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.bookBtnGradient}>
            <Text style={styles.bookBtnText}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Booking bottom sheet */}
      {bookingSheetOpen && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity style={styles.overlay} onPress={closeBookingSheet} activeOpacity={1} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Date & Time</Text>

            <Text style={styles.sheetLabel}>DATE</Text>
            <DateSelector selected={selectedDate} onSelect={setSelectedDate} />

            <Text style={[styles.sheetLabel, { marginTop: Spacing.lg, paddingHorizontal: Spacing.base }]}>TIME SLOT</Text>
            <View style={{ paddingHorizontal: Spacing.base }}>
              <TimeSelector selected={selectedTime} onSelect={setSelectedTime} />
            </View>

            {selectedDate && selectedTime && (
              <View style={styles.selectionSummary}>
                <Text style={styles.summaryText}>
                  📅 {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}  ·  ⏰ {selectedTime}
                </Text>
              </View>
            )}

            <View style={{ padding: Spacing.base }}>
              <TouchableOpacity
                onPress={handleAddToCart}
                disabled={!selectedDate || !selectedTime}
                style={[styles.bookBtn, { width: '100%' }]}
                activeOpacity={0.85}>
                <LinearGradient
                  colors={selectedDate && selectedTime ? [Colors.primary, Colors.primaryDark] : ['#ccc', '#aaa']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.bookBtnGradient, { borderRadius: Radius.xl }]}>
                  <Text style={styles.bookBtnText}>
                    {selectedDate && selectedTime ? `Add to Cart — ₹${price}` : 'Select date & time'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.md, borderBottomWidth: 1,
    borderBottomColor: Colors.offWhite, ...Shadows.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: Colors.black, fontWeight: '600' },
  stickyTitle: { flex: 1, ...Typography.h4, textAlign: 'center' },
  floatingBack: { position: 'absolute', left: Spacing.base, zIndex: 50 },
  floatingBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  hero: {
    paddingTop: 80, paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.base,
  },
  heroIcon: { fontSize: 56, marginBottom: Spacing.sm },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { ...Typography.h1, color: Colors.white, fontSize: 28, lineHeight: 34 },
  heroRating: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  heroReviews: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroBookings: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  section: { padding: Spacing.base },
  sectionTitle: { ...Typography.h4, marginBottom: Spacing.base },
  description: { ...Typography.body, lineHeight: 22 },
  subRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.base, paddingHorizontal: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
    backgroundColor: Colors.white,
  },
  subRowSelected: { backgroundColor: Colors.primaryLight },
  subRowLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, flex: 1 },
  subRowCheck: { fontSize: 18, color: Colors.lightGray, marginTop: 2 },
  subRowCheckSelected: { color: Colors.primary },
  subRowRight: { alignItems: 'flex-end', gap: 2 },
  subName: { ...Typography.bodyMed, marginBottom: 2 },
  subDuration: { ...Typography.small },
  subDesc: { ...Typography.small, marginTop: 2 },
  subPrice: { ...Typography.price, color: Colors.black },
  subOriginal: { fontSize: 12, color: Colors.lightGray, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.pill },
  discountText: { fontSize: 10, color: Colors.success, fontWeight: '700' },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
    backgroundColor: Colors.white, marginTop: Spacing.md,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, position: 'relative' },
  tabText: { ...Typography.small, fontWeight: '600', color: Colors.midGray },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, backgroundColor: Colors.primary, borderRadius: 1,
  },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  trustItem: {
    width: (Screen.W - Spacing.base * 2 - Spacing.md) / 2,
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg, padding: Spacing.md,
  },
  trustIcon: { fontSize: 24, marginBottom: Spacing.sm },
  trustTitle: { ...Typography.bodyMed, marginBottom: 2 },
  trustSub: { ...Typography.small },
  reviewCard: {
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg,
    padding: Spacing.base, marginBottom: Spacing.md,
  },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  reviewAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  reviewName: { ...Typography.bodyMed },
  reviewDate: { ...Typography.small },
  reviewStars: { flexDirection: 'row' },
  starFilled: { color: Colors.star, fontSize: 14 },
  reviewComment: { ...Typography.body, marginTop: Spacing.sm, lineHeight: 20 },
  reviewImagePlaceholder: {
    width: 64, height: 64, borderRadius: Radius.md,
    backgroundColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center',
  },
  ratingBig: { fontSize: 52, fontWeight: '900', color: Colors.black, lineHeight: 56 },
  faqItem: {
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg,
    padding: Spacing.base, marginBottom: Spacing.md,
  },
  faqQ: { ...Typography.bodyMed, marginBottom: Spacing.sm },
  faqA: { ...Typography.body, lineHeight: 20 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, paddingTop: Spacing.md,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.offWhite, ...Shadows.lg,
  },
  bottomPrice: { ...Typography.priceLarge },
  bottomOriginal: { ...Typography.small, textDecorationLine: 'line-through', color: Colors.midGray },
  bookBtn: { borderRadius: Radius.xl, overflow: 'hidden' },
  bookBtnGradient: { paddingHorizontal: Spacing.xxl, paddingVertical: 14 },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.md, maxHeight: Screen.H * 0.85, ...Shadows.lg,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: Colors.lightGray,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.base,
  },
  sheetTitle: { ...Typography.h3, paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  sheetLabel: { ...Typography.label, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  dateChip: {
    width: 60, alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.offWhite,
    backgroundColor: Colors.white,
  },
  dateChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateDay: { ...Typography.caption },
  dateNum: { ...Typography.h3, lineHeight: 28 },
  dateMon: { ...Typography.caption },
  dateTextSelected: { color: Colors.white },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  timeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.offWhite,
  },
  timeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeText: { ...Typography.small, fontWeight: '600', color: Colors.gray },
  timeTextSelected: { color: Colors.white },
  selectionSummary: {
    marginHorizontal: Spacing.base, marginTop: Spacing.md,
    backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: Spacing.md,
  },
  summaryText: { ...Typography.bodyMed, color: Colors.success },
});
