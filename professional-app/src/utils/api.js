/**
 * Slot Professional App — API Client
 * Centralised Axios instance with auth interceptors, retry logic, token refresh
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';
const TIMEOUT  = 15000;

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Request interceptor — attach auth token ───────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('proToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle token refresh ───────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('proRefreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          await AsyncStorage.setItem('proToken', data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        }
      } catch {
        await AsyncStorage.multiRemove(['proToken', 'proRefreshToken', 'proUser']);
        // Navigate to login — handled by AuthContext
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login:         (data)   => api.post('/auth/pro-login', data),
  sendOTP:       (phone)  => api.post('/auth/send-otp', { phone }),
  verifyOTP:     (data)   => api.post('/auth/verify-otp', data),
  logout:        ()       => api.post('/auth/logout'),
  refreshToken:  (token)  => api.post('/auth/refresh', { refreshToken: token }),
  getMe:         ()       => api.get('/auth/me'),
};

// ── Professional profile ──────────────────────────────────────
export const profileAPI = {
  getProfile:          ()      => api.get('/professionals/me'),
  updateProfile:       (data)  => api.put('/professionals/me', data),
  updateAvailability:  (data)  => api.put('/professionals/me/availability', data),
  getSchedule:         ()      => api.get('/professionals/me/schedule'),
  updateSchedule:      (data)  => api.put('/professionals/me/schedule', data),
  updateLocation:      (data)  => api.post('/tracking/location', data),
  uploadDocument:      (data)  => api.post('/professionals/me/documents', data),
  uploadPortfolioPhoto:(data)  => api.post('/professionals/me/portfolio', data),
  requestPayout:       (data)  => api.post('/professionals/me/payout', data),
  getBankDetails:      ()      => api.get('/professionals/me/bank'),
  updateBankDetails:   (data)  => api.put('/professionals/me/bank', data),
  getEarnings:         (params)=> api.get('/professionals/me/earnings', { params }),
  getLeaderboard:      (params)=> api.get('/professionals/leaderboard', { params }),
  getStats:            ()      => api.get('/professionals/me/stats'),
};

// ── Jobs / Bookings ───────────────────────────────────────────
export const jobsAPI = {
  getJobs:             (params)    => api.get('/bookings/professional', { params }),
  getJob:              (id)        => api.get(`/bookings/${id}`),
  acceptJob:           (id)        => api.put(`/bookings/${id}/accept`),
  rejectJob:           (id, reason)=> api.put(`/bookings/${id}/reject`, { reason }),
  markArrived:         (id)        => api.post(`/tracking/arrived/${id}`),
  markStarted:         (id)        => api.post(`/tracking/started/${id}`),
  markCompleted:       (id, data)  => api.post(`/tracking/completed/${id}`, data),
  checkInArrived:      (id)        => api.post(`/tracking/checkin-arrived/${id}`),
  verifyCheckInOTP:    (id, otp)   => api.post(`/tracking/verify-checkin-otp/${id}`, { otp }),
  generateInvoice:     (id)        => api.post(`/bookings/${id}/invoice`),
  getHistory:          (params)    => api.get('/bookings/professional/history', { params }),
  updateJobNotes:      (id, notes) => api.put(`/bookings/${id}/notes`, { notes }),
};

// ── Tracking ──────────────────────────────────────────────────
export const trackingAPI = {
  updateLocation:   (data)  => api.post('/tracking/location', data),
  getBookingRoute:  (id)    => api.get(`/tracking/booking/${id}`),
  getHistory:       (id)    => api.get(`/tracking/history/${id}`),
};

// ── Reviews ───────────────────────────────────────────────────
export const reviewsAPI = {
  getMyReviews:    (params) => api.get('/reviews/my-reviews', { params }),
  replyToReview:   (id, reply) => api.post(`/reviews/${id}/reply`, { reply }),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsAPI = {
  getAll:          (params) => api.get('/notifications', { params }),
  markRead:        (id)     => api.put(`/notifications/${id}/read`),
  markAllRead:     ()       => api.put('/notifications/read-all'),
  registerToken:   (token, platform) => api.post('/notifications/device-token', { token, platform }),
  getUnreadCount:  ()       => api.get('/notifications/unread-count'),
};

// ── Support ───────────────────────────────────────────────────
export const supportAPI = {
  createTicket:    (data)   => api.post('/support/tickets', data),
  getMyTickets:    ()       => api.get('/support/tickets'),
  getTicket:       (id)     => api.get(`/support/tickets/${id}`),
  addMessage:      (id, msg)=> api.post(`/support/tickets/${id}/messages`, { message: msg }),
};

// ── Video calls ───────────────────────────────────────────────
export const videoAPI = {
  initiateCall:    (data)   => api.post('/video-calls/initiate', data),
  joinCall:        (callId) => api.post(`/video-calls/${callId}/join`),
  endCall:         (callId) => api.post(`/video-calls/${callId}/end`),
  getCallHistory:  ()       => api.get('/video-calls/history'),
};

// ── Warranty claims ───────────────────────────────────────────
export const warrantyAPI = {
  getProfessionalClaims: () => api.get('/warranty/professional-claims'),
  respondToClaim:  (id, data) => api.put(`/warranty/claims/${id}/respond`, data),
  scheduleRedo:    (id, data) => api.post(`/warranty/claims/${id}/schedule-redo`, data),
};

// ── Training ──────────────────────────────────────────────────
export const trainingAPI = {
  getCourses:      ()       => api.get('/professionals/training/courses'),
  startCourse:     (id)     => api.post(`/professionals/training/courses/${id}/start`),
  completeCourse:  (id)     => api.post(`/professionals/training/courses/${id}/complete`),
  getProgress:     ()       => api.get('/professionals/training/progress'),
  getCertificates: ()       => api.get('/professionals/training/certificates'),
};

// ── KYC & Verification ────────────────────────────────────────
export const kycAPI = {
  submitDocument:  (data)   => api.post('/professionals/me/documents', data),
  getKYCStatus:    ()       => api.get('/professionals/me/kyc-status'),
  verifyAadhaar:   (data)   => api.post('/professionals/me/verify/aadhaar', data),
  verifyPAN:       (data)   => api.post('/professionals/me/verify/pan', data),
  verifySelfie:    (data)   => api.post('/professionals/me/verify/selfie', data),
  verifyBank:      (data)   => api.post('/professionals/me/verify/bank', data),
};

export default api;
