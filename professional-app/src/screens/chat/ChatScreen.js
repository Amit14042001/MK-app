/**
 * Slot Professional App — ChatScreen
 * Real-time chat with customers, booking context, image/location sharing
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, FlatList,
  Alert, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const API_URL = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';
const SOCKET_URL = process.env.SOCKET_URL || 'http://10.0.2.2:5000';

const { width: W } = Dimensions.get('window');

const CONVERSATIONS = [
  {
    id: 'conv1',
    customerId: 'c1',
    customerName: 'Ananya Reddy',
    avatar: 'AR',
    bookingId: 'BK7823',
    service: 'AC Service',
    status: 'active',
    lastMessage: 'Will you be coming at 10 AM?',
    lastTime: '10:32 AM',
    unread: 2,
    messages: [
      { id: 'm1', text: 'Hello, I have a booking BK7823 for today', sender: 'customer', time: '10:20 AM', status: 'read' },
      { id: 'm2', text: 'Yes, I can see your booking. I\'ll be there by 10 AM.', sender: 'pro', time: '10:22 AM', status: 'read' },
      { id: 'm3', text: 'Great! Please bring all tools for AC gas refilling', sender: 'customer', time: '10:28 AM', status: 'read' },
      { id: 'm4', text: 'Sure, I\'ll carry the gas kit and all required tools.', sender: 'pro', time: '10:30 AM', status: 'read' },
      { id: 'm5', text: 'Will you be coming at 10 AM?', sender: 'customer', time: '10:32 AM', status: 'delivered' },
    ],
  },
  {
    id: 'conv2',
    customerId: 'c2',
    customerName: 'Karan Mehta',
    avatar: 'KM',
    bookingId: 'BK7819',
    service: 'AC Installation',
    status: 'completed',
    lastMessage: 'Thank you for the excellent work!',
    lastTime: 'Yesterday',
    unread: 0,
    messages: [
      { id: 'm1', text: 'Installation done. Please check if cooling is proper.', sender: 'pro', time: '3:00 PM', status: 'read' },
      { id: 'm2', text: 'Yes, it\'s working perfectly! Thank you for the excellent work!', sender: 'customer', time: '3:15 PM', status: 'read' },
    ],
  },
  {
    id: 'conv3',
    customerId: 'c3',
    customerName: 'Priya Sharma',
    avatar: 'PS',
    bookingId: 'BK7830',
    service: 'AC Service',
    status: 'upcoming',
    lastMessage: 'Booking confirmed for tomorrow 2 PM',
    lastTime: '9:00 AM',
    unread: 0,
    messages: [
      { id: 'm1', text: 'Hi, your booking BK7830 is confirmed for tomorrow at 2 PM.', sender: 'pro', time: '9:00 AM', status: 'read' },
    ],
  },
];

const AVATAR_COLORS = ['#E94560','#2980B9','#27AE60','#9B59B6','#E67E22'];

const QUICK_REPLIES = [
  'I\'m on my way!',
  'Reached your location',
  'Work completed. Please check.',
  'Will be 10 mins late, sorry.',
  'Please open the main door.',
  'Payment received. Thank you!',
];

export default function ChatScreen({ navigation, route }) {
  const initialConv = route?.params?.conversationId
    ? CONVERSATIONS.find(c => c.id === route.params.conversationId)
    : null;

  const [conversations, setConvs] = useState(CONVERSATIONS);
  const [activeConv, setActiveConv] = useState(initialConv);
  const [messageText, setMsgText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [showQuick, setShowQuick]   = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const scrollRef  = useRef(null);
  const socketRef  = useRef(null);

  // Load real conversations from API
  useEffect(() => {
    loadConversations();
    setupSocket();
    return () => { socketRef.current?.disconnect(); };
  }, []);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const token = await AsyncStorage.getItem('proToken');
      const res = await fetch(`${API_URL}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.conversations?.length > 0) {
        setConvs(data.conversations);
      }
      // else keep CONVERSATIONS as fallback
    } catch {}
    setLoadingConvs(false);
  };

  const setupSocket = async () => {
    const token = await AsyncStorage.getItem('proToken');
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    socket.on('new_message', (msg) => {
      setConvs(prev => prev.map(c =>
        c.id === msg.conversationId || c.bookingId === msg.bookingId
          ? { ...c, messages: [...(c.messages || []), msg], lastMessage: msg.text, lastTime: msg.time, unread: (c.unread || 0) + 1 }
          : c
      ));
      if (activeConv?.id === msg.conversationId) {
        setActiveConv(prev => prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    socket.on('message_read', ({ messageId, conversationId }) => {
      setConvs(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, messages: (c.messages || []).map(m => m.id === messageId ? { ...m, status: 'read' } : m) }
          : c
      ));
    });
  };

  useEffect(() => {
    if (activeConv) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      // Mark as read
      setConvs(prev => prev.map(c => c.id === activeConv.id ? { ...c, unread: 0 } : c));
    }
  }, [activeConv]);

  const sendMessage = async (text) => {
    const msg = text || messageText.trim();
    if (!msg || !activeConv) return;
    setSending(true);
    const newMsg = {
      id:     `m${Date.now()}`,
      text:   msg,
      sender: 'pro',
      time:   new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    // Optimistic update
    setConvs(prev => prev.map(c =>
      c.id === activeConv.id
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: msg, lastTime: newMsg.time }
        : c
    ));
    setActiveConv(prev => ({ ...prev, messages: [...prev.messages, newMsg] }));
    setMsgText('');
    setShowQuick(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Send via Socket.io (fastest) or fall back to HTTP
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversationId: activeConv.id,
          bookingId:      activeConv.bookingId,
          text:           msg,
          sender:         'professional',
        }, (ack) => {
          if (ack?.messageId) {
            setConvs(prev => prev.map(c =>
              c.id === activeConv.id
                ? { ...c, messages: c.messages.map(m => m.id === newMsg.id ? { ...m, status: 'delivered', id: ack.messageId } : m) }
                : c
            ));
          }
        });
      } else {
        // HTTP fallback
        const token = await AsyncStorage.getItem('proToken');
        await fetch(`${API_URL}/chat/conversations/${activeConv.bookingId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: msg }),
        });
        // Mark as delivered
        setConvs(prev => prev.map(c =>
          c.id === activeConv.id
            ? { ...c, messages: c.messages.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m) }
            : c
        ));
      }
    } catch {}
    setSending(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'read') return '✓✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'sent') return '✓';
    return '◯';
  };

  const getStatusColor = (status) => status === 'read' ? Colors.info : Colors.midGray;

  if (activeConv) {
    return (
      <KeyboardAvoidingView style={S.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Chat Header */}
        <View style={S.chatHeader}>
          <TouchableOpacity onPress={() => setActiveConv(null)} style={S.backBtn}>
            <Text style={S.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={[S.chatAvatar, { backgroundColor: AVATAR_COLORS[activeConv.customerId.charCodeAt(1) % AVATAR_COLORS.length] }]}>
            <Text style={S.chatAvatarText}>{activeConv.avatar}</Text>
          </View>
          <View style={S.chatHeaderInfo}>
            <Text style={S.chatHeaderName}>{activeConv.customerName}</Text>
            <Text style={S.chatHeaderSub}>{activeConv.service} · {activeConv.bookingId}</Text>
          </View>
          <TouchableOpacity style={S.callBtn} onPress={() => Alert.alert('Call', 'Calling customer...')}>
            <Text style={S.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Banner */}
        <View style={S.bookingBanner}>
          <Text style={S.bookingBannerText}>📋 {activeConv.service} — {activeConv.bookingId}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('JobDetail', { bookingId: activeConv.bookingId })}>
            <Text style={S.bookingBannerLink}>View →</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={S.messagesContainer}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={S.dateSep}>Today</Text>
          {activeConv.messages.map((msg, idx) => {
            const isMe = msg.sender === 'pro';
            return (
              <View key={msg.id} style={[S.msgWrapper, isMe ? S.msgWrapperMe : S.msgWrapperThem]}>
                {!isMe && (
                  <View style={[S.msgAvatar, { backgroundColor: AVATAR_COLORS[activeConv.customerId.charCodeAt(1) % AVATAR_COLORS.length] }]}>
                    <Text style={S.msgAvatarText}>{activeConv.avatar}</Text>
                  </View>
                )}
                <View style={[S.bubble, isMe ? S.bubbleMe : S.bubbleThem]}>
                  <Text style={[S.bubbleText, isMe ? S.bubbleTextMe : S.bubbleTextThem]}>{msg.text}</Text>
                  <View style={S.msgMeta}>
                    <Text style={[S.msgTime, isMe ? S.msgTimeMe : S.msgTimeThem]}>{msg.time}</Text>
                    {isMe && (
                      <Text style={[S.msgStatus, { color: getStatusColor(msg.status) }]}>
                        {getStatusIcon(msg.status)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 10 }} />
        </ScrollView>

        {/* Quick Replies */}
        {showQuick && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.quickScroll}>
            {QUICK_REPLIES.map((q, i) => (
              <TouchableOpacity key={i} style={S.quickChip} onPress={() => sendMessage(q)}>
                <Text style={S.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={S.inputRow}>
          <TouchableOpacity style={S.quickBtn} onPress={() => setShowQuick(!showQuick)}>
            <Text style={S.quickBtnIcon}>⚡</Text>
          </TouchableOpacity>
          <TextInput
            style={S.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.lightGray}
            value={messageText}
            onChangeText={setMsgText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[S.sendBtn, (!messageText.trim() || sending) && S.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!messageText.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={S.sendIcon}>➤</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Conversations List
  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <View style={S.emptyBox}>
            <Text style={S.emptyIcon}>💬</Text>
            <Text style={S.emptyTitle}>No Messages</Text>
            <Text style={S.emptyDesc}>Customer messages for your bookings will appear here.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {conversations.map(conv => (
              <TouchableOpacity
                key={conv.id}
                style={S.convCard}
                onPress={() => setActiveConv(conv)}
                activeOpacity={0.85}
              >
                <View style={[S.convAvatar, { backgroundColor: AVATAR_COLORS[conv.customerId.charCodeAt(1) % AVATAR_COLORS.length] }]}>
                  <Text style={S.convAvatarText}>{conv.avatar}</Text>
                  {conv.status === 'active' && <View style={S.onlineDot} />}
                </View>
                <View style={S.convInfo}>
                  <View style={S.convTopRow}>
                    <Text style={S.convName}>{conv.customerName}</Text>
                    <Text style={S.convTime}>{conv.lastTime}</Text>
                  </View>
                  <View style={S.convBottomRow}>
                    <Text style={S.convLast} numberOfLines={1}>{conv.lastMessage}</Text>
                    {conv.unread > 0 && (
                      <View style={S.unreadBadge}><Text style={S.unreadText}>{conv.unread}</Text></View>
                    )}
                  </View>
                  <View style={S.convBookingRow}>
                    <Text style={S.convBookingId}>{conv.bookingId}</Text>
                    <Text style={S.convService}>{conv.service}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  backIcon:   { fontSize: 22, color: Colors.black },
  headerTitle:{ flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  convCard:        { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 8, alignItems: 'center', ...Shadows.sm },
  convAvatar:      { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 12, position: 'relative' },
  convAvatarText:  { ...Typography.bodyLarge, color: Colors.white, fontWeight: '800' },
  onlineDot:       { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.white },
  convInfo:        { flex: 1 },
  convTopRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName:        { ...Typography.body, color: Colors.black, fontWeight: '700' },
  convTime:        { ...Typography.caption, color: Colors.midGray },
  convBottomRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convLast:        { ...Typography.body, color: Colors.gray, flex: 1, marginRight: 8 },
  unreadBadge:     { backgroundColor: Colors.primary, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  unreadText:      { ...Typography.small, color: Colors.white, fontWeight: '800' },
  convBookingRow:  { flexDirection: 'row', gap: 8 },
  convBookingId:   { ...Typography.small, color: Colors.primary, fontWeight: '700', backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  convService:     { ...Typography.small, color: Colors.gray },

  chatHeader:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, ...Shadows.sm },
  chatAvatar:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  chatAvatarText:  { ...Typography.body, color: Colors.white, fontWeight: '800' },
  chatHeaderInfo:  { flex: 1 },
  chatHeaderName:  { ...Typography.body, color: Colors.black, fontWeight: '700' },
  chatHeaderSub:   { ...Typography.caption, color: Colors.gray },
  callBtn:         { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  callIcon:        { fontSize: 20 },

  bookingBanner:   { flexDirection: 'row', backgroundColor: Colors.primaryLight, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'space-between', alignItems: 'center' },
  bookingBannerText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  bookingBannerLink: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '700' },

  messagesContainer:{ flex: 1 },
  dateSep:         { textAlign: 'center', ...Typography.small, color: Colors.midGray, marginBottom: 16, backgroundColor: Colors.offWhite, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'center' },

  msgWrapper:      { flexDirection: 'row', marginBottom: 8, maxWidth: W * 0.8 },
  msgWrapperMe:    { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgWrapperThem:  { alignSelf: 'flex-start' },
  msgAvatar:       { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 6, alignSelf: 'flex-end' },
  msgAvatarText:   { fontSize: 10, color: Colors.white, fontWeight: '800' },

  bubble:          { borderRadius: 16, padding: 12, maxWidth: W * 0.7 },
  bubbleMe:        { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem:      { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadows.sm },
  bubbleText:      { ...Typography.body, lineHeight: 20 },
  bubbleTextMe:    { color: Colors.white },
  bubbleTextThem:  { color: Colors.black },
  msgMeta:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  msgTime:         { fontSize: 10, lineHeight: 14 },
  msgTimeMe:       { color: 'rgba(255,255,255,0.7)' },
  msgTimeThem:     { color: Colors.midGray },
  msgStatus:       { fontSize: 11 },

  quickScroll:     { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.offWhite, paddingVertical: 8 },
  quickChip:       { backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginHorizontal: 6 },
  quickChipText:   { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.offWhite, gap: 8 },
  quickBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  quickBtnIcon:    { fontSize: 18 },
  input:           { flex: 1, backgroundColor: Colors.offWhite, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, ...Typography.body, color: Colors.black, maxHeight: 100 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.lightGray },
  sendIcon:        { fontSize: 16, color: Colors.white, marginLeft: 2 },

  emptyBox:   { alignItems: 'center', paddingVertical: 80 },
  emptyIcon:  { fontSize: 56, marginBottom: 12 },
  emptyTitle: { ...Typography.h3, color: Colors.black, marginBottom: 8 },
  emptyDesc:  { ...Typography.body, color: Colors.gray, textAlign: 'center', paddingHorizontal: 40 },
});
