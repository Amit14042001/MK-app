/**
 * MK App — ServiceHealthReportScreen
 * Post-service health report: what was found, fixed, photos, next service date.
 * Accessed from BookingDetail after service is completed.
 * Downloadable as PDF via react-native-html-to-pdf.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, Alert, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { bookingsAPI } from '../../utils/api';

const STATUS_COLORS = {
  done:  { bg: '#E8F5E9', text: '#2E7D32' },
  fixed: { bg: '#E3F2FD', text: '#1565C0' },
  good:  { bg: '#E8F5E9', text: '#2E7D32' },
  info:  { bg: '#FFF8E1', text: '#F57F17' },
  issue: { bg: '#FFEBEE', text: '#C62828' },
};

const STATUS_ICONS = { done: '✅', fixed: '🔧', good: '✅', info: '📅', issue: '⚠️' };

export default function ServiceHealthReportScreen({ navigation, route }) {
  const { bookingId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [emailing,  setEmailing]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchReport(); }, []);

  const fetchReport = async () => {
    try {
      const { data } = await bookingsAPI.getHealthReport(bookingId);
      if (data.success) setReport(data.report);
    } catch { Alert.alert('Error', 'Could not load health report. Please try again.'); }
    setLoading(false);
  };

  const handleEmail = async () => {
    setEmailing(true);
    try {
      await bookingsAPI.emailHealthReport(bookingId);
      Alert.alert('✅ Emailed!', 'Service report has been sent to your registered email address.');
    } catch { Alert.alert('Error', 'Could not send email. Please try again.'); }
    setEmailing(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let RNHTMLtoPDF;
      try { RNHTMLtoPDF = require('react-native-html-to-pdf').default; } catch {}
      if (RNHTMLtoPDF && report) {
        const html = buildPdfHtml(report);
        const result = await RNHTMLtoPDF.convert({
          html, fileName: `MK_Report_${report.reportId}`, directory: 'Downloads',
        });
        Alert.alert('✅ Downloaded', `Report saved to: ${result.filePath}`);
      } else {
        // Share fallback
        await Share.share({
          title:   `MK Service Report — ${report?.reportId}`,
          message: buildTextReport(report),
        });
      }
    } catch (e) { Alert.alert('Error', 'Could not download report.'); }
    setDownloading(false);
  };

  const buildPdfHtml = (r) => `
    <html><body style="font-family:Arial;padding:24px;color:#1a1a2e;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#fff;padding:24px;border-radius:12px;margin-bottom:20px">
        <h1 style="margin:0;font-size:22px">🏠 Service Health Report</h1>
        <p style="margin:6px 0 0;opacity:0.8">Report #${r.reportId}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:6px;color:#666">Service</td><td style="padding:6px;font-weight:600">${r.service}</td></tr>
        <tr><td style="padding:6px;color:#666">Professional</td><td style="padding:6px;font-weight:600">${r.professional.name}</td></tr>
        <tr><td style="padding:6px;color:#666">Date</td><td style="padding:6px;font-weight:600">${new Date(r.serviceDate).toDateString()}</td></tr>
        <tr><td style="padding:6px;color:#666">Next Service</td><td style="padding:6px;font-weight:600;color:#e94560">${new Date(r.nextServiceDue).toDateString()}</td></tr>
      </table>
      <h3>What Was Done</h3>
      ${r.healthItems.map(i => `<div style="padding:10px;margin:6px 0;background:#f8f9fa;border-radius:8px"><b>${i.label}</b>: ${i.value}</div>`).join('')}
      <p style="color:#27ae60;margin-top:20px">✅ Warranty valid until ${new Date(r.warrantyUntil).toDateString()}</p>
    </body></html>`;

  const buildTextReport = (r) => {
    if (!r) return '';
    return `MK Service Health Report\n\nReport ID: ${r.reportId}\nService: ${r.service}\nProfessional: ${r.professional.name}\nDate: ${new Date(r.serviceDate).toDateString()}\n\n${r.healthItems.map(i => `✓ ${i.label}: ${i.value}`).join('\n')}\n\nWarranty valid until: ${new Date(r.warrantyUntil).toDateString()}\nNext service due: ${new Date(r.nextServiceDue).toDateString()}\n\nThank you for choosing MK App!`;
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ color: Colors.textLight, marginTop: 12 }}>Loading your health report...</Text>
    </View>
  );

  if (!report) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 48 }}>📋</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 16, color: Colors.text }}>Report Not Available</Text>
      <Text style={{ fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 8 }}>Health reports are generated after your service is completed.</Text>
      <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
        <Text style={{ color: Colors.primary, fontWeight: '600' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.headerTitle}>Service Health Report</Text>
          <Text style={S.headerSub}>Report #{report.reportId}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service summary card */}
        <View style={S.summaryCard}>
          <View style={S.summaryRow}>
            <Text style={S.serviceIcon}>{report.serviceIcon || '🔧'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.serviceName}>{report.service}</Text>
              <Text style={S.serviceDate}>{new Date(report.serviceDate).toDateString()}</Text>
            </View>
            <View style={S.warrantyBadge}>
              <Text style={S.warrantyText}>🛡️ 30-day warranty</Text>
            </View>
          </View>
          <View style={S.proRow}>
            <View style={S.proAvatar}>
              <Text style={S.proAvatarText}>{report.professional.name?.[0] || 'P'}</Text>
            </View>
            <View>
              <Text style={S.proName}>{report.professional.name}</Text>
              <Text style={S.proMeta}>
                ★ {report.professional.rating} · {report.professional.totalJobs?.toLocaleString('en-IN')}+ jobs
              </Text>
            </View>
          </View>
        </View>

        {/* Health items */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>What Was Done</Text>
          {report.healthItems.map((item, i) => {
            const colors = STATUS_COLORS[item.status] || STATUS_COLORS.done;
            return (
              <View key={i} style={S.healthItem}>
                <Text style={S.healthIcon}>{STATUS_ICONS[item.status] || '✅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.healthLabel}>{item.label}</Text>
                  <Text style={S.healthValue}>{item.value}</Text>
                </View>
                <View style={[S.statusBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[S.statusText, { color: colors.text }]}>{item.status}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Next service */}
        <View style={S.nextServiceCard}>
          <Text style={S.nextServiceIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.nextServiceTitle}>Next service recommended</Text>
            <Text style={S.nextServiceDate}>
              {new Date(report.nextServiceDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity
            style={S.remindBtn}
            onPress={() => Alert.alert('✅ Reminder Set', 'We\'ll remind you 7 days before the next service is due.')}>
            <Text style={S.remindBtnText}>Set Reminder</Text>
          </TouchableOpacity>
        </View>

        {/* Pro notes */}
        {report.proNotes?.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Professional Notes</Text>
            <View style={S.notesBox}>
              <Text style={S.notesText}>{report.proNotes}</Text>
            </View>
          </View>
        )}

        {/* Photos */}
        {report.photos?.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Before & After Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.photoScroll}>
              {report.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={S.photo} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Actions */}
        <View style={S.actionsRow}>
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={handleDownload}
            disabled={downloading}>
            {downloading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={S.actionBtnText}>⬇ Download PDF</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: '#25D366' }]}
            onPress={handleEmail}
            disabled={emailing}>
            {emailing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={S.actionBtnText}>✉ Email Report</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  header:         { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn:        { width: 40, height: 40, justifyContent: 'center' },
  backIcon:       { fontSize: 24, color: '#fff' },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:      { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  summaryCard:    { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.card },
  summaryRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  serviceIcon:    { fontSize: 32 },
  serviceName:    { fontSize: 16, fontWeight: '700', color: Colors.text },
  serviceDate:    { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  warrantyBadge:  { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 6 },
  warrantyText:   { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  proRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: Colors.border },
  proAvatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  proAvatarText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  proName:        { fontSize: 14, fontWeight: '600', color: Colors.text },
  proMeta:        { fontSize: 12, color: Colors.textLight },

  section:        { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  healthItem:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 6, gap: 10, ...Shadows.sm },
  healthIcon:     { fontSize: 18 },
  healthLabel:    { fontSize: 13, fontWeight: '600', color: Colors.text },
  healthValue:    { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  statusBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:     { fontSize: 11, fontWeight: '600' },

  nextServiceCard:{ marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FFE08020' },
  nextServiceIcon:{ fontSize: 24 },
  nextServiceTitle:{ fontSize: 12, color: Colors.textLight },
  nextServiceDate:{ fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 2 },
  remindBtn:      { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  remindBtnText:  { color: '#fff', fontSize: 11, fontWeight: '700' },

  notesBox:       { backgroundColor: Colors.white, borderRadius: 10, padding: 12, ...Shadows.sm },
  notesText:      { fontSize: 13, color: Colors.textLight, lineHeight: 20 },

  photoScroll:    { marginTop: 4 },
  photo:          { width: 140, height: 100, borderRadius: 8, marginRight: 8 },

  actionsRow:     { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 8 },
  actionBtn:      { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});
