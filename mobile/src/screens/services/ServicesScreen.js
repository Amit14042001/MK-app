/**
 * MK App — Services Screen (Full)
 * Category → services listing with filters, sort, search
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, StatusBar,
  Animated, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { servicesAPI } from '../../utils/api';
import { useCart } from '../../context/CartContext';

const SORT_OPTIONS = [
  { key: '-totalBookings', label: 'Most Popular' },
  { key: '-rating',        label: 'Top Rated' },
  { key: 'startingPrice',  label: 'Price: Low to High' },
  { key: '-startingPrice', label: 'Price: High to Low' },
  { key: '-isNew',         label: 'Newest' },
];

function ServiceCard({ service, onPress, onAddCart }) {
  const { cart } = useCart();
  const inCart = cart.some(c => c.serviceId === service._id);
  const scale  = new Animated.Value(1);

  const disc = service.subServices?.[0]?.originalPrice
    ? Math.round((1 - service.startingPrice / service.subServices[0].originalPrice) * 100) : 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={S.serviceCard}
        onPress={onPress}
        activeOpacity={0.9}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 300 }).start()}
      >
        {/* Tags */}
        <View style={S.tagRow}>
          {service.isNew     && <View style={[S.tag, { backgroundColor: '#E8F5E9' }]}><Text style={[S.tagText, { color: '#2E7D32' }]}>NEW</Text></View>}
          {service.isPopular && <View style={[S.tag, { backgroundColor: '#FFF3E0' }]}><Text style={[S.tagText, { color: '#E65100' }]}>🔥 Popular</Text></View>}
          {disc > 0          && <View style={[S.tag, { backgroundColor: '#FFEBEE' }]}><Text style={[S.tagText, { color: '#C62828' }]}>{disc}% OFF</Text></View>}
        </View>

        <View style={S.cardMain}>
          <View style={S.iconBox}>
            <Text style={S.serviceEmoji}>{service.icon || '🔧'}</Text>
          </View>
          <View style={S.cardBody}>
            <Text style={S.serviceName} numberOfLines={2}>{service.name}</Text>
            <Text style={S.serviceDesc} numberOfLines={2}>{service.shortDescription || service.description}</Text>

            <View style={S.metaRow}>
              <Text style={S.rating}>⭐ {service.rating?.toFixed(1) || '4.8'}</Text>
              <Text style={S.dot}>·</Text>
              <Text style={S.bookings}>{service.totalBookings?.toLocaleString() || '0'} bookings</Text>
              {service.duration && (
                <>
                  <Text style={S.dot}>·</Text>
                  <Text style={S.duration}>⏱ {service.duration} min</Text>
                </>
              )}
            </View>

            <View style={S.priceRow}>
              <View style={S.priceBox}>
                <Text style={S.priceLabel}>Starts at</Text>
                <Text style={S.price}>₹{service.startingPrice}</Text>
              </View>
              <TouchableOpacity
                style={[S.addBtn, inCart && S.addBtnAdded]}
                onPress={onAddCart}
              >
                <Text style={[S.addBtnText, inCart && S.addBtnTextAdded]}>
                  {inCart ? '✓ Added' : '+ Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {service.warranty && (
          <View style={S.warrantyBadge}>
            <Text style={S.warrantyText}>🛡️ {service.warranty}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ServicesScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { categorySlug, categoryName } = route.params || {};
  const { addToCart } = useCart();

  const [services, setServices]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort]             = useState('-totalBookings');
  const [showSort, setShowSort]     = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchServices = useCallback(async (reset = false, query = search) => {
    try {
      if (reset) { setLoading(true); setPage(1); }
      else setLoadingMore(true);

      const p = reset ? 1 : page + 1;
      const params = { sort, page: p, limit: 15 };
      if (categorySlug) params.categorySlug = categorySlug;
      if (query)        params.search       = query;

      const { data } = await (query
        ? servicesAPI.search(query, params)
        : categorySlug
          ? servicesAPI.getByCategory(categorySlug)
          : servicesAPI.getAll(params));

      const list = data.services || data.data || [];
      if (reset) setServices(list);
      else setServices(prev => [...prev, ...list]);
      setHasMore(list.length === 15);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [sort, categorySlug, page, search]);

  useEffect(() => { fetchServices(true); }, [sort, categorySlug]);

  const handleSearch = (text) => {
    setSearch(text);
    if (text.length === 0 || text.length >= 3) fetchServices(true, text);
  };

  const handleAddCart = (service) => {
    const added = addToCart({
      serviceId:    service._id,
      serviceName:  service.name,
      subServiceName: null,
      price:        service.startingPrice,
      originalPrice: service.subServices?.[0]?.originalPrice || service.startingPrice,
      duration:     service.duration,
      icon:         service.icon,
      categorySlug,
    });
    if (!added) navigation.navigate('ServiceDetail', { serviceId: service._id });
  };

  const currentSort = SORT_OPTIONS.find(o => o.key === sort)?.label || 'Most Popular';

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle} numberOfLines={1}>{categoryName || 'All Services'}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={S.searchBtn}>
          <Text style={S.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={S.searchBar}>
        <Text style={S.searchBarIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder={`Search in ${categoryName || 'services'}...`}
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Text style={S.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sort bar */}
      <View style={S.filterBar}>
        <TouchableOpacity style={S.sortBtn} onPress={() => setShowSort(!showSort)}>
          <Text style={S.sortIcon}>⇅</Text>
          <Text style={S.sortLabel}>{currentSort}</Text>
          <Text style={S.sortChevron}>{showSort ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {services.length > 0 && (
          <Text style={S.resultCount}>{services.length}+ services</Text>
        )}
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={S.sortDropdown}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[S.sortOption, sort === opt.key && S.sortOptionActive]}
              onPress={() => { setSort(opt.key); setShowSort(false); }}
            >
              <Text style={[S.sortOptionText, sort === opt.key && S.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {sort === opt.key && <Text style={S.sortCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={S.loadingText}>Loading services...</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })}
              onAddCart={() => handleAddCart(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchServices(true)}
              colors={[Colors.primary]} tintColor={Colors.primary} />
          }
          onEndReached={() => { if (hasMore && !loadingMore) fetchServices(false); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={() => loadingMore
            ? <ActivityIndicator style={{ margin: 20 }} color={Colors.primary} />
            : null}
          ListEmptyComponent={() => (
            <View style={S.empty}>
              <Text style={S.emptyEmoji}>🔍</Text>
              <Text style={S.emptyTitle}>No services found</Text>
              <Text style={S.emptyText}>{search ? `No results for "${search}"` : 'No services available in this category'}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#1A1A2E', fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1A2E', flex: 1, textAlign: 'center' },
  searchBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7F7FA', justifyContent: 'center', alignItems: 'center' },
  searchIcon:   { fontSize: 18 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, ...Shadows.sm, borderWidth: 1, borderColor: '#F0F0F5' },
  searchBarIcon:{ fontSize: 16, marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 14, color: '#1A1A2E' },
  clearIcon:    { fontSize: 14, color: '#999', paddingLeft: 8 },
  filterBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6, ...Shadows.sm },
  sortIcon:     { fontSize: 14, color: Colors.primary },
  sortLabel:    { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  sortChevron:  { fontSize: 10, color: '#999' },
  resultCount:  { fontSize: 13, color: '#999' },
  sortDropdown: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, ...Shadows.lg, marginBottom: 8, overflow: 'hidden' },
  sortOption:   { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F7F7FA' },
  sortOptionActive: { backgroundColor: '#FFF8F0' },
  sortOptionText: { fontSize: 14, color: '#333' },
  sortOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  sortCheck:    { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  serviceCard:  { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...Shadows.md },
  tagRow:       { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 0 },
  tag:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText:      { fontSize: 11, fontWeight: '700' },
  cardMain:     { flexDirection: 'row', padding: 14 },
  iconBox:      { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F7F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  serviceEmoji: { fontSize: 32 },
  cardBody:     { flex: 1 },
  serviceName:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  serviceDesc:  { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 8 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rating:       { fontSize: 12, color: '#555' },
  dot:          { fontSize: 12, color: '#CCC', marginHorizontal: 4 },
  bookings:     { fontSize: 12, color: '#555' },
  duration:     { fontSize: 12, color: '#555' },
  priceRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceBox:     {},
  priceLabel:   { fontSize: 11, color: '#999' },
  price:        { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  addBtn:       { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  addBtnAdded:  { backgroundColor: '#E8F5E9' },
  addBtnText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  addBtnTextAdded: { color: '#2E7D32' },
  warrantyBadge: { borderTopWidth: 1, borderTopColor: '#F7F7FA', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F8FFF8' },
  warrantyText:  { fontSize: 12, color: '#2E7D32', fontWeight: '500' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText:  { fontSize: 14, color: '#999', marginTop: 12 },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText:    { fontSize: 14, color: '#999', textAlign: 'center' },
});
