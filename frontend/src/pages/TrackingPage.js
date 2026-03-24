/**
 * Slot Web — Live Booking Tracking Page (Full)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { trackingAPI, bookingsAPI } from '../utils/api';

const STATUS_STEPS = [
  { key: 'confirmed',             label: 'Booking Confirmed',       icon: '✅', desc: 'Your booking is confirmed' },
  { key: 'professional_assigned', label: 'Professional Assigned',   icon: '👷', desc: 'A professional is on the way' },
  { key: 'professional_arriving', label: 'Professional Arriving',   icon: '🚗', desc: 'Almost there!' },
  { key: 'professional_arrived',  label: 'Professional Arrived',    icon: '🏠', desc: 'Your professional is at the door' },
  { key: 'in_progress',           label: 'Work in Progress',        icon: '🔧', desc: 'Service is being performed' },
  { key: 'completed',             label: 'Completed',               icon: '🎉', desc: 'Service completed successfully!' },
];

const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

export default function TrackingPage({ navigate = () => {}, bookingId }) {
  const { user } = useApp();
  const [tracking, setTracking]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [eta, setEta]               = useState(null);
  const pollRef                     = useRef(null);

  const fetchTracking = useCallback(async () => {
    try {
      const { data } = await trackingAPI.getBookingTracking(bookingId);
      setTracking(data.tracking);
      if (data.tracking?.tracking?.estimatedArrival) {
        const mins = Math.max(0, Math.round((new Date(data.tracking.tracking.estimatedArrival) - new Date()) / 60000));
        setEta(mins);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load tracking info');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchTracking();
    // Poll every 15 seconds for live updates
    pollRef.current = setInterval(fetchTracking, 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchTracking]);

  const LIVE_STATUSES = ['professional_assigned','professional_arriving','professional_arrived','in_progress'];
  const isLive = LIVE_STATUSES.includes(tracking?.status);
  const currentStep = STATUS_ORDER.indexOf(tracking?.status);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading tracking info...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tracking Error</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <span className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors">
          My Bookings
        </span>
      </div>
    </div>
  );

  const t = tracking;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-orange-600 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              ←
            </span>
            <h1 className="text-xl font-bold">Live Tracking</h1>
            {isLive && (
              <span className="ml-auto flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <div className="bg-white/15 rounded-2xl p-4">
            <p className="text-sm text-white/70 mb-1">Booking ID</p>
            <p className="font-bold">#{t?.bookingId}</p>
            {t?.service && (
              <p className="text-sm text-white/80 mt-1">{t.service.icon} {t.service.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {/* ETA */}
        {eta !== null && eta > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <span className="text-4xl">🚗</span>
            <div>
              <p className="font-black text-orange-600 text-xl">{eta} minutes away</p>
              <p className="text-sm text-gray-500">Estimated arrival · {Math.round((t?.tracking?.distanceToCustomer || 0) * 10) / 10} km away</p>
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-5">Booking Status</h2>
          <div className="space-y-4">
            {STATUS_STEPS.map((step, idx) => {
              const isDone    = idx <= currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                      isCurrent ? 'bg-orange-500 text-white shadow-lg scale-110' :
                      isDone    ? 'bg-green-500 text-white' :
                                  'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? (isCurrent ? step.icon : '✓') : step.icon}
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 rounded-full ${isDone ? 'bg-green-300' : 'bg-gray-100'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className={`font-semibold ${isCurrent ? 'text-orange-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {isCurrent && <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Professional info */}
        {t?.professional && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Your Professional</h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-black text-orange-600">
                {(t.professional.name || 'P')[0]}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg">{t.professional.name}</p>
                <p className="text-sm text-gray-500">⭐ {t.professional.rating?.toFixed(1) || '4.8'} rating</p>
              </div>
              <a href={`tel:+91${t.professional.phone}`}
                className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-xl hover:bg-green-100 transition-colors border border-green-200">
                📞
              </a>
            </div>
          </div>
        )}

        {/* Address */}
        {t?.address && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Service Address</h2>
            <div className="flex items-start gap-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="font-semibold text-gray-800">{t.address.line1}</p>
                {t.address.area && <p className="text-sm text-gray-500">{t.address.area}</p>}
                <p className="text-sm text-gray-500">{t.address.city} — {t.address.pincode}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment summary */}
        {t?.pricing && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Payment Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Base Price</span><span>₹{t.pricing.basePrice}</span></div>
              {t.pricing.couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Coupon Discount</span><span>-₹{t.pricing.couponDiscount}</span></div>}
              {t.pricing.convenienceFee > 0 && <div className="flex justify-between text-gray-600"><span>Convenience Fee</span><span>₹{t.pricing.convenienceFee}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Taxes (GST)</span><span>₹{t.pricing.taxes}</span></div>
              <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100"><span>Total</span><span>₹{t.pricing.totalAmount}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
