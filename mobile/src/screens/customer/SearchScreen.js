import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, StatusBar, Keyboard, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../utils/theme';
import { servicesAPI } from '../../utils/api';

const TRENDING = ['AC Service', 'Car Battery', 'Salon at Home', 'Deep Cleaning', 'Jump Start', 'Plumber', 'Electrician', 'Oil Change'];
const POPULAR_CATEGORIES = [
  { icon: '❄️', label: 'AC & Appliances' },
  { icon: '💄', label: 'Beauty' },
  { icon: '🚗', label: 'Automotive' },
  { icon: '🧹', label: 'Cleaning' },
  { icon: '🔌', label: 'Electrician' },
  { icon: '🪛', label: 'Plumber' },
];

function SearchResultItem({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.resultItem} activeOpacity={0.7}>
      <View style={styles.resultIcon}>
        <Text style={{ fontSize: 28 }}>{item.icon}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultMeta}>
          {item.category?.name}  ·  ★ {item.rating || 4.8}  ·  Starting ₹{item.startingPrice}
        </Text>
      </View>
      <Text style={styles.resultArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent]   = useState([]);
  const [focused, setFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minRating: 0, sortBy: 'relevance' });
  const SORT_OPTIONS = [
    { value: 'relevance',  label: 'Relevance' },
    { value: 'price_asc',  label: 'Price ↑' },
    { value: 'price_desc', label: 'Price ↓' },
    { value: 'rating',     label: 'Top Rated' },
    { value: 'newest',     label: 'Newest' },
  ];
  const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    loadRecent();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const loadRecent = async () => {
    try {
      const stored = await AsyncStorage.getItem('mk_recent_searches');
      if (stored) setRecent(JSON.parse(stored));
    } catch {}
  };

  const saveRecent = async (term) => {
    try {
      const updated = [term, ...recent.filter(r => r !== term)].slice(0, 8);
      setRecent(updated);
      await AsyncStorage.setItem('mk_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const clearRecent = async () => {
    setRecent([]);
    await AsyncStorage.removeItem('mk_recent_searches');
  };

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [query, filters]);

  const doSearch = async () => {
    setLoading(true);
    try {
      const params = { q: query };
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.minRating > 0) params.minRating = filters.minRating;
      if (filters.sortBy !== 'relevance') params.sortBy = filters.sortBy;
      const { data } = await servicesAPI.search(query, params);
      setResults(data.services || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (service) => {
    saveRecent(service.name);
    Keyboard.dismiss();
    navigation.navigate('ServiceDetail', { serviceId: service.slug || service._id });
  };

  const handleTrending = (term) => {
    setQuery(term);
    saveRecent(term);
  };

  const isEmpty = query.length === 0;
  const hasResults = results.length > 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search services, e.g. AC repair"
            placeholderTextColor={Colors.lightGray}
            style={styles.input}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(f => !f)}
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}>
          <Text style={styles.filterBtnIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Sort */}
          <Text style={styles.filterLabel}>Sort by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setFilters(f => ({ ...f, sortBy: opt.value }))}
                style={[styles.filterChip, filters.sortBy === opt.value && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, filters.sortBy === opt.value && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Min Rating */}
          <Text style={styles.filterLabel}>Minimum rating</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {RATING_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setFilters(f => ({ ...f, minRating: r }))}
                style={[styles.filterChip, filters.minRating === r && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, filters.minRating === r && styles.filterChipTextActive]}>
                  {r === 0 ? 'Any' : `★ ${r}+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price range */}
          <Text style={styles.filterLabel}>Price range</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            <TextInput
              value={filters.minPrice}
              onChangeText={v => setFilters(f => ({ ...f, minPrice: v }))}
              placeholder="Min ₹"
              keyboardType="number-pad"
              placeholderTextColor={Colors.lightGray}
              style={styles.priceInput}
            />
            <Text style={{ alignSelf: 'center', color: Colors.gray }}>–</Text>
            <TextInput
              value={filters.maxPrice}
              onChangeText={v => setFilters(f => ({ ...f, maxPrice: v }))}
              placeholder="Max ₹"
              keyboardType="number-pad"
              placeholderTextColor={Colors.lightGray}
              style={styles.priceInput}
            />
            <TouchableOpacity
              onPress={() => setFilters({ minPrice: '', maxPrice: '', minRating: 0, sortBy: 'relevance' })}
              style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Loading */}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Search results */}
        {!loading && hasResults && query.length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RESULTS ({results.length})</Text>
            {results.map(item => (
              <SearchResultItem key={item._id} item={item} onPress={() => handleSelect(item)} />
            ))}
          </View>
        )}

        {/* No results */}
        {!loading && !hasResults && query.length >= 2 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🔎</Text>
            <Text style={styles.emptyTitle}>No results for "{query}"</Text>
            <Text style={styles.emptySub}>Try a different keyword or browse categories below</Text>
          </View>
        )}

        {/* Empty state — show recent + trending */}
        {isEmpty && (
          <>
            {/* Recent searches */}
            {recent.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>RECENT SEARCHES</Text>
                  <TouchableOpacity onPress={clearRecent}>
                    <Text style={styles.clearAll}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                {recent.map((term, i) => (
                  <TouchableOpacity key={i} onPress={() => handleTrending(term)}
                    style={styles.recentItem}>
                    <Text style={styles.recentIcon}>🕐</Text>
                    <Text style={styles.recentText}>{term}</Text>
                    <TouchableOpacity onPress={() => {
                      const updated = recent.filter(r => r !== term);
                      setRecent(updated);
                      AsyncStorage.setItem('mk_recent_searches', JSON.stringify(updated));
                    }}>
                      <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Trending */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>🔥 TRENDING NOW</Text>
              <View style={styles.trendingWrap}>
                {TRENDING.map(term => (
                  <TouchableOpacity key={term} onPress={() => handleTrending(term)}
                    style={styles.trendingChip}>
                    <Text style={styles.trendingText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Popular categories */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>BROWSE BY CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {POPULAR_CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat.label}
                    onPress={() => navigation.navigate('Services', { category: cat.label })}
                    style={styles.categoryCard}>
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginRight: 8 },
  backIcon: { fontSize: 22, color: Colors.black, fontWeight: '600' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: Radius.xl, paddingHorizontal: 14, height: 44 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.black, fontWeight: '500' },
  clearIcon: { fontSize: 14, color: Colors.midGray, padding: 4 },
  filterBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8, backgroundColor: Colors.offWhite },
  filterBtnActive: { backgroundColor: Colors.primaryLight },
  filterBtnIcon: { fontSize: 18 },
  filterPanel: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  filterLabel: { fontSize: 12, fontWeight: '700', color: Colors.gray, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.offWhite, borderWidth: 1, borderColor: Colors.borderLight },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterChipTextActive: { color: Colors.white },
  priceInput: { flex: 1, height: 38, backgroundColor: Colors.offWhite, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: Colors.black, borderWidth: 1, borderColor: Colors.borderLight },
  clearFiltersBtn: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: Colors.primaryLight, borderRadius: 10 },
  clearFiltersText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20 },
  loadingText: { color: Colors.midGray, fontSize: 14 },
  section: { padding: Spacing.base, paddingBottom: 0 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.midGray, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.sm },
  clearAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.offWhite, gap: 14 },
  resultIcon: { width: 52, height: 52, borderRadius: Radius.lg, backgroundColor: Colors.offWhite, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 3 },
  resultMeta: { fontSize: 12, color: Colors.midGray },
  resultArrow: { fontSize: 22, color: Colors.lightGray },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.midGray, textAlign: 'center', lineHeight: 20 },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.offWhite, gap: 12 },
  recentIcon: { fontSize: 16 },
  recentText: { flex: 1, fontSize: 14, color: Colors.black, fontWeight: '500' },
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.base },
  trendingChip: { backgroundColor: Colors.offWhite, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.offWhite },
  trendingText: { fontSize: 13, color: Colors.gray, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  categoryCard: { width: '30%', backgroundColor: Colors.offWhite, borderRadius: Radius.lg, padding: 14, alignItems: 'center', gap: 6 },
  categoryIcon: { fontSize: 28 },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: Colors.gray, textAlign: 'center' },
});
