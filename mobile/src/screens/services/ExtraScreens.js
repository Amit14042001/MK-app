import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, StatusBar, Animated, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common, Screen } from '../../utils/theme';
import { servicesAPI, categoriesAPI } from '../../utils/api';
import { useCart } from '../../context/CartContext';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.SOCKET_URL || 'http://10.0.2.2:5000';

// ═══════════════════════════════════════════════════════════
// CATEGORY SCREEN — All services in a category
// ═══════════════════════════════════════════════════════════
export function CategoryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { categorySlug, categoryName, categoryIcon } = route.params;
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sortBy, setSortBy]     = useState('popular');
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({ inputRange:[0,80], outputRange:[0,1], extrapolate:'clamp' });

  useEffect(() => { loadServices(); }, [categorySlug, sortBy]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data } = await servicesAPI.getByCategory(categorySlug, { sort: sortBy });
      setServices(data.services || []);
    } catch {} finally { setLoading(false); }
  };

  const SORTS = [
    { key: 'popular',  label: '🔥 Popular' },
    { key: 'rating',   label: '⭐ Rating' },
    { key: 'price_asc',label: '💰 Price ↑' },
    { key: 'newest',   label: '✨ Newest' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Animated sticky header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.stickyTitle}>{categoryName}</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}>

        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#0F3460']} style={styles.catHero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.catBackBtn}>
            <Text style={{ fontSize: 22, color: Colors.white, fontWeight: '600' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.catHeroIcon}>{categoryIcon || '🔧'}</Text>
          <Text style={styles.catHeroTitle}>{categoryName}</Text>
          <Text style={styles.catHeroCount}>{services.length} services available</Text>
        </LinearGradient>

        {/* Sort bar */}
        <View style={styles.sortBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 8, paddingVertical: 8 }}>
            {SORTS.map(s => (
              <TouchableOpacity key={s.key} onPress={() => setSortBy(s.key)}
                style={[styles.sortChip, sortBy === s.key && styles.sortChipActive]}>
                <Text style={[styles.sortText, sortBy === s.key && styles.sortTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Services */}
        <View style={{ padding: Spacing.base }}>
          {loading ? (
            <View style={[Common.center, { padding: 60 }]}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            services.map(svc => (
              <TouchableOpacity key={svc._id}
                onPress={() => navigation.navigate('ServiceDetail', { serviceId: svc.slug || svc._id })}
                style={styles.catServiceCard} activeOpacity={0.85}>
                <View style={styles.catServiceLeft}>
                  <Text style={styles.catServiceIcon}>{svc.icon}</Text>
                </View>
                <View style={styles.catServiceInfo}>
                  <Text style={styles.catServiceName}>{svc.name}</Text>
                  <View style={styles.catServiceMeta}>
                    <Text style={styles.catServiceRating}>★ {svc.rating || 4.8}</Text>
                    <Text style={styles.catServiceReviews}>({svc.totalRatings?.toLocaleString() || '1K+'})</Text>
                    {svc.isPopular && <View style={styles.popularChip}><Text style={styles.popularChipText}>Popular</Text></View>}
                  </View>
                  {svc.description && (
                    <Text style={styles.catServiceDesc} numberOfLines={2}>{svc.description}</Text>
                  )}
                </View>
                <View style={styles.catServiceRight}>
                  <Text style={styles.catServicePrice}>₹{svc.startingPrice}</Text>
                  <Text style={styles.catServicePriceSub}>onwards</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// PACKAGES SCREEN — Sub-service detail with addons
// ═══════════════════════════════════════════════════════════
export function PackagesScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { service } = route.params;
  const { addToCart } = useCart();
  const [selectedPkg, setSelectedPkg]     = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);

  const packages = service?.subServices?.filter(s => s.isActive !== false) || [];
  const addons   = service?.addons || [];

  const toggleAddon = (addon) => {
    setSelectedAddons(prev =>
      prev.find(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  const total = (selectedPkg?.price || 0) + selectedAddons.reduce((s, a) => s + a.price, 0);

  const handleAddToCart = () => {
    if (!selectedPkg) { Alert.alert('Select a package first'); return; }
    addToCart({
      serviceId:      service._id,
      serviceName:    service.name,
      serviceIcon:    service.icon,
      subServiceName: selectedPkg.name,
      price:          total,
      addons:         selectedAddons,
    });
    navigation.navigate('Cart');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.pkgHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pkgHeaderTitle}>{service?.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Packages */}
        <View style={{ padding: Spacing.base }}>
          <Text style={styles.pkgSectionTitle}>Choose Package</Text>
          {packages.map(pkg => {
            const disc = pkg.originalPrice ? Math.round((1 - pkg.price / pkg.originalPrice) * 100) : 0;
            const sel  = selectedPkg?.name === pkg.name;
            return (
              <TouchableOpacity key={pkg.name} onPress={() => setSelectedPkg(pkg)}
                style={[styles.pkgCard, sel && styles.pkgCardSel]} activeOpacity={0.85}>
                <View style={[styles.pkgRadio, sel && styles.pkgRadioSel]}>
                  {sel && <View style={styles.pkgRadioDot} />}
                </View>
                <View style={styles.pkgCardBody}>
                  <Text style={[styles.pkgName, sel && { color: Colors.primary }]}>{pkg.name}</Text>
                  {pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}
                  <View style={styles.pkgMeta}>
                    {pkg.duration && <Text style={styles.pkgMetaText}>⏱ {pkg.duration} min</Text>}
                    {pkg.warranty && <Text style={styles.pkgMetaText}>🛡️ {pkg.warranty}</Text>}
                    {pkg.includes?.slice(0,2).map(i => (
                      <Text key={i} style={styles.pkgMetaText}>✓ {i}</Text>
                    ))}
                  </View>
                </View>
                <View style={styles.pkgPriceCol}>
                  <Text style={[styles.pkgPrice, sel && { color: Colors.primary }]}>₹{pkg.price}</Text>
                  {pkg.originalPrice && <Text style={styles.pkgOriginal}>₹{pkg.originalPrice}</Text>}
                  {disc > 0 && (
                    <View style={styles.pkgDiscBadge}><Text style={styles.pkgDiscText}>{disc}% off</Text></View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add-ons */}
        {addons.length > 0 && (
          <View style={{ paddingHorizontal: Spacing.base }}>
            <Text style={styles.pkgSectionTitle}>Add-ons (Optional)</Text>
            {addons.map(addon => {
              const selected = !!selectedAddons.find(a => a.name === addon.name);
              return (
                <TouchableOpacity key={addon.name} onPress={() => toggleAddon(addon)}
                  style={[styles.addonCard, selected && styles.addonCardSel]}>
                  <View style={[styles.addonCheck, selected && styles.addonCheckSel]}>
                    {selected && <Text style={{ color: Colors.white, fontSize: 12, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <View style={styles.addonInfo}>
                    <Text style={styles.addonName}>{addon.name}</Text>
                    {addon.description && <Text style={styles.addonDesc}>{addon.description}</Text>}
                  </View>
                  <Text style={styles.addonPrice}>+₹{addon.price}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* What's included */}
        {service?.inclusions?.length > 0 && (
          <View style={{ padding: Spacing.base }}>
            <Text style={styles.pkgSectionTitle}>What's Included</Text>
            <View style={styles.inclusionCard}>
              {service.inclusions.map((inc, i) => (
                <View key={i} style={styles.inclusionRow}>
                  <Text style={styles.inclusionCheck}>✓</Text>
                  <Text style={styles.inclusionText}>{inc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.pkgCTA, { paddingBottom: insets.bottom + Spacing.base }]}>
        <View>
          <Text style={styles.pkgCTATotal}>Total: ₹{total || '—'}</Text>
          {selectedAddons.length > 0 && (
            <Text style={styles.pkgCTAAddons}>Includes {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleAddToCart} disabled={!selectedPkg}
          style={[styles.pkgCTABtn, !selectedPkg && { opacity: 0.5 }]} activeOpacity={0.85}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}}
            style={styles.pkgCTABtnGradient}>
            <Text style={styles.pkgCTABtnText}>Add to Cart</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// PRO DETAIL SCREEN — Professional profile public view
// ═══════════════════════════════════════════════════════════
export function ProDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { professionalId } = route.params;
  const [pro, setPro]         = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/${professionalId}`).then(r => r.json()),
      fetch(`${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/reviews/professional/${professionalId}?limit=10`).then(r => r.json()),
    ])
      .then(([proData, reviewData]) => {
        setPro(proData.professional);
        setReviews(reviewData.reviews || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [professionalId]);

  if (loading) return (
    <View style={[Common.container, Common.center]}><ActivityIndicator color={Colors.primary} size="large" /></View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E','#0F3460']} style={styles.proHero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.catBackBtn}>
            <Text style={{ fontSize: 22, color: Colors.white, fontWeight: '600' }}>←</Text>
          </TouchableOpacity>
          <View style={styles.proHeroAvatar}>
            <Text style={styles.proHeroAvatarText}>
              {pro?.user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </Text>
          </View>
          <Text style={styles.proHeroName}>{pro?.user?.name || 'Professional'}</Text>
          <View style={styles.proHeroStats}>
            <View style={styles.proHeroStat}>
              <Text style={styles.proHeroStatVal}>★ {pro?.rating || 4.8}</Text>
              <Text style={styles.proHeroStatLabel}>Rating</Text>
            </View>
            <View style={styles.proHeroStatDivider} />
            <View style={styles.proHeroStat}>
              <Text style={styles.proHeroStatVal}>{pro?.totalBookings || 0}</Text>
              <Text style={styles.proHeroStatLabel}>Jobs Done</Text>
            </View>
            <View style={styles.proHeroStatDivider} />
            <View style={styles.proHeroStat}>
              <Text style={styles.proHeroStatVal}>{pro?.yearsExperience || 3}+</Text>
              <Text style={styles.proHeroStatLabel}>Yrs Exp</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Skills */}
        <View style={{ padding: Spacing.base }}>
          <Text style={styles.proDetailSection}>Skills & Expertise</Text>
          <View style={styles.skillsRow}>
            {(pro?.skills || []).map(skill => (
              <View key={skill} style={styles.skillBadge}>
                <Text style={styles.skillBadgeText}>{skill}</Text>
              </View>
            ))}
          </View>

          {/* Badges */}
          <Text style={[styles.proDetailSection, { marginTop: Spacing.xl }]}>Achievements</Text>
          <View style={styles.badgesRow}>
            {[
              { icon: '🏆', label: 'Top Rated' },
              { icon: '⚡', label: 'Quick Responder' },
              { icon: '🛡️', label: 'Background Verified' },
              ...(pro?.totalBookings > 100 ? [{ icon: '💯', label: '100+ Jobs' }] : []),
            ].map(b => (
              <View key={b.label} style={styles.achieveBadge}>
                <Text style={styles.achieveIcon}>{b.icon}</Text>
                <Text style={styles.achieveLabel}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Past Work Photos */}
          <Text style={[styles.proDetailSection, { marginTop: Spacing.xl }]}>Past Work</Text>
          {(pro?.portfolioPhotos?.length > 0) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {pro.portfolioPhotos.map((photo, i) => (
                <View key={i} style={{ width: 120, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.offWhite }}>
                  {photo.afterUrl ? (
                    <Image source={{ uri: photo.afterUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 32 }}>📸</Text>
                      <Text style={{ fontSize: 10, color: Colors.gray, marginTop: 4 }}>{photo.service || 'Work photo'}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['🔧 AC Service','🧹 Deep Clean','⚡ Electrical'].map((label, i) => (
                <View key={i} style={{ width: 110, height: 90, borderRadius: 12, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: Colors.midGray, textAlign: 'center', padding: 8 }}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          <Text style={[styles.proDetailSection, { marginTop: Spacing.xl }]}>
            Customer Reviews ({reviews.length})
          </Text>
          {reviews.length === 0 ? (
            <Text style={[Typography.body, { color: Colors.midGray }]}>No reviews yet</Text>
          ) : (
            reviews.map((r, i) => (
              <View key={i} style={styles.proReviewCard}>
                <View style={Common.rowBetween}>
                  <Text style={styles.proReviewName}>{r.customer?.name || 'Customer'}</Text>
                  <Text style={{ color: Colors.star, fontSize: 13 }}>{'★'.repeat(r.rating)}</Text>
                </View>
                <Text style={styles.proReviewText}>{r.comment}</Text>
                <Text style={styles.proReviewDate}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// LIVE CHAT SCREEN — Real-time chat with professional
// ═══════════════════════════════════════════════════════════
export function LiveChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, professional, customerId } = route.params;
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [socket, setSocket]       = useState(null);
  const [connected, setConnected] = useState(false);
  const flatRef = useRef(null);

  const QUICK_MSGS = ['I\'m on my way!', 'Reached your location', 'Job complete!', 'Need 10 more mins', 'Please come down'];

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('slot_access_token');
      const s = io(SOCKET_URL, { auth: { token } });
      s.emit('join_booking', bookingId);
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
      s.on('receive_message', (msg) => {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      });
      setSocket(s);
      return () => s.disconnect();
    };
    init();
  }, [bookingId]);

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg || !socket) return;
    const msgObj = {
      bookingId, senderType: 'customer', senderId: customerId,
      message: msg, timestamp: new Date().toISOString(),
    };
    socket.emit('send_message', msgObj);
    setMessages(prev => [...prev, { ...msgObj, mine: true }]);
    setInput('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{professional?.name?.charAt(0) || 'P'}</Text>
          </View>
          <View>
            <Text style={styles.chatProName}>{professional?.name || 'Professional'}</Text>
            <View style={styles.chatOnlineRow}>
              <View style={[styles.chatOnlineDot, { backgroundColor: connected ? Colors.success : Colors.midGray }]} />
              <Text style={styles.chatOnlineText}>{connected ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.chatCallBtn}>
          <Text style={{ fontSize: 22 }}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={[Common.center, { padding: 40 }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
            <Text style={Typography.body}>No messages yet. Say hi!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.mine ? styles.msgRowMine : styles.msgRowTheirs]}>
            {!item.mine && (
              <View style={styles.msgAvatar}>
                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>
                  {professional?.name?.charAt(0) || 'P'}
                </Text>
              </View>
            )}
            <View style={[styles.msgBubble, item.mine ? styles.msgBubbleMine : styles.msgBubbleTheirs]}>
              <Text style={[styles.msgText, item.mine && { color: Colors.white }]}>{item.message}</Text>
              <Text style={[styles.msgTime, item.mine && { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date(item.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Quick messages */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickMsgRow}>
        {QUICK_MSGS.map(msg => (
          <TouchableOpacity key={msg} onPress={() => send(msg)} style={styles.quickMsgChip}>
            <Text style={styles.quickMsgText}>{msg}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.chatInput, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.lightGray}
            style={styles.chatInputField}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity onPress={() => send()} style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}>
            <LinearGradient colors={['#E94560','#C0392B']} style={styles.sendBtnGradient}>
              <Text style={{ color: Colors.white, fontSize: 18 }}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── SHARED STYLES ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg },
  // Category
  stickyHeader: { position:'absolute', top:0, left:0, right:0, zIndex:100, backgroundColor:Colors.white, flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.base, paddingBottom:Spacing.md, borderBottomWidth:1, borderBottomColor:Colors.offWhite, ...Shadows.sm },
  stickyTitle: { flex:1, textAlign:'center', ...Typography.h4 },
  backBtn: { width:40 },
  backIcon: { fontSize:22, color:Colors.black, fontWeight:'600' },
  catHero: { padding:Spacing.xl, paddingTop:Spacing.xl, alignItems:'center', paddingBottom:Spacing.xxl },
  catBackBtn: { alignSelf:'flex-start', marginBottom:Spacing.xl },
  catHeroIcon: { fontSize:64, marginBottom:Spacing.md },
  catHeroTitle: { color:Colors.white, fontSize:28, fontWeight:'900', letterSpacing:-0.5 },
  catHeroCount: { color:'rgba(255,255,255,0.6)', fontSize:14, marginTop:6 },
  sortBar: { backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  sortChip: { paddingHorizontal:16, paddingVertical:8, borderRadius:Radius.pill, borderWidth:1.5, borderColor:Colors.offWhite, backgroundColor:Colors.white },
  sortChipActive: { backgroundColor:Colors.primary, borderColor:Colors.primary },
  sortText: { fontSize:13, fontWeight:'600', color:Colors.gray },
  sortTextActive: { color:Colors.white },
  catServiceCard: { flexDirection:'row', alignItems:'flex-start', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.md, gap:14, ...Shadows.card },
  catServiceLeft: { width:64, height:64, borderRadius:Radius.xl, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0 },
  catServiceIcon: { fontSize:32 },
  catServiceInfo: { flex:1 },
  catServiceName: { ...Typography.bodyMed, lineHeight:20, marginBottom:4 },
  catServiceMeta: { flexDirection:'row', alignItems:'center', gap:6, marginBottom:4 },
  catServiceRating: { fontSize:12, fontWeight:'700', color:Colors.star },
  catServiceReviews: { fontSize:12, color:Colors.midGray },
  popularChip: { backgroundColor:Colors.successLight, paddingHorizontal:7, paddingVertical:2, borderRadius:Radius.pill },
  popularChipText: { fontSize:9, fontWeight:'700', color:Colors.success },
  catServiceDesc: { ...Typography.small, lineHeight:17 },
  catServiceRight: { alignItems:'flex-end', flexShrink:0 },
  catServicePrice: { ...Typography.price, color:Colors.primary },
  catServicePriceSub: { fontSize:10, color:Colors.midGray },
  // Packages
  pkgHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.base, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  pkgHeaderTitle: { ...Typography.h4 },
  pkgSectionTitle: { ...Typography.h4, marginBottom:Spacing.md },
  pkgCard: { flexDirection:'row', alignItems:'flex-start', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, borderWidth:1.5, borderColor:Colors.offWhite, gap:12, ...Shadows.sm },
  pkgCardSel: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  pkgRadio: { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:Colors.lightGray, marginTop:2, alignItems:'center', justifyContent:'center', flexShrink:0 },
  pkgRadioSel: { borderColor:Colors.primary },
  pkgRadioDot: { width:10, height:10, borderRadius:5, backgroundColor:Colors.primary },
  pkgCardBody: { flex:1 },
  pkgName: { ...Typography.bodyMed, lineHeight:20, marginBottom:4 },
  pkgDesc: { ...Typography.small, lineHeight:17, marginBottom:6 },
  pkgMeta: { gap:3 },
  pkgMetaText: { fontSize:11, color:Colors.midGray },
  pkgPriceCol: { alignItems:'flex-end', flexShrink:0 },
  pkgPrice: { ...Typography.price, color:Colors.black },
  pkgOriginal: { fontSize:12, color:Colors.lightGray, textDecorationLine:'line-through' },
  pkgDiscBadge: { backgroundColor:Colors.successLight, paddingHorizontal:6, paddingVertical:2, borderRadius:Radius.pill, marginTop:2 },
  pkgDiscText: { fontSize:9, fontWeight:'700', color:Colors.success },
  addonCard: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, borderWidth:1.5, borderColor:Colors.offWhite },
  addonCardSel: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  addonCheck: { width:22, height:22, borderRadius:4, borderWidth:2, borderColor:Colors.lightGray, alignItems:'center', justifyContent:'center', flexShrink:0 },
  addonCheckSel: { backgroundColor:Colors.primary, borderColor:Colors.primary },
  addonInfo: { flex:1 },
  addonName: { ...Typography.bodyMed },
  addonDesc: { ...Typography.small, marginTop:2 },
  addonPrice: { ...Typography.price, color:Colors.primary, flexShrink:0 },
  inclusionCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, ...Shadows.card },
  inclusionRow: { flexDirection:'row', gap:10, marginBottom:8 },
  inclusionCheck: { color:Colors.success, fontWeight:'700', fontSize:14, width:18 },
  inclusionText: { ...Typography.body, flex:1, lineHeight:20 },
  pkgCTA: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:Colors.white, padding:Spacing.base, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderTopWidth:1, borderTopColor:Colors.offWhite, ...Shadows.lg },
  pkgCTATotal: { ...Typography.h3, color:Colors.black },
  pkgCTAAddons: { ...Typography.small, color:Colors.midGray },
  pkgCTABtn: { borderRadius:Radius.xl, overflow:'hidden' },
  pkgCTABtnGradient: { paddingHorizontal:Spacing.xxl, paddingVertical:14 },
  pkgCTABtnText: { color:Colors.white, fontWeight:'700', fontSize:15 },
  // Pro Detail
  proHero: { padding:Spacing.xl, paddingBottom:Spacing.xxl, alignItems:'center' },
  proHeroAvatar: { width:80, height:80, borderRadius:40, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center', marginBottom:Spacing.md, borderWidth:3, borderColor:'rgba(255,255,255,0.3)' },
  proHeroAvatarText: { color:Colors.white, fontWeight:'900', fontSize:32 },
  proHeroName: { color:Colors.white, fontSize:22, fontWeight:'800', marginBottom:Spacing.base },
  proHeroStats: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.1)', borderRadius:Radius.xl, padding:Spacing.md },
  proHeroStat: { alignItems:'center', paddingHorizontal:Spacing.xl },
  proHeroStatVal: { color:Colors.white, fontWeight:'800', fontSize:18 },
  proHeroStatLabel: { color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:2 },
  proHeroStatDivider: { width:1, height:32, backgroundColor:'rgba(255,255,255,0.2)' },
  proDetailSection: { ...Typography.h4, marginBottom:Spacing.md },
  skillsRow: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:4 },
  skillBadge: { backgroundColor:Colors.primaryLight, paddingHorizontal:14, paddingVertical:8, borderRadius:Radius.pill, borderWidth:1, borderColor:Colors.primary + '30' },
  skillBadgeText: { color:Colors.primary, fontWeight:'600', fontSize:13 },
  badgesRow: { flexDirection:'row', flexWrap:'wrap', gap:12 },
  achieveBadge: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:12, alignItems:'center', width:80, ...Shadows.sm },
  achieveIcon: { fontSize:26, marginBottom:4 },
  achieveLabel: { fontSize:10, fontWeight:'600', color:Colors.gray, textAlign:'center' },
  proReviewCard: { backgroundColor:Colors.white, borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.sm, ...Shadows.sm },
  proReviewName: { ...Typography.bodyMed },
  proReviewText: { ...Typography.body, marginTop:6, lineHeight:20, fontStyle:'italic' },
  proReviewDate: { ...Typography.caption, marginTop:6 },
  // Chat
  chatHeader: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite, paddingHorizontal:Spacing.base, paddingVertical:12, gap:12 },
  chatHeaderCenter: { flex:1, flexDirection:'row', alignItems:'center', gap:12 },
  chatAvatar: { width:40, height:40, borderRadius:20, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center' },
  chatAvatarText: { color:Colors.white, fontWeight:'700', fontSize:16 },
  chatProName: { ...Typography.bodyMed },
  chatOnlineRow: { flexDirection:'row', alignItems:'center', gap:5, marginTop:2 },
  chatOnlineDot: { width:7, height:7, borderRadius:4 },
  chatOnlineText: { fontSize:12, color:Colors.midGray },
  chatCallBtn: { width:40, height:40, borderRadius:20, backgroundColor:Colors.successLight, alignItems:'center', justifyContent:'center' },
  msgList: { padding:Spacing.base, gap:8 },
  msgRow: { flexDirection:'row', alignItems:'flex-end', gap:8 },
  msgRowMine: { justifyContent:'flex-end' },
  msgRowTheirs: { justifyContent:'flex-start' },
  msgAvatar: { width:28, height:28, borderRadius:14, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center', flexShrink:0 },
  msgBubble: { maxWidth:'75%', padding:12, borderRadius:18 },
  msgBubbleMine: { backgroundColor:Colors.primary, borderBottomRightRadius:4 },
  msgBubbleTheirs: { backgroundColor:Colors.white, borderBottomLeftRadius:4, ...Shadows.sm },
  msgText: { fontSize:14, color:Colors.black, lineHeight:20 },
  msgTime: { fontSize:10, color:Colors.midGray, marginTop:4, alignSelf:'flex-end' },
  quickMsgRow: { paddingHorizontal:Spacing.base, paddingVertical:8, gap:8 },
  quickMsgChip: { paddingHorizontal:14, paddingVertical:8, borderRadius:Radius.pill, backgroundColor:Colors.white, borderWidth:1, borderColor:Colors.offWhite },
  quickMsgText: { fontSize:12, fontWeight:'600', color:Colors.gray },
  chatInput: { flexDirection:'row', alignItems:'flex-end', gap:10, padding:Spacing.sm, paddingHorizontal:Spacing.base, backgroundColor:Colors.white, borderTopWidth:1, borderTopColor:Colors.offWhite },
  chatInputField: { flex:1, backgroundColor:Colors.offWhite, borderRadius:Radius.xl, paddingHorizontal:16, paddingVertical:10, fontSize:14, color:Colors.black, maxHeight:100, fontFamily:'System' },
  sendBtn: { flexShrink:0 },
  sendBtnGradient: { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
});
