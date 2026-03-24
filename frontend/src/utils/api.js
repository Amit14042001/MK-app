/**
 * Slot Web — API Client (Full)
 */
import axios from 'axios';

const BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('slot_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 + refresh
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const refresh = localStorage.getItem('slot_refresh_token');
        if (!refresh) throw new Error('no refresh');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken: refresh });
        localStorage.setItem('slot_access_token', data.accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(err.config);
      } catch {
        localStorage.removeItem('slot_access_token');
        localStorage.removeItem('slot_refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  sendOTP:       (phone)    => api.post('/auth/send-otp', { phone }),
  verifyOTP:     (data)     => api.post('/auth/verify-otp', data),
  refreshToken:  (token)    => api.post('/auth/refresh-token', { refreshToken: token }),
  logout:        (token)    => api.post('/auth/logout', { refreshToken: token }),
  getMe:         ()         => api.get('/auth/me'),
  googleLogin:   (idToken)  => api.post('/auth/google', { idToken }),
  socialLogin:   (data)     => api.post('/auth/social-login', data),
  updatePassword:(data)     => api.put('/auth/update-password', data),
  forgotPassword:(email)    => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, pw)=> api.put(`/auth/reset-password/${token}`, { newPassword: pw }),
};

// ── Services ──────────────────────────────────────────────────
export const servicesAPI = {
  getAll:        (params)   => api.get('/services', { params }),
  getFeatured:   (city)     => api.get('/services/featured', { params: { city } }),
  getOne:        (id)       => api.get(`/services/${id}`),
  search:        (q, params)=> api.get('/services/search', { params: { q, ...params } }),
  getByCategory: (slug)     => api.get(`/services/category/${slug}`),
  getSimilar:    (id)       => api.get(`/services/${id}/similar`),
  getTimeSlots:  (id, date) => api.get(`/services/${id}/slots`, { params: { date } }),
};

// ── Categories ────────────────────────────────────────────────
export const categoriesAPI = {
  getAll:        ()         => api.get('/categories'),
  getFeatured:   ()         => api.get('/categories/featured'),
  getOne:        (slug)     => api.get(`/categories/${slug}`),
};

// ── Bookings ──────────────────────────────────────────────────
export const bookingsAPI = {
  create:        (data)     => api.post('/bookings', data),
  getAll:        (params)   => api.get('/bookings', { params }),
  getOne:        (id)       => api.get(`/bookings/${id}`),
  cancel:        (id, reason)=>api.put(`/bookings/${id}/cancel`, { cancellationReason: reason }),
  reschedule:    (id, data) => api.put(`/bookings/${id}/reschedule`, data),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentsAPI = {
  createOrder:   (data)     => api.post('/payments/create-order', data),
  verify:        (data)     => api.post('/payments/verify', data),
  applyCoupon:   (code, amount, serviceId) => api.post('/payments/apply-coupon', { code, amount, serviceId }),
  getHistory:    ()         => api.get('/payments/history'),
  getInvoice:    (id)       => api.get(`/payments/invoice/${id}`),
  walletRecharge:(data)     => api.post('/payments/wallet/recharge', data),
};

// ── Users ─────────────────────────────────────────────────────
export const usersAPI = {
  getProfile:    ()         => api.get('/users/profile'),
  updateProfile: (data)     => api.put('/users/profile', data),
  getWallet:     ()         => api.get('/users/wallet'),
  addWalletMoney:(data)     => api.post('/users/wallet/add', data),
  getStats:      ()         => api.get('/users/stats'),
  addAddress:    (data)     => api.post('/users/addresses', data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id)       => api.delete(`/users/addresses/${id}`),
  getSaved:      ()         => api.get('/users/saved-services'),
  toggleSaved:   (id)       => api.post(`/users/saved-services/${id}`),
  applyReferral: (code)     => api.post('/users/apply-referral', { referralCode: code }),
};

// ── Tracking ──────────────────────────────────────────────────
export const trackingAPI = {
  getBookingTracking: (id)  => api.get(`/tracking/booking/${id}`),
};

// ── Reviews ───────────────────────────────────────────────────
export const reviewsAPI = {
  create:        (data)     => api.post('/reviews', data),
  getForService: (id, p)    => api.get(`/reviews/service/${id}`, { params: p }),
  getForPro:     (id, p)    => api.get(`/reviews/professional/${id}`, { params: p }),
  getMyReviews:  ()         => api.get('/reviews/mine'),
  getPending:    ()         => api.get('/reviews/pending'),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsAPI = {
  getAll:        (params)   => api.get('/notifications', { params }),
  getUnreadCount:()         => api.get('/notifications/unread-count'),
  markRead:      (id)       => api.put(`/notifications/${id}/read`),
  markAllRead:   ()         => api.put('/notifications/read-all'),
  delete:        (id)       => api.delete(`/notifications/${id}`),
  clearAll:      ()         => api.put('/notifications/clear-all'),
  broadcast:     (data)     => api.post('/notifications/broadcast', data),
  registerDeviceToken: (data) => api.post('/notifications/device-token', data),
};

// ── Subscriptions ─────────────────────────────────────────────
export const subscriptionsAPI = {
  getPlans:      ()         => api.get('/subscriptions/plans'),
  getMy:         ()         => api.get('/subscriptions/my'),
  createOrder:   (planType) => api.post('/subscriptions/create-order', { planType }),
  activate:      (data)     => api.post('/subscriptions/activate', data),
  cancel:        (reason)   => api.put('/subscriptions/cancel', { reason }),
};

// ── Corporate ─────────────────────────────────────────────────
export const corporateAPI = {
  getMy:         ()         => api.get('/corporate/my'),
  submitEnquiry: (data)     => api.post('/corporate/enquiry', data),
  getBookings:   ()         => api.get('/corporate/bookings'),
  getInvoice:    (y, m)     => api.get(`/corporate/invoice/${y}/${m}`),
};

// ── FAQs ──────────────────────────────────────────────────────
export const faqsAPI = {
  getAll:        (params)   => api.get('/faqs', { params }),
  vote:          (id, helpful) => api.post(`/faqs/${id}/vote`, { helpful }),
};

// ── Banners ───────────────────────────────────────────────────
export const bannersAPI = {
  get:           (placement, city) => api.get('/banners', { params: { placement, city } }),
  click:         (id)   => api.post(`/banners/${id}/click`),
};

// ── Professionals ─────────────────────────────────────────────
export const professionalsAPI = {
  getAll:             (params)   => api.get('/professionals', { params }),
  getOne:             (id)       => api.get(`/professionals/${id}`),
  getMe:              ()         => api.get('/professionals/me'),
  updateMe:           (data)     => api.put('/professionals/me', data),
  getEarnings:        (p)        => api.get('/professionals/me/earnings', { params: p }),
  updateAvailability: (data)     => api.put('/professionals/me/availability', data),
  requestPayout:      (data)     => api.post('/professionals/me/payout', data),
  getLeaderboard:     (p)        => api.get('/professionals/leaderboard', { params: p }),
  getMyBookings:      (p)        => api.get('/bookings/professional', { params: p }),
  updateBookingStatus:(id, data) => api.put(`/bookings/${id}/status`, data),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminAPI = {
  getStats:        ()       => api.get('/admin/stats'),
  getUsers:        (p)      => api.get('/admin/users', { params: p }),
  getBookings:     (p)      => api.get('/admin/bookings', { params: p }),
  getProfessionals:(p)      => api.get('/admin/professionals', { params: p }),
  toggleBan:       (id)     => api.put(`/admin/users/${id}/ban`),
  verifyPro:       (id, data) => api.put(`/admin/professionals/${id}/verify`, data),
  createCoupon:    (data)   => api.post('/admin/coupons', data),
  getRevenue:      (p)      => api.get('/admin/revenue', { params: p }),
  getTickets:      (p)      => api.get('/admin/tickets', { params: p }),
  resolveTicket:   (id, data) => api.put(`/admin/tickets/${id}/resolve`, data),
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
  getCountries:       ()           => api.get('/stripe/countries'),
  createBookingIntent:(data)       => api.post('/stripe/booking-intent', data),
  createStoreIntent:  (data)       => api.post('/stripe/store-intent', data),
  confirmBooking:     (data)       => api.post('/stripe/confirm-booking', data),
  confirmStore:       (data)       => api.post('/stripe/confirm-store', data),
};

export default api;
