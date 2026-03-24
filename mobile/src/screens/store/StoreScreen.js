/**
 * Slot App — Store Screen (UC Store Clone)
 * Browse products, add to cart, checkout, track orders
 * Cleaning kits, beauty products, tools, automotive accessories
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, TextInput, ActivityIndicator, Alert, Modal,
  Dimensions, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../utils/theme';
import { api } from '../../utils/api';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

// ── Mock Product Data (replace with API) ─────────────────────
const MOCK_PRODUCTS = [
  { _id: 'p1', name: 'Phenyl Floor Cleaner 1L', category: 'cleaning', price: 129, mrp: 199, discount: 35, images: [{ url: '' }], isTopSeller: true, ratings: { average: 4.5, count: 2340 }, soldCount: 12000, highlights: ['Kills 99.9% germs','Long-lasting fragrance','Safe for all floors'], unit: 'bottle' },
  { _id: 'p2', name: 'Professional AC Coil Cleaner', category: 'tools', price: 349, mrp: 499, discount: 30, images: [{ url: '' }], isFeatured: true, ratings: { average: 4.7, count: 890 }, soldCount: 4500, highlights: ['Non-corrosive formula','Removes dust & mold','Easy spray nozzle'], unit: 'can' },
  { _id: 'p3', name: 'Keratin Hair Mask 200ml', category: 'beauty', price: 599, mrp: 899, discount: 33, images: [{ url: '' }], isTopSeller: true, ratings: { average: 4.8, count: 3210 }, soldCount: 18000, highlights: ['Salon-grade formula','Reduces frizz 85%','All hair types'], unit: 'tube' },
  { _id: 'p4', name: 'Car Battery Clamps Set', category: 'automotive', price: 249, mrp: 399, discount: 38, images: [{ url: '' }], ratings: { average: 4.3, count: 450 }, soldCount: 2100, highlights: ['Heavy duty steel','Safety insulation','Fits all batteries'], unit: 'set' },
  { _id: 'p5', name: 'Pest Control Spray 500ml', category: 'pest_control', price: 199, mrp: 299, discount: 33, images: [{ url: '' }], isFeatured: true, ratings: { average: 4.6, count: 1780 }, soldCount: 8900, highlights: ['Cockroach & mosquito','Odourless after dry','Child-safe formula'], unit: 'bottle' },
  { _id: 'p6', name: 'Microfiber Cleaning Kit (10pc)', category: 'cleaning', price: 299, mrp: 449, discount: 33, images: [{ url: '' }], ratings: { average: 4.4, count: 2100 }, soldCount: 9800, highlights: ['Super absorbent','Scratch-free','Washable & reusable'], unit: 'set' },
  { _id: 'p7', name: 'Vitamin C Face Serum 30ml', category: 'beauty', price: 449, mrp: 699, discount: 36, images: [{ url: '' }], isTopSeller: true, ratings: { average: 4.9, count: 5600 }, soldCount: 32000, highlights: ['Dermatologist tested','Brightens in 2 weeks','All skin types'], unit: 'bottle' },
  { _id: 'p8', name: 'Cordless Screwdriver', category: 'tools', price: 1299, mrp: 1999, discount: 35, images: [{ url: '' }], ratings: { average: 4.6, count: 780 }, soldCount: 3400, highlights: ['3.6V rechargeable','22 bits included','LED work light'], unit: 'piece' },
  { _id: 'p9', name: 'Lavender Room Freshener', category: 'home_care', price: 149, mrp: 199, discount: 25, images: [{ url: '' }], ratings: { average: 4.2, count: 1200 }, soldCount: 6700, highlights: ['Long lasting 60 days','Neutralizes odors','Non-toxic'], unit: 'piece' },
  { _id: 'p10', name: 'Car Dashboard Polish', category: 'automotive', price: 179, mrp: 249, discount: 28, images: [{ url: '' }], ratings: { average: 4.4, count: 670 }, soldCount: 3100, highlights: ['UV protection','Anti-dust','Shine lasts 3 months'], unit: 'bottle' },
];

const CATEGORY_LIST = [
  { id: 'all', label: 'All', icon: '🛍️' },
  { id: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { id: 'beauty', label: 'Beauty', icon: '💄' },
  { id: 'tools', label: 'Tools', icon: '🔧' },
  { id: 'automotive', label: 'Auto', icon: '🚗' },
  { id: 'pest_control', label: 'Pest', icon: '🐛' },
  { id: 'home_care', label: 'Home', icon: '🏠' },
  { id: 'wellness', label: 'Wellness', icon: '🌿' },
];

const CATEGORY_COLORS = {
  cleaning: '#E3F2FD', beauty: '#FCE4EC', tools: '#F3E5F5',
  automotive: '#E8F5E9', pest_control: '#FFF3E0', home_care: '#E0F7FA',
  wellness: '#F1F8E9',
};

const EMOJI_MAP = {
  cleaning: '🧹', beauty: '💄', tools: '🔧', automotive: '🚗',
  pest_control: '🐛', home_care: '🏠', wellness: '🌿',
};

// ── Product Card ──────────────────────────────────────────────
function ProductCard({ product, onPress, onAddToCart, cartQty }) {
  const bgColor = CATEGORY_COLORS[product.category] || '#F8F9FA';
  return (
    <TouchableOpacity style={[S.productCard, { width: CARD_W }]} onPress={onPress} activeOpacity={0.9}>
      {/* Image / Emoji area */}
      <View style={[S.productImage, { backgroundColor: bgColor }]}>
        <Text style={S.productEmoji}>{EMOJI_MAP[product.category] || '📦'}</Text>
        {product.discount > 0 && (
          <View style={S.discountBadge}>
            <Text style={S.discountBadgeText}>{product.discount}% OFF</Text>
          </View>
        )}
        {product.isTopSeller && (
          <View style={S.topSellerBadge}>
            <Text style={S.topSellerText}>🔥 Top</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={S.productInfo}>
        <Text style={S.productName} numberOfLines={2}>{product.name}</Text>
        <View style={S.ratingRow}>
          <Text style={S.ratingStar}>★</Text>
          <Text style={S.ratingVal}>{product.ratings.average}</Text>
          <Text style={S.ratingCount}>({product.ratings.count.toLocaleString()})</Text>
        </View>
        <View style={S.priceRow}>
          <Text style={S.price}>₹{product.price}</Text>
          {product.mrp > product.price && (
            <Text style={S.mrp}>₹{product.mrp}</Text>
          )}
        </View>
        <Text style={S.freeDelivery}>{product.price >= 499 ? '🚚 Free delivery' : '🚚 ₹49 delivery'}</Text>

        {/* Add to cart */}
        {cartQty > 0 ? (
          <View style={S.qtyControl}>
            <TouchableOpacity style={S.qtyBtn} onPress={() => onAddToCart(product, -1)}>
              <Text style={S.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={S.qtyText}>{cartQty}</Text>
            <TouchableOpacity style={S.qtyBtn} onPress={() => onAddToCart(product, 1)}>
              <Text style={S.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={S.addBtn} onPress={() => onAddToCart(product, 1)}>
            <Text style={S.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Product Detail Modal ──────────────────────────────────────
function ProductDetailModal({ product, visible, onClose, onAddToCart, cartQty }) {
  if (!product) return null;
  const bgColor = CATEGORY_COLORS[product.category] || '#F8F9FA';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={S.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={S.detailSheet}>
          <View style={S.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[S.detailHero, { backgroundColor: bgColor }]}>
              <Text style={S.detailEmoji}>{EMOJI_MAP[product.category] || '📦'}</Text>
              {product.discount > 0 && (
                <View style={S.detailDiscount}>
                  <Text style={S.detailDiscountText}>{product.discount}% OFF</Text>
                </View>
              )}
            </View>

            <View style={S.detailBody}>
              <Text style={S.detailName}>{product.name}</Text>
              <View style={S.detailMeta}>
                <Text style={S.detailRating}>★ {product.ratings.average}</Text>
                <Text style={S.detailReviews}>{product.ratings.count.toLocaleString()} reviews</Text>
                <Text style={S.detailSold}>{product.soldCount.toLocaleString()}+ sold</Text>
              </View>

              <View style={S.detailPriceRow}>
                <Text style={S.detailPrice}>₹{product.price}</Text>
                {product.mrp > product.price && (
                  <>
                    <Text style={S.detailMrp}>₹{product.mrp}</Text>
                    <View style={S.saveBadge}><Text style={S.saveBadgeText}>Save ₹{product.mrp - product.price}</Text></View>
                  </>
                )}
              </View>

              {/* Highlights */}
              {product.highlights?.length > 0 && (
                <>
                  <Text style={S.sectionTitle}>Highlights</Text>
                  {product.highlights.map((h, i) => (
                    <View key={i} style={S.highlightRow}>
                      <Text style={S.highlightCheck}>✓</Text>
                      <Text style={S.highlightText}>{h}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Delivery info */}
              <View style={S.deliveryCard}>
                <Text style={S.deliveryIcon}>🚚</Text>
                <View>
                  <Text style={S.deliveryTitle}>{product.price >= 499 ? 'Free Delivery' : `Delivery: ₹49`}</Text>
                  <Text style={S.deliverySub}>Delivered within 2-3 business days</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Add to cart footer */}
          <View style={S.detailFooter}>
            {cartQty > 0 ? (
              <View style={S.detailQtyControl}>
                <TouchableOpacity style={S.detailQtyBtn} onPress={() => onAddToCart(product, -1)}>
                  <Text style={S.detailQtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={S.detailQtyText}>{cartQty} in cart</Text>
                <TouchableOpacity style={S.detailQtyBtn} onPress={() => onAddToCart(product, 1)}>
                  <Text style={S.detailQtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={S.detailAddBtn} onPress={() => onAddToCart(product, 1)}>
                <Text style={S.detailAddBtnText}>Add to Cart — ₹{product.price}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Cart Bottom Sheet ─────────────────────────────────────────
function CartSheet({ visible, cart, onClose, onCheckout, onUpdateQty }) {
  const insets = useSafeAreaInsets();
  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = MOCK_PRODUCTS.find(p => p._id === id);
    return sum + (product ? product.price * qty : 0);
  }, 0);
  const deliveryFee = subtotal >= 499 ? 0 : 49;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + gst;
  const itemCount = Object.values(cart).reduce((s, q) => s + q, 0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={S.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[S.cartSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={S.sheetHandle} />
          <Text style={S.cartTitle}>Your Cart ({itemCount} items)</Text>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {Object.entries(cart).map(([productId, qty]) => {
              if (!qty) return null;
              const product = MOCK_PRODUCTS.find(p => p._id === productId);
              if (!product) return null;
              return (
                <View key={productId} style={S.cartItem}>
                  <View style={[S.cartItemImg, { backgroundColor: CATEGORY_COLORS[product.category] }]}>
                    <Text style={{ fontSize: 20 }}>{EMOJI_MAP[product.category] || '📦'}</Text>
                  </View>
                  <View style={S.cartItemInfo}>
                    <Text style={S.cartItemName} numberOfLines={2}>{product.name}</Text>
                    <Text style={S.cartItemPrice}>₹{product.price} × {qty}</Text>
                  </View>
                  <View style={S.cartQtyControl}>
                    <TouchableOpacity style={S.cartQtyBtn} onPress={() => onUpdateQty(productId, -1)}>
                      <Text style={S.cartQtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={S.cartQtyText}>{qty}</Text>
                    <TouchableOpacity style={S.cartQtyBtn} onPress={() => onUpdateQty(productId, 1)}>
                      <Text style={S.cartQtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Price summary */}
          <View style={S.priceSummary}>
            <View style={S.priceRow2}><Text style={S.priceLabel}>Subtotal</Text><Text style={S.priceVal}>₹{subtotal}</Text></View>
            <View style={S.priceRow2}><Text style={S.priceLabel}>Delivery</Text><Text style={[S.priceVal, deliveryFee === 0 && { color: Colors.success }]}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</Text></View>
            <View style={S.priceRow2}><Text style={S.priceLabel}>GST (5%)</Text><Text style={S.priceVal}>₹{gst}</Text></View>
            <View style={[S.priceRow2, S.totalRow]}><Text style={S.totalLabel}>Total</Text><Text style={S.totalVal}>₹{total}</Text></View>
          </View>

          <TouchableOpacity style={S.checkoutBtn} onPress={() => onCheckout(total)}>
            <Text style={S.checkoutBtnText}>Proceed to Checkout — ₹{total}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Store Screen ─────────────────────────────────────────
export default function StoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchText, setSearchText]         = useState('');
  const [cart, setCart]                     = useState({});
  const [cartVisible, setCartVisible]       = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailVisible, setDetailVisible]   = useState(false);
  const [loading, setLoading]               = useState(false);

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const updateCart = useCallback((product, delta) => {
    setCart(prev => {
      const current = prev[product._id] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [product._id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [product._id]: newQty };
    });
  }, []);

  const handleCheckout = (total) => {
    setCartVisible(false);
    Alert.alert(
      'Checkout',
      `Total: ₹${total}\n\nProceed to payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => navigation.navigate('StoreCheckout', { cart, total }) },
      ]
    );
  };

  const openProduct = (product) => {
    setSelectedProduct(product);
    setDetailVisible(true);
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Slot Store</Text>
        {cartCount > 0 && (
          <TouchableOpacity style={S.cartIconBtn} onPress={() => setCartVisible(true)}>
            <Text style={S.cartIcon}>🛒</Text>
            <View style={S.cartBadge}><Text style={S.cartBadgeText}>{cartCount}</Text></View>
          </TouchableOpacity>
        )}
      </View>

      {/* Banner */}
      <LinearGradient colors={['#E94560', '#C0392B']} style={S.banner}>
        <View>
          <Text style={S.bannerTitle}>Free Delivery</Text>
          <Text style={S.bannerSub}>On orders above ₹499</Text>
        </View>
        <Text style={S.bannerEmoji}>🚚</Text>
      </LinearGradient>

      {/* Search */}
      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.lightGray}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={S.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={S.categoryScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {CATEGORY_LIST.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[S.categoryChip, activeCategory === cat.id && S.categoryChipActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={S.catIcon}>{cat.icon}</Text>
            <Text style={[S.catLabel, activeCategory === cat.id && S.catLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item._id}
        numColumns={2}
        columnWrapperStyle={S.row}
        contentContainerStyle={S.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => openProduct(item)}
            onAddToCart={updateCart}
            cartQty={cart[item._id] || 0}
          />
        )}
        ListEmptyComponent={
          <View style={S.emptyBox}>
            <Text style={S.emptyIcon}>🔍</Text>
            <Text style={S.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity style={S.floatingCart} onPress={() => setCartVisible(true)}>
          <Text style={S.floatingCartText}>🛒 View Cart ({cartCount} items)</Text>
        </TouchableOpacity>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onAddToCart={(product, delta) => { updateCart(product, delta); }}
        cartQty={selectedProduct ? (cart[selectedProduct._id] || 0) : 0}
      />

      {/* Cart Sheet */}
      <CartSheet
        visible={cartVisible}
        cart={cart}
        onClose={() => setCartVisible(false)}
        onCheckout={handleCheckout}
        onUpdateQty={(productId, delta) => {
          const product = MOCK_PRODUCTS.find(p => p._id === productId);
          if (product) updateCart(product, delta);
        }}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, ...Shadows.sm },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  backIcon:      { fontSize: 22, color: Colors.black },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.black },
  cartIconBtn:   { position: 'relative', padding: 4 },
  cartIcon:      { fontSize: 24 },
  cartBadge:     { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '800' },

  banner:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  bannerTitle:   { fontSize: 16, fontWeight: '800', color: Colors.white },
  bannerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  bannerEmoji:   { fontSize: 32 },

  searchBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.borderLight, gap: 8 },
  searchIcon:    { fontSize: 16 },
  searchInput:   { flex: 1, height: 44, fontSize: 14, color: Colors.black },
  clearSearch:   { fontSize: 14, color: Colors.gray, padding: 4 },

  categoryScroll:{ maxHeight: 48, marginBottom: 8 },
  categoryChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catIcon:       { fontSize: 13 },
  catLabel:      { fontSize: 12, color: Colors.gray, fontWeight: '600' },
  catLabelActive:{ color: Colors.white },

  grid:          { padding: 16, paddingTop: 8, paddingBottom: 100 },
  row:           { gap: 12, marginBottom: 12 },
  productCard:   { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', ...Shadows.sm },
  productImage:  { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  productEmoji:  { fontSize: 44 },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  discountBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '800' },
  topSellerBadge:{ position: 'absolute', top: 8, right: 8, backgroundColor: Colors.warningLight, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  topSellerText: { fontSize: 10, color: Colors.warning, fontWeight: '700' },
  productInfo:   { padding: 10 },
  productName:   { fontSize: 12, fontWeight: '600', color: Colors.black, marginBottom: 4, lineHeight: 16 },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  ratingStar:    { fontSize: 11, color: Colors.star },
  ratingVal:     { fontSize: 11, fontWeight: '700', color: Colors.black },
  ratingCount:   { fontSize: 10, color: Colors.gray },
  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  price:         { fontSize: 15, fontWeight: '800', color: Colors.black },
  mrp:           { fontSize: 11, color: Colors.gray, textDecorationLine: 'line-through' },
  freeDelivery:  { fontSize: 10, color: Colors.success, marginBottom: 8 },
  addBtn:        { backgroundColor: Colors.primaryLight, borderRadius: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: Colors.primaryMid },
  addBtnText:    { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  qtyControl:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: 8, overflow: 'hidden' },
  qtyBtn:        { paddingHorizontal: 12, paddingVertical: 7 },
  qtyBtnText:    { fontSize: 16, color: Colors.white, fontWeight: '700' },
  qtyText:       { fontSize: 13, color: Colors.white, fontWeight: '800' },

  emptyBox:      { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:     { fontSize: 40, marginBottom: 8 },
  emptyText:     { fontSize: 14, color: Colors.gray },

  floatingCart:  { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: Colors.black, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...Shadows.lg },
  floatingCartText: { fontSize: 15, color: Colors.white, fontWeight: '700' },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailSheet:   { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  cartSheet:     { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHandle:   { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  detailHero:    { height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  detailEmoji:   { fontSize: 72 },
  detailDiscount:{ position: 'absolute', top: 16, right: 16, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  detailDiscountText: { fontSize: 12, color: Colors.white, fontWeight: '800' },
  detailBody:    { padding: 20 },
  detailName:    { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 8 },
  detailMeta:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailRating:  { fontSize: 13, color: Colors.star, fontWeight: '700' },
  detailReviews: { fontSize: 12, color: Colors.gray },
  detailSold:    { fontSize: 12, color: Colors.gray },
  detailPriceRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  detailPrice:   { fontSize: 24, fontWeight: '800', color: Colors.black },
  detailMrp:     { fontSize: 14, color: Colors.gray, textDecorationLine: 'line-through' },
  saveBadge:     { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  saveBadgeText: { fontSize: 11, color: Colors.success, fontWeight: '700' },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 10 },
  highlightRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  highlightCheck:{ fontSize: 14, color: Colors.success, fontWeight: '700' },
  highlightText: { fontSize: 13, color: Colors.gray, flex: 1 },
  deliveryCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginTop: 16 },
  deliveryIcon:  { fontSize: 22 },
  deliveryTitle: { fontSize: 14, fontWeight: '600', color: Colors.black },
  deliverySub:   { fontSize: 12, color: Colors.gray, marginTop: 2 },
  detailFooter:  { padding: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  detailAddBtn:  { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  detailAddBtnText: { fontSize: 15, color: Colors.white, fontWeight: '700' },
  detailQtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: 14, overflow: 'hidden' },
  detailQtyBtn:  { paddingHorizontal: 24, paddingVertical: 14 },
  detailQtyBtnText: { fontSize: 20, color: Colors.white, fontWeight: '700' },
  detailQtyText: { fontSize: 15, color: Colors.white, fontWeight: '800' },

  cartTitle:     { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 12 },
  cartItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 10 },
  cartItemImg:   { width: 52, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cartItemInfo:  { flex: 1 },
  cartItemName:  { fontSize: 13, fontWeight: '600', color: Colors.black },
  cartItemPrice: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  cartQtyControl:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartQtyBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  cartQtyBtnText:{ fontSize: 16, color: Colors.white, fontWeight: '800' },
  cartQtyText:   { fontSize: 14, color: Colors.black, fontWeight: '700', minWidth: 20, textAlign: 'center' },

  priceSummary:  { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 12, gap: 8 },
  priceRow2:     { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel:    { fontSize: 13, color: Colors.gray },
  priceVal:      { fontSize: 13, fontWeight: '600', color: Colors.black },
  totalRow:      { paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 2 },
  totalLabel:    { fontSize: 15, fontWeight: '700', color: Colors.black },
  totalVal:      { fontSize: 15, fontWeight: '800', color: Colors.primary },
  checkoutBtn:   { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  checkoutBtnText: { fontSize: 15, color: Colors.white, fontWeight: '700' },
});
