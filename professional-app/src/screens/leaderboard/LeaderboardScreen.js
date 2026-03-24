/**
 * Slot App Professional — Leaderboard Screen (Full)
 * Weekly/monthly rankings, badges, top earners, performance tiers
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Dimensions, FlatList, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Ravi Kumar',    category: 'Electrician',  city: 'Hyderabad', rating: 4.98, jobs: 312, earnings: 128400, badge: '🥇', tier: 'platinum', avatar: '👨' },
  { rank: 2, name: 'Priya Singh',   category: 'Salon',        city: 'Mumbai',    rating: 4.96, jobs: 298, earnings: 115200, badge: '🥈', tier: 'platinum', avatar: '👩' },
  { rank: 3, name: 'Suresh Patel',  category: 'Plumbing',     city: 'Bangalore', rating: 4.95, jobs: 287, earnings: 109800, badge: '🥉', tier: 'platinum', avatar: '👨' },
  { rank: 4, name: 'Anita Sharma',  category: 'Cleaning',     city: 'Delhi',     rating: 4.93, jobs: 274, earnings: 98600,  badge: '⭐', tier: 'gold',     avatar: '👩' },
  { rank: 5, name: 'Kiran Reddy',   category: 'AC Repair',    city: 'Hyderabad', rating: 4.92, jobs: 265, earnings: 94200,  badge: '⭐', tier: 'gold',     avatar: '👨' },
  { rank: 6, name: 'Deepa Nair',    category: 'Massage',      city: 'Chennai',   rating: 4.91, jobs: 259, earnings: 91800,  badge: '⭐', tier: 'gold',     avatar: '👩' },
  { rank: 7, name: 'Rajesh More',   category: 'Carpentry',    city: 'Pune',      rating: 4.90, jobs: 248, earnings: 87400,  badge: '⭐', tier: 'gold',     avatar: '👨' },
  { rank: 8, name: 'Meena Iyer',    category: 'Yoga',         city: 'Bangalore', rating: 4.89, jobs: 241, earnings: 84200,  badge: '⭐', tier: 'silver',   avatar: '👩' },
  { rank: 9, name: 'Arun Verma',    category: 'Painting',     city: 'Jaipur',    rating: 4.88, jobs: 236, earnings: 82000,  badge: '⭐', tier: 'silver',   avatar: '👨' },
  { rank: 10, name: 'Sonal Gupta',  category: 'Physio',       city: 'Ahmedabad', rating: 4.87, jobs: 229, earnings: 79800,  badge: '⭐', tier: 'silver',   avatar: '👩' },
];

const currentUser = { rank: 14, name: 'You', category: 'Electrician', city: 'Hyderabad', rating: 4.85, jobs: 198, earnings: 68400, badge: '🎯', tier: 'silver', avatar: '😊' };

const BADGES = [
  { id: 'top10',       icon: '🏆', label: 'Top 10',          desc: 'Rank in top 10 weekly',      earned: false },
  { id: 'century',     icon: '💯', label: '100 Jobs',         desc: 'Complete 100 jobs',           earned: true  },
  { id: 'perfect',     icon: '⭐', label: 'Perfect Rating',   desc: 'Maintain 5.0 for a month',   earned: false },
  { id: 'speedster',   icon: '⚡', label: 'Speedster',        desc: 'Accept 95% jobs in 30s',     earned: true  },
  { id: 'consistent',  icon: '📅', label: '30-Day Streak',    desc: 'Active 30 consecutive days', earned: true  },
  { id: 'earner',      icon: '💰', label: 'Top Earner',       desc: 'Earn ₹1L+ in a month',       earned: false },
  { id: 'reviewer',    icon: '📝', label: '50 Reviews',       desc: 'Get 50 five-star reviews',   earned: true  },
  { id: 'referrer',    icon: '🤝', label: 'Team Builder',     desc: 'Refer 5 professionals',      earned: false },
];

const TIER_CONFIG = {
  platinum: { color: '#B5A9D4', bg: '#F3F0FF', label: 'Platinum', icon: '💎', minRank: 1,  maxRank: 5  },
  gold:     { color: '#FFD700', bg: '#FFFDE7', label: 'Gold',     icon: '🥇', minRank: 6,  maxRank: 20 },
  silver:   { color: '#B0BEC5', bg: '#F5F5F5', label: 'Silver',   icon: '🥈', minRank: 21, maxRank: 50 },
  bronze:   { color: '#CD7F32', bg: '#FBE9E7', label: 'Bronze',   icon: '🥉', minRank: 51, maxRank: 999 },
};

function TopThreeCard({ pro, position }) {
  const scale = position === 1 ? 1.08 : 0.95;
  const marginTop = position === 1 ? 0 : 20;
  const gradients = {
    1: ['#FFD700', '#FFA000'],
    2: ['#B0BEC5', '#78909C'],
    3: ['#CD7F32', '#A1631B'],
  };

  return (
    <Animated.View style={[styles.topCard, { transform: [{ scale }], marginTop }]}>
      <LinearGradient colors={gradients[position]} style={styles.topCardGrad}>
        <Text style={styles.topRankLabel}>#{position}</Text>
        <Text style={styles.topAvatar}>{pro.avatar}</Text>
        <Text style={styles.topBadge}>{pro.badge}</Text>
        <Text style={styles.topName} numberOfLines={1}>{pro.name.split(' ')[0]}</Text>
        <Text style={styles.topCategory}>{pro.category}</Text>
        <Text style={styles.topJobs}>{pro.jobs} jobs</Text>
        <Text style={styles.topRating}>⭐ {pro.rating}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function LeaderboardRow({ pro, isCurrentUser }) {
  const tierConf = TIER_CONFIG[pro.tier] || TIER_CONFIG.bronze;
  return (
    <View style={[styles.row, isCurrentUser && styles.rowHighlight]}>
      <View style={styles.rowRank}>
        <Text style={[styles.rowRankNum, isCurrentUser && { color: '#E94560' }]}>#{pro.rank}</Text>
      </View>
      <Text style={styles.rowAvatar}>{pro.avatar}</Text>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameRow}>
          <Text style={[styles.rowName, isCurrentUser && { color: '#E94560' }]}>
            {isCurrentUser ? 'You' : pro.name}
          </Text>
          <View style={[styles.tierChip, { backgroundColor: tierConf.bg }]}>
            <Text style={[styles.tierChipText, { color: tierConf.color }]}>{tierConf.icon} {tierConf.label}</Text>
          </View>
        </View>
        <Text style={styles.rowMeta}>{pro.category} • {pro.city}</Text>
      </View>
      <View style={styles.rowStats}>
        <Text style={styles.rowJobs}>{pro.jobs}</Text>
        <Text style={styles.rowJobsLabel}>jobs</Text>
        <Text style={[styles.rowRating, { color: '#F5A623' }]}>⭐ {pro.rating}</Text>
      </View>
    </View>
  );
}

function BadgeCard({ badge }) {
  return (
    <View style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
      <Text style={[styles.badgeIcon, !badge.earned && styles.badgeIconLocked]}>{badge.icon}</Text>
      <Text style={[styles.badgeLabel, !badge.earned && styles.badgeLabelLocked]}>{badge.label}</Text>
      <Text style={styles.badgeDesc}>{badge.desc}</Text>
      {badge.earned && <View style={styles.earnedDot}><Text style={styles.earnedDotText}>✓</Text></View>}
      {!badge.earned && <Text style={styles.lockedText}>🔒 Locked</Text>}
    </View>
  );
}

export default function LeaderboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('weekly');
  const [activeTab, setActiveTab] = useState('overall');
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState(MOCK_LEADERBOARD);
  const [currentUser, setCurrentUser] = useState(currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, [period, activeTab]);

  const fetchLeaderboard = async () => {
    try {
      const token = await AsyncStorage.getItem('proToken');
      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/leaderboard?period=${period}&category=${activeTab}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (data.success && data.leaderboard?.length > 0) {
        setLeaderboardData(data.leaderboard);
        if (data.currentUser) setCurrentUser(data.currentUser);
      }
    } catch { /* keep MOCK_LEADERBOARD */ }
    finally { setLoading(false); }
  };
  const scrollY = useRef(new Animated.Value(0)).current;

  const TABS = [
    { key: 'overall', label: 'Overall' },
    { key: 'category', label: 'My Category' },
    { key: 'city', label: 'My City' },
  ];

  const PERIODS = [
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'alltime', label: 'All Time' },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const myTierConf = TIER_CONFIG[currentUser.tier];
  const headerBg = scrollY.interpolate({ inputRange: [0, 100], outputRange: ['transparent', '#1A1A2E'], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Sticky Header */}
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#0F3460', '#E94560']} style={styles.hero}>
          <Text style={styles.heroTitle}>🏆 Rankings</Text>
          <Text style={styles.heroSub}>Compete. Earn more. Level up.</Text>

          {/* My current rank card */}
          <View style={styles.myRankCard}>
            <View style={styles.myRankLeft}>
              <Text style={styles.myRankAvatar}>{currentUser.avatar}</Text>
              <View>
                <Text style={styles.myRankName}>Your Position</Text>
                <Text style={styles.myRankTier}>{myTierConf.icon} {myTierConf.label} Tier</Text>
              </View>
            </View>
            <View style={styles.myRankRight}>
              <Text style={styles.myRankNum}>#{currentUser.rank}</Text>
              <Text style={styles.myRankSub}>of 1,240</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodBtnText, period === p.key && styles.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My stats snapshot */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Your Stats This Week</Text>
          <View style={styles.statsGrid}>
            {[
              ['#{0}', currentUser.rank, 'Rank'],
              ['⭐', currentUser.rating, 'Rating'],
              ['💼', currentUser.jobs, 'Jobs Done'],
              ['💰', `₹${(currentUser.earnings / 1000).toFixed(1)}k`, 'Earned'],
            ].map(([icon, val, lbl], i) => (
              <View key={i} style={styles.statBox}>
                <Text style={styles.statBoxVal}>{String(val).replace('{0}', '')}{icon === '#{0}' ? '' : ''}</Text>
                <Text style={styles.statBoxLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
          <View style={styles.rankProgress}>
            <Text style={styles.rankProgressText}>📈 You're 12 jobs away from breaking into top 10!</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top 3 Podium */}
        <View style={styles.podium}>
          <TopThreeCard pro={leaderboardData[1]} position={2} />
          <TopThreeCard pro={leaderboardData[0]} position={1} />
          <TopThreeCard pro={leaderboardData[2]} position={3} />
        </View>

        {/* Full Rankings */}
        <View style={styles.rankingsList}>
          <Text style={styles.rankingsTitle}>Full Rankings</Text>
          {leaderboardData.slice(3).map(pro => (
            <LeaderboardRow key={pro.rank} pro={pro} isCurrentUser={false} />
          ))}
          {/* Separator before current user */}
          <View style={styles.myRankSeparator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>Your Position</Text>
            <View style={styles.separatorLine} />
          </View>
          <LeaderboardRow pro={currentUser} isCurrentUser={true} />
        </View>

        {/* Badges */}
        <View style={styles.badgesSection}>
          <Text style={styles.badgesTitle}>🏅 Achievement Badges</Text>
          <Text style={styles.badgesSubtitle}>{BADGES.filter(b => b.earned).length}/{BADGES.length} earned</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {BADGES.map(badge => <BadgeCard key={badge.id} badge={badge} />)}
          </ScrollView>
        </View>

        {/* Tier Info */}
        <View style={styles.tierSection}>
          <Text style={styles.tierSectionTitle}>🎖️ Performance Tiers</Text>
          {Object.values(TIER_CONFIG).map((tier, i) => (
            <View key={i} style={[styles.tierRow, { backgroundColor: tier.bg, borderLeftColor: tier.color }]}>
              <Text style={styles.tierRowIcon}>{tier.icon}</Text>
              <View style={styles.tierRowInfo}>
                <Text style={[styles.tierRowLabel, { color: tier.color }]}>{tier.label}</Text>
                <Text style={styles.tierRowRange}>Rank #{tier.minRank}–{tier.maxRank || '∞'}</Text>
              </View>
              {currentUser.tier === Object.keys(TIER_CONFIG)[i] && (
                <View style={styles.currentTierBadge}><Text style={styles.currentTierText}>You're here</Text></View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  hero: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 20 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  myRankCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 18 },
  myRankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myRankAvatar: { fontSize: 36 },
  myRankName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  myRankTier: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  myRankRight: { alignItems: 'flex-end' },
  myRankNum: { fontSize: 32, fontWeight: '900', color: '#FFD700' },
  myRankSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  periodSelector: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#1A1A2E' },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  periodBtnTextActive: { color: '#fff' },
  statsCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 18, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  statsTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statBoxVal: { fontSize: 18, fontWeight: '900', color: '#1A1A2E' },
  statBoxLbl: { fontSize: 11, color: '#888', marginTop: 2 },
  rankProgress: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 14 },
  rankProgressText: { fontSize: 13, color: '#27AE60', fontWeight: '600', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 4, marginTop: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#E94560' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginTop: 24, paddingHorizontal: 16 },
  topCard: { flex: 1, marginHorizontal: 4 },
  topCardGrad: { borderRadius: 18, padding: 14, alignItems: 'center' },
  topRankLabel: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  topAvatar: { fontSize: 32, marginBottom: 4 },
  topBadge: { fontSize: 20, marginBottom: 4 },
  topName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  topCategory: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  topJobs: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 6 },
  topRating: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  rankingsList: { margin: 16 },
  rankingsTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  rowHighlight: { backgroundColor: '#FFF0F3', borderWidth: 1.5, borderColor: '#E94560' },
  rowRank: { width: 36, alignItems: 'center' },
  rowRankNum: { fontSize: 14, fontWeight: '800', color: '#888' },
  rowAvatar: { fontSize: 28, marginHorizontal: 10 },
  rowInfo: { flex: 1 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  tierChip: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  tierChipText: { fontSize: 9, fontWeight: '700' },
  rowMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  rowStats: { alignItems: 'flex-end' },
  rowJobs: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  rowJobsLabel: { fontSize: 9, color: '#888' },
  rowRating: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  myRankSeparator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E94560' },
  separatorText: { fontSize: 12, fontWeight: '700', color: '#E94560' },
  badgesSection: { marginTop: 8 },
  badgesTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginHorizontal: 16, marginBottom: 4 },
  badgesSubtitle: { fontSize: 13, color: '#888', marginHorizontal: 16, marginBottom: 14 },
  badgeCard: { width: 130, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', position: 'relative', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  badgeCardLocked: { opacity: 0.6 },
  badgeIcon: { fontSize: 36, marginBottom: 8 },
  badgeIconLocked: { filter: 'grayscale(1)' },
  badgeLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  badgeLabelLocked: { color: '#AAA' },
  badgeDesc: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 4, lineHeight: 14 },
  earnedDot: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#27AE60', justifyContent: 'center', alignItems: 'center' },
  earnedDotText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  lockedText: { fontSize: 10, color: '#AAA', marginTop: 6 },
  tierSection: { margin: 16 },
  tierSectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 14 },
  tierRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 8, borderLeftWidth: 4 },
  tierRowIcon: { fontSize: 28, marginRight: 14 },
  tierRowInfo: { flex: 1 },
  tierRowLabel: { fontSize: 15, fontWeight: '700' },
  tierRowRange: { fontSize: 12, color: '#888', marginTop: 2 },
  currentTierBadge: { backgroundColor: '#E94560', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  currentTierText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
