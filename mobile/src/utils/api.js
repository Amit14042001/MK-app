/**
 * Slot App — Mobile API Client (Full)
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach token ────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('slot_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: refresh token on 401 ───────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry  = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('slot_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken } = data;
        await AsyncStorage.setItem('slot_access_token', accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        await AsyncStorage.multiRemove(['slot_access_token', 'slot_refresh_token', 'slot_user']);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── API modules ───────────────────────────────────────────────
export const authAPI = {
  socialLogin:   (data) => api.post('/auth/social-login', data),
  sendOTP:       (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP:     (data)  => api.post('/auth/verify-otp', data),
  refreshToken:  (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  logout:        (token) => api.post('/auth/logout', { refreshToken: token }),
  getMe:         ()      => api.get('/auth/me'),
};

export const servicesAPI = {
  getAll:        (params) => api.get('/services', { params }),
  getFeatured:   (city)   => api.get('/services/featured', { params: { city } }),
  getOne:        (id)     => api.get(`/services/${id}`),
  search:        (q, params) => api.get('/services/search', { params: { q, ...params } }),
  getByCategory: (slug)   => api.get(`/services/category/${slug}`),
  getSimilar:    (id)     => api.get(`/services/${id}/similar`),
  getTimeSlots:  (id, date) => api.get(`/services/${id}/slots`, { params: { date } }),
};

export const categoriesAPI = {
  getAll:        ()       => api.get('/categories'),
  getFeatured:   ()       => api.get('/categories/featured'),
  getOne:        (slug)   => api.get(`/categories/${slug}`),
};

export const bookingsAPI = {
  getHealthReport:   (id)   => api.get(`/bookings/${id}/health-report`),
  emailHealthReport: (id)   => api.post(`/bookings/${id}/health-report/email`),
  create:        (data)   => api.post('/bookings', data),
  getAll:        (params) => api.get('/bookings', { params }),
  getOne:        (id)     => api.get(`/bookings/${id}`),
  cancel:        (id, reason) => api.put(`/bookings/${id}/cancel`, { cancellationReason: reason }),
  reschedule:    (id, data) => api.put(`/bookings/${id}/reschedule`, data),
  getPreferredProfessionals: () => api.get('/bookings/preferred-professionals'),
  getAvailableSlots: (params) => api.get('/bookings/slots', { params }),
};

export const paymentsAPI = {
  createOrder:   (data)   => api.post('/payments/create-order', data),
  verify:        (data)   => api.post('/payments/verify', data),
  applyCoupon:   (code, amount, serviceId) => api.post('/payments/apply-coupon', { code, amount, serviceId }),
  getHistory:    ()       => api.get('/payments/history'),
  getInvoice:    (bookingId) => api.get(`/payments/invoice/${bookingId}`),
  walletRecharge:(data)   => api.post('/payments/wallet/recharge', data),
};

export const usersAPI = {
  getProfile:    ()       => api.get('/users/profile'),
  updateProfile: (data)   => api.put('/users/profile', data),
  updateFCMToken:(token)  => api.put('/users/profile/fcm-token', { fcmToken: token }),
  addAddress:    (data)   => api.post('/users/addresses', data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id)     => api.delete(`/users/addresses/${id}`),
  getWallet:     ()       => api.get('/users/wallet'),
  addWalletMoney:(data)   => api.post('/users/wallet/add', data),
  getStats:      ()       => api.get('/users/stats'),
  getSaved:      ()       => api.get('/users/saved-services'),
  toggleSaved:   (serviceId) => api.post(`/users/saved-services/${serviceId}`),
  applyReferral: (code)   => api.post('/users/apply-referral', { referralCode: code }),
};

export const trackingAPI = {
  getBookingTracking: (id) => api.get(`/tracking/booking/${id}`),
  updateLocation:     (data) => api.post('/tracking/location', data),
};

export const reviewsAPI = {
  create:        (data)   => api.post('/reviews', data),
  getForService: (id, params) => api.get(`/reviews/service/${id}`, { params }),
  getForPro:     (id, params) => api.get(`/reviews/professional/${id}`, { params }),
  getMyReviews:  ()       => api.get('/reviews/mine'),
  getPending:    ()       => api.get('/reviews/pending'),
  voteHelpful:   (id)     => api.post(`/reviews/${id}/helpful`),
};

export const notificationsAPI = {
  getAll:        (params) => api.get('/notifications', { params }),
  getUnreadCount:()       => api.get('/notifications/unread-count'),
  markRead:      (id)     => api.put(`/notifications/${id}/read`),
  markAllRead:   ()       => api.put('/notifications/read-all'),
  delete:        (id)     => api.delete(`/notifications/${id}`),
  clearAll:      ()       => api.put('/notifications/clear-all'),
};

export const subscriptionsAPI = {
  getPlans:      ()       => api.get('/subscriptions/plans'),
  getMy:         ()       => api.get('/subscriptions/my'),
  createOrder:   (planType) => api.post('/subscriptions/create-order', { planType }),
  activate:      (data)   => api.post('/subscriptions/activate', data),
  cancel:        (reason) => api.put('/subscriptions/cancel', { reason }),
};

export const corporateAPI = {
  getMy:         ()       => api.get('/corporate/my'),
  submitEnquiry: (data)   => api.post('/corporate/enquiry', data),
  getBookings:   ()       => api.get('/corporate/bookings'),
  addCredits:    (data)   => api.post('/corporate/add-credits', data),
  getInvoice:    (year, month) => api.get(`/corporate/invoice/${year}/${month}`),
};

export const professionalsAPI = {
  getAll:        (params) => api.get('/professionals', { params }),
  getOne:        (id)     => api.get(`/professionals/${id}`),
  getMe:         ()       => api.get('/professionals/me'),
  updateMe:      (data)   => api.put('/professionals/me', data),
  updateAvailability: (data) => api.put('/professionals/me/availability', data),
  updateBankDetails:  (data) => api.put('/professionals/me/bank-details', data),
  getEarnings:   (params) => api.get('/professionals/me/earnings', { params }),
};

// ── Store ─────────────────────────────────────────────────────
export const storeAPI = {
  getCategories:  ()           => api.get('/store/categories'),
  getProducts:    (params)     => api.get('/store/products', { params }),
  getProduct:     (id)         => api.get(`/store/products/${id}`),
  createOrder:    (data)       => api.post('/store/orders', data),
  getMyOrders:    ()           => api.get('/store/orders'),
  getOrder:       (id)         => api.get(`/store/orders/${id}`),
  confirmPayment: (id, data)   => api.post(`/store/orders/${id}/pay`, data),
  cancelOrder:    (id, data)   => api.post(`/store/orders/${id}/cancel`, data),
  addReview:      (id, data)   => api.post(`/store/products/${id}/review`, data),
};

// ── Stripe (international payments) ──────────────────────────
export const stripeAPI = {
  getCountries:       ()       => api.get('/stripe/countries'),
  createBookingIntent:(data)   => api.post('/stripe/booking-intent', data),
  createStoreIntent:  (data)   => api.post('/stripe/store-intent', data),
  confirmBooking:     (data)   => api.post('/stripe/confirm-booking', data),
  confirmStore:       (data)   => api.post('/stripe/confirm-store', data),
};


// ── AI Chat Booking Assistant ─────────────────────────────────
export const aiChatAPI = {
  sendMessage:    (data) => api.post('/ai-chat/message', data),
  getSuggestions: ()     => api.get('/ai-chat/suggestions'),
};

// ── Pro Bidding ───────────────────────────────────────────────
export const bidsAPI = {
  getForBooking: (bookingId)    => api.get(`/pro-bids/booking/${bookingId}`),
  acceptBid:     (bidId)        => api.post(`/pro-bids/${bidId}/accept`),
  submitBid:     (data)         => api.post('/pro-bids', data),
};

// ── Instant Booking ───────────────────────────────────────────
export const instantAPI = {
  checkAvailable: (params) => api.get('/instant-booking/available', { params }),
  create:         (data)   => api.post('/instant-booking', data),
};

export const warrantyAPI = {
  submitClaim: (data) => api.post('/warranty/claims', data),
  getClaims:   ()     => api.get('/warranty/claims'),
  getClaim:    (id)   => api.get(`/warranty/claims/${id}`),
};

export const videoCallsAPI = {
  initiateCall:  (data)    => api.post('/video-calls/initiate', data),
  joinCall:      (callId)  => api.post(`/video-calls/${callId}/join`),
  endCall:       (callId)  => api.post(`/video-calls/${callId}/end`),
  getHistory:    ()        => api.get('/video-calls/history'),
  rateCall:      (id, data)=> api.post(`/video-calls/${id}/rate`, data),
};

export const supportAPI = {
  createTicket:   (data)   => api.post('/support', data),
  getMyTickets:   ()       => api.get('/support'),
  getTicket:      (id)     => api.get(`/support/${id}`),
  addMessage:     (id,msg) => api.post(`/support/${id}/reply`, { message: msg }),
  closeTicket:    (id)     => api.put(`/support/${id}/close`),
  reopenTicket:   (id)     => api.put(`/support/${id}/reopen`),
};

export const loyaltyAPI = {
  getProfile:   ()        => api.get('/loyalty/profile'),
  getHistory:   ()        => api.get('/loyalty/history'),
  getRewards:   ()        => api.get('/loyalty/rewards'),
  redeem:       (data)    => api.post('/loyalty/redeem', data),
  getTiers:     ()        => api.get('/loyalty/tiers'),
  getExpiring:  ()        => api.get('/loyalty/expiring'),
};

export default api;
