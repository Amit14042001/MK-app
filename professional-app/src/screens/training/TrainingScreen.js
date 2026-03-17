/**
 * MK Professional App — TrainingScreen
 * Courses, certifications, skill badges, video tutorials, quizzes
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Image, ProgressBarAndroid, Modal, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Shadows, Radius } from '../../utils/theme';

let Video = null;
try { Video = require('react-native-video').default; } catch { }

const { width: W } = Dimensions.get('window');

const COURSES = [
  {
    id: 'c1',
    title: 'Professional AC Service & Repair',
    category: 'HVAC',
    duration: '4h 30min',
    lessons: 18,
    rating: 4.8,
    enrolled: 1240,
    progress: 65,
    thumbnail: '❄️',
    color: '#EAF4FB',
    level: 'Intermediate',
    instructor: 'Rajesh Kumar',
    badge: '🏆',
    description: 'Master AC installation, gas charging, fault diagnosis, and preventive maintenance for all major brands.',
    topics: ['AC Types & Components', 'Gas Handling Safety', 'Fault Diagnosis', 'Preventive Maintenance', 'Customer Communication'],
    completed: false,
    certified: false,
  },
  {
    id: 'c2',
    title: 'Home Electrical Safety & Wiring',
    category: 'Electrical',
    duration: '3h 15min',
    lessons: 14,
    rating: 4.9,
    enrolled: 2100,
    progress: 100,
    thumbnail: '⚡',
    color: '#FEF9E7',
    level: 'Advanced',
    instructor: 'Amit Sharma',
    badge: '⭐',
    description: 'Complete guide to domestic electrical work including MCB panels, earthing, and load calculations.',
    topics: ['Safety Standards', 'MCB & ELCB', 'Earthing Systems', 'Load Calculations', 'Fault Finding'],
    completed: true,
    certified: true,
  },
  {
    id: 'c3',
    title: 'Plumbing Essentials & Modern Fixtures',
    category: 'Plumbing',
    duration: '2h 45min',
    lessons: 11,
    rating: 4.7,
    enrolled: 890,
    progress: 30,
    thumbnail: '🔧',
    color: '#E8F8F0',
    level: 'Beginner',
    instructor: 'Suresh Patel',
    badge: null,
    description: 'Learn pipe fitting, leak detection, bathroom fixture installation, and drainage systems.',
    topics: ['Pipe Materials', 'Leak Detection', 'Fixture Installation', 'Drainage Design', 'Water Pressure'],
    completed: false,
    certified: false,
  },
  {
    id: 'c4',
    title: 'Customer Service Excellence',
    category: 'Soft Skills',
    duration: '1h 30min',
    lessons: 8,
    rating: 4.6,
    enrolled: 3400,
    progress: 0,
    thumbnail: '🤝',
    color: '#F3E5F5',
    level: 'Beginner',
    instructor: 'Priya Singh',
    badge: null,
    description: 'Build strong customer relationships, handle complaints professionally, and earn 5-star reviews.',
    topics: ['First Impressions', 'Active Listening', 'Complaint Resolution', 'Upselling Ethically', 'Post-Service Follow-up'],
    completed: false,
    certified: false,
  },
  {
    id: 'c5',
    title: 'Advanced Pest Control Techniques',
    category: 'Pest Control',
    duration: '3h 00min',
    lessons: 12,
    rating: 4.8,
    enrolled: 670,
    progress: 0,
    thumbnail: '🐛',
    color: '#FCE4EC',
    level: 'Advanced',
    instructor: 'Vijay Nair',
    badge: null,
    description: 'Comprehensive pest management including termite treatment, rodent control, and chemical safety.',
    topics: ['Pest Identification', 'Chemical Safety', 'Termite Treatment', 'Rodent Control', 'Post-Treatment Care'],
    completed: false,
    certified: false,
  },
];

const ACHIEVEMENTS = [
  { id: 'a1', title: 'First Certificate', icon: '🎓', earned: true,  desc: 'Complete your first course' },
  { id: 'a2', title: 'Fast Learner',     icon: '⚡', earned: true,  desc: 'Complete a course in one session' },
  { id: 'a3', title: 'Top Rated',        icon: '⭐', earned: false, desc: 'Maintain 4.8+ rating for 30 days' },
  { id: 'a4', title: 'Expert Pro',       icon: '🏆', earned: false, desc: 'Complete 5 advanced courses' },
  { id: 'a5', title: 'Safety Champion',  icon: '🛡️', earned: false, desc: 'Complete all safety courses' },
];

export default function TrainingScreen({ navigation }) {
  const [activeTab, setActiveTab]       = useState('courses'); // courses | achievements | certificates
  const [selectedCourse, setSelected]   = useState(null);
  const [courseModal, setCourseModal]   = useState(false);
  const [filterCategory, setFilter]     = useState('All');
  const [loading, setLoading]           = useState(false);

  const categories = ['All', 'HVAC', 'Electrical', 'Plumbing', 'Pest Control', 'Soft Skills'];
  const filtered = filterCategory === 'All' ? COURSES : COURSES.filter(c => c.category === filterCategory);

  const completedCount = COURSES.filter(c => c.completed).length;
  const certCount      = COURSES.filter(c => c.certified).length;
  const totalProgress  = Math.round(COURSES.reduce((sum, c) => sum + c.progress, 0) / COURSES.length);

  const openCourse = (course) => {
    setSelected(course);
    setCourseModal(true);
  };

  const [videoModal, setVideoModal]       = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [videoProgress, setVideoProgress] = useState({});
  const [playing, setPlaying]             = useState(false);

  // Course → lesson list map (in production, fetched from API)
  const LESSON_MAP = {
    c1: [
      { id: 'l1', title: 'Introduction to AC Systems', duration: '12:30', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'l2', title: 'Safety & Tools Required', duration: '8:45', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
      { id: 'l3', title: 'Filter Cleaning & Replacement', duration: '15:20', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    ],
    c2: [
      { id: 'l1', title: 'Electrical Safety Standards', duration: '10:00', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
      { id: 'l2', title: 'MCB & Circuit Breakers', duration: '14:15', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    ],
  };

  const startLesson = () => {
    const lessons = LESSON_MAP[selectedCourse?.id] || [];
    if (lessons.length === 0) {
      Alert.alert('Coming Soon', 'Video content for this course will be available soon.');
      setCourseModal(false);
      return;
    }
    setCurrentLesson(lessons[0]);
    setPlaying(true);
    setCourseModal(false);
    setVideoModal(true);
  };

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Training Hub</Text>
        <View style={S.headerRight} />
      </View>

      {/* Stats Bar */}
      <View style={S.statsBar}>
        <View style={S.statItem}>
          <Text style={S.statValue}>{completedCount}</Text>
          <Text style={S.statLabel}>Completed</Text>
        </View>
        <View style={S.statDivider} />
        <View style={S.statItem}>
          <Text style={S.statValue}>{certCount}</Text>
          <Text style={S.statLabel}>Certificates</Text>
        </View>
        <View style={S.statDivider} />
        <View style={S.statItem}>
          <Text style={S.statValue}>{totalProgress}%</Text>
          <Text style={S.statLabel}>Avg Progress</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {['courses', 'achievements', 'certificates'].map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[S.tab, activeTab === tab && S.tabActive]}>
            <Text style={[S.tabLabel, activeTab === tab && S.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'courses' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setFilter(cat)}
                style={[S.filterChip, filterCategory === cat && S.filterChipActive]}
              >
                <Text style={[S.filterLabel, filterCategory === cat && S.filterLabelActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* In Progress */}
          {filtered.filter(c => c.progress > 0 && !c.completed).length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>Continue Learning</Text>
              {filtered.filter(c => c.progress > 0 && !c.completed).map(course => (
                <TouchableOpacity key={course.id} style={S.courseCard} onPress={() => openCourse(course)} activeOpacity={0.85}>
                  <View style={[S.courseThumbnail, { backgroundColor: course.color }]}>
                    <Text style={S.courseEmoji}>{course.thumbnail}</Text>
                  </View>
                  <View style={S.courseInfo}>
                    <Text style={S.courseTitle} numberOfLines={2}>{course.title}</Text>
                    <Text style={S.courseMeta}>{course.category} · {course.level}</Text>
                    <View style={S.progressRow}>
                      <View style={S.progressBar}>
                        <View style={[S.progressFill, { width: `${course.progress}%` }]} />
                      </View>
                      <Text style={S.progressPct}>{course.progress}%</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* All Courses */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>All Courses</Text>
            {filtered.map(course => (
              <TouchableOpacity key={course.id} style={S.courseCard} onPress={() => openCourse(course)} activeOpacity={0.85}>
                <View style={[S.courseThumbnail, { backgroundColor: course.color }]}>
                  <Text style={S.courseEmoji}>{course.thumbnail}</Text>
                  {course.completed && <View style={S.completedBadge}><Text style={S.completedBadgeText}>✓</Text></View>}
                </View>
                <View style={S.courseInfo}>
                  <View style={S.courseTitleRow}>
                    <Text style={S.courseTitle} numberOfLines={1}>{course.title}</Text>
                    {course.certified && <Text style={S.certIcon}>🏅</Text>}
                  </View>
                  <Text style={S.courseMeta}>{course.lessons} lessons · {course.duration}</Text>
                  <View style={S.courseFooter}>
                    <Text style={S.courseRating}>⭐ {course.rating}</Text>
                    <Text style={S.courseEnrolled}>{course.enrolled.toLocaleString()} enrolled</Text>
                    <View style={[S.levelBadge, { backgroundColor: course.level === 'Beginner' ? Colors.successLight : course.level === 'Intermediate' ? Colors.warningLight : Colors.errorLight }]}>
                      <Text style={[S.levelText, { color: course.level === 'Beginner' ? Colors.success : course.level === 'Intermediate' ? Colors.warning : Colors.error }]}>{course.level}</Text>
                    </View>
                  </View>
                  {course.progress > 0 && (
                    <View style={S.progressRow}>
                      <View style={S.progressBar}>
                        <View style={[S.progressFill, { width: `${course.progress}%`, backgroundColor: course.completed ? Colors.success : Colors.primary }]} />
                      </View>
                      <Text style={S.progressPct}>{course.progress}%</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'achievements' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={S.achieveHeader}>Your Achievements</Text>
          {ACHIEVEMENTS.map(a => (
            <View key={a.id} style={[S.achieveCard, !a.earned && S.achieveCardLocked]}>
              <Text style={[S.achieveIcon, !a.earned && { opacity: 0.3 }]}>{a.icon}</Text>
              <View style={S.achieveInfo}>
                <Text style={[S.achieveTitle, !a.earned && { color: Colors.lightGray }]}>{a.title}</Text>
                <Text style={S.achieveDesc}>{a.desc}</Text>
              </View>
              {a.earned ? (
                <View style={S.earnedBadge}><Text style={S.earnedBadgeText}>Earned</Text></View>
              ) : (
                <View style={S.lockedBadge}><Text style={S.lockedBadgeText}>Locked</Text></View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'certificates' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {COURSES.filter(c => c.certified).length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyIcon}>🎓</Text>
              <Text style={S.emptyTitle}>No Certificates Yet</Text>
              <Text style={S.emptyDesc}>Complete courses to earn certificates and boost your profile ranking.</Text>
            </View>
          ) : (
            COURSES.filter(c => c.certified).map(course => (
              <View key={course.id} style={S.certCard}>
                <View style={[S.certHeader, { backgroundColor: course.color }]}>
                  <Text style={S.certEmoji}>{course.thumbnail}</Text>
                  <View style={S.certBadge}><Text style={S.certBadgeText}>🏅 Certified</Text></View>
                </View>
                <View style={S.certBody}>
                  <Text style={S.certTitle}>{course.title}</Text>
                  <Text style={S.certInstructor}>by {course.instructor}</Text>
                  <Text style={S.certDate}>Issued: Jan 2025</Text>
                  <TouchableOpacity style={S.downloadBtn}>
                    <Text style={S.downloadBtnText}>⬇ Download Certificate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Course Detail Modal */}
      <Modal visible={courseModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.courseSheet}>
            <View style={S.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCourse && (
                <>
                  <View style={[S.courseSheetHero, { backgroundColor: selectedCourse.color }]}>
                    <Text style={S.courseSheetEmoji}>{selectedCourse.thumbnail}</Text>
                  </View>
                  <View style={{ padding: 20 }}>
                    <Text style={S.courseSheetTitle}>{selectedCourse.title}</Text>
                    <Text style={S.courseSheetMeta}>By {selectedCourse.instructor} · {selectedCourse.category}</Text>
                    <View style={S.courseMetaRow}>
                      <Text style={S.metaChip}>⭐ {selectedCourse.rating}</Text>
                      <Text style={S.metaChip}>📚 {selectedCourse.lessons} lessons</Text>
                      <Text style={S.metaChip}>⏱ {selectedCourse.duration}</Text>
                    </View>
                    <Text style={S.courseSheetDesc}>{selectedCourse.description}</Text>
                    <Text style={S.topicsTitle}>What You'll Learn</Text>
                    {selectedCourse.topics.map((t, i) => (
                      <View key={i} style={S.topicRow}>
                        <Text style={S.topicCheck}>✓</Text>
                        <Text style={S.topicText}>{t}</Text>
                      </View>
                    ))}
                    {selectedCourse.progress > 0 && (
                      <View style={S.progressSection}>
                        <View style={S.progressRowFull}>
                          <Text style={S.progressLabel}>Your Progress</Text>
                          <Text style={S.progressValue}>{selectedCourse.progress}%</Text>
                        </View>
                        <View style={S.progressBarFull}>
                          <View style={[S.progressFillFull, { width: `${selectedCourse.progress}%` }]} />
                        </View>
                      </View>
                    )}
                    <TouchableOpacity style={S.startBtn} onPress={startLesson}>
                      <Text style={S.startBtnText}>
                        {selectedCourse.completed ? '✓ Review Course' : selectedCourse.progress > 0 ? '▶ Continue Learning' : '▶ Start Course'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.cancelBtn} onPress={() => setCourseModal(false)}>
                      <Text style={S.cancelBtnText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Video Player Modal */}
      <Modal visible={videoModal} transparent={false} animationType="slide" onRequestClose={() => { setVideoModal(false); setPlaying(false); }}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Video area */}
          <View style={{ width: '100%', aspectRatio: 16/9, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
            {Video && currentLesson ? (
              <Video
                source={{ uri: currentLesson.videoUrl }}
                style={{ width: '100%', height: '100%' }}
                controls={true}
                resizeMode="contain"
                paused={!playing}
                onProgress={({ currentTime, seekableDuration }) => {
                  if (seekableDuration > 0) {
                    setVideoProgress(prev => ({ ...prev, [currentLesson.id]: currentTime / seekableDuration }));
                  }
                }}
                onEnd={() => setPlaying(false)}
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 48 }}>▶️</Text>
                <Text style={{ color: '#fff', marginTop: 8, fontSize: 14 }}>
                  {Video ? 'Loading video...' : 'Install react-native-video to enable playback'}
                </Text>
              </View>
            )}
          </View>

          {/* Lesson info */}
          <View style={{ flex: 1, backgroundColor: Colors.white, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => { setVideoModal(false); setPlaying(false); }} style={{ padding: 4 }}>
                <Text style={{ fontSize: 22, color: Colors.black }}>✕</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: Colors.gray }}>{selectedCourse?.title}</Text>
              <View style={{ width: 32 }} />
            </View>

            <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.black, marginBottom: 4 }}>
              {currentLesson?.title}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.gray, marginBottom: 20 }}>
              Duration: {currentLesson?.duration}
            </Text>

            {/* Lesson list */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 10 }}>All Lessons</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(LESSON_MAP[selectedCourse?.id] || []).map((lesson, idx) => {
                const prog = videoProgress[lesson.id] || 0;
                const isActive = currentLesson?.id === lesson.id;
                return (
                  <TouchableOpacity
                    key={lesson.id}
                    onPress={() => { setCurrentLesson(lesson); setPlaying(true); }}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: isActive ? Colors.primaryLight : Colors.offWhite }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isActive ? Colors.primary : Colors.lightGray, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, color: Colors.white }}>{prog >= 0.95 ? '✓' : isActive ? '▶' : String(idx + 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: isActive ? Colors.primary : Colors.black }} numberOfLines={1}>{lesson.title}</Text>
                      <Text style={{ fontSize: 12, color: Colors.gray, marginTop: 2 }}>{lesson.duration}</Text>
                      {prog > 0 && prog < 0.95 && (
                        <View style={{ height: 3, backgroundColor: Colors.borderLight, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <View style={{ height: 3, width: `${Math.round(prog * 100)}%`, backgroundColor: Colors.primary }} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:   { width: 40, height: 40, justifyContent: 'center' },
  backIcon:  { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  headerRight:  { width: 40 },

  statsBar:    { flexDirection: 'row', backgroundColor: Colors.white, margin: 16, borderRadius: 16, padding: 16, ...Shadows.sm },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { ...Typography.h2, color: Colors.primary },
  statLabel:   { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.offWhite },

  tabs:          { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  tab:           { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel:      { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  tabLabelActive:{ ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  filterScroll: { marginTop: 12, marginBottom: 4 },
  filterChip:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel:  { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  filterLabelActive: { color: Colors.white },

  section:      { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  courseCard:   { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...Shadows.sm },
  courseThumbnail: { width: 90, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  courseEmoji:  { fontSize: 32 },
  completedBadge: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  completedBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
  courseInfo:   { flex: 1, padding: 12 },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  courseTitle:  { ...Typography.body, color: Colors.black, fontWeight: '700', flex: 1 },
  certIcon:     { fontSize: 16 },
  courseMeta:   { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  courseFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  courseRating: { ...Typography.caption, color: Colors.star, fontWeight: '700' },
  courseEnrolled: { ...Typography.caption, color: Colors.gray },
  levelBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText:    { ...Typography.small, fontWeight: '700' },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressBar:  { flex: 1, height: 5, backgroundColor: Colors.offWhite, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: Colors.primary, borderRadius: 3 },
  progressPct:  { ...Typography.small, color: Colors.primary, fontWeight: '700', width: 30 },

  achieveHeader: { ...Typography.h3, color: Colors.black, marginBottom: 16 },
  achieveCard:   { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 8, alignItems: 'center', ...Shadows.sm },
  achieveCardLocked: { opacity: 0.7 },
  achieveIcon:   { fontSize: 32, marginRight: 16 },
  achieveInfo:   { flex: 1 },
  achieveTitle:  { ...Typography.body, color: Colors.black, fontWeight: '700' },
  achieveDesc:   { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  earnedBadge:   { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.successLight, borderRadius: 8 },
  earnedBadgeText: { ...Typography.caption, color: Colors.success, fontWeight: '700' },
  lockedBadge:   { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.offWhite, borderRadius: 8 },
  lockedBadgeText: { ...Typography.caption, color: Colors.midGray, fontWeight: '600' },

  emptyBox:  { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle:{ ...Typography.h3, color: Colors.black, marginBottom: 8 },
  emptyDesc: { ...Typography.body, color: Colors.gray, textAlign: 'center', paddingHorizontal: 32 },

  certCard:   { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', marginBottom: 16, ...Shadows.sm },
  certHeader: { height: 100, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  certEmoji:  { fontSize: 40 },
  certBadge:  { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  certBadgeText: { ...Typography.caption, color: Colors.warning, fontWeight: '700' },
  certBody:   { padding: 16 },
  certTitle:  { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700', marginBottom: 4 },
  certInstructor: { ...Typography.caption, color: Colors.gray },
  certDate:   { ...Typography.caption, color: Colors.midGray, marginTop: 2, marginBottom: 12 },
  downloadBtn: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  downloadBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  courseSheet:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  sheetHandle:  { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  courseSheetHero: { height: 120, justifyContent: 'center', alignItems: 'center' },
  courseSheetEmoji: { fontSize: 56 },
  courseSheetTitle: { ...Typography.h2, color: Colors.black, marginBottom: 4 },
  courseSheetMeta:  { ...Typography.caption, color: Colors.gray, marginBottom: 12 },
  courseMetaRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaChip:         { ...Typography.caption, color: Colors.black, backgroundColor: Colors.offWhite, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontWeight: '600' },
  courseSheetDesc:  { ...Typography.body, color: Colors.gray, lineHeight: 22, marginBottom: 16 },
  topicsTitle:      { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700', marginBottom: 8 },
  topicRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  topicCheck:       { ...Typography.body, color: Colors.success, fontWeight: '700' },
  topicText:        { ...Typography.body, color: Colors.darkGray, flex: 1 },
  progressSection:  { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 4 },
  progressRowFull:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel:    { ...Typography.body, color: Colors.black, fontWeight: '600' },
  progressValue:    { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  progressBarFull:  { height: 8, backgroundColor: Colors.lightGray, borderRadius: 4, overflow: 'hidden' },
  progressFillFull: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  startBtn:         { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnText:     { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  cancelBtn:        { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText:    { ...Typography.body, color: Colors.gray },
});
