/**
 * MK App — LocationContext
 * GPS location, permissions, reverse geocoding, nearby professionals
 * Real react-native-geolocation-service + react-native-permissions wired.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, Linking, AppState } from 'react-native';

// Real SDK imports — graceful fallback if not yet linked
let Geolocation = null;
let check = null, request = null, PERMISSIONS = null, RESULTS = null;
try {
  Geolocation = require('react-native-geolocation-service').default;
} catch { /* will fall back to IP-based location */ }
try {
  const perms = require('react-native-permissions');
  check       = perms.check;
  request     = perms.request;
  PERMISSIONS  = perms.PERMISSIONS;
  RESULTS      = perms.RESULTS;
} catch { /* permissions package not linked */ }

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_KEY         = process.env.GOOGLE_MAPS_API_KEY || '';
const DEFAULT_CITY       = 'Hyderabad';
const DEFAULT_COORDS     = { lat: 17.3850, lng: 78.4867 }; // only used as last resort fallback

const LocationContext = createContext(null);

export const LOCATION_STATUS = {
  UNKNOWN:    'unknown',
  REQUESTING: 'requesting',
  GRANTED:    'granted',
  DENIED:     'denied',
  BLOCKED:    'blocked',
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationProvider({ children }) {
  const [status,       setStatus]    = useState(LOCATION_STATUS.UNKNOWN);
  const [location,     setLocation]  = useState(null);
  const [address,      setAddress]   = useState(null);
  const [loading,      setLoading]   = useState(false);
  const [nearbyPros,   setNearbyPros]= useState([]);
  const [selectedCity, setCity]      = useState(DEFAULT_CITY);
  const watchId  = useRef(null);
  const appState = useRef(AppState.currentState);

  // Re-check permission when returning from device Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (status === LOCATION_STATUS.BLOCKED) checkPermission();
      }
      appState.current = nextState;
    });
    return () => sub?.remove();
  }, [status]);

  useEffect(() => {
    checkPermission();
    return () => { if (watchId.current !== null) clearWatch(); };
  }, []);

  // ── Permission check ─────────────────────────────────────────
  const checkPermission = async () => {
    if (!check || !PERMISSIONS || !RESULTS) {
      // react-native-permissions not linked — proceed directly
      setStatus(LOCATION_STATUS.GRANTED);
      getCurrentLocation();
      return;
    }
    try {
      const perm   = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      const result = await check(perm);
      if (result === RESULTS.GRANTED) {
        setStatus(LOCATION_STATUS.GRANTED);
        getCurrentLocation();
      } else if (result === RESULTS.BLOCKED) {
        setStatus(LOCATION_STATUS.BLOCKED);
      } else {
        setStatus(LOCATION_STATUS.UNKNOWN);
        // Will prompt when needed
      }
    } catch (e) {
      console.error('[Location] checkPermission error:', e.message);
      // Fallback: try anyway
      setStatus(LOCATION_STATUS.GRANTED);
      getCurrentLocation();
    }
  };

  // ── Request permission ───────────────────────────────────────
  const requestPermission = async () => {
    setStatus(LOCATION_STATUS.REQUESTING);
    if (!request || !PERMISSIONS || !RESULTS) {
      setStatus(LOCATION_STATUS.GRANTED);
      await getCurrentLocation();
      return true;
    }
    try {
      const perm   = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      const result = await request(perm);
      if (result === RESULTS.GRANTED) {
        setStatus(LOCATION_STATUS.GRANTED);
        await getCurrentLocation();
        return true;
      } else if (result === RESULTS.BLOCKED) {
        setStatus(LOCATION_STATUS.BLOCKED);
        openSettings();
        return false;
      } else {
        setStatus(LOCATION_STATUS.DENIED);
        return false;
      }
    } catch (e) {
      console.error('[Location] requestPermission error:', e.message);
      setStatus(LOCATION_STATUS.DENIED);
      return false;
    }
  };

  // ── Get current position ─────────────────────────────────────
  const getCurrentLocation = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (Geolocation) {
        // Real GPS — react-native-geolocation-service
        await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (pos) => {
              const coords = {
                lat:       pos.coords.latitude,
                lng:       pos.coords.longitude,
                accuracy:  pos.coords.accuracy,
                timestamp: pos.timestamp,
              };
              setLocation(coords);
              setStatus(LOCATION_STATUS.GRANTED);
              reverseGeocode(coords.lat, coords.lng).then(() => fetchNearbyPros(coords.lat, coords.lng));
              resolve(coords);
            },
            (err) => {
              console.warn('[Location] GPS error, trying IP fallback:', err.message);
              _ipFallback().then(resolve).catch(reject);
            },
            {
              enableHighAccuracy:  true,
              timeout:             15000,
              maximumAge:          10000,
              forceRequestLocation: true,
            }
          );
        });
      } else {
        // Geolocation package not linked — use IP-based fallback
        await _ipFallback();
      }
    } catch (e) {
      console.error('[Location] getCurrentLocation error:', e.message);
      // Last resort: use default city coords
      _useDefault();
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // IP-based geolocation fallback (no native permission needed)
  const _ipFallback = async () => {
    try {
      const res  = await fetch('https://ipapi.co/json/', { timeout: 5000 });
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const coords = { lat: data.latitude, lng: data.longitude, accuracy: 5000, timestamp: Date.now() };
        setLocation(coords);
        setStatus(LOCATION_STATUS.GRANTED);
        await reverseGeocode(coords.lat, coords.lng);
        await fetchNearbyPros(coords.lat, coords.lng);
        return coords;
      }
    } catch {}
    return _useDefault();
  };

  // True last resort — Hyderabad default
  const _useDefault = () => {
    const coords = { ...DEFAULT_COORDS, accuracy: 99999, timestamp: Date.now() };
    setLocation(coords);
    setStatus(LOCATION_STATUS.GRANTED);
    setAddress({ area: 'Banjara Hills', city: DEFAULT_CITY, state: 'Telangana', pincode: '500034', formatted: 'Banjara Hills, Hyderabad, Telangana 500034', ...coords });
    setCity(DEFAULT_CITY);
  };

  // ── Watch position ───────────────────────────────────────────
  const startWatching = useCallback(() => {
    if (!Geolocation) return;
    if (watchId.current !== null) return;
    watchId.current = Geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat:       pos.coords.latitude,
          lng:       pos.coords.longitude,
          accuracy:  pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setLocation(coords);
      },
      (err) => console.warn('[Location] watchPosition error:', err.message),
      { enableHighAccuracy: true, distanceFilter: 50, interval: 10000, fastestInterval: 5000 }
    );
  }, []);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null && Geolocation) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  // ── Reverse geocode ──────────────────────────────────────────
  const reverseGeocode = async (lat, lng) => {
    try {
      if (GOOGLE_KEY) {
        // Real Google Geocoding API
        const res  = await fetch(`${GOOGLE_GEOCODE_URL}?latlng=${lat},${lng}&key=${GOOGLE_KEY}`);
        const data = await res.json();
        if (data.results?.[0]) {
          const comps = data.results[0].address_components || [];
          const get   = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
          const addr  = {
            area:      get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
            city:      get('locality') || get('administrative_area_level_2'),
            state:     get('administrative_area_level_1'),
            pincode:   get('postal_code'),
            formatted: data.results[0].formatted_address,
            lat,
            lng,
          };
          setAddress(addr);
          if (addr.city) setCity(addr.city);
          return addr;
        }
      }
      // Fallback: call our own backend reverse geocode
      const { api } = require('../utils/api');
      const res = await api.get(`/service-areas/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.data?.address) {
        setAddress(res.data.address);
        if (res.data.address.city) setCity(res.data.address.city);
        return res.data.address;
      }
    } catch (e) {
      console.warn('[Location] reverseGeocode error:', e.message);
    }
    return null;
  };

  // ── Forward geocode ──────────────────────────────────────────
  const geocodeAddress = async (addressText) => {
    try {
      if (GOOGLE_KEY) {
        const encoded = encodeURIComponent(addressText);
        const res     = await fetch(`${GOOGLE_GEOCODE_URL}?address=${encoded}&key=${GOOGLE_KEY}&region=IN`);
        const data    = await res.json();
        if (data.results?.[0]?.geometry?.location) {
          return {
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng,
          };
        }
      }
    } catch (e) {
      console.warn('[Location] geocodeAddress error:', e.message);
    }
    return null;
  };

  // ── Nearby pros ──────────────────────────────────────────────
  const fetchNearbyPros = async (lat, lng, radius = 10) => {
    try {
      const { api } = require('../utils/api');
      const res = await api.get(`/search/nearby-professionals?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (res.data?.data) {
        const prosWithDist = res.data.data
          .map(pro => ({
            ...pro,
            distance: pro.location?.coordinates
              ? getDistanceKm(lat, lng, pro.location.coordinates[1], pro.location.coordinates[0])
              : null,
          }))
          .sort((a, b) => (a.distance || 99) - (b.distance || 99));
        setNearbyPros(prosWithDist);
      }
    } catch { /* non-fatal */ }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const openSettings = () => {
    Alert.alert(
      'Location Access Required',
      'MK App needs your location to show nearby professionals and accurate service availability.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const promptLocation = () => {
    Alert.alert(
      '📍 Allow Location Access',
      'MK App uses your location to:\n• Show professionals near you\n• Auto-fill your address\n• Provide accurate service availability',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Allow', onPress: () => requestPermission() },
      ]
    );
  };

  const getDistanceFromUser = (proLat, proLng) => {
    if (!location) return null;
    return getDistanceKm(location.lat, location.lng, proLat, proLng);
  };

  return (
    <LocationContext.Provider value={{
      status, location, address, loading, nearbyPros, selectedCity,
      requestPermission,
      getCurrentLocation,
      startWatching,
      clearWatch,
      reverseGeocode,
      geocodeAddress,
      fetchNearbyPros,
      openSettings,
      promptLocation,
      setCity,
      isGranted:       status === LOCATION_STATUS.GRANTED,
      isBlocked:       status === LOCATION_STATUS.BLOCKED,
      isDenied:        status === LOCATION_STATUS.DENIED,
      hasLocation:     !!location,
      getDistanceFromUser,
      getDistanceKm,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider');
  return ctx;
}

export default LocationContext;
