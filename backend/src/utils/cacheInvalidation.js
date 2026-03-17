// Cache invalidation helpers — call these after mutations
const { delPattern, del } = require('../config/redis');

// Invalidate service-related caches
const invalidateServices = async (serviceId = null) => {
  await delPattern('services:*');
  await delPattern('featured:*');
  await delPattern('search:*');
  if (serviceId) await del(`service:${serviceId}`);
  console.log('[Cache] Services cache invalidated');
};

// Invalidate booking caches for a user
const invalidateBookings = async (userId, bookingId = null) => {
  await delPattern(`bookings:${userId}:*`);
  if (bookingId) await del(`booking:${bookingId}`);
};

// Invalidate category caches
const invalidateCategories = async () => {
  await delPattern('categories:*');
};

// Invalidate user profile cache
const invalidateUser = async (userId) => {
  await del(`user:${userId}`);
  await del(`user:profile:${userId}`);
};

module.exports = { invalidateServices, invalidateBookings, invalidateCategories, invalidateUser };
