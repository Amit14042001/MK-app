/**
 * Slot App — ProPerformanceCard Component
 * Live performance score shown to customers before booking.
 * Shows: composite score, punctuality %, re-do rate, completion %, badges.
 * UC hides these metrics — we make them fully transparent.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Colors, Shadows } from '../utils/theme';
import { api } from '../utils/api';

function ScoreBar({ value, color, label }) {
  return (
    <View style={B.barRow}>
      <Text style={B.barLabel}>{label}</Text>
      <View style={B.barTrack}>
        <View style={[B.barFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[B.barVal, { color }]}>{value}%</Text>
    </View>
  );
}

function Badge({ icon, label }) {
  return (
    <View style={B.badge}>
      <Text style={B.badgeIcon}>{icon}</Text>
      <Text style={B.badgeLabel}>{label}</Text>
    </View>
  );
}

export default function ProPerformanceCard({ professionalId, proName, compact = false }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (!professionalId) { setLoading(false); return; }
    api.get(`/professionals/${professionalId}/performance`)
      .then(res => { if (res.data.success) setData(res.data.performance); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [professionalId]);

  if (loading) return (
    <View style={B.loadingBox}>
      <ActivityIndicator size="small" color={Colors.primary} />
      <Text style={B.loadingText}>Loading performance data...</Text>
    </View>
  );

  if (!data) return null;

  const scoreColor = data.score >= 90 ? '#1DB954' : data.score >= 75 ? Colors.warning : Colors.error;

  return (
    <View style={B.card}>
      {/* Header */}
      <TouchableOpacity
        style={B.header}
        onPress={() => compact && setExpanded(e => !e)}
        activeOpacity={compact ? 0.7 : 1}>
        <View style={B.scoreCircle}>
          <Text style={[B.scoreNum, { color: scoreColor }]}>{data.score}</Text>
          <Text style={B.scoreMax}>/100</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={B.scoreTitle}>Performance Score</Text>
          <Text style={B.scoreSub}>
            {data.score >= 90 ? '🏆 Exceptional professional'
              : data.score >= 75 ? '⭐ Great professional'
              : '✅ Verified professional'}
          </Text>
          <View style={B.statRow}>
            <Text style={B.statItem}>⭐ {data.rating}</Text>
            <Text style={B.statDot}>·</Text>
            <Text style={B.statItem}>{data.totalJobs.toLocaleString('en-IN')} jobs</Text>
            {data.jobsThisMonth > 0 && <>
              <Text style={B.statDot}>·</Text>
              <Text style={B.statItem}>{data.jobsThisMonth} this month</Text>
            </>}
          </View>
        </View>
        {compact && (
          <Text style={B.chevron}>{expanded ? '▲' : '▼'}</Text>
        )}
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Metric bars */}
          <View style={B.barsSection}>
            <ScoreBar value={data.onTimePct}      color="#1DB954" label="On-time arrival" />
            <ScoreBar value={data.completionPct}  color={Colors.primary} label="Job completion" />
            <ScoreBar value={data.responseRate}   color="#2196F3" label="Response rate" />
            <View style={B.barRow}>
              <Text style={B.barLabel}>Re-do rate</Text>
              <View style={B.barTrack}>
                <View style={[B.barFill, {
                  width: `${Math.min(data.redoRate, 100)}%`,
                  backgroundColor: data.redoRate === 0 ? '#1DB954' : data.redoRate < 5 ? Colors.warning : Colors.error,
                }]} />
              </View>
              <Text style={[B.barVal, {
                color: data.redoRate === 0 ? '#1DB954' : data.redoRate < 5 ? Colors.warning : Colors.error,
              }]}>
                {data.redoRate === 0 ? '0%' : `${data.redoRate}%`}
              </Text>
            </View>
          </View>

          {/* Badges */}
          {data.badges?.length > 0 && (
            <View style={B.badgesRow}>
              {data.badges.map((b, i) => <Badge key={i} icon={b.icon} label={b.label} />)}
            </View>
          )}

          <Text style={B.footer}>
            Data from {data.jobsThisMonth > 0 ? `${data.jobsThisMonth} recent jobs` : 'all completed jobs'}
          </Text>
        </>
      )}
    </View>
  );
}

const B = StyleSheet.create({
  loadingBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  loadingText:  { fontSize: 12, color: Colors.textLight },
  card:         { backgroundColor: Colors.white, borderRadius: 14, padding: 14, ...Shadows.sm, marginBottom: 12 },
  header:       { flexDirection: 'row', alignItems: 'center' },
  scoreCircle:  { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#E8E8F0', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', alignItems: 'baseline' },
  scoreNum:     { fontSize: 22, fontWeight: '800' },
  scoreMax:     { fontSize: 11, color: Colors.textLight, marginLeft: 1 },
  scoreTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  scoreSub:     { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, flexWrap: 'wrap' },
  statItem:     { fontSize: 11, color: Colors.textLight },
  statDot:      { fontSize: 11, color: Colors.placeholder },
  chevron:      { fontSize: 12, color: Colors.textLight, padding: 4 },

  barsSection:  { marginTop: 14, gap: 8 },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:     { fontSize: 12, color: Colors.textLight, width: 110 },
  barTrack:     { flex: 1, height: 6, backgroundColor: '#F0F0F4', borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 3 },
  barVal:       { fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },

  badgesRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F5FA', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeIcon:    { fontSize: 12 },
  badgeLabel:   { fontSize: 11, fontWeight: '600', color: Colors.text },
  footer:       { fontSize: 11, color: Colors.placeholder, marginTop: 10, textAlign: 'center' },
});
