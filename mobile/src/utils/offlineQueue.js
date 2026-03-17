/**
 * MK App — Offline Queue & Sync Utility
 * Queues API calls when offline, replays when connection restored
 * Handles: bookings, reviews, profile updates, address saves
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = 'offline_action_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ── Queue Entry Type ──────────────────────────────────────────
// { id, type, endpoint, method, body, timestamp, retries, priority }

class OfflineQueue {
  constructor() {
    this.isProcessing = false;
    this.listeners = [];
    this._setupNetworkListener();
  }

  _setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  _generateId() {
    return `oq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveQueue(queue) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async enqueue(action) {
    const queue = await this.getQueue();
    const entry = {
      id: this._generateId(),
      type: action.type,
      endpoint: action.endpoint,
      method: action.method || 'POST',
      body: action.body || {},
      headers: action.headers || {},
      timestamp: Date.now(),
      retries: 0,
      priority: action.priority || 'normal', // 'high' | 'normal' | 'low'
      description: action.description || action.type,
    };
    // High priority items go to front
    if (entry.priority === 'high') {
      queue.unshift(entry);
    } else {
      queue.push(entry);
    }
    await this.saveQueue(queue);
    this._notifyListeners('enqueued', entry);

    // Try to process immediately if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
      this.processQueue();
    }

    return entry.id;
  }

  async dequeue(id) {
    const queue = await this.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    await this.saveQueue(filtered);
  }

  async processQueue() {
    if (this.isProcessing) return;
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    this.isProcessing = true;
    this._notifyListeners('processing_start', { count: queue.length });

    for (const entry of [...queue]) {
      try {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) break;

        await this._executeAction(entry);
        await this.dequeue(entry.id);
        this._notifyListeners('action_success', entry);
      } catch (error) {
        entry.retries = (entry.retries || 0) + 1;
        entry.lastError = error.message;
        if (entry.retries >= MAX_RETRIES) {
          await this.dequeue(entry.id);
          this._notifyListeners('action_failed', { ...entry, error: error.message });
        } else {
          // Update retry count in queue
          const currentQueue = await this.getQueue();
          const idx = currentQueue.findIndex(q => q.id === entry.id);
          if (idx !== -1) {
            currentQueue[idx] = entry;
            await this.saveQueue(currentQueue);
          }
          this._notifyListeners('action_retry', { ...entry, nextRetry: entry.retries });
        }
        // Exponential backoff: 2s, 4s, 8s (2^n * base)
        const backoffMs = RETRY_DELAY_MS * Math.pow(2, entry.retries - 1);
        await new Promise(r => setTimeout(r, Math.min(backoffMs, 30000))); // cap at 30s
      }
    }

    this.isProcessing = false;
    const remaining = await this.getQueue();
    this._notifyListeners('processing_end', { remaining: remaining.length });
  }

  async _executeAction(entry) {
    const API_BASE = process.env.API_URL || 'http://10.0.2.2:5000/api';
    const token = await AsyncStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE}${entry.endpoint}`, {
      method: entry.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...entry.headers,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(entry.method) ? JSON.stringify(entry.body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ── Listener System ────────────────────────────────────────
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  _notifyListeners(event, data) {
    this.listeners.forEach(l => {
      try { l(event, data); } catch {}
    });
  }

  // ── Helper methods for common actions ─────────────────────
  async queueBookingCreate(bookingData) {
    return this.enqueue({
      type: 'CREATE_BOOKING',
      endpoint: '/bookings',
      method: 'POST',
      body: bookingData,
      priority: 'high',
      description: `Book ${bookingData.serviceName}`,
    });
  }

  async queueReviewSubmit(bookingId, reviewData) {
    return this.enqueue({
      type: 'SUBMIT_REVIEW',
      endpoint: `/bookings/${bookingId}/review`,
      method: 'POST',
      body: reviewData,
      priority: 'normal',
      description: 'Submit service review',
    });
  }

  async queueProfileUpdate(profileData) {
    return this.enqueue({
      type: 'UPDATE_PROFILE',
      endpoint: '/users/profile',
      method: 'PUT',
      body: profileData,
      priority: 'low',
      description: 'Update profile',
    });
  }

  async queueAddressAdd(addressData) {
    return this.enqueue({
      type: 'ADD_ADDRESS',
      endpoint: '/users/addresses',
      method: 'POST',
      body: addressData,
      priority: 'normal',
      description: 'Save new address',
    });
  }

  async queueBookingCancel(bookingId, reason) {
    return this.enqueue({
      type: 'CANCEL_BOOKING',
      endpoint: `/bookings/${bookingId}/cancel`,
      method: 'PUT',
      body: { reason },
      priority: 'high',
      description: 'Cancel booking',
    });
  }

  // ── Status helpers ────────────────────────────────────────
  async getPendingCount() {
    const queue = await this.getQueue();
    return queue.length;
  }

  async clearQueue() {
    await AsyncStorage.removeItem(QUEUE_KEY);
    this._notifyListeners('queue_cleared', {});
  }

  async getQueueStatus() {
    const queue = await this.getQueue();
    return {
      total: queue.length,
      high: queue.filter(q => q.priority === 'high').length,
      normal: queue.filter(q => q.priority === 'normal').length,
      low: queue.filter(q => q.priority === 'low').length,
      failedRetries: queue.filter(q => q.retries > 0).length,
      oldestItem: queue.length > 0 ? queue[0].timestamp : null,
    };
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// ── React Hook ────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    offlineQueue.getPendingCount().then(setPendingCount);
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable));
    });
    const queueUnsub = offlineQueue.subscribe((event, data) => {
      if (['enqueued', 'action_success', 'action_failed', 'queue_cleared'].includes(event)) {
        offlineQueue.getPendingCount().then(setPendingCount);
      }
      if (event === 'processing_start') setIsProcessing(true);
      if (event === 'processing_end') setIsProcessing(false);
    });
    return () => { unsubscribe(); queueUnsub(); };
  }, []);

  const sync = useCallback(() => offlineQueue.processQueue(), []);

  return { pendingCount, isOnline, isProcessing, sync, queue: offlineQueue };
}

export default offlineQueue;
