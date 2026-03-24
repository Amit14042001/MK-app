/**
 * Slot App — MapAddressPicker Component
 * Drop a pin on map to set address — Urban Company style
 * Feature #3: Address on map
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Dimensions, Animated, FlatList,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

// Try to import react-native-maps — graceful fallback if not installed
let MapView = null;
let Marker  = null;
try {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker  = RNMaps.Marker;

} catch { /* react-native-maps not installed — use placeholder */ }

const { width: W, height: H } = Dimensions.get('window');

const RECENT_SEARCHES = [
  { id: 1, title: 'Home',         subtitle: '123 Banjara Hills, Hyderabad',     icon: '🏠', lat: 17.4139, lng: 78.4674 },
  { id: 2, title: 'Work',         subtitle: 'Hitech City, Madhapur, Hyderabad', icon: '🏢', lat: 17.4484, lng: 78.3762 },
  { id: 3, title: 'Parents Home', subtitle: 'Jubilee Hills, Hyderabad',         icon: '👨‍👩‍👦', lat: 17.4314, lng: 78.4055 },
];

const POPULAR_AREAS = [
  'Banjara Hills', 'Jubilee Hills', 'Hitech City', 'Kondapur',
  'Gachibowli', 'Madhapur', 'Kukatpally', 'Miyapur', 'Ameerpet',
];

export default function MapAddressPicker({
  visible,
  onClose,
  onConfirm,
  initialAddress,
}) {
  const [mode, setMode]           = useState('search'); // 'search' | 'map'
  const [query, setQuery]         = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults]     = useState([]);
  const [pinLocation, setPinLoc]  = useState({ lat: 17.3850, lng: 78.4867 });
  const [resolvedAddr, setResolved] = useState(null);
  const [resolving, setResolving]   = useState(false);
  const [savedAddresses, setSaved]  = useState(RECENT_SEARCHES);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef  = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 60 }).start();
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [visible]);

  const searchAddress = useCallback(async (text) => {
    setQuery(text);
    if (text.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
      if (GOOGLE_KEY) {
        // Real Google Places Autocomplete
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&components=country:in&types=geocode&key=${GOOGLE_KEY}`
        );
        const json = await res.json();
        if (json.status === 'OK' && json.predictions?.length > 0) {
          const mapped = json.predictions.map((p, i) => ({
            id: p.place_id || String(i),
            title: p.structured_formatting?.main_text || p.description.split(',')[0],
            subtitle: p.structured_formatting?.secondary_text || p.description,
            placeId: p.place_id,
            lat: null, lng: null, // will resolve on select
          }));
          setResults(mapped);
          setSearching(false);
          return;
        }
      }
      // Fallback — search backend service areas
      const saRes = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/service-areas/search?q=${encodeURIComponent(text)}&limit=5`
      );
      const saJson = await saRes.json();
      if (saJson.success && saJson.data?.length > 0) {
        setResults(saJson.data.map(a => ({
          id: a._id, title: a.area, subtitle: `${a.city}, ${a.state || 'IN'}`,
          lat: a.location?.coordinates?.[1], lng: a.location?.coordinates?.[0],
        })));
      } else {
        // Last resort — text-based fallback
        setResults([
          { id: '1', title: `${text} Road`,     subtitle: 'Banjara Hills, Hyderabad, TS', lat: 17.4139, lng: 78.4674 },
          { id: '2', title: `${text} Colony`,   subtitle: 'Jubilee Hills, Hyderabad, TS', lat: 17.4314, lng: 78.4055 },
          { id: '3', title: `${text} Street`,   subtitle: 'Kondapur, Hyderabad, TS',      lat: 17.4484, lng: 78.3762 },
          { id: '4', title: `${text} Main Road`,subtitle: 'Madhapur, Hyderabad, TS',      lat: 17.4474, lng: 78.3913 },
        ]);
      }
    } catch {}
    setSearching(false);
  }, []);

  const selectResult = async (item) => {
    // If lat/lng already known (from service areas), use directly
    if (item.lat && item.lng) {
      setPinLoc({ lat: item.lat, lng: item.lng });
      setMode('map');
      reverseGeocode(item.lat, item.lng);
      return;
    }
    // Resolve placeId to coordinates via Google Places Details
    if (item.placeId) {
      const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
      if (GOOGLE_KEY) {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.placeId}&fields=geometry,formatted_address&key=${GOOGLE_KEY}`
          );
          const json = await res.json();
          if (json.status === 'OK') {
            const loc = json.result.geometry.location;
            setPinLoc({ lat: loc.lat, lng: loc.lng });
            setMode('map');
            reverseGeocode(loc.lat, loc.lng);
            return;
          }
        } catch {}
      }
    }
    // Fallback — use approximate centre
    setPinLoc({ lat: 17.385, lng: 78.487 });
    setMode('map');
    reverseGeocode(17.385, 78.487);
  };

  const reverseGeocode = async (lat, lng) => {
    setResolving(true);
    try {
      const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
      if (GOOGLE_KEY) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`
        );
        const json = await res.json();
        if (json.status === 'OK' && json.results?.[0]) {
          const r = json.results[0];
          const getComp = (type) => r.address_components?.find(c => c.types.includes(type))?.long_name || '';
          setResolved({
            line1:    `${getComp('street_number')} ${getComp('route')}`.trim() || r.formatted_address?.split(',')[0] || 'Selected Location',
            area:     getComp('sublocality_level_1') || getComp('sublocality') || getComp('neighborhood'),
            city:     getComp('locality') || getComp('administrative_area_level_2'),
            state:    getComp('administrative_area_level_1'),
            pincode:  getComp('postal_code'),
            formatted: r.formatted_address,
            lat, lng,
          });
          setResolving(false);
          return;
        }
      }
      // Fallback when no API key
      setResolved({
        line1:    query || 'Selected Location',
        area:     '',
        city:     'Hyderabad',
        state:    'Telangana',
        pincode:  '500034',
        formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat, lng,
      });
    } catch {
      setResolved({ line1: 'Selected Location', city: 'Hyderabad', pincode: '500034', lat, lng });
    }
    setResolving(false);
  };

  const onPinDrag = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinLoc({ lat: latitude, lng: longitude });
    reverseGeocode(latitude, longitude);
  };

  const confirmLocation = () => {
    if (!resolvedAddr) {
      Alert.alert('Please wait', 'Fetching address details...');
      return;
    }
    onConfirm?.(resolvedAddr);
    onClose?.();
  };

  const goToCurrentLocation = async () => {
    try {
      // Use LocationContext if available (real GPS + IP fallback)
      const { useLocation } = require('../context/LocationContext');
      // Direct geolocation-service call as primary path
      let Geolocation = null;
      try { Geolocation = require('react-native-geolocation-service').default; } catch {}
      if (Geolocation) {
        Geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPinLoc(coords);
            reverseGeocode(coords.lat, coords.lng);
          },
          () => {
            // GPS failed — use IP fallback
            fetch('https://ipapi.co/json/')
              .then(r => r.json())
              .then(d => {
                if (d.latitude && d.longitude) {
                  setPinLoc({ lat: d.latitude, lng: d.longitude });
                  reverseGeocode(d.latitude, d.longitude);
                }
              })
              .catch(() => {});
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        // No GPS SDK — use IP fallback
        const res  = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setPinLoc({ lat: data.latitude, lng: data.longitude });
          reverseGeocode(data.latitude, data.longitude);
        }
      }
    } catch (e) {
      console.warn('[MapAddressPicker] goToCurrentLocation error:', e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={S.container}>

        {/* ── Search Mode ─────────────────────────────────────── */}
        {mode === 'search' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            {/* Header */}
            <View style={S.searchHeader}>
              <TouchableOpacity onPress={onClose} style={S.backBtn}>
                <Text style={S.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={S.headerTitle}>Enter Your Address</Text>
            </View>

            {/* Search Bar */}
            <View style={S.searchBar}>
              <Text style={S.searchIcon}>🔍</Text>
              <TextInput
                ref={inputRef}
                style={S.searchInput}
                placeholder="Search area, street, landmark..."
                placeholderTextColor={Colors.lightGray}
                value={query}
                onChangeText={searchAddress}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color={Colors.primary} />}
              {query.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Text style={S.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Use current location */}
            <TouchableOpacity style={S.gpsBtn} onPress={() => { goToCurrentLocation(); setMode('map'); }}>
              <Text style={S.gpsIcon}>📍</Text>
              <View style={S.gpsBtnText}>
                <Text style={S.gpsTitle}>Use current location</Text>
                <Text style={S.gpsSub}>Using GPS to detect your location</Text>
              </View>
              <Text style={S.gpsArrow}>›</Text>
            </TouchableOpacity>

            <View style={S.divider} />

            {/* Search Results */}
            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={i => i.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={S.resultRow} onPress={() => selectResult(item)}>
                    <View style={S.resultIcon}><Text style={{ fontSize: 18 }}>📍</Text></View>
                    <View style={S.resultInfo}>
                      <Text style={S.resultTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={S.resultSub}   numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : query.length === 0 ? (
              <View style={{ flex: 1 }}>
                {/* Recent */}
                <Text style={S.sectionLabel}>RECENT</Text>
                {savedAddresses.map(a => (
                  <TouchableOpacity key={a.id} style={S.resultRow} onPress={() => selectResult(a)}>
                    <View style={S.resultIcon}><Text style={{ fontSize: 18 }}>{a.icon}</Text></View>
                    <View style={S.resultInfo}>
                      <Text style={S.resultTitle}>{a.title}</Text>
                      <Text style={S.resultSub} numberOfLines={1}>{a.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Popular areas */}
                <Text style={[S.sectionLabel, { marginTop: 16 }]}>POPULAR AREAS IN HYDERABAD</Text>
                <View style={S.areasWrap}>
                  {POPULAR_AREAS.map(area => (
                    <TouchableOpacity key={area} style={S.areaChip} onPress={() => searchAddress(area)}>
                      <Text style={S.areaChipText}>{area}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={S.noResults}>
                <Text style={S.noResultsIcon}>🔍</Text>
                <Text style={S.noResultsText}>No results for "{query}"</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        )}

        {/* ── Map Mode ─────────────────────────────────────────── */}
        {mode === 'map' && (
          <View style={{ flex: 1 }}>
            {/* Map Header */}
            <View style={S.mapHeader}>
              <TouchableOpacity onPress={() => setMode('search')} style={S.backBtn}>
                <Text style={S.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={S.headerTitle}>Confirm Location</Text>
            </View>

            {/* Real MapView (react-native-maps) with placeholder fallback */}
            <View style={S.mapContainer}>
              {MapView ? (
                <MapView
                  style={{ flex: 1 }}
                  provider="google"
                  initialRegion={{
                    latitude:      pinLocation.lat,
                    longitude:     pinLocation.lng,
                    latitudeDelta:  0.01,
                    longitudeDelta: 0.01,
                  }}
                  onRegionChangeComplete={(region) => {
                    setPinLocation({ lat: region.latitude, lng: region.longitude });
                  }}
                  showsUserLocation
                  showsMyLocationButton={false}
                >
                  {Marker && (
                    <Marker coordinate={{ latitude: pinLocation.lat, longitude: pinLocation.lng }} />
                  )}
                </MapView>
              ) : (
                <View style={S.mapPlaceholder}>
                  <Text style={S.mapPlaceholderEmoji}>🗺️</Text>
                  <Text style={S.mapPlaceholderText}>
                    {'Install react-native-maps\nfor live map view'}
                  </Text>
                  <Text style={S.mapCoords}>
                    📍 {pinLocation.lat.toFixed(4)}, {pinLocation.lng.toFixed(4)}
                  </Text>
                </View>
              )}

              {/* Center pin overlay (for non-MapView mode) */}
              {!MapView && (
                <View style={S.centerPin}>
                  <Text style={S.pinEmoji}>📍</Text>
                  <View style={S.pinShadow} />
                </View>
              )}

              {/* GPS button */}
              <TouchableOpacity style={S.gpsCircle} onPress={goToCurrentLocation}>
                <Text style={S.gpsCircleIcon}>🎯</Text>
              </TouchableOpacity>
            </View>

            {/* Address Card */}
            <View style={S.addressCard}>
              {resolving ? (
                <View style={S.resolvingRow}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={S.resolvingText}>Getting address details...</Text>
                </View>
              ) : resolvedAddr ? (
                <>
                  <View style={S.addrRow}>
                    <Text style={S.addrIcon}>🏠</Text>
                    <View style={S.addrInfo}>
                      <Text style={S.addrTitle}>{resolvedAddr.area}</Text>
                      <Text style={S.addrFull} numberOfLines={2}>{resolvedAddr.formatted}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setMode('search')}>
                      <Text style={S.changeText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={S.movePrompt}>
                    📌 Move the map to adjust pin location
                  </Text>

                  <TouchableOpacity style={S.confirmBtn} onPress={confirmLocation}>
                    <Text style={S.confirmText}>Confirm This Location →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={S.movePrompt}>Move the map to select your location</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.white },
  searchHeader:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12, backgroundColor: Colors.white, ...Shadows.sm },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  backIcon:   { fontSize: 22, color: Colors.black },
  headerTitle:{ flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 14, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1.5, borderColor: Colors.primary },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, ...Typography.body, color: Colors.black },
  clearIcon:   { fontSize: 14, color: Colors.midGray },

  gpsBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  gpsIcon:    { fontSize: 22, color: Colors.primary },
  gpsBtnText: { flex: 1 },
  gpsTitle:   { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  gpsSub:     { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  gpsArrow:   { fontSize: 22, color: Colors.midGray },

  divider:    { height: 6, backgroundColor: Colors.offWhite },

  sectionLabel: { ...Typography.small, color: Colors.gray, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },

  resultRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  resultIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1 },
  resultTitle:{ ...Typography.body, color: Colors.black, fontWeight: '600' },
  resultSub:  { ...Typography.caption, color: Colors.gray, marginTop: 2 },

  areasWrap:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  areaChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.offWhite, borderWidth: 1, borderColor: Colors.lightGray },
  areaChipText:{ ...Typography.caption, color: Colors.darkGray, fontWeight: '600' },

  noResults:      { alignItems: 'center', paddingVertical: 48 },
  noResultsIcon:  { fontSize: 36, marginBottom: 8 },
  noResultsText:  { ...Typography.body, color: Colors.gray },

  mapHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12, backgroundColor: Colors.white, ...Shadows.sm, zIndex: 10 },
  mapContainer:{ flex: 1, position: 'relative', backgroundColor: '#E8EAF0' },
  mapPlaceholder:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapPlaceholderEmoji:{ fontSize: 64, marginBottom: 12 },
  mapPlaceholderText: { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 22 },
  mapCoords:   { ...Typography.caption, color: Colors.primary, marginTop: 8, fontWeight: '700' },

  centerPin:  { position: 'absolute', top: '50%', left: '50%', marginLeft: -16, marginTop: -40, alignItems: 'center' },
  pinEmoji:   { fontSize: 32 },
  pinShadow:  { width: 10, height: 4, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.2)' },

  gpsCircle:     { position: 'absolute', bottom: 16, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  gpsCircleIcon: { fontSize: 22 },

  addressCard: { backgroundColor: Colors.white, padding: 20, borderTopWidth: 1, borderTopColor: Colors.offWhite },
  resolvingRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  resolvingText:{ ...Typography.body, color: Colors.gray },
  addrRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  addrIcon:    { fontSize: 24, marginTop: 2 },
  addrInfo:    { flex: 1 },
  addrTitle:   { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 2 },
  addrFull:    { ...Typography.caption, color: Colors.gray, lineHeight: 18 },
  changeText:  { ...Typography.caption, color: Colors.primary, fontWeight: '700', paddingTop: 2 },
  movePrompt:  { ...Typography.caption, color: Colors.gray, textAlign: 'center', marginBottom: 14 },
  confirmBtn:  { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  confirmText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  mapHeader2:  { flexDirection: 'row' },
});
