/**
 * MK App — Admin Panel Full (Complete v2)
 * All 16 admin pages matching Urban Company admin dashboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, TextInput, Alert, ActivityIndicator, Modal,
  Switch, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width: W } = Dimensions.get('window');

// ── Shared admin components ───────────────────────────────────
function AdminCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function StatBox({ label, value, sub, color = '#E94560', icon }) {
  return (
    <View style={[styles.statBox, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}
function Badge({ text, color = '#E94560', bg = '#FFF0F3' }) {
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color }]}>{text}</Text></View>;
}
function SearchBar({ value, onChange, placeholder }) {
  return (
    <View style={styles.searchBar}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput style={styles.searchInput} value={value} onChangeText={onChange} placeholder={placeholder || 'Search...'} placeholderTextColor="#AAA" />
    </View>
  );
}
function ActionBtn({ label, color = '#E94560', onPress, small }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }, small && styles.actionBtnSm]} onPress={onPress}>
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}
function TableHeader({ cols }) {
  return (
    <View style={styles.tableHeader}>
      {cols.map((c, i) => <Text key={i} style={[styles.tableHeaderText, { flex: c.flex || 1 }]}>{c.label}</Text>)}
    </View>
  );
}
function PaginationBar({ page, total, perPage, onPrev, onNext }) {
  const totalPages = Math.ceil(total / perPage);
  return (
    <View style={styles.paginationBar}>
      <Text style={styles.paginationInfo}>Page {page} of {totalPages} ({total} total)</Text>
      <View style={styles.paginationBtns}>
        <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={onPrev} disabled={page === 1}>
          <Text style={styles.pageBtnText}>‹ Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} onPress={onNext} disabled={page === totalPages}>
          <Text style={styles.pageBtnText}>Next ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── 1. Professional Management ────────────────────────────────
export function AdminProfessionalsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const FILTERS = ['all', 'pending', 'active', 'suspended', 'training'];
  const MOCK_PROS = Array.from({ length: 40 }, (_, i) => ({
    id: `pro${i}`, name: `Professional ${i + 1}`, category: ['Electrician','Plumber','Cleaner','Salon','AC Repair'][i % 5],
    city: ['Hyderabad','Mumbai','Bangalore','Delhi','Chennai'][i % 5], rating: (4.2 + (i % 8) * 0.1).toFixed(1),
    jobs: 120 + i * 7, earnings: 45000 + i * 2000, status: ['active','active','pending','suspended','training'][i % 5],
    joinedAt: `${2024 - (i % 3)}-0${(i % 9) + 1}-15`, kyc: i % 3 !== 2, bgv: i % 4 !== 3,
  }));

  const filtered = MOCK_PROS.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  );
  const paged = filtered.slice((page - 1) * 10, page * 10);

  const handleAction = (pro, action) => {
    Alert.alert(`${action} Professional`, `${action} ${pro.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => Alert.alert('Done', `${pro.name} has been ${action.toLowerCase()}d`) },
    ]);
  };

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>👨‍🔧 Professional Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Total Pros" value="2,847" icon="👷" color="#2196F3" />
        <StatBox label="Active" value="2,341" icon="✅" color="#4CAF50" />
        <StatBox label="Pending KYC" value="156" icon="⏳" color="#FF9800" />
        <StatBox label="Suspended" value="23" icon="🚫" color="#E94560" />
      </View>

      <AdminCard>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, category, city..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => { setFilter(f); setPage(1); }}>
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AdminCard>

      <AdminCard>
        <TableHeader cols={[{ label: 'Name', flex: 2 }, { label: 'Category' }, { label: 'Rating' }, { label: 'Jobs' }, { label: 'Status' }, { label: 'Actions', flex: 2 }]} />
        {paged.map(pro => (
          <View key={pro.id} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.rowName}>{pro.name}</Text>
              <Text style={styles.rowSub}>{pro.city}</Text>
            </View>
            <Text style={[styles.rowCell, { flex: 1 }]}>{pro.category}</Text>
            <Text style={[styles.rowCell, { flex: 1 }]}>⭐{pro.rating}</Text>
            <Text style={[styles.rowCell, { flex: 1 }]}>{pro.jobs}</Text>
            <View style={{ flex: 1 }}>
              <Badge text={pro.status}
                color={pro.status === 'active' ? '#4CAF50' : pro.status === 'pending' ? '#FF9800' : pro.status === 'suspended' ? '#E94560' : '#2196F3'}
                bg={pro.status === 'active' ? '#E8F5E9' : pro.status === 'pending' ? '#FFF3E0' : pro.status === 'suspended' ? '#FFF0F3' : '#E3F2FD'}
              />
            </View>
            <View style={[styles.rowActions, { flex: 2 }]}>
              <ActionBtn label="View" color="#2196F3" onPress={() => { setSelected(pro); setShowModal(true); }} small />
              {pro.status === 'active' && <ActionBtn label="Suspend" color="#E94560" onPress={() => handleAction(pro, 'Suspend')} small />}
              {pro.status === 'suspended' && <ActionBtn label="Restore" color="#4CAF50" onPress={() => handleAction(pro, 'Restore')} small />}
              {pro.status === 'pending' && <ActionBtn label="Approve" color="#4CAF50" onPress={() => handleAction(pro, 'Approve')} small />}
            </View>
          </View>
        ))}
        <PaginationBar page={page} total={filtered.length} perPage={10} onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
      </AdminCard>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        {selected && (
          <ScrollView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Professional Profile</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.proModalName}>{selected.name}</Text>
              <Text style={styles.proModalMeta}>{selected.category} • {selected.city}</Text>
              <View style={styles.proModalStats}>
                {[['⭐', selected.rating, 'Rating'], ['💼', selected.jobs, 'Jobs'], ['💰', `₹${(selected.earnings/1000).toFixed(0)}k`, 'Earned']].map(([icon, val, lbl], i) => (
                  <View key={i} style={styles.proModalStat}>
                    <Text style={styles.proModalStatIcon}>{icon}</Text>
                    <Text style={styles.proModalStatVal}>{val}</Text>
                    <Text style={styles.proModalStatLbl}>{lbl}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.proChecks}>
                <Text style={[styles.proCheck, selected.kyc && styles.proCheckDone]}>KYC: {selected.kyc ? '✓ Verified' : '✗ Pending'}</Text>
                <Text style={[styles.proCheck, selected.bgv && styles.proCheckDone]}>BGV: {selected.bgv ? '✓ Cleared' : '✗ Pending'}</Text>
              </View>
              <View style={styles.modalActions}>
                <ActionBtn label="📞 Call" color="#2196F3" onPress={() => Alert.alert('Call', `Calling ${selected.name}`)} />
                <ActionBtn label="📧 Email" color="#4CAF50" onPress={() => Alert.alert('Email', `Emailing ${selected.name}`)} />
                <ActionBtn label="🚫 Suspend" color="#E94560" onPress={() => { handleAction(selected, 'Suspend'); setShowModal(false); }} />
              </View>
            </View>
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
}

// ── 2. Service & Pricing Management ──────────────────────────
export function AdminServiceManagementPage() {
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editService, setEditService] = useState(null);

  const SERVICES = [
    { id: 's1', name: 'AC Service & Repair', category: 'AC', price: 599, discountedPrice: 499, cities: 12, bookings: 8420, status: 'active', rating: 4.8 },
    { id: 's2', name: 'Deep House Cleaning', category: 'Cleaning', price: 799, discountedPrice: 649, cities: 15, bookings: 12300, status: 'active', rating: 4.9 },
    { id: 's3', name: "Women's Haircut", category: 'Salon', price: 499, discountedPrice: 399, cities: 10, bookings: 18700, status: 'active', rating: 4.9 },
    { id: 's4', name: 'Swedish Massage', category: 'Massage', price: 999, discountedPrice: 799, cities: 8, bookings: 6200, status: 'active', rating: 4.8 },
    { id: 's5', name: 'Interior Painting', category: 'Painting', price: 2499, discountedPrice: 1999, cities: 10, bookings: 4100, status: 'active', rating: 4.7 },
    { id: 's6', name: 'Hatha Yoga', category: 'Yoga', price: 799, discountedPrice: 699, cities: 6, bookings: 3200, status: 'paused', rating: 4.9 },
    { id: 's7', name: 'Cockroach Control', category: 'Pest Control', price: 499, discountedPrice: 299, cities: 14, bookings: 9800, status: 'active', rating: 4.8 },
    { id: 's8', name: 'Physiotherapy', category: 'Health', price: 1299, discountedPrice: 999, cities: 7, bookings: 2400, status: 'active', rating: 4.9 },
  ];

  const filtered = SERVICES.filter(s => search === '' || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🛠️ Service & Pricing Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Total Services" value="247" icon="📦" color="#9C27B0" />
        <StatBox label="Categories" value="18" icon="🏷️" color="#2196F3" />
        <StatBox label="Avg Rating" value="4.82" icon="⭐" color="#FF9800" />
        <StatBox label="Active Cities" value="15" icon="🏙️" color="#4CAF50" />
      </View>

      <AdminCard>
        <View style={styles.rowBetween}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search services..." />
          <ActionBtn label="+ Add Service" color="#9C27B0" onPress={() => Alert.alert('Add Service', 'Service creation form would open here')} />
        </View>
      </AdminCard>

      <AdminCard>
        <TableHeader cols={[{ label: 'Service', flex: 2 }, { label: 'Price' }, { label: 'Bookings' }, { label: 'Cities' }, { label: 'Status' }, { label: 'Actions' }]} />
        {filtered.map(svc => (
          <View key={svc.id} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.rowName}>{svc.name}</Text>
              <Text style={styles.rowSub}>{svc.category} • ⭐{svc.rating}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowCell}>₹{svc.discountedPrice}</Text>
              <Text style={[styles.rowSub, { textDecorationLine: 'line-through' }]}>₹{svc.price}</Text>
            </View>
            <Text style={styles.rowCell}>{svc.bookings.toLocaleString()}</Text>
            <Text style={styles.rowCell}>{svc.cities}</Text>
            <Badge text={svc.status} color={svc.status === 'active' ? '#4CAF50' : '#FF9800'} bg={svc.status === 'active' ? '#E8F5E9' : '#FFF3E0'} />
            <View style={styles.rowActions}>
              <ActionBtn label="Edit" color="#9C27B0" onPress={() => { setEditService(svc); setEditModal(true); }} small />
              <ActionBtn label={svc.status === 'active' ? 'Pause' : 'Activate'} color={svc.status === 'active' ? '#FF9800' : '#4CAF50'} onPress={() => Alert.alert('Updated')} small />
            </View>
          </View>
        ))}
      </AdminCard>

      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        {editService && (
          <ScrollView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Service</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Service Name</Text>
              <TextInput style={styles.fieldInput} defaultValue={editService.name} />
              <Text style={styles.fieldLabel}>Base Price (₹)</Text>
              <TextInput style={styles.fieldInput} defaultValue={String(editService.price)} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Discounted Price (₹)</Text>
              <TextInput style={styles.fieldInput} defaultValue={String(editService.discountedPrice)} keyboardType="numeric" />
              <Text style={styles.fieldLabel}>Active Cities</Text>
              <TextInput style={styles.fieldInput} defaultValue={String(editService.cities)} keyboardType="numeric" />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Status: Active</Text>
                <Switch value={editService.status === 'active'} onValueChange={() => {}} trackColor={{ true: '#4CAF50' }} />
              </View>
              <ActionBtn label="Save Changes" color="#9C27B0" onPress={() => { Alert.alert('Saved', 'Service updated successfully'); setEditModal(false); }} />
            </View>
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
}

// ── 3. Payout Management ─────────────────────────────────────
export function AdminPayoutManagementPage() {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');

  const PAYOUTS = Array.from({ length: 20 }, (_, i) => ({
    id: `pay${i}`, proName: `Professional ${i + 1}`, category: ['Electrician','Plumber','Cleaner'][i % 3],
    amount: 3000 + i * 500, jobs: 10 + i, period: 'Dec 16–31 2025',
    upi: `pro${i + 1}@paytm`, status: ['pending', 'pending', 'processed', 'hold'][i % 4],
    tds: Math.round((3000 + i * 500) * 0.01),
  }));

  const filtered = PAYOUTS.filter(p =>
    (tab === 'all' || p.status === tab) &&
    (search === '' || p.proName.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPending = PAYOUTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalProcessed = PAYOUTS.filter(p => p.status === 'processed').reduce((s, p) => s + p.amount, 0);

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>💰 Payout Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Pending Payouts" value={`₹${(totalPending / 1000).toFixed(0)}k`} icon="⏳" color="#FF9800" />
        <StatBox label="Processed" value={`₹${(totalProcessed / 1000).toFixed(0)}k`} icon="✅" color="#4CAF50" />
        <StatBox label="On Hold" value="₹12.4k" icon="🔒" color="#E94560" />
        <StatBox label="TDS Deducted" value="₹2.1k" icon="📋" color="#9C27B0" />
      </View>

      <AdminCard>
        <View style={styles.rowBetween}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search professionals..." />
          <ActionBtn label="Process All Pending" color="#4CAF50" onPress={() => Alert.alert('Bulk Payout', `Process ₹${(totalPending / 1000).toFixed(0)}k to ${PAYOUTS.filter(p => p.status === 'pending').length} professionals?`)} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {['pending', 'processed', 'hold', 'all'].map(t => (
            <TouchableOpacity key={t} style={[styles.filterTab, tab === t && styles.filterTabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.filterTabText, tab === t && styles.filterTabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AdminCard>

      <AdminCard>
        <TableHeader cols={[{ label: 'Professional', flex: 2 }, { label: 'Period' }, { label: 'Jobs' }, { label: 'Amount' }, { label: 'TDS' }, { label: 'Status' }, { label: 'Actions' }]} />
        {filtered.map(p => (
          <View key={p.id} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.rowName}>{p.proName}</Text>
              <Text style={styles.rowSub}>{p.upi}</Text>
            </View>
            <Text style={styles.rowCell}>{p.period}</Text>
            <Text style={styles.rowCell}>{p.jobs}</Text>
            <Text style={[styles.rowCell, { fontWeight: '700' }]}>₹{p.amount.toLocaleString()}</Text>
            <Text style={[styles.rowCell, { color: '#E94560' }]}>-₹{p.tds}</Text>
            <Badge text={p.status} color={p.status === 'pending' ? '#FF9800' : p.status === 'processed' ? '#4CAF50' : '#E94560'} bg={p.status === 'pending' ? '#FFF3E0' : p.status === 'processed' ? '#E8F5E9' : '#FFF0F3'} />
            <View style={styles.rowActions}>
              {p.status === 'pending' && <ActionBtn label="Pay" color="#4CAF50" onPress={() => Alert.alert('Payout', `Sending ₹${p.amount - p.tds} to ${p.proName}`)} small />}
              {p.status === 'pending' && <ActionBtn label="Hold" color="#FF9800" onPress={() => Alert.alert('On Hold')} small />}
              {p.status === 'hold' && <ActionBtn label="Release" color="#4CAF50" onPress={() => Alert.alert('Released')} small />}
            </View>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

// ── 4. Banner & Content Management ───────────────────────────
export function AdminBannerManagementPage() {
  const [banners, setBanners] = useState([
    { id: 'b1', title: 'Summer AC Sale', subtitle: 'Up to 40% off AC service', target: 'ac_repair', position: 1, startDate: '2026-04-01', endDate: '2026-06-30', clicks: 18420, impressions: 142000, active: true, image: '❄️' },
    { id: 'b2', title: 'Diwali Cleaning', subtitle: 'Deep clean your home', target: 'cleaning', position: 2, startDate: '2025-10-15', endDate: '2025-11-05', clicks: 9200, impressions: 87000, active: false, image: '🧹' },
    { id: 'b3', title: 'Refer & Earn ₹200', subtitle: 'Invite friends, earn wallet credit', target: 'refer', position: 3, startDate: '2026-01-01', endDate: '2026-12-31', clicks: 32100, impressions: 210000, active: true, image: '🎁' },
    { id: 'b4', title: 'New: Physiotherapy', subtitle: 'Expert physios at home', target: 'physiotherapy', position: 4, startDate: '2026-03-01', endDate: '2026-06-30', clicks: 4200, impressions: 38000, active: true, image: '🏥' },
  ]);

  const toggleBanner = (id) => setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🎨 Banner & Content Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Active Banners" value={banners.filter(b => b.active).length.toString()} icon="📢" color="#9C27B0" />
        <StatBox label="Total Impressions" value="477k" icon="👁️" color="#2196F3" />
        <StatBox label="Total Clicks" value="63.9k" icon="👆" color="#4CAF50" />
        <StatBox label="Avg CTR" value="13.4%" icon="📊" color="#FF9800" />
      </View>

      <AdminCard>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>Homepage Banners</Text>
          <ActionBtn label="+ New Banner" color="#9C27B0" onPress={() => Alert.alert('New Banner', 'Banner creation form')} />
        </View>
      </AdminCard>

      {banners.map(banner => (
        <AdminCard key={banner.id} style={{ marginBottom: 12 }}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerEmoji}><Text style={{ fontSize: 32 }}>{banner.image}</Text></View>
            <View style={styles.bannerInfo}>
              <View style={styles.rowBetween}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Switch value={banner.active} onValueChange={() => toggleBanner(banner.id)} trackColor={{ true: '#4CAF50', false: '#CCC' }} />
              </View>
              <Text style={styles.bannerSub}>{banner.subtitle}</Text>
              <Text style={styles.bannerTarget}>Target: {banner.target} • Pos #{banner.position}</Text>
              <Text style={styles.bannerDates}>{banner.startDate} → {banner.endDate}</Text>
              <View style={styles.bannerMetrics}>
                <Text style={styles.bannerMetric}>👁️ {banner.impressions.toLocaleString()} impressions</Text>
                <Text style={styles.bannerMetric}>👆 {banner.clicks.toLocaleString()} clicks</Text>
                <Text style={styles.bannerMetric}>CTR {((banner.clicks / banner.impressions) * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.rowActions}>
                <ActionBtn label="Edit" color="#9C27B0" onPress={() => Alert.alert('Edit Banner')} small />
                <ActionBtn label="Duplicate" color="#2196F3" onPress={() => Alert.alert('Duplicated')} small />
                <ActionBtn label="Delete" color="#E94560" onPress={() => Alert.alert('Delete?', 'This cannot be undone')} small />
              </View>
            </View>
          </View>
        </AdminCard>
      ))}

      <AdminCard>
        <Text style={styles.sectionLabel}>Push Notification Campaigns</Text>
        {[
          { title: 'Weekend AC Offer', sent: 142000, opened: 28400, ctr: '20%', sentAt: '2026-03-10', status: 'sent' },
          { title: 'Re-engage Inactive Users', sent: 45000, opened: 6750, ctr: '15%', sentAt: '2026-03-08', status: 'sent' },
          { title: 'New Physio Launch', sent: 0, opened: 0, ctr: '-', sentAt: 'Scheduled 2026-03-20', status: 'scheduled' },
        ].map((camp, i) => (
          <View key={i} style={styles.campaignRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{camp.title}</Text>
              <Text style={styles.rowSub}>{camp.sentAt}</Text>
            </View>
            <Text style={styles.rowCell}>{camp.sent > 0 ? camp.sent.toLocaleString() : '-'}</Text>
            <Text style={styles.rowCell}>{camp.opened > 0 ? camp.opened.toLocaleString() : '-'}</Text>
            <Text style={styles.rowCell}>{camp.ctr}</Text>
            <Badge text={camp.status} color={camp.status === 'sent' ? '#4CAF50' : '#2196F3'} bg={camp.status === 'sent' ? '#E8F5E9' : '#E3F2FD'} />
          </View>
        ))}
        <ActionBtn label="Create New Campaign" color="#9C27B0" onPress={() => Alert.alert('New Campaign')} />
      </AdminCard>
    </ScrollView>
  );
}

// ── 5. Review Moderation ──────────────────────────────────────
export function AdminReviewModerationPage() {
  const [filter, setFilter] = useState('flagged');
  const REVIEWS = Array.from({ length: 20 }, (_, i) => ({
    id: `rev${i}`, customer: `Customer ${i + 1}`, professional: `Pro ${i + 1}`, service: 'AC Repair',
    rating: 1 + (i % 3), text: i % 3 === 0 ? 'Terrible service, professional was rude and unprofessional' : i % 3 === 1 ? 'Did not complete the work, left halfway through' : 'Great service!',
    flagReason: i % 3 === 0 ? 'offensive' : i % 3 === 1 ? 'fake_review' : null,
    status: i % 4 === 3 ? 'removed' : i % 5 === 4 ? 'approved' : 'flagged',
    date: '2026-03-12',
  }));
  const filtered = REVIEWS.filter(r => filter === 'all' || r.status === filter || (filter === 'flagged' && r.flagReason));

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>⭐ Review Moderation</Text>
      <View style={styles.statsRow}>
        <StatBox label="Flagged" value="47" icon="🚩" color="#E94560" />
        <StatBox label="Pending Review" value="23" icon="⏳" color="#FF9800" />
        <StatBox label="Removed Today" value="8" icon="🗑️" color="#9C27B0" />
        <StatBox label="Avg Rating" value="4.7" icon="⭐" color="#4CAF50" />
      </View>
      <AdminCard>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['flagged', 'approved', 'removed', 'all'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AdminCard>
      {filtered.slice(0, 10).map(rev => (
        <AdminCard key={rev.id} style={{ marginBottom: 10 }}>
          <View style={styles.reviewRow}>
            <View style={styles.reviewMeta}>
              <Text style={styles.reviewRating}>{'⭐'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)} ({rev.rating}/5)</Text>
              <Text style={styles.reviewCustomer}>{rev.customer} → {rev.professional}</Text>
              <Text style={styles.reviewDate}>{rev.service} • {rev.date}</Text>
            </View>
            {rev.flagReason && <Badge text={`🚩 ${rev.flagReason}`} color="#E94560" bg="#FFF0F3" />}
          </View>
          <Text style={styles.reviewText}>"{rev.text}"</Text>
          {rev.status !== 'removed' && (
            <View style={styles.rowActions}>
              <ActionBtn label="✓ Approve" color="#4CAF50" onPress={() => Alert.alert('Approved')} small />
              <ActionBtn label="🗑 Remove" color="#E94560" onPress={() => Alert.alert('Removed')} small />
              <ActionBtn label="⚠️ Warn Pro" color="#FF9800" onPress={() => Alert.alert('Warning sent')} small />
            </View>
          )}
          {rev.status === 'removed' && <Badge text="Removed" color="#E94560" bg="#FFF0F3" />}
        </AdminCard>
      ))}
    </ScrollView>
  );
}

// ── 6. Revenue & Finance Reports ──────────────────────────────
export function AdminRevenueReportsPage() {
  const [period, setPeriod] = useState('month');
  const PERIODS = ['today', 'week', 'month', 'quarter', 'year'];
  const REVENUE_DATA = {
    today: { gmv: 184200, revenue: 27630, bookings: 312, avgOrder: 590, growth: '+12%' },
    week: { gmv: 1284000, revenue: 192600, bookings: 2184, avgOrder: 588, growth: '+18%' },
    month: { gmv: 5420000, revenue: 813000, bookings: 9204, avgOrder: 589, growth: '+24%' },
    quarter: { gmv: 16200000, revenue: 2430000, bookings: 27400, avgOrder: 591, growth: '+31%' },
    year: { gmv: 64800000, revenue: 9720000, bookings: 108600, avgOrder: 597, growth: '+42%' },
  };
  const d = REVENUE_DATA[period];

  const CATEGORY_BREAKDOWN = [
    { category: 'AC Repair', revenue: 2840000, share: '29%', growth: '+32%' },
    { category: 'Cleaning', revenue: 1650000, share: '17%', growth: '+28%' },
    { category: 'Salon', revenue: 1420000, share: '15%', growth: '+41%' },
    { category: 'Plumbing', revenue: 980000, share: '10%', growth: '+19%' },
    { category: 'Electrician', revenue: 870000, share: '9%', growth: '+22%' },
    { category: 'Others', revenue: 1960000, share: '20%', growth: '+18%' },
  ];

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>📊 Revenue & Finance Reports</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p} style={[styles.filterTab, period === p && styles.filterTabActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.filterTabText, period === p && styles.filterTabTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.statsRow}>
        <StatBox label="GMV" value={`₹${(d.gmv / 100000).toFixed(1)}L`} sub={d.growth} icon="💹" color="#4CAF50" />
        <StatBox label="Revenue (15%)" value={`₹${(d.revenue / 100000).toFixed(1)}L`} icon="💰" color="#9C27B0" />
        <StatBox label="Bookings" value={d.bookings.toLocaleString()} icon="📋" color="#2196F3" />
        <StatBox label="Avg Order" value={`₹${d.avgOrder}`} icon="🧾" color="#FF9800" />
      </View>

      <AdminCard>
        <Text style={styles.sectionLabel}>Revenue by Category</Text>
        {CATEGORY_BREAKDOWN.map((cat, i) => (
          <View key={i} style={styles.revenueRow}>
            <Text style={[styles.rowName, { flex: 2 }]}>{cat.category}</Text>
            <Text style={styles.rowCell}>₹{(cat.revenue / 100000).toFixed(1)}L</Text>
            <Text style={styles.rowCell}>{cat.share}</Text>
            <Text style={[styles.rowCell, { color: '#4CAF50' }]}>{cat.growth}</Text>
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressBar, { width: `${parseInt(cat.share)}%` }]} />
            </View>
          </View>
        ))}
      </AdminCard>

      <AdminCard>
        <Text style={styles.sectionLabel}>Financial Summary</Text>
        {[
          ['Gross Revenue', `₹${(d.gmv / 100000).toFixed(2)}L`],
          ['Platform Commission (15%)', `₹${(d.revenue / 100000).toFixed(2)}L`],
          ['Professional Payouts (85%)', `₹${((d.gmv * 0.85) / 100000).toFixed(2)}L`],
          ['Payment Gateway Fees (2%)', `₹${((d.gmv * 0.02) / 100000).toFixed(2)}L`],
          ['Net Revenue', `₹${((d.revenue - d.gmv * 0.02) / 100000).toFixed(2)}L`],
          ['GST Collected (18%)', `₹${((d.gmv * 0.18) / 100000).toFixed(2)}L`],
          ['TDS Deducted (1%)', `₹${((d.gmv * 0.01) / 100000).toFixed(2)}L`],
        ].map(([label, value], i) => (
          <View key={i} style={[styles.financeRow, i >= 4 && { borderTopWidth: i === 4 ? 1.5 : 0, borderTopColor: '#E0E0E0', paddingTop: i === 4 ? 12 : 0 }]}>
            <Text style={[styles.financeLabel, i >= 4 && { fontWeight: '700' }]}>{label}</Text>
            <Text style={[styles.financeValue, i >= 4 && { color: '#4CAF50', fontWeight: '800' }]}>{value}</Text>
          </View>
        ))}
        <ActionBtn label="Export Report (CSV)" color="#2196F3" onPress={() => Alert.alert('Export', 'Report exported to downloads')} />
      </AdminCard>
    </ScrollView>
  );
}

// ── 7. Fraud Detection Dashboard ─────────────────────────────
export function AdminFraudDetectionPage() {
  const ALERTS = [
    { id: 'f1', type: 'duplicate_booking', severity: 'high', description: 'Same user booked 5 bookings in 10 mins from different accounts', userId: 'U4821', amount: 4200, flaggedAt: '2026-03-15 14:22', status: 'investigating' },
    { id: 'f2', type: 'fake_review', severity: 'medium', description: 'Professional received 12 five-star reviews in 24 hours from new accounts', proId: 'P2341', flaggedAt: '2026-03-15 11:45', status: 'confirmed' },
    { id: 'f3', type: 'coupon_abuse', severity: 'high', description: 'Single device used 8 different referral codes', userId: 'U9102', amount: 1600, flaggedAt: '2026-03-14 22:10', status: 'resolved' },
    { id: 'f4', type: 'payment_fraud', severity: 'critical', description: 'Multiple failed card attempts followed by successful payment', userId: 'U3394', amount: 2800, flaggedAt: '2026-03-14 18:32', status: 'blocked' },
    { id: 'f5', type: 'pro_no_show', severity: 'medium', description: 'Professional reported "completed" 3 jobs without customer confirmation', proId: 'P1122', flaggedAt: '2026-03-14 16:00', status: 'investigating' },
  ];
  const SEVERITY_COLORS = { critical: '#B71C1C', high: '#E94560', medium: '#FF9800', low: '#4CAF50' };

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🛡️ Fraud Detection</Text>
      <View style={styles.statsRow}>
        <StatBox label="Active Alerts" value="23" icon="🚨" color="#E94560" />
        <StatBox label="Blocked Today" value="7" icon="🚫" color="#B71C1C" />
        <StatBox label="Saved Revenue" value="₹84k" icon="💰" color="#4CAF50" />
        <StatBox label="False Positives" value="3%" icon="✅" color="#2196F3" />
      </View>

      <AdminCard>
        <Text style={styles.sectionLabel}>Fraud Detection Rules Active</Text>
        {[
          ['Multiple bookings same device', true], ['Coupon reuse detection', true],
          ['Fake review clustering', true], ['Payment velocity check', true],
          ['Pro no-show pattern', true], ['Referral abuse detection', true],
        ].map(([rule, active], i) => (
          <View key={i} style={styles.ruleRow}>
            <Text style={styles.ruleText}>{rule}</Text>
            <Switch value={active} onValueChange={() => {}} trackColor={{ true: '#4CAF50' }} />
          </View>
        ))}
      </AdminCard>

      {ALERTS.map(alert => (
        <AdminCard key={alert.id} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: SEVERITY_COLORS[alert.severity] }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.alertType, { color: SEVERITY_COLORS[alert.severity] }]}>
              {alert.severity.toUpperCase()} — {alert.type.replace(/_/g, ' ').toUpperCase()}
            </Text>
            <Badge text={alert.status} color={alert.status === 'blocked' ? '#E94560' : alert.status === 'resolved' ? '#4CAF50' : '#FF9800'} bg={alert.status === 'blocked' ? '#FFF0F3' : alert.status === 'resolved' ? '#E8F5E9' : '#FFF3E0'} />
          </View>
          <Text style={styles.alertDesc}>{alert.description}</Text>
          <Text style={styles.alertMeta}>{alert.userId ? `User: ${alert.userId}` : `Pro: ${alert.proId}`}{alert.amount ? ` • ₹${alert.amount}` : ''} • {alert.flaggedAt}</Text>
          {alert.status === 'investigating' && (
            <View style={styles.rowActions}>
              <ActionBtn label="Block User" color="#E94560" onPress={() => Alert.alert('User Blocked')} small />
              <ActionBtn label="False Positive" color="#4CAF50" onPress={() => Alert.alert('Cleared')} small />
              <ActionBtn label="Escalate" color="#FF9800" onPress={() => Alert.alert('Escalated')} small />
            </View>
          )}
        </AdminCard>
      ))}
    </ScrollView>
  );
}

// ── 8. Support Ticket Management ─────────────────────────────
export function AdminSupportTicketsPage() {
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');

  const TICKETS = Array.from({ length: 30 }, (_, i) => ({
    id: `TKT-${1000 + i}`, customer: `Customer ${i + 1}`, type: ['booking_issue', 'payment', 'professional_complaint', 'refund', 'app_bug'][i % 5],
    priority: ['high', 'medium', 'low', 'urgent'][i % 4], subject: ['Booking not confirmed', 'Payment deducted but not booked', 'Professional misbehaved', 'Refund not received', 'App crashing'][i % 5],
    status: ['open', 'in_progress', 'resolved', 'closed'][i % 4],
    assignedTo: i % 3 === 0 ? 'Agent Priya' : i % 3 === 1 ? 'Agent Rahul' : 'Unassigned',
    createdAt: '2026-03-15', sla: i % 3 === 0 ? 'Breached' : i % 3 === 1 ? '2h remaining' : 'On time',
  }));

  const filtered = TICKETS.filter(t => (filter === 'all' || t.status === filter) && (search === '' || t.subject.toLowerCase().includes(search.toLowerCase())));

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🎫 Support Tickets</Text>
      <View style={styles.statsRow}>
        <StatBox label="Open" value="47" icon="📭" color="#E94560" />
        <StatBox label="In Progress" value="23" icon="⚙️" color="#FF9800" />
        <StatBox label="Resolved Today" value="89" icon="✅" color="#4CAF50" />
        <StatBox label="Avg Resolution" value="4.2h" icon="⏱️" color="#2196F3" />
      </View>
      <AdminCard>
        <View style={styles.rowBetween}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..." />
          <ActionBtn label="Export" color="#2196F3" onPress={() => Alert.alert('Exported')} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {['open', 'in_progress', 'resolved', 'closed', 'all'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AdminCard>
      <AdminCard>
        {filtered.slice(0, 12).map(ticket => (
          <TouchableOpacity key={ticket.id} style={styles.ticketRow} onPress={() => Alert.alert(ticket.id, `${ticket.subject}\n\nCustomer: ${ticket.customer}\nAssigned: ${ticket.assignedTo}\nSLA: ${ticket.sla}`)}>
            <View style={styles.ticketLeft}>
              <View style={styles.rowBetween}>
                <Text style={styles.ticketId}>{ticket.id}</Text>
                <Badge text={ticket.priority} color={ticket.priority === 'urgent' ? '#B71C1C' : ticket.priority === 'high' ? '#E94560' : ticket.priority === 'medium' ? '#FF9800' : '#4CAF50'} bg={ticket.priority === 'urgent' ? '#FFEBEE' : ticket.priority === 'high' ? '#FFF0F3' : ticket.priority === 'medium' ? '#FFF3E0' : '#E8F5E9'} />
              </View>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketMeta}>{ticket.customer} • {ticket.assignedTo} • SLA: {ticket.sla}</Text>
            </View>
            <Badge text={ticket.status.replace('_', ' ')} color={ticket.status === 'open' ? '#E94560' : ticket.status === 'in_progress' ? '#FF9800' : '#4CAF50'} bg={ticket.status === 'open' ? '#FFF0F3' : ticket.status === 'in_progress' ? '#FFF3E0' : '#E8F5E9'} />
          </TouchableOpacity>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

// ── 9. Geographic Zone Management ────────────────────────────
export function AdminGeoManagementPage() {
  const CITIES = [
    { id: 'hyd', name: 'Hyderabad', zones: 18, pros: 842, bookings: 8420, revenue: 4200000, status: 'active', launch: '2022-01-15' },
    { id: 'mum', name: 'Mumbai', zones: 24, pros: 1240, bookings: 12400, revenue: 6800000, status: 'active', launch: '2021-06-01' },
    { id: 'blr', name: 'Bangalore', zones: 22, pros: 1180, bookings: 11200, revenue: 6200000, status: 'active', launch: '2021-09-01' },
    { id: 'del', name: 'Delhi NCR', zones: 28, pros: 1420, bookings: 14100, revenue: 7600000, status: 'active', launch: '2020-11-01' },
    { id: 'chn', name: 'Chennai', zones: 16, pros: 620, bookings: 6200, revenue: 3100000, status: 'active', launch: '2022-06-01' },
    { id: 'pun', name: 'Pune', zones: 14, pros: 480, bookings: 4800, revenue: 2400000, status: 'active', launch: '2022-09-01' },
    { id: 'ahm', name: 'Ahmedabad', zones: 12, pros: 340, bookings: 3400, revenue: 1700000, status: 'partial', launch: '2023-01-01' },
    { id: 'kol', name: 'Kolkata', zones: 10, pros: 280, bookings: 2800, revenue: 1400000, status: 'partial', launch: '2023-06-01' },
    { id: 'jai', name: 'Jaipur', zones: 8, pros: 180, bookings: 1800, revenue: 900000, status: 'launching', launch: '2026-04-01' },
    { id: 'luc', name: 'Lucknow', zones: 0, pros: 0, bookings: 0, revenue: 0, status: 'planned', launch: '2026-07-01' },
  ];

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🗺️ Geographic Zone Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Active Cities" value="8" icon="🏙️" color="#4CAF50" />
        <StatBox label="Partial Launch" value="2" icon="⚡" color="#FF9800" />
        <StatBox label="Total Zones" value="152" icon="📍" color="#2196F3" />
        <StatBox label="Planned" value="2" icon="🗓️" color="#9C27B0" />
      </View>
      <AdminCard>
        <TableHeader cols={[{ label: 'City', flex: 2 }, { label: 'Zones' }, { label: 'Pros' }, { label: 'Bookings' }, { label: 'Revenue' }, { label: 'Status' }, { label: 'Actions' }]} />
        {CITIES.map(city => (
          <View key={city.id} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.rowName}>{city.name}</Text>
              <Text style={styles.rowSub}>Launch: {city.launch}</Text>
            </View>
            <Text style={styles.rowCell}>{city.zones}</Text>
            <Text style={styles.rowCell}>{city.pros}</Text>
            <Text style={styles.rowCell}>{city.bookings > 0 ? city.bookings.toLocaleString() : '-'}</Text>
            <Text style={styles.rowCell}>{city.revenue > 0 ? `₹${(city.revenue / 100000).toFixed(1)}L` : '-'}</Text>
            <Badge text={city.status} color={city.status === 'active' ? '#4CAF50' : city.status === 'partial' ? '#FF9800' : city.status === 'launching' ? '#2196F3' : '#9C27B0'} bg={city.status === 'active' ? '#E8F5E9' : city.status === 'partial' ? '#FFF3E0' : '#E3F2FD'} />
            <View style={styles.rowActions}>
              <ActionBtn label="Manage" color="#2196F3" onPress={() => Alert.alert(city.name, `Manage zones, pincodes and service availability for ${city.name}`)} small />
            </View>
          </View>
        ))}
      </AdminCard>

      <AdminCard>
        <Text style={styles.sectionLabel}>Pincode Serviceability</Text>
        <Text style={styles.bodyText}>Manage which pincodes are serviceable. Add or remove pincodes per city and service category.</Text>
        <ActionBtn label="Manage Pincodes" color="#2196F3" onPress={() => Alert.alert('Pincode Manager', 'Pincode management UI')} />
      </AdminCard>
    </ScrollView>
  );
}

// ── 10. Role & Permission Management ─────────────────────────
export function AdminRolesPage() {
  const ROLES = [
    { id: 'r1', name: 'Super Admin', users: 3, permissions: 'All permissions', color: '#B71C1C' },
    { id: 'r2', name: 'Operations Manager', users: 8, permissions: 'Bookings, Professionals, Reviews', color: '#E94560' },
    { id: 'r3', name: 'Finance Manager', users: 4, permissions: 'Payouts, Revenue, Coupons', color: '#9C27B0' },
    { id: 'r4', name: 'Support Agent', users: 24, permissions: 'Tickets, Bookings (read), Users (read)', color: '#2196F3' },
    { id: 'r5', name: 'Content Manager', users: 6, permissions: 'Banners, Services, FAQs', color: '#4CAF50' },
    { id: 'r6', name: 'City Manager', users: 12, permissions: 'City-specific: Pros, Bookings, Reports', color: '#FF9800' },
  ];

  const PERMISSION_MATRIX = [
    { module: 'User Management', superAdmin: true, ops: true, finance: false, support: true, content: false, city: false },
    { module: 'Professional Mgmt', superAdmin: true, ops: true, finance: false, support: false, content: false, city: true },
    { module: 'Booking Management', superAdmin: true, ops: true, finance: false, support: true, content: false, city: true },
    { module: 'Payout & Finance', superAdmin: true, ops: false, finance: true, support: false, content: false, city: false },
    { module: 'Analytics Reports', superAdmin: true, ops: true, finance: true, support: false, content: false, city: true },
    { module: 'Banner & Content', superAdmin: true, ops: false, finance: false, support: false, content: true, city: false },
    { module: 'Fraud Detection', superAdmin: true, ops: true, finance: false, support: false, content: false, city: false },
    { module: 'Support Tickets', superAdmin: true, ops: true, finance: false, support: true, content: false, city: true },
    { module: 'Role Management', superAdmin: true, ops: false, finance: false, support: false, content: false, city: false },
  ];

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🔐 Role & Permission Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Total Roles" value={ROLES.length.toString()} icon="👥" color="#9C27B0" />
        <StatBox label="Admin Users" value={ROLES.reduce((s, r) => s + r.users, 0).toString()} icon="👤" color="#2196F3" />
        <StatBox label="Permissions" value="48" icon="🔑" color="#4CAF50" />
        <StatBox label="Active Sessions" value="12" icon="💻" color="#FF9800" />
      </View>

      <AdminCard>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>System Roles</Text>
          <ActionBtn label="+ New Role" color="#9C27B0" onPress={() => Alert.alert('New Role')} />
        </View>
        {ROLES.map(role => (
          <View key={role.id} style={[styles.roleRow, { borderLeftColor: role.color }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleName, { color: role.color }]}>{role.name}</Text>
              <Text style={styles.rolePermissions}>{role.permissions}</Text>
              <Text style={styles.roleUsers}>{role.users} users assigned</Text>
            </View>
            <ActionBtn label="Edit" color={role.color} onPress={() => Alert.alert('Edit Role', `Edit permissions for ${role.name}`)} small />
          </View>
        ))}
      </AdminCard>

      <AdminCard>
        <Text style={styles.sectionLabel}>Permission Matrix</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.matrixHeader}>
              <Text style={[styles.matrixCell, { flex: 3 }]}>Module</Text>
              {['SA', 'Ops', 'Fin', 'Sup', 'Con', 'City'].map((h, i) => (
                <Text key={i} style={styles.matrixHeaderCell}>{h}</Text>
              ))}
            </View>
            {PERMISSION_MATRIX.map((row, i) => (
              <View key={i} style={styles.matrixRow}>
                <Text style={[styles.matrixCell, { flex: 3 }]}>{row.module}</Text>
                {[row.superAdmin, row.ops, row.finance, row.support, row.content, row.city].map((has, j) => (
                  <Text key={j} style={[styles.matrixCheck, { color: has ? '#4CAF50' : '#DDD' }]}>{has ? '✓' : '✗'}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </AdminCard>
    </ScrollView>
  );
}

// ── 11. Cancellation & Dispute Management ────────────────────
export function AdminDisputeManagementPage() {
  const DISPUTES = Array.from({ length: 20 }, (_, i) => ({
    id: `DIS-${2000 + i}`, customer: `Customer ${i + 1}`, professional: `Pro ${i + 1}`,
    type: ['service_quality', 'no_show', 'overcharge', 'damage', 'cancellation_fee'][i % 5],
    amount: 500 + i * 100, status: ['open', 'investigating', 'resolved_customer', 'resolved_pro', 'escalated'][i % 5],
    createdAt: '2026-03-14', description: 'Professional did not complete the service as agreed.',
  }));

  const TYPE_LABELS = { service_quality: 'Quality Issue', no_show: 'No Show', overcharge: 'Overcharge', damage: 'Property Damage', cancellation_fee: 'Cancellation Fee' };

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>⚖️ Dispute & Cancellation Management</Text>
      <View style={styles.statsRow}>
        <StatBox label="Open Disputes" value="34" icon="⚖️" color="#E94560" />
        <StatBox label="Avg Resolution" value="18h" icon="⏱️" color="#FF9800" />
        <StatBox label="Refunds Today" value="₹24k" icon="💸" color="#9C27B0" />
        <StatBox label="Resolution Rate" value="94%" icon="✅" color="#4CAF50" />
      </View>

      <AdminCard>
        <Text style={styles.sectionLabel}>Cancellation Policy Settings</Text>
        {[
          ['Cancel 24h+ before', 'Full refund'],
          ['Cancel 4-24h before', '₹100 fee'],
          ['Cancel < 4h before', '₹200 fee'],
          ['Professional no-show', 'Full refund + ₹50 credit'],
          ['After service started', 'No refund'],
        ].map(([rule, outcome], i) => (
          <View key={i} style={styles.policyRow}>
            <Text style={styles.policyRule}>{rule}</Text>
            <Text style={styles.policyOutcome}>{outcome}</Text>
          </View>
        ))}
        <ActionBtn label="Update Policies" color="#9C27B0" onPress={() => Alert.alert('Policies Updated')} />
      </AdminCard>

      <AdminCard>
        <TableHeader cols={[{ label: 'Dispute ID' }, { label: 'Type', flex: 2 }, { label: 'Amount' }, { label: 'Status', flex: 2 }, { label: 'Actions', flex: 2 }]} />
        {DISPUTES.slice(0, 10).map(d => (
          <View key={d.id} style={styles.tableRow}>
            <Text style={styles.rowCell}>{d.id}</Text>
            <Text style={[styles.rowCell, { flex: 2 }]}>{TYPE_LABELS[d.type]}</Text>
            <Text style={styles.rowCell}>₹{d.amount}</Text>
            <View style={{ flex: 2 }}>
              <Badge text={d.status.replace(/_/g, ' ')} color={d.status.includes('resolved') ? '#4CAF50' : d.status === 'escalated' ? '#E94560' : '#FF9800'} bg={d.status.includes('resolved') ? '#E8F5E9' : '#FFF3E0'} />
            </View>
            <View style={[styles.rowActions, { flex: 2 }]}>
              {d.status === 'open' && <ActionBtn label="Resolve" color="#4CAF50" onPress={() => Alert.alert('Resolve Dispute')} small />}
              {d.status === 'open' && <ActionBtn label="Escalate" color="#E94560" onPress={() => Alert.alert('Escalated')} small />}
            </View>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6FA', padding: 16 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A2E', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  statSub: { fontSize: 10, color: '#4CAF50', fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', borderRadius: 12, paddingHorizontal: 12, flex: 1 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E', paddingVertical: 10 },
  actionBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  actionBtnSm: { paddingHorizontal: 10, paddingVertical: 7 },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F6FA', marginRight: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  filterTabActive: { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  filterTabTextActive: { color: '#fff' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F5F6FA', borderRadius: 10, padding: 10, marginBottom: 4 },
  tableHeaderText: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  rowName: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  rowSub: { fontSize: 11, color: '#888', marginTop: 2 },
  rowCell: { flex: 1, fontSize: 12, color: '#444' },
  rowActions: { flexDirection: 'row', gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  paginationBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F6FA' },
  paginationInfo: { fontSize: 12, color: '#888' },
  paginationBtns: { flexDirection: 'row', gap: 8 },
  pageBtn: { backgroundColor: '#1A1A2E', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  pageBtnDisabled: { backgroundColor: '#E0E0E0' },
  pageBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  modal: { flex: 1, backgroundColor: '#F5F6FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  modalClose: { fontSize: 20, color: '#666' },
  modalBody: { padding: 20 },
  proModalName: { fontSize: 22, fontWeight: '900', color: '#1A1A2E', marginBottom: 4 },
  proModalMeta: { fontSize: 14, color: '#666', marginBottom: 16 },
  proModalStats: { flexDirection: 'row', backgroundColor: '#F5F6FA', borderRadius: 14, padding: 16, marginBottom: 16 },
  proModalStat: { flex: 1, alignItems: 'center' },
  proModalStatIcon: { fontSize: 20, marginBottom: 4 },
  proModalStatVal: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  proModalStatLbl: { fontSize: 10, color: '#888' },
  proChecks: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  proCheck: { fontSize: 13, fontWeight: '600', color: '#E94560' },
  proCheckDone: { color: '#4CAF50' },
  modalActions: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 6, marginTop: 12 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  bannerRow: { flexDirection: 'row', gap: 14 },
  bannerEmoji: { width: 60, height: 60, backgroundColor: '#F5F6FA', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bannerInfo: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  bannerSub: { fontSize: 12, color: '#666', marginTop: 2 },
  bannerTarget: { fontSize: 11, color: '#888', marginTop: 4 },
  bannerDates: { fontSize: 11, color: '#2196F3', marginTop: 2 },
  bannerMetrics: { flexDirection: 'row', gap: 12, marginTop: 8 },
  bannerMetric: { fontSize: 11, color: '#555' },
  campaignRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewMeta: { flex: 1 },
  reviewRating: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  reviewCustomer: { fontSize: 12, color: '#666', marginTop: 2 },
  reviewDate: { fontSize: 11, color: '#888' },
  reviewText: { fontSize: 13, color: '#444', fontStyle: 'italic', marginBottom: 10, backgroundColor: '#F9F9F9', borderRadius: 10, padding: 10 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  progressBarWrap: { flex: 2, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#9C27B0', borderRadius: 3 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  financeLabel: { fontSize: 13, color: '#444' },
  financeValue: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  ruleText: { fontSize: 13, color: '#1A1A2E', flex: 1 },
  alertType: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  alertDesc: { fontSize: 13, color: '#444', marginVertical: 6, lineHeight: 18 },
  alertMeta: { fontSize: 11, color: '#888' },
  ticketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  ticketLeft: { flex: 1 },
  ticketId: { fontSize: 11, fontWeight: '700', color: '#888' },
  ticketSubject: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginTop: 2 },
  ticketMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  roleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 12, borderLeftWidth: 4, borderBottomWidth: 1, borderBottomColor: '#F5F6FA', marginBottom: 4 },
  roleName: { fontSize: 15, fontWeight: '800' },
  rolePermissions: { fontSize: 11, color: '#666', marginTop: 2 },
  roleUsers: { fontSize: 11, color: '#888', marginTop: 2 },
  matrixHeader: { flexDirection: 'row', backgroundColor: '#F5F6FA', padding: 10 },
  matrixRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  matrixCell: { fontSize: 12, color: '#1A1A2E', width: 180, paddingHorizontal: 10 },
  matrixHeaderCell: { width: 48, fontSize: 11, fontWeight: '700', color: '#888', textAlign: 'center' },
  matrixCheck: { width: 48, fontSize: 16, textAlign: 'center' },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  policyRule: { fontSize: 13, color: '#1A1A2E', fontWeight: '600', flex: 1 },
  policyOutcome: { fontSize: 13, color: '#4CAF50', fontWeight: '700' },
  bodyText: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 12 },
});
