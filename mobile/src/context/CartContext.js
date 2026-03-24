/**
 * Slot App — Cart Context (Full)
 * Manages service cart, city selection, address selection
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};

export function CartProvider({ children }) {
  const [cart, setCart]             = useState([]);
  const [city, setCity]             = useState('Hyderabad');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [coupon, setCoupon]         = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [loading, setLoading]       = useState(true);

  // ── Persist cart ─────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const [cartData, cityData, addressData] = await Promise.all([
          AsyncStorage.getItem('slot_cart'),
          AsyncStorage.getItem('slot_city'),
          AsyncStorage.getItem('slot_address'),
        ]);
        if (cartData) setCart(JSON.parse(cartData));
        if (cityData) setCity(cityData);
        if (addressData) setSelectedAddress(JSON.parse(addressData));
      } catch {} finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  useEffect(() => {
    if (!loading) AsyncStorage.setItem('slot_cart', JSON.stringify(cart));
  }, [cart, loading]);

  useEffect(() => {
    if (city) AsyncStorage.setItem('slot_city', city);
  }, [city]);

  useEffect(() => {
    if (selectedAddress)
      AsyncStorage.setItem('slot_address', JSON.stringify(selectedAddress));
  }, [selectedAddress]);

  // ── Cart operations ───────────────────────────────────────
  const addToCart = useCallback((item) => {
    // Prevent adding same sub-service twice
    const exists = cart.find(
      (c) => c.serviceId === item.serviceId && c.subServiceName === item.subServiceName
    );
    if (exists) return false;
    setCart((prev) => [
      ...prev,
      {
        cartId:          `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        serviceId:       item.serviceId,
        serviceName:     item.serviceName,
        subServiceName:  item.subServiceName,
        price:           item.price,
        originalPrice:   item.originalPrice || item.price,
        duration:        item.duration || 60,
        icon:            item.icon || '🔧',
        category:        item.category,
        categorySlug:    item.categorySlug,
      },
    ]);
    return true;
  }, [cart]);

  const removeFromCart = useCallback((cartId) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
    // Clear coupon if cart becomes empty
    setCart((prev) => {
      if (prev.length === 0) { setCoupon(null); setCouponDiscount(0); }
      return prev;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon(null);
    setCouponDiscount(0);
  }, []);

  const updateQuantity = useCallback((cartId, qty) => {
    if (qty <= 0) { removeFromCart(cartId); return; }
    setCart((prev) => prev.map((i) => i.cartId === cartId ? { ...i, quantity: qty } : i));
  }, [removeFromCart]);

  const applyCoupon = useCallback((couponData, discountAmount) => {
    setCoupon(couponData);
    setCouponDiscount(discountAmount);
  }, []);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponDiscount(0);
  }, []);

  // ── Computed values ───────────────────────────────────────
  const cartTotal        = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
  const cartOriginalTotal= cart.reduce((s, i) => s + (i.originalPrice * (i.quantity || 1)), 0);
  const cartSavings      = cartOriginalTotal - cartTotal;
  const cartCount        = cart.length;
  const CONVENIENCE_FEE  = cartTotal > 0 ? (cartTotal >= 500 ? 0 : 29) : 0;
  const GST              = Math.round(cartTotal * 0.18);
  const grandTotal       = cartTotal + CONVENIENCE_FEE + GST - couponDiscount;

  return (
    <CartContext.Provider value={{
      cart, loading,
      addToCart, removeFromCart, clearCart, updateQuantity,
      cartTotal, cartOriginalTotal, cartSavings, cartCount,
      convenienceFee: CONVENIENCE_FEE, gst: GST, grandTotal,
      city, setCity,
      selectedAddress, setSelectedAddress,
      coupon, couponDiscount, applyCoupon, removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}
