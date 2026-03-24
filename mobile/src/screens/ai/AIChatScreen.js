/**
 * Slot App — AI Chat Booking Assistant Screen
 * LLM-powered conversational booking — UC doesn't have this
 * "Book AC service Sunday 10am" → auto-creates booking
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
  Dimensions, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows, Radius } from '../../utils/theme';
import { aiChatAPI } from '../../utils/api';

const { width: W } = Dimensions.get('window');

const GREETING = {
  id: 'greeting',
  role: 'assistant',
  text: "Hi! 👋 I'm your Slot Assistant.\n\nI can help you book any home service just by chatting — no tapping through menus.\n\nTry: *\"Book AC service this Sunday at 10am\"*",
  timestamp: new Date(),
};

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])
    ).start();
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={S.typingBubble}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[S.typingDot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

function MessageBubble({ message, onBookingPress }) {
  const isUser = message.role === 'user';
  const hasBooking = message.booking && !message.booking.error;

  // Format text: *bold* → bold style
  const renderText = (text) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <Text key={i} style={{ fontWeight: '700' }}>{part.slice(1, -1)}</Text>;
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  return (
    <View style={[S.msgRow, isUser && S.msgRowUser]}>
      {!isUser && (
        <View style={S.avatarCircle}>
          <Text style={S.avatarText}>🤖</Text>
        </View>
      )}
      <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleBot]}>
        <Text style={[S.bubbleText, isUser && S.bubbleTextUser]}>
          {renderText(message.text)}
        </Text>

        {/* Booking confirmation card */}
        {hasBooking && (
          <TouchableOpacity
            onPress={() => onBookingPress?.(message.booking)}
            style={S.bookingCard}>
            <View style={S.bookingCardHeader}>
              <Text style={S.bookingCardIcon}>✅</Text>
              <Text style={S.bookingCardTitle}>Booking Confirmed!</Text>
            </View>
            <Text style={S.bookingCardDetail}>📋 {message.booking.bookingId}</Text>
            <Text style={S.bookingCardDetail}>🔧 {message.booking.service}</Text>
            <Text style={S.bookingCardDetail}>📅 {new Date(message.booking.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}</Text>
            <Text style={S.bookingCardDetail}>⏰ {message.booking.timeSlot}</Text>
            <Text style={S.bookingCardAmount}>₹{message.booking.totalAmount} · Tap to view booking</Text>
          </TouchableOpacity>
        )}

        {/* Booking error */}
        {message.booking?.error && (
          <View style={S.errorCard}>
            <Text style={S.errorText}>⚠️ {message.booking.error}</Text>
          </View>
        )}

        <Text style={S.timestamp}>
          {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function SuggestionChip({ text, onPress }) {
  return (
    <TouchableOpacity onPress={() => onPress(text)} style={S.suggChip} activeOpacity={0.75}>
      <Text style={S.suggText}>{text}</Text>
    </TouchableOpacity>
  );
}

export default function AIChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const flatRef = useRef(null);

  const [messages, setMessages]           = useState([GREETING]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [suggestions, setSuggestions]     = useState([]);
  const [showSuggestions, setShowSugg]    = useState(true);
  const [conversationHistory, setHistory] = useState([]);

  useEffect(() => {
    aiChatAPI.getSuggestions()
      .then(({ data }) => setSuggestions(data.data || []))
      .catch(() => setSuggestions([
        'Book AC service this Sunday',
        'Need deep cleaning for 2BHK',
        'Plumber needed tomorrow morning',
        'How much does salon cost?',
      ]));
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setShowSugg(false);
    setLoading(true);

    const userMsg = { id: Date.now().toString(), role: 'user', text: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data } = await aiChatAPI.sendMessage({
        message: msg,
        conversationHistory,
      });

      const botMsg = {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        text:      data.reply,
        booking:   data.booking || null,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMsg]);
      setHistory(prev => [
        ...prev,
        { role: 'user',      content: msg },
        { role: 'assistant', content: data.assistantMessage?.content || data.reply },
      ]);

      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages(prev => [...prev, {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        text:      "Sorry, I'm having trouble connecting. Please check your internet or try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationHistory]);

  const handleBookingPress = (booking) => {
    navigation.navigate('BookingDetail', { bookingId: booking.bookingId });
  };

  return (
    <KeyboardAvoidingView
      style={[S.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>

      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#2D2D4A']} style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={S.headerInfo}>
          <View style={S.headerAvatarRow}>
            <View style={S.headerAvatar}><Text style={{ fontSize: 18 }}>🤖</Text></View>
            <View>
              <Text style={S.headerTitle}>Slot Assistant</Text>
              <Text style={S.headerSub}>AI-powered booking · Always online</Text>
            </View>
          </View>
        </View>
        <View style={S.aiLabel}>
          <Text style={S.aiLabelText}>✨ AI</Text>
        </View>
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={S.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <MessageBubble message={item} onBookingPress={handleBookingPress} />
        )}
        ListFooterComponent={loading ? (
          <View style={S.msgRow}>
            <View style={S.avatarCircle}><Text style={S.avatarText}>🤖</Text></View>
            <TypingIndicator />
          </View>
        ) : null}
      />

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={S.suggContainer}>
          <Text style={S.suggLabel}>Try asking:</Text>
          <FlatList
            horizontal
            data={suggestions}
            keyExtractor={(s, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <SuggestionChip text={item} onPress={sendMessage} />
            )}
          />
        </View>
      )}

      {/* Input bar */}
      <View style={[S.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask me to book a service…"
          placeholderTextColor={Colors.lightGray}
          style={S.input}
          multiline
          maxLength={500}
          onFocus={() => setShowSugg(false)}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={[S.sendBtn, (!input.trim() || loading) && S.sendBtnDisabled]}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={S.sendIcon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F5F5F7' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#fff' },
  headerInfo:   { flex: 1 },
  headerAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  aiLabel:      { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  aiLabelText:  { fontSize: 11, fontWeight: '800', color: '#fff' },

  messageList:  { padding: 16, paddingBottom: 8, gap: 12 },
  msgRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: W * 0.88 },
  msgRowUser:   { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginBottom: 16 },
  avatarText:   { fontSize: 16 },

  bubble:       { maxWidth: W * 0.75, borderRadius: 18, padding: 12, paddingBottom: 6 },
  bubbleBot:    { backgroundColor: '#fff', borderBottomLeftRadius: 4, ...Shadows.sm },
  bubbleUser:   { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText:   { fontSize: 14, color: Colors.black, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  timestamp:    { fontSize: 10, color: Colors.lightGray, marginTop: 4, alignSelf: 'flex-end' },

  typingBubble: { backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, flexDirection: 'row', gap: 5, ...Shadows.sm },
  typingDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lightGray },

  bookingCard:       { backgroundColor: '#F0FFF4', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#A8E6CF' },
  bookingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bookingCardIcon:   { fontSize: 16 },
  bookingCardTitle:  { fontSize: 13, fontWeight: '800', color: '#1B5E20' },
  bookingCardDetail: { fontSize: 12, color: '#2E7D32', marginTop: 2 },
  bookingCardAmount: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginTop: 6 },

  errorCard:    { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#FFCC80' },
  errorText:    { fontSize: 12, color: '#E65100' },

  suggContainer:{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingVertical: 10 },
  suggLabel:    { fontSize: 11, color: Colors.midGray, fontWeight: '600', paddingHorizontal: 16, marginBottom: 6 },
  suggChip:     { backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primaryMid || '#FFD6DE' },
  suggText:     { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Colors.borderLight },
  input:        { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: Colors.offWhite, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.black, borderWidth: 1, borderColor: Colors.borderLight },
  sendBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.brand },
  sendBtnDisabled: { backgroundColor: Colors.lightGray },
  sendIcon:     { fontSize: 18, color: '#fff' },
});
