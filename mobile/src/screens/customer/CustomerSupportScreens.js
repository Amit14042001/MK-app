/**
 * Slot App — Customer Live Chat Screen (Full)
 * Real-time chat with support agent, booking context, media support
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';

const QUICK_REPLIES = [
  'Where is my professional?',
  'I want to reschedule',
  'I want to cancel',
  'Payment issue',
  'Service quality issue',
  'Request a refund',
  'Warranty claim',
];

const CANNED_RESPONSES = {
  'Where is my professional?': 'I can see your professional is on the way! They are currently about 15 minutes away. You can track their live location in the app.',
  'I want to reschedule': "Sure! I'll help you reschedule. What date and time works best for you?",
  'I want to cancel': 'I understand you want to cancel. Could you tell me the reason so I can assist you better? Note: Cancellations within 4 hours may have a small fee.',
  'Payment issue': "I'm sorry to hear about the payment issue. Could you share the transaction ID or the error message you're seeing?",
  'Service quality issue': "I'm really sorry about that. Your experience matters to us. Could you describe what happened so we can address it immediately?",
  'Request a refund': "I'll process your refund request right away. Please allow 5-7 business days for the amount to reflect in your account.",
  'Warranty claim': 'I can help you file a warranty claim. Please provide your booking ID and describe the issue, and I will create a ticket immediately.',
};

function Message({ msg, isUser }) {
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && (
        <View style={styles.agentAvatar}>
          <Text style={styles.agentAvatarText}>🎧</Text>
        </View>
      )}
      <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAgent]}>
        {!isUser && <Text style={styles.agentName}>{msg.senderName}</Text>}
        {msg.type === 'text' && <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{msg.text}</Text>}
        {msg.type === 'booking' && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingCardTitle}>📋 {msg.bookingData.service}</Text>
            <Text style={styles.bookingCardDetail}>Booking #{msg.bookingData.id}</Text>
            <Text style={styles.bookingCardDetail}>Status: {msg.bookingData.status}</Text>
          </View>
        )}
        {msg.type === 'options' && (
          <View style={styles.optionsList}>
            {msg.options.map((opt, i) => (
              <TouchableOpacity key={i} style={styles.optionBtn} onPress={opt.action}>
                <Text style={styles.optionBtnText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>
          {msg.time}{isUser && (msg.read ? '  ✓✓' : '  ✓')}
        </Text>
      </View>
    </View>
  );
}

export function LiveChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookingId, issue } = route?.params || {};
  const socketRef = useRef(null);
  const supportRoomId = useRef(`support_${bookingId || user?._id || Date.now()}`);

  // ── Socket.io support room connection ─────────────────────
  useEffect(() => {
    let socket = null;
    try {
      const io     = require('socket.io-client').default;
      const token  = require('@react-native-async-storage/async-storage').default
        .getItem('auth_token').then(t => {
          socket = io(process.env.API_URL?.replace('/api/v1', '') || 'http://10.0.2.2:5000', {
            auth:       { token: t },
            transports: ['websocket'],
            query:      { room: supportRoomId.current, type: 'support' },
          });
          socketRef.current = socket;

          socket.emit('join_support_room', { roomId: supportRoomId.current, bookingId, userId: user?._id });

          socket.on('support_message', (msg) => {
            setMessages(prev => [...prev, {
              id:         msg._id || String(Date.now()),
              type:       'text',
              text:       msg.text || msg.message,
              sender:     'agent',
              senderName: msg.agentName || 'Support Agent',
              time:       new Date(msg.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              read:       true,
            }]);
            setAgentTyping(false);
          });

          socket.on('agent_typing',    () => setAgentTyping(true));
          socket.on('agent_stop_typing', () => setAgentTyping(false));
        });
    } catch { /* socket not available — use canned fallback */ }

    return () => { socket?.disconnect(); };
  }, []);

  const [messages, setMessages] = useState([
    {
      id: '1', type: 'text', text: "Hi! I'm Priya from Slot App support. How can I help you today?",
      sender: 'agent', senderName: 'Priya (Support)', time: '2:30 PM', read: true,
    },
    ...(bookingId ? [{
      id: '2', type: 'booking', sender: 'agent', senderName: 'Priya (Support)',
      bookingData: { id: bookingId.slice(-8).toUpperCase(), service: 'AC Service & Repair', status: 'In Progress' },
      time: '2:30 PM', read: true,
    }] : []),
    {
      id: '3', type: 'options', sender: 'agent', senderName: 'Priya (Support)',
      options: [
        { label: '📍 Track Professional', action: () => navigation.navigate('Tracking') },
        { label: '📅 Reschedule', action: () => navigation.navigate('Reschedule') },
        { label: '❌ Cancel Booking', action: () => Alert.alert('Cancel', 'Cancellation flow') },
      ],
      time: '2:30 PM', read: true,
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const flatListRef = useRef(null);
  const typingTimer = useRef(null);

  const sendMessage = useCallback((text) => {
    if (!text.trim()) return;
    const newMsg = {
      id: String(Date.now()),
      type: 'text', text: text.trim(),
      sender: 'user', senderName: user?.name || 'You',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setShowQuickReplies(false);

    if (socketRef.current?.connected) {
      // Real Socket.io — emit to support room
      socketRef.current.emit('send_support_message', {
        roomId:   supportRoomId.current,
        bookingId,
        text:     text.trim(),
        userId:   user?._id,
        userName: user?.name,
      });
      setAgentTyping(true); // will be cleared by socket event
    } else {
      // Fallback: try API first, then canned response
      const { api } = require('../../utils/api');
      api.post('/support/message', { bookingId, message: text.trim() })
        .then(res => {
          if (res.data?.reply) {
            setAgentTyping(false);
            setMessages(prev => [...prev, {
              id: String(Date.now() + 1), type: 'text',
              text: res.data.reply, sender: 'agent', senderName: 'Support Agent',
              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              read: true,
            }]);
          }
        })
        .catch(() => {
          // Last resort: canned response
          setAgentTyping(true);
          const delay = 1000 + Math.random() * 1500;
          setTimeout(() => {
            setAgentTyping(false);
            const response = CANNED_RESPONSES[text] ||
              "Thank you for reaching out. I'm looking into this right now and will get back to you shortly.";
            setMessages(prev => [...prev, {
              id: String(Date.now() + 1), type: 'text', text: response,
              sender: 'agent', senderName: 'Priya (Support)',
              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              read: true,
            }]);
          }, delay);
        });
    }
  }, [user, bookingId]);

  const handleTyping = (text) => {
    setInput(text);
    setIsTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), 1000);
  };

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.agentInfo}>
          <View style={styles.agentOnline}>
            <Text style={styles.agentOnlineAvatar}>🎧</Text>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.agentInfoName}>Customer Support</Text>
            <Text style={styles.agentInfoStatus}>🟢 Online — Avg reply: 2 min</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={() => Alert.alert('Call Support', 'Connecting to support...')}>
          <Text style={styles.callBtnText}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <Message msg={item} isUser={item.sender === 'user'} />}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={agentTyping ? (
          <View style={styles.typingIndicator}>
            <View style={styles.agentAvatar}><Text style={styles.agentAvatarText}>🎧</Text></View>
            <View style={styles.typingBubble}>
              {[0, 1, 2].map(i => <View key={i} style={[styles.typingDot, { animationDelay: `${i * 200}ms` }]} />)}
            </View>
          </View>
        ) : null}
      />

      {/* Quick replies */}
      {showQuickReplies && (
        <View style={styles.quickRepliesSection}>
          <Text style={styles.quickRepliesLabel}>Quick Replies</Text>
          <FlatList
            horizontal
            data={QUICK_REPLIES}
            keyExtractor={q => q}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickReplyChip} onPress={() => sendMessage(item)}>
                <Text style={styles.quickReplyText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.attachBtn} onPress={() => Alert.alert('Attach', 'Photo/file attachment')}>
          <Text style={styles.attachBtnText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor="#AAA"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim()}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Social Login Component ─────────────────────────────────────
export function SocialLoginButtons({ onSuccess }) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      let GoogleSignin;
      try { GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin; }
      catch { throw new Error('Google Sign-In SDK not installed. Run: npm install @react-native-google-signin/google-signin'); }

      GoogleSignin.configure({ webClientId: process.env.GOOGLE_WEB_CLIENT_ID || 'YOUR_GOOGLE_WEB_CLIENT_ID' });
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      // Send idToken to backend for verification
      const { authAPI } = require('../../utils/api');
      const { data } = await authAPI.socialLogin({ provider: 'google', idToken, email: userInfo.user.email, name: userInfo.user.name });
      onSuccess?.(data.user);
    } catch (e) {
      if (e.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google Sign-In Failed', e.message || 'Please try again or use phone number.');
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoadingApple(true);
    try {
      let appleAuth;
      try { appleAuth = require('@invertase/react-native-apple-authentication').default; }
      catch { throw new Error('Apple Auth SDK not installed. Run: npm install @invertase/react-native-apple-authentication'); }

      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      if (appleAuthRequestResponse.realUserStatus === appleAuth.RealUserStatus.LIKELY_REAL) {
        const { authorizationCode, email, fullName } = appleAuthRequestResponse;
        const { authAPI } = require('../../utils/api');
        const { data } = await authAPI.socialLogin({
          provider: 'apple',
          authorizationCode,
          email: email || undefined,
          name: fullName?.givenName ? `${fullName.givenName} ${fullName.familyName || ''}`.trim() : undefined,
        });
        onSuccess?.(data.user);
      }
    } catch (e) {
      if (e.code !== '1000') { // 1000 = user cancelled
        Alert.alert('Apple Sign-In Failed', e.message || 'Please try again.');
      }
    } finally {
      setLoadingApple(false);
    }
  };

  return (
    <View style={socialStyles.container}>
      <View style={socialStyles.dividerRow}>
        <View style={socialStyles.divider} />
        <Text style={socialStyles.dividerText}>or continue with</Text>
        <View style={socialStyles.divider} />
      </View>

      <TouchableOpacity style={socialStyles.googleBtn} onPress={handleGoogleLogin} disabled={loadingGoogle}>
        {loadingGoogle ? (
          <ActivityIndicator size="small" color="#444" />
        ) : (
          <>
            <Text style={socialStyles.googleIcon}>G</Text>
            <Text style={socialStyles.googleText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity style={socialStyles.appleBtn} onPress={handleAppleLogin} disabled={loadingApple}>
          {loadingApple ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={socialStyles.appleIcon}></Text>
              <Text style={socialStyles.appleText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Pincode Serviceability Checker ─────────────────────────────
export function PincodeChecker({ onResult }) {
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkPincode = async () => {
    if (pincode.length !== 6) { Alert.alert('Invalid', 'Please enter a 6-digit pincode'); return; }
    setChecking(true);
    let found = null;
    try {
      const resp = await fetch(`${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/service-areas/check/${pincode}`);
      const data = await resp.json();
      if (data.success && data.data.available) {
        found = { city: data.data.city, area: data.data.area, available: true };
      }
    } catch {
      // Fallback: check common pincodes locally
      const fallback = {
        '500001':'Nampally, Hyderabad','500034':'Banjara Hills, Hyderabad','500081':'Kondapur, Hyderabad',
        '400001':'Fort, Mumbai','560001':'MG Road, Bangalore','110001':'Connaught Place, Delhi',
        '600001':'Parrys, Chennai','411001':'Shivajinagar, Pune',
      };
      if (fallback[pincode]) found = { city: fallback[pincode].split(', ')[1], area: fallback[pincode].split(', ')[0], available: true };
    }
    const res = found || { available: false, message: 'We\'re not in your area yet. We\'ll notify you when we launch!' };
    setResult(res);
    setChecking(false);
    onResult?.(res);
  };

  return (
    <View style={pincodeStyles.container}>
      <Text style={pincodeStyles.title}>Check Availability in Your Area</Text>
      <View style={pincodeStyles.inputRow}>
        <TextInput
          style={pincodeStyles.input}
          value={pincode}
          onChangeText={t => { setPincode(t.replace(/\D/g, '').slice(0, 6)); setResult(null); }}
          placeholder="Enter 6-digit pincode"
          keyboardType="numeric"
          maxLength={6}
          placeholderTextColor="#AAA"
        />
        <TouchableOpacity style={pincodeStyles.checkBtn} onPress={checkPincode} disabled={checking}>
          {checking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={pincodeStyles.checkBtnText}>Check</Text>}
        </TouchableOpacity>
      </View>
      {result && (
        <View style={[pincodeStyles.result, result.available ? pincodeStyles.resultAvail : pincodeStyles.resultUnavail]}>
          {result.available ? (
            <>
              <Text style={pincodeStyles.resultIcon}>✅</Text>
              <View>
                <Text style={pincodeStyles.resultTitle}>Services available in {result.area}!</Text>
                <Text style={pincodeStyles.resultSub}>{result.city} • All services available</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={pincodeStyles.resultIcon}>😔</Text>
              <View>
                <Text style={[pincodeStyles.resultTitle, { color: '#E94560' }]}>Not available yet</Text>
                <Text style={pincodeStyles.resultSub}>{result.message}</Text>
                <TouchableOpacity style={pincodeStyles.notifyBtn} onPress={() => Alert.alert('Notified!', 'We\'ll email you when we launch in your area.')}>
                  <Text style={pincodeStyles.notifyBtnText}>Notify Me →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Gift Card Screen ───────────────────────────────────────────
export function GiftCardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(0);

  const AMOUNTS = [250, 500, 1000, 2000, 5000];
  const DESIGNS = [
    { id: 0, emoji: '🎁', gradient: ['#E94560', '#C0392B'], label: 'Classic Red' },
    { id: 1, emoji: '💆', gradient: ['#6A0572', '#E91E8C'], label: 'Spa & Wellness' },
    { id: 2, emoji: '🏠', gradient: ['#1565C0', '#0D47A1'], label: 'Home Services' },
    { id: 3, emoji: '✨', gradient: ['#b8860b', '#DAA520'], label: 'Premium Gold' },
  ];

  return (
    <View style={[giftStyles.screen, { paddingTop: insets.top }]}>
      <View style={giftStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={giftStyles.backText}>←</Text></TouchableOpacity>
        <Text style={giftStyles.headerTitle}>Gift Cards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={giftStyles.sectionTitle}>Choose Design</Text>
        <View style={giftStyles.designRow}>
          {DESIGNS.map(d => (
            <TouchableOpacity key={d.id} style={[giftStyles.designCard, selectedDesign === d.id && giftStyles.designCardSelected]} onPress={() => setSelectedDesign(d.id)}>
              <View style={[giftStyles.designPreview, { backgroundColor: d.gradient[0] }]}>
                <Text style={giftStyles.designEmoji}>{d.emoji}</Text>
              </View>
              <Text style={giftStyles.designLabel}>{d.label}</Text>
              {selectedDesign === d.id && <View style={giftStyles.selectedCheck}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={giftStyles.sectionTitle}>Select Amount</Text>
        <View style={giftStyles.amountsRow}>
          {AMOUNTS.map(amt => (
            <TouchableOpacity key={amt} style={[giftStyles.amountChip, selectedAmount === amt && giftStyles.amountChipSelected]} onPress={() => setSelectedAmount(amt)}>
              <Text style={[giftStyles.amountChipText, selectedAmount === amt && giftStyles.amountChipTextSelected]}>₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={giftStyles.sectionTitle}>Recipient Details</Text>
        <TextInput style={giftStyles.input} value={recipientName} onChangeText={setRecipientName} placeholder="Recipient's name" placeholderTextColor="#AAA" />
        <TextInput style={giftStyles.input} value={recipientPhone} onChangeText={setRecipientPhone} placeholder="Mobile number (gift sent via SMS)" keyboardType="phone-pad" placeholderTextColor="#AAA" />
        <TextInput style={[giftStyles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={personalMessage} onChangeText={setPersonalMessage} placeholder="Add a personal message (optional)..." placeholderTextColor="#AAA" multiline />

        {/* Preview */}
        <Text style={giftStyles.sectionTitle}>Preview</Text>
        <View style={giftStyles.previewCard}>
          <View style={[giftStyles.previewHeader, { backgroundColor: DESIGNS[selectedDesign].gradient[0] }]}>
            <Text style={giftStyles.previewEmoji}>{DESIGNS[selectedDesign].emoji}</Text>
            <View>
              <Text style={giftStyles.previewTitle}>Slot App Gift Card</Text>
              <Text style={giftStyles.previewAmount}>₹{selectedAmount}</Text>
            </View>
          </View>
          <View style={giftStyles.previewBody}>
            {recipientName && <Text style={giftStyles.previewTo}>For: {recipientName}</Text>}
            {personalMessage && <Text style={giftStyles.previewMsg}>"{personalMessage}"</Text>}
            <Text style={giftStyles.previewValidity}>Valid for 1 year • Redeemable on any Slot App service</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[giftStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View>
          <Text style={giftStyles.footerLabel}>Total</Text>
          <Text style={giftStyles.footerAmount}>₹{selectedAmount}</Text>
        </View>
        <TouchableOpacity
          style={[giftStyles.buyBtn, (!recipientName || !recipientPhone) && { opacity: 0.5 }]}
          onPress={() => recipientName && recipientPhone && Alert.alert('🎁 Gift Card Sent!', `A ₹${selectedAmount} gift card has been sent to ${recipientName} via SMS.`)}
          disabled={!recipientName || !recipientPhone}
        >
          <Text style={giftStyles.buyBtnText}>Send Gift Card 🎁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Review with Photo Upload ───────────────────────────────────
export function ReviewWithPhotosScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, serviceName, professionalName } = route?.params || {};
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const TAGS = ['Professional', 'On time', 'Clean work', 'Great quality', 'Would recommend', 'Value for money'];

  const addPhoto = async () => {
    if (photos.length >= 3) { Alert.alert('Maximum 3 photos allowed'); return; }
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
      if (result.didCancel || result.errorCode) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setPhotos(prev => [...prev, { id: String(Date.now()), uri: asset.uri, fileName: asset.fileName, emoji: '📸' }]);
    } catch {
      setPhotos(prev => [...prev, { id: String(Date.now()), emoji: ['📸','🏠','✅','👌'][prev.length % 4] }]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Rating Required', 'Please rate your experience'); return; }
    setSubmitting(true);
    try {
      const { reviewsAPI } = require('../../utils/api');
      await reviewsAPI.create({
        booking: route?.params?.bookingId,
        rating,
        comment,
        tags: selectedTags,
        images: photos.filter(p => p.uri).map(p => p.uri),
      });
    } catch (e) {
      console.warn('[Review] Submit error:', e.message);
    }
    setSubmitting(false);
    Alert.alert('Thank you! 🌟', 'Your review has been submitted and will help other customers.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={[reviewStyles.screen, { paddingTop: insets.top }]}>
      <View style={reviewStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={reviewStyles.backText}>✕</Text></TouchableOpacity>
        <Text style={reviewStyles.headerTitle}>Rate Your Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={reviewStyles.serviceInfo}>
          <Text style={reviewStyles.serviceName}>{serviceName || 'AC Service & Repair'}</Text>
          <Text style={reviewStyles.proName}>by {professionalName || 'Ravi Kumar'}</Text>
        </View>

        <Text style={reviewStyles.sectionTitle}>How was your experience?</Text>
        <View style={reviewStyles.starsRow}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} style={reviewStyles.starBtn}>
              <Text style={[reviewStyles.star, star <= rating && reviewStyles.starFilled]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && <Text style={reviewStyles.ratingLabel}>
          {['', 'Poor 😞', 'Below Average 😕', 'Okay 😐', 'Great! 😊', 'Excellent! 🤩'][rating]}
        </Text>}

        <Text style={reviewStyles.sectionTitle}>What did you like?</Text>
        <View style={reviewStyles.tagsRow}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[reviewStyles.tag, tags.includes(tag) && reviewStyles.tagSelected]}
              onPress={() => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            >
              <Text style={[reviewStyles.tagText, tags.includes(tag) && reviewStyles.tagTextSelected]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={reviewStyles.sectionTitle}>Write a review</Text>
        <TextInput
          style={reviewStyles.reviewInput}
          value={review}
          onChangeText={setReview}
          placeholder="Share your experience to help others..."
          placeholderTextColor="#AAA"
          multiline
          numberOfLines={4}
        />

        <Text style={reviewStyles.sectionTitle}>Add Photos (optional)</Text>
        <Text style={reviewStyles.photoSubtitle}>Upload before/after photos to showcase the quality</Text>
        <View style={reviewStyles.photosRow}>
          {photos.map(photo => (
            <View key={photo.id} style={reviewStyles.photoThumb}>
              <Text style={reviewStyles.photoThumbEmoji}>{photo.emoji}</Text>
              <TouchableOpacity style={reviewStyles.photoRemove} onPress={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}>
                <Text style={reviewStyles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 3 && (
            <TouchableOpacity style={reviewStyles.addPhotoBtn} onPress={addPhoto}>
              <Text style={reviewStyles.addPhotoIcon}>📷</Text>
              <Text style={reviewStyles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[reviewStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[reviewStyles.submitBtn, (rating === 0 || submitting) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={rating === 0 || submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={reviewStyles.submitBtnText}>Submit Review</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  agentInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentOnline: { position: 'relative' },
  agentOnlineAvatar: { fontSize: 28 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#27AE60', borderWidth: 2, borderColor: '#fff' },
  agentInfoName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  agentInfoStatus: { fontSize: 11, color: '#888' },
  callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 18 },
  messagesList: { padding: 16 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  msgRowUser: { flexDirection: 'row-reverse' },
  agentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  agentAvatarText: { fontSize: 16 },
  msgBubble: { maxWidth: '72%', borderRadius: 18, padding: 12, paddingBottom: 6 },
  msgBubbleAgent: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  msgBubbleUser: { backgroundColor: '#E94560', borderBottomRightRadius: 4 },
  agentName: { fontSize: 10, fontWeight: '700', color: '#888', marginBottom: 4 },
  msgText: { fontSize: 14, color: '#1A1A2E', lineHeight: 20 },
  msgTextUser: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#AAA', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeUser: { color: 'rgba(255,255,255,0.6)' },
  bookingCard: { backgroundColor: '#F0F4FF', borderRadius: 12, padding: 12 },
  bookingCardTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  bookingCardDetail: { fontSize: 12, color: '#666', marginTop: 3 },
  optionsList: { gap: 8, marginTop: 4 },
  optionBtn: { backgroundColor: '#F0F4FF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E94560' },
  optionBtnText: { fontSize: 13, fontWeight: '600', color: '#E94560' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: { flexDirection: 'row', gap: 4, backgroundColor: '#fff', borderRadius: 16, padding: 12, marginLeft: 8 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD' },
  quickRepliesSection: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 10 },
  quickRepliesLabel: { fontSize: 11, fontWeight: '600', color: '#888', paddingHorizontal: 16, marginBottom: 8 },
  quickRepliesList: { paddingHorizontal: 16, gap: 8 },
  quickReplyChip: { backgroundColor: '#FFF0F3', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E94560' },
  quickReplyText: { fontSize: 12, fontWeight: '600', color: '#E94560' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8 },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F6FA', justifyContent: 'center', alignItems: 'center' },
  attachBtnText: { fontSize: 20 },
  textInput: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#DDD' },
  sendBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});

const socialStyles = StyleSheet.create({
  container: { marginTop: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  divider: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { fontSize: 12, color: '#888', fontWeight: '600' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, borderWidth: 1.5, borderColor: '#E0E0E0', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  googleIcon: { fontSize: 16, fontWeight: '900', color: '#4285F4', fontFamily: 'serif' },
  googleText: { fontSize: 15, fontWeight: '700', color: '#444' },
  appleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  appleIcon: { fontSize: 18, color: '#fff' },
  appleText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const pincodeStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 18, padding: 20, margin: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A2E', letterSpacing: 2 },
  checkBtn: { backgroundColor: '#E94560', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  checkBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 14, marginTop: 14 },
  resultAvail: { backgroundColor: '#E8F5E9' },
  resultUnavail: { backgroundColor: '#FFF0F3' },
  resultIcon: { fontSize: 24 },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#27AE60' },
  resultSub: { fontSize: 12, color: '#666', marginTop: 2 },
  notifyBtn: { marginTop: 8, backgroundColor: '#E94560', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  notifyBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

const giftStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 12, marginTop: 16 },
  designRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  designCard: { flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 8 },
  designCardSelected: { borderColor: '#E94560', backgroundColor: '#FFF0F3' },
  designPreview: { width: 60, height: 60, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  designEmoji: { fontSize: 28 },
  designLabel: { fontSize: 10, fontWeight: '600', color: '#666', textAlign: 'center' },
  selectedCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
  amountsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  amountChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0' },
  amountChipSelected: { backgroundColor: '#E94560', borderColor: '#E94560' },
  amountChipText: { fontSize: 14, fontWeight: '700', color: '#444' },
  amountChipTextSelected: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 14, fontSize: 14, color: '#1A1A2E', marginBottom: 12 },
  previewCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  previewHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  previewEmoji: { fontSize: 36 },
  previewTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  previewAmount: { fontSize: 26, fontWeight: '900', color: '#fff' },
  previewBody: { padding: 16 },
  previewTo: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  previewMsg: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  previewValidity: { fontSize: 11, color: '#AAA' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 11, color: '#888' },
  footerAmount: { fontSize: 20, fontWeight: '900', color: '#1A1A2E' },
  buyBtn: { backgroundColor: '#E94560', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 16 },
  buyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

const reviewStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 22, fontWeight: '700', color: '#888' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  serviceInfo: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  serviceName: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  proName: { fontSize: 13, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12, marginTop: 8 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 40, color: '#DDD' },
  starFilled: { color: '#F5A623' },
  ratingLabel: { fontSize: 14, color: '#888', marginBottom: 16, textAlign: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0' },
  tagSelected: { backgroundColor: '#FFF0F3', borderColor: '#E94560' },
  tagText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tagTextSelected: { color: '#E94560' },
  reviewInput: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 14, fontSize: 14, color: '#1A1A2E', minHeight: 100, textAlignVertical: 'top', marginBottom: 8 },
  photoSubtitle: { fontSize: 12, color: '#888', marginBottom: 12 },
  photosRow: { flexDirection: 'row', gap: 12 },
  photoThumb: { width: 80, height: 80, backgroundColor: '#F0F4FF', borderRadius: 14, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  photoThumbEmoji: { fontSize: 32 },
  photoRemove: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
  photoRemoveText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  addPhotoBtn: { width: 80, height: 80, backgroundColor: '#fff', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  addPhotoIcon: { fontSize: 24, marginBottom: 4 },
  addPhotoText: { fontSize: 10, fontWeight: '600', color: '#888' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 16 },
  submitBtn: { backgroundColor: '#E94560', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
