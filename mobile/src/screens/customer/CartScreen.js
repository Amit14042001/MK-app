import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Animated, StatusBar, TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

function CartItem({ item, onRemove, onQtyChange }) {
  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemLeft}>
        <Text style={styles.cartItemIcon}>{item.serviceIcon || '🔧'}</Text>
      </View>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemService}>{item.serviceName}</Text>
        {item.subServiceName && (
          <Text style={styles.cartItemSub}>{item.subServiceName}</Text>
        )}
        {item.addons?.length > 0 && (
          <Text style={styles.cartItemAddons}>+ {item.addons.map(a => a.name).join(', ')}</Text>
        )}
        <Text style={styles.cartItemPrice}>₹{item.price}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { cartItems, removeFromCart, clearCart, getCartTotal } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = getCartTotal();
  const taxes    = Math.round(subtotal * 0.18);
  const total    = subtotal - discount + taxes;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const { paymentsAPI } = require('../../utils/api');
      const { data } = await paymentsAPI.applyCoupon({ couponCode: couponCode.trim(), orderAmount: subtotal });
      setDiscount(data.discount);
      setCouponApplied(couponCode.trim());
      Alert.alert('🎉 Coupon Applied!', `You saved ₹${data.discount}`);
    } catch (e) {
      Alert.alert('Invalid Coupon', e.response?.data?.message || 'Coupon not valid or expired');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setDiscount(0);
    setCouponApplied('');
    setCouponCode('');
  };

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[Common.center, { flex: 1 }]}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🛒</Text>
          <Text style={Typography.h3}>Your cart is empty</Text>
          <Text style={[Typography.body, { color: Colors.midGray, marginTop: 8, textAlign: 'center' }]}>
            Browse services and add them to your cart
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('HomeTab')}
            style={[Common.primaryBtn, { marginTop: Spacing.xl, paddingHorizontal: Spacing.xxl }]}>
            <Text style={Common.primaryBtnText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart ({cartItems.length})</Text>
        <TouchableOpacity onPress={() => Alert.alert('Clear Cart?','Remove all items?',[
          {text:'Cancel',style:'cancel'},
          {text:'Clear',style:'destructive',onPress:clearCart},
        ])}>
          <Text style={{ color: Colors.error, fontWeight: '600', fontSize: 13 }}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Items */}
        <View style={{ margin: Spacing.base }}>
          <Text style={styles.sectionTitle}>Services ({cartItems.length})</Text>
          {cartItems.map((item, i) => (
            <CartItem key={i} item={item} onRemove={() => removeFromCart(i)} />
          ))}
        </View>

        {/* Coupon */}
        <View style={{ marginHorizontal: Spacing.base }}>
          <Text style={styles.sectionTitle}>Apply Coupon</Text>
          {couponApplied ? (
            <View style={styles.couponApplied}>
              <Text style={styles.couponAppliedIcon}>🎟️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.couponAppliedCode}>{couponApplied}</Text>
                <Text style={styles.couponAppliedSaved}>You saved ₹{discount}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text style={{ color: Colors.error, fontWeight: '700' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponRow}>
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Enter coupon code"
                placeholderTextColor={Colors.lightGray}
                style={styles.couponInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity onPress={handleApplyCoupon} disabled={applyingCoupon}
                style={styles.couponApplyBtn}>
                <Text style={styles.couponApplyText}>{applyingCoupon ? '...' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick coupons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: Spacing.sm }}>
            {['MKWELCOME','MK100','AUTOCARE'].map(code => (
              <TouchableOpacity key={code} onPress={() => setCouponCode(code)} style={styles.quickCoupon}>
                <Text style={styles.quickCouponText}>{code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Price breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          <View style={styles.priceLine}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{subtotal}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceLine}>
              <Text style={[styles.priceLabel, { color: Colors.success }]}>Coupon Discount</Text>
              <Text style={[styles.priceValue, { color: Colors.success }]}>-₹{discount}</Text>
            </View>
          )}
          <View style={styles.priceLine}>
            <Text style={styles.priceLabel}>GST (18%)</Text>
            <Text style={styles.priceValue}>₹{taxes}</Text>
          </View>
          <View style={styles.priceTotal}>
            <Text style={styles.priceTotalLabel}>Total</Text>
            <Text style={styles.priceTotalValue}>₹{total}</Text>
          </View>
          {discount > 0 && (
            <Text style={styles.priceSavings}>🎉 You're saving ₹{discount} on this order!</Text>
          )}
        </View>

        {/* Safety */}
        <View style={styles.safetyRow}>
          {['🛡️ Verified Pros','⭐ Rated 4.8+','💰 Best Price','🔄 Free Re-service'].map(item => (
            <View key={item} style={styles.safetyItem}>
              <Text style={styles.safetyText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Checkout CTA */}
      <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + Spacing.base }]}>
        <View>
          <Text style={styles.checkoutTotal}>₹{total}</Text>
          <Text style={styles.checkoutSub}>{cartItems.length} service{cartItems.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Checkout', { cartItems, total, discount, couponCode: couponApplied })}
          activeOpacity={0.85} style={styles.checkoutBtn}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}}
            style={styles.checkoutBtnGradient}>
            <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.base, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  backBtn: { width:40 },
  backIcon: { fontSize:22, color:Colors.black, fontWeight:'600' },
  headerTitle: { ...Typography.h4 },
  sectionTitle: { ...Typography.h4, marginBottom:Spacing.md },
  cartItem: { flexDirection:'row', alignItems:'flex-start', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, ...Shadows.card },
  cartItemLeft: { width:52, height:52, borderRadius:Radius.lg, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0 },
  cartItemIcon: { fontSize:28 },
  cartItemInfo: { flex:1 },
  cartItemService: { ...Typography.bodyMed, lineHeight:20 },
  cartItemSub: { ...Typography.small, color:Colors.gray, marginTop:2 },
  cartItemAddons: { ...Typography.small, color:Colors.midGray, fontStyle:'italic', marginTop:2 },
  cartItemPrice: { ...Typography.price, color:Colors.primary, marginTop:4 },
  removeBtn: { width:28, height:28, borderRadius:14, backgroundColor:Colors.errorLight, alignItems:'center', justifyContent:'center' },
  removeBtnText: { color:Colors.error, fontSize:12, fontWeight:'700' },
  couponRow: { flexDirection:'row', gap:10 },
  couponInput: { flex:1, backgroundColor:Colors.white, borderRadius:Radius.lg, paddingHorizontal:16, paddingVertical:12, fontSize:14, color:Colors.black, borderWidth:1.5, borderColor:Colors.offWhite, fontFamily:'System', letterSpacing:1.5 },
  couponApplyBtn: { backgroundColor:Colors.primary, paddingHorizontal:20, borderRadius:Radius.lg, justifyContent:'center' },
  couponApplyText: { color:Colors.white, fontWeight:'700', fontSize:14 },
  couponApplied: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.successLight, borderRadius:Radius.xl, padding:Spacing.base, gap:12, borderWidth:1.5, borderColor:Colors.success+'30' },
  couponAppliedIcon: { fontSize:24 },
  couponAppliedCode: { fontWeight:'800', fontSize:15, color:Colors.success, letterSpacing:1 },
  couponAppliedSaved: { ...Typography.small, color:Colors.success, marginTop:2 },
  quickCoupon: { paddingHorizontal:14, paddingVertical:8, borderRadius:Radius.pill, borderWidth:1.5, borderStyle:'dashed', borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  quickCouponText: { fontSize:12, fontWeight:'700', color:Colors.primary, letterSpacing:1 },
  priceCard: { margin:Spacing.base, backgroundColor:Colors.white, borderRadius:Radius.xxl, padding:Spacing.xl, ...Shadows.card },
  priceLine: { flexDirection:'row', justifyContent:'space-between', marginBottom:Spacing.sm },
  priceLabel: { ...Typography.body },
  priceValue: { ...Typography.body, fontWeight:'600' },
  priceTotal: { flexDirection:'row', justifyContent:'space-between', borderTopWidth:1, borderTopColor:Colors.offWhite, paddingTop:Spacing.md, marginTop:4 },
  priceTotalLabel: { ...Typography.h4 },
  priceTotalValue: { ...Typography.h3, color:Colors.primary },
  priceSavings: { ...Typography.small, color:Colors.success, marginTop:Spacing.sm, fontWeight:'600', textAlign:'center' },
  safetyRow: { flexDirection:'row', flexWrap:'wrap', gap:8, padding:Spacing.base, paddingTop:0 },
  safetyItem: { backgroundColor:Colors.white, paddingHorizontal:12, paddingVertical:7, borderRadius:Radius.pill, ...Shadows.sm },
  safetyText: { fontSize:11, fontWeight:'600', color:Colors.gray },
  checkoutBar: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:Colors.white, padding:Spacing.base, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderTopWidth:1, borderTopColor:Colors.offWhite, ...Shadows.lg },
  checkoutTotal: { ...Typography.h3, color:Colors.black },
  checkoutSub: { ...Typography.small, color:Colors.midGray },
  checkoutBtn: { borderRadius:Radius.xl, overflow:'hidden' },
  checkoutBtnGradient: { paddingHorizontal:Spacing.xl, paddingVertical:14 },
  checkoutBtnText: { color:Colors.white, fontWeight:'800', fontSize:15 },
});
