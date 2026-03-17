/**
 * MK App — Web Store Page (UC Store Clone)
 * Full product browsing, cart, checkout experience on web
 * Matches Urban Company Store design + functionality
 */
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { storeAPI } from '../utils/api';

// ── Design tokens (inline for self-contained page) ─────────────
const T = {
  brand: '#f15c22',
  brandDk: '#d94f1a',
  brandLt: '#fff3ee',
  ink900: '#1c1c1e',
  ink700: '#3a3a3c',
  ink500: '#6e6e73',
  ink300: '#aeaeb2',
  ink100: '#e5e5ea',
  ink50: '#f2f2f7',
  white: '#ffffff',
  success: '#30d158',
  successBg: '#f0fdf4',
  star: '#f5a623',
};

// ── Mock products (mirrors mobile StoreScreen) ─────────────────
const PRODUCTS = [
  { _id: 'p1', name: 'Phenyl Floor Cleaner 1L', category: 'cleaning', price: 129, mrp: 199, discount: 35, emoji: '🧹', topSeller: true, rating: 4.5, reviewCount: 2340, soldCount: 12000, highlights: ['Kills 99.9% germs', 'Long-lasting fragrance', 'Safe for all floors'], deliveryDays: 2 },
  { _id: 'p2', name: 'Professional AC Coil Cleaner', category: 'tools', price: 349, mrp: 499, discount: 30, emoji: '❄️', featured: true, rating: 4.7, reviewCount: 890, soldCount: 4500, highlights: ['Non-corrosive formula', 'Removes dust & mold', 'Easy spray nozzle'], deliveryDays: 2 },
  { _id: 'p3', name: 'Keratin Hair Mask 200ml', category: 'beauty', price: 599, mrp: 899, discount: 33, emoji: '💆', topSeller: true, rating: 4.8, reviewCount: 3210, soldCount: 18000, highlights: ['Salon-grade formula', 'Reduces frizz 85%', 'All hair types'], deliveryDays: 3 },
  { _id: 'p4', name: 'Car Battery Clamps Set', category: 'automotive', price: 249, mrp: 399, discount: 38, emoji: '🚗', rating: 4.3, reviewCount: 450, soldCount: 2100, highlights: ['Heavy duty steel', 'Safety insulation', 'Fits all batteries'], deliveryDays: 3 },
  { _id: 'p5', name: 'Pest Control Spray 500ml', category: 'pest_control', price: 199, mrp: 299, discount: 33, emoji: '🐛', featured: true, rating: 4.6, reviewCount: 1780, soldCount: 8900, highlights: ['Cockroach & mosquito', 'Odourless after dry', 'Child-safe formula'], deliveryDays: 2 },
  { _id: 'p6', name: 'Microfiber Cleaning Kit (10pc)', category: 'cleaning', price: 299, mrp: 449, discount: 33, emoji: '✨', rating: 4.4, reviewCount: 2100, soldCount: 9800, highlights: ['Super absorbent', 'Scratch-free', 'Washable & reusable'], deliveryDays: 2 },
  { _id: 'p7', name: 'Vitamin C Face Serum 30ml', category: 'beauty', price: 449, mrp: 699, discount: 36, emoji: '💧', topSeller: true, rating: 4.9, reviewCount: 5600, soldCount: 32000, highlights: ['Dermatologist tested', 'Brightens in 2 weeks', 'All skin types'], deliveryDays: 3 },
  { _id: 'p8', name: 'Cordless Screwdriver Set', category: 'tools', price: 1299, mrp: 1999, discount: 35, emoji: '🔧', rating: 4.6, reviewCount: 780, soldCount: 3400, highlights: ['3.6V rechargeable', '22 bits included', 'LED work light'], deliveryDays: 4 },
  { _id: 'p9', name: 'Lavender Room Freshener', category: 'home_care', price: 149, mrp: 199, discount: 25, emoji: '🌸', rating: 4.2, reviewCount: 1200, soldCount: 6700, highlights: ['Long lasting 60 days', 'Neutralizes odors', 'Non-toxic'], deliveryDays: 2 },
  { _id: 'p10', name: 'Car Dashboard Polish', category: 'automotive', price: 179, mrp: 249, discount: 28, emoji: '🚘', rating: 4.4, reviewCount: 670, soldCount: 3100, highlights: ['UV protection', 'Anti-dust', 'Shine lasts 3 months'], deliveryDays: 3 },
  { _id: 'p11', name: 'Anti-Dandruff Shampoo 300ml', category: 'beauty', price: 299, mrp: 449, discount: 33, emoji: '🧴', rating: 4.5, reviewCount: 2890, soldCount: 14500, highlights: ['ZPTO formula', 'Salon recommended', 'Daily use safe'], deliveryDays: 3 },
  { _id: 'p12', name: 'Heavy Duty Drain Cleaner', category: 'home_care', price: 179, mrp: 249, discount: 28, emoji: '🪣', rating: 4.3, reviewCount: 980, soldCount: 5200, highlights: ['Clears blockages fast', 'Safe for pipes', 'No harsh fumes'], deliveryDays: 2 },
];

const CATEGORIES = [
  { id: 'all', label: 'All Products', emoji: '🛍️', count: PRODUCTS.length },
  { id: 'cleaning', label: 'Cleaning', emoji: '🧹', count: PRODUCTS.filter(p => p.category === 'cleaning').length },
  { id: 'beauty', label: 'Beauty', emoji: '💄', count: PRODUCTS.filter(p => p.category === 'beauty').length },
  { id: 'tools', label: 'Tools', emoji: '🔧', count: PRODUCTS.filter(p => p.category === 'tools').length },
  { id: 'automotive', label: 'Automotive', emoji: '🚗', count: PRODUCTS.filter(p => p.category === 'automotive').length },
  { id: 'pest_control', label: 'Pest Control', emoji: '🐛', count: PRODUCTS.filter(p => p.category === 'pest_control').length },
  { id: 'home_care', label: 'Home Care', emoji: '🏠', count: PRODUCTS.filter(p => p.category === 'home_care').length },
];

const CAT_BG = {
  cleaning: '#e3f2fd', beauty: '#fce4ec', tools: '#f3e5f5',
  automotive: '#e8f5e9', pest_control: '#fff3e0', home_care: '#e0f7fa',
};

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'rating', label: 'Top Rated' },
];

// ── Stars component ───────────────────────────────────────────
function Stars({ rating, count }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: T.star, fontSize: 12 }}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
      <span style={{ fontSize: 12, color: T.ink500 }}>{rating} ({count.toLocaleString()})</span>
    </span>
  );
}

// ── Product Card ──────────────────────────────────────────────
function ProductCard({ product, qty, onAdd, onRemove, onClick }) {
  const [hover, setHover] = useState(false);
  const bg = CAT_BG[product.category] || T.ink50;
  const saving = product.mrp - product.price;
  const freeDelivery = product.price >= 499;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.white,
        borderRadius: 16,
        border: `1px solid ${hover ? T.ink200 : T.ink100}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? '0 8px 30px rgba(0,0,0,0.11)' : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image area */}
      <div style={{ position: 'relative', background: bg, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 64 }}>{product.emoji}</span>
        {product.discount > 0 && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: T.brand, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
            {product.discount}% OFF
          </span>
        )}
        {product.topSeller && (
          <span style={{ position: 'absolute', top: 10, right: 10, background: '#fff3e0', color: '#e65100', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
            🔥 Top Seller
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.ink900, lineHeight: 1.4 }}>{product.name}</p>
        <Stars rating={product.rating} count={product.reviewCount} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.ink900 }}>₹{product.price}</span>
          <span style={{ fontSize: 12, color: T.ink300, textDecoration: 'line-through' }}>₹{product.mrp}</span>
          {saving > 0 && <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>Save ₹{saving}</span>}
        </div>
        <span style={{ fontSize: 11, color: freeDelivery ? T.success : T.ink500 }}>
          {freeDelivery ? '🚚 Free delivery' : '🚚 ₹49 delivery'}
        </span>

        {/* Add to cart */}
        {qty > 0 ? (
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.brand, borderRadius: 10, overflow: 'hidden', marginTop: 'auto' }}
          >
            <button onClick={() => onRemove(product._id)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}>−</button>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{qty}</span>
            <button onClick={() => onAdd(product)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}>+</button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onAdd(product); }}
            style={{ marginTop: 'auto', padding: '9px 0', background: T.brandLt, color: T.brand, border: `1px solid ${T.brand}30`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.brand; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.brandLt; e.currentTarget.style.color = T.brand; }}
          >
            + Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

// ── Product Detail Modal ──────────────────────────────────────
function ProductModal({ product, qty, onAdd, onRemove, onClose }) {
  if (!product) return null;
  const bg = CAT_BG[product.category] || T.ink50;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.white, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, background: T.ink100, borderRadius: 4 }} />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Hero */}
          <div style={{ background: bg, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: 80 }}>{product.emoji}</span>
            {product.discount > 0 && (
              <span style={{ position: 'absolute', top: 14, right: 14, background: T.brand, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                {product.discount}% OFF
              </span>
            )}
          </div>

          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: T.ink900 }}>{product.name}</h2>
              <Stars rating={product.rating} count={product.reviewCount} />
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: T.ink50, borderRadius: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: T.ink900 }}>₹{product.price}</span>
              <span style={{ fontSize: 14, color: T.ink300, textDecoration: 'line-through' }}>₹{product.mrp}</span>
              <span style={{ marginLeft: 'auto', background: '#f0fdf4', color: T.success, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                Save ₹{product.mrp - product.price}
              </span>
            </div>

            {/* Highlights */}
            <div>
              <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 15, color: T.ink900 }}>Highlights</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {product.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: T.success, fontWeight: 700, fontSize: 15 }}>✓</span>
                    <span style={{ fontSize: 14, color: T.ink700 }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: T.ink50, borderRadius: 12 }}>
              <span style={{ fontSize: 22 }}>🚚</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: T.ink900 }}>
                  {product.price >= 499 ? 'Free Delivery' : 'Delivery: ₹49'}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: T.ink500 }}>
                  Expected in {product.deliveryDays}-{product.deliveryDays + 1} business days
                </p>
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['🔄 Free returns', '🛡️ Genuine product', '⭐ Quality assured'].map(badge => (
                <span key={badge} style={{ fontSize: 12, color: T.ink700, background: T.ink50, padding: '5px 10px', borderRadius: 8 }}>{badge}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.ink100}`, background: T.white }}>
          {qty > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.brand, borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => onRemove(product._id)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, fontWeight: 700, padding: '14px 24px', cursor: 'pointer' }}>−</button>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{qty} in cart</span>
              <button onClick={() => onAdd(product)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, fontWeight: 700, padding: '14px 24px', cursor: 'pointer' }}>+</button>
            </div>
          ) : (
            <button
              onClick={() => onAdd(product)}
              style={{ width: '100%', padding: '15px', background: T.brand, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 20px rgba(241,92,34,0.30)' }}
            >
              Add to Cart — ₹{product.price}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cart Sidebar ──────────────────────────────────────────────
function CartSidebar({ cart, onClose, onAdd, onRemove, onCheckout }) {
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({
    product: PRODUCTS.find(p => p._id === id),
    qty,
  })).filter(i => i.product);

  const subtotal = items.reduce((s, { product, qty }) => s + product.price * qty, 0);
  const deliveryFee = subtotal >= 499 ? 0 : 49;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + gst;
  const totalItems = items.reduce((s, { qty }) => s + qty, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex' }}>
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ width: 420, maxWidth: '100vw', background: T.white, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${T.ink100}` }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.ink900 }}>Your Cart ({totalItems})</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: T.ink500 }}>✕</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: T.ink400 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
              <p style={{ fontSize: 15, margin: 0 }}>Your cart is empty</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Browse products and add items</p>
            </div>
          ) : items.map(({ product, qty }) => (
            <div key={product._id} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, background: CAT_BG[product.category] || T.ink50, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 28 }}>{product.emoji}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: T.ink900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: T.ink500 }}>₹{product.price} × {qty}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => onRemove(product._id)} style={{ width: 28, height: 28, borderRadius: 14, background: T.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.ink900, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => onAdd(product)} style={{ width: 28, height: 28, borderRadius: 14, background: T.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Price summary + checkout */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: `1px solid ${T.ink100}` }}>
            <div style={{ background: T.ink50, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.ink700 }}>
                <span>Subtotal</span><span>₹{subtotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.ink700 }}>
                <span>Delivery</span>
                <span style={{ color: deliveryFee === 0 ? T.success : T.ink700 }}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.ink700 }}>
                <span>GST (5%)</span><span>₹{gst}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: T.ink900, paddingTop: 8, borderTop: `1px solid ${T.ink100}` }}>
                <span>Total</span><span>₹{total}</span>
              </div>
            </div>
            {deliveryFee > 0 && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: T.brand, textAlign: 'center' }}>
                Add ₹{499 - subtotal} more for free delivery!
              </p>
            )}
            <button
              onClick={() => onCheckout(items, total)}
              style={{ width: '100%', padding: '15px', background: T.brand, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 20px rgba(241,92,34,0.30)' }}
            >
              Proceed to Checkout — ₹{total}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Success Modal ───────────────────────────────────────
function OrderSuccess({ order, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: T.white, borderRadius: 24, padding: 40, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: T.ink900 }}>Order Placed!</h2>
        <p style={{ margin: '0 0 20px', color: T.ink500, fontSize: 15 }}>
          Your order <strong>#{order.id}</strong> has been confirmed.
        </p>
        <div style={{ background: T.ink50, borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.ink500 }}>Total paid</span>
            <span style={{ fontWeight: 700, color: T.ink900 }}>₹{order.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.ink500 }}>Estimated delivery</span>
            <span style={{ fontWeight: 600, color: T.ink700 }}>2-3 business days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.ink500 }}>Items</span>
            <span style={{ fontWeight: 600, color: T.ink700 }}>{order.itemCount} item{order.itemCount > 1 ? 's' : ''}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '14px', background: T.brand, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

// ── Main Store Page ───────────────────────────────────────────
export default function StorePage({ navigate }) {
  const { user, showToast } = useApp();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, qty]) => {
    const p = PRODUCTS.find(x => x._id === id);
    return s + (p ? p.price * qty : 0);
  }, 0);

  // Filter + sort products
  const filteredProducts = PRODUCTS
    .filter(p => {
      const catMatch = activeCategory === 'all' || p.category === activeCategory;
      const searchMatch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
      return catMatch && searchMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'discount': return b.discount - a.discount;
        case 'rating': return b.rating - a.rating;
        case 'newest': return b._id.localeCompare(a._id);
        default: return b.soldCount - a.soldCount;
      }
    });

  const addToCart = useCallback((product) => {
    setCart(prev => ({ ...prev, [product._id]: (prev[product._id] || 0) + 1 }));
    if (cartCount === 0) showToast?.(`${product.emoji} Added to cart!`);
  }, [cartCount, showToast]);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: current - 1 };
    });
  }, []);

  const handleCheckout = (items, total) => {
    if (!user) {
      setCartOpen(false);
      navigate('login');
      return;
    }
    // Simulate order placement
    const orderId = 'SO' + Math.random().toString(36).slice(2, 8).toUpperCase();
    setCartOpen(false);
    setCart({});
    setOrderSuccess({ id: orderId, total, itemCount: items.reduce((s, i) => s + i.qty, 0) });
  };

  return (
    <div style={{ background: T.ink50, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Store Hero ─────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1c1c1e 0%, #2d2d30 60%, #1c0a04 100%)', padding: '40px 24px 36px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🛍️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>MK Store</h1>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>Professional products for your home</p>
            </div>
          </div>

          {/* Trust row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
            {[['🚚', 'Free delivery above ₹499'], ['🔄', 'Easy 7-day returns'], ['✅', '100% genuine products'], ['⭐', '4.7★ avg rating']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search products…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontFamily: 'inherit' }}
              />
              {searchText && (
                <button onClick={() => setSearchText('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', padding: 0 }}>✕</button>
              )}
            </div>
            {cartCount > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                style={{ position: 'relative', background: T.brand, border: 'none', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 6px 20px rgba(241,92,34,0.40)' }}
              >
                🛒 Cart
                <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 800 }}>{cartCount}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* ── Category filter chips ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 24, cursor: 'pointer',
                border: activeCategory === cat.id ? 'none' : `1px solid ${T.ink100}`,
                background: activeCategory === cat.id ? T.brand : T.white,
                color: activeCategory === cat.id ? '#fff' : T.ink700,
                fontWeight: activeCategory === cat.id ? 700 : 500,
                fontSize: 13, whiteSpace: 'nowrap', transition: 'all 0.18s',
                boxShadow: activeCategory === cat.id ? '0 4px 14px rgba(241,92,34,0.30)' : 'none',
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span style={{ opacity: 0.65, fontSize: 11 }}>({cat.count})</span>
            </button>
          ))}
        </div>

        {/* ── Toolbar: results count + sort ────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 14, color: T.ink500 }}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            {searchText && <span> for "<strong style={{ color: T.ink900 }}>{searchText}</strong>"</span>}
          </p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 14px', border: `1px solid ${T.ink100}`, borderRadius: 10, fontSize: 13, color: T.ink700, background: T.white, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* ── Products grid ─────────────────────────────────────── */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: T.ink400 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16, margin: '0 0 8px', color: T.ink700 }}>No products found</p>
            <p style={{ fontSize: 14, margin: 0 }}>Try a different search or category</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                qty={cart[product._id] || 0}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}

        {/* ── Why shop with us ─────────────────────────────────── */}
        <div style={{ marginTop: 60, padding: '32px 0', borderTop: `1px solid ${T.ink100}` }}>
          <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, color: T.ink900, marginBottom: 28 }}>Why Shop at MK Store?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              ['🏷️', 'Best Prices', 'Up to 40% off on professional-grade products'],
              ['✅', 'Genuine Products', 'Sourced directly from verified manufacturers'],
              ['🚚', 'Fast Delivery', 'Delivered within 2-4 business days across India'],
              ['🔄', 'Easy Returns', '7-day hassle-free return policy on all items'],
            ].map(([emoji, title, desc]) => (
              <div key={title} style={{ textAlign: 'center', padding: '20px 16px', background: T.white, borderRadius: 16, border: `1px solid ${T.ink100}` }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{emoji}</div>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14, color: T.ink900 }}>{title}</p>
                <p style={{ margin: 0, fontSize: 12, color: T.ink500, lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating cart button (mobile feel on web) ────────── */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 500,
            background: T.brand, color: '#fff', border: 'none', borderRadius: 16,
            padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10,
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(241,92,34,0.45)',
          }}
        >
          <span>🛒</span>
          <span>View Cart ({cartCount})</span>
          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '2px 10px', fontSize: 13 }}>₹{cartTotal}</span>
        </button>
      )}

      {/* ── Product detail modal ──────────────────────────────── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          qty={cart[selectedProduct._id] || 0}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* ── Cart sidebar ──────────────────────────────────────── */}
      {cartOpen && (
        <CartSidebar
          cart={cart}
          onClose={() => setCartOpen(false)}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onCheckout={handleCheckout}
        />
      )}

      {/* ── Order success modal ───────────────────────────────── */}
      {orderSuccess && (
        <OrderSuccess
          order={orderSuccess}
          onClose={() => setOrderSuccess(null)}
        />
      )}
    </div>
  );
}
