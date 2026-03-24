/**
 * Slot App — RebookScreen
 * UC feature: "Book the same professional again"
 * Shows past professionals with ratings, lets user request them specifically
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows, Radius } from '../../utils/theme';
import { bookingsAPI } from '../../utils/api';

const { width: W } = Dimensions.get('window');

export default function RebookScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [preferred, setPreferred] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    loadPreferred();
  }, []);

  const loadPreferred = async () => {
    try {
      const { data } = await bookingsAPI.getPreferredProfessionals();
      setPreferred(data.data || []);
    } catch {
      // fallback mock data
      setPreferred([
        {
          professional: { _id: 'p1', rating: 4.9, totalBookings: 234, skills: ['AC Service', 'Electrical'], user: { name: 'Rajesh Kumar' } },
          lastService: 'AC Service',
          lastBookingDate: new Date(Date.now() - 7 * 864e5),
          rating: 5,
        },
        {
          professional: { _id: 'p2', rating: 4.8, totalBookings: 178, skills: ['Deep Cleaning', 'Pest Control'], user: { name: 'Suresh Nair' } },
          lastService: 'Deep Cleaning',
          lastBookingDate: new Date(Date.now() - 22 * 864e5),
          rating: 4,
        },
        {
          professional: { _id: 'p3', rating: 4.7, totalBookings: 312, skills: ['Plumbing', 'Carpentry'], user: { name: 'Amit Sharma' } },
          lastService: 'Plumbing',
          lastBookingDate: new Date(Date.now() - 45 * 864e5),
          rating: 5,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRebook = (item) => {
    Alert.alert(
      `Book ${item.professional.user?.name} again?`,
      `They'll be requested for your next ${item.lastService} booking. Final assignment depends on their availability.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: () => navigation.navigate('Services', {
            preferredProId: item.professional._id,
            preferredProName: item.professional.user?.name,
            serviceHint: item.lastService,
          }),
        },
      ]
    );
  };

  const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const timeAgo = (date) => {
    const days = Math.round((Date.now() - new Date(date)) / 864e5);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return `${Math.round(days / 30)} months ago`;
  };

  const starColor = (r) => r >= 4.5 ? Colors.star : r >= 4 ? Colors.warning : Colors.gray;

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#2D2D4A']} style={S.header}>
        <TouchableOpacity style={S.back} onPress={() => navigation.goBack()}>
          <Text style={S.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={S.headerTitle}>Your Favourite Pros</Text>
          <Text style={S.headerSub}>Book professionals you've loved before</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={S.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={S.loadingText}>Finding your favourite professionals…</Text>
        </View>
      ) : preferred.length === 0 ? (
        <View style={S.emptyBox}>
          <Text style={S.emptyIcon}>👷</Text>
          <Text style={S.emptyTitle}>No preferred professionals yet</Text>
          <Text style={S.emptySub}>
            Complete a booking and rate your professional 4+ stars to see them here for quick re-booking.
          </Text>
          <TouchableOpacity style={S.browseBtn} onPress={() => navigation.navigate('Services')}>
            <Text style={S.browseBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>

          <View style={S.infoCard}>
            <Text style={S.infoIcon}>💡</Text>
            <Text style={S.infoText}>
              These are professionals you've previously booked and rated highly. We'll request them for your next booking based on availability.
            </Text>
          </View>

          {preferred.map((item, idx) => {
            const pro = item.professional;
            const name = pro.user?.name || 'Professional';
            return (
              <View key={pro._id || idx} style={S.proCard}>
                {/* Avatar */}
                <View style={S.proAvatarWrap}>
                  <View style={S.proAvatar}>
                    <Text style={S.proAvatarText}>{getInitials(name)}</Text>
                  </View>
                  <View style={S.onlineDot} />
                </View>

                {/* Info */}
                <View style={S.proInfo}>
                  <Text style={S.proName}>{name}</Text>

                  <View style={S.proMeta}>
                    <Text style={[S.proRating, { color: starColor(pro.rating) }]}>
                      ★ {pro.rating?.toFixed(1)}
                    </Text>
                    <Text style={S.proDot}>·</Text>
                    <Text style={S.proJobs}>{pro.totalBookings}+ jobs</Text>
                  </View>

                  <View style={S.skillRow}>
                    {(pro.skills || []).slice(0, 2).map(s => (
                      <View key={s} style={S.skillChip}>
                        <Text style={S.skillText}>{s}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={S.lastBookingRow}>
                    <Text style={S.lastBookingIcon}>🕐</Text>
                    <Text style={S.lastBookingText}>
                      Last: {item.lastService} · {timeAgo(item.lastBookingDate)}
                    </Text>
                    <View style={S.lastRatingStars}>
                      {[1,2,3,4,5].map(n => (
                        <Text key={n} style={{ color: n <= item.rating ? Colors.star : Colors.lightGray, fontSize: 10 }}>★</Text>
                      ))}
                    </View>
                  </View>
                </View>

                {/* CTA */}
                <TouchableOpacity style={S.rebookBtn} onPress={() => handleRebook(item)} activeOpacity={0.85}>
                  <Text style={S.rebookBtnText}>Book</Text>
                  <Text style={S.rebookBtnText}>Again</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 14 },
  back:            { width: 40, height: 40, justifyContent: 'center' },
  backText:        { fontSize: 22, color: '#fff' },
  headerTitle:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  loadingBox:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:     { fontSize: 14, color: Colors.gray },

  emptyBox:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon:       { fontSize: 60, marginBottom: 16 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 8, textAlign: 'center' },
  emptySub:        { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  browseBtn:       { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  browseBtnText:   { fontSize: 15, fontWeight: '700', color: Colors.white },

  infoCard:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.infoLight || '#EAF4FB', borderRadius: 12, padding: 12 },
  infoIcon:        { fontSize: 18 },
  infoText:        { flex: 1, fontSize: 13, color: Colors.gray, lineHeight: 19 },

  proCard:         { backgroundColor: Colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, ...Shadows.sm },
  proAvatarWrap:   { position: 'relative', flexShrink: 0 },
  proAvatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryMid || '#FFD6DE', justifyContent: 'center', alignItems: 'center' },
  proAvatarText:   { fontSize: 20, fontWeight: '800', color: Colors.primary },
  onlineDot:       { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.white },

  proInfo:         { flex: 1, gap: 4 },
  proName:         { fontSize: 16, fontWeight: '700', color: Colors.black },
  proMeta:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proRating:       { fontSize: 13, fontWeight: '700' },
  proDot:          { fontSize: 12, color: Colors.lightGray },
  proJobs:         { fontSize: 12, color: Colors.gray },

  skillRow:        { flexDirection: 'row', gap: 6, marginTop: 2 },
  skillChip:       { backgroundColor: Colors.offWhite, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  skillText:       { fontSize: 11, fontWeight: '600', color: Colors.gray },

  lastBookingRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lastBookingIcon: { fontSize: 12 },
  lastBookingText: { fontSize: 11, color: Colors.midGray, flex: 1 },
  lastRatingStars: { flexDirection: 'row' },

  rebookBtn:       { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rebookBtnText:   { fontSize: 13, fontWeight: '800', color: Colors.white, lineHeight: 16 },
});
