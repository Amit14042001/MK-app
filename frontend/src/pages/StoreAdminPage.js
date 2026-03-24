/**
 * Slot App — Store Admin Panel
 * Manage products (inventory, stock, pricing), view orders, update status
 */
import { useState, useEffect, useCallback } from 'react';
import { storeAPI, adminAPI } from '../utils/api';

const BRAND = 'var(--color-brand)';
const CATEGORIES = ['cleaning','beauty','tools','automotive','pest_control','home_care','wellness'];
const STATUS_COLORS = {
  pending:           { bg:'#fff3e0', color:'#e65100' },
  confirmed:         { bg:'#e3f2fd', color:'#1565c0' },
  packed:            { bg:'#f3e5f5', color:'#6a1b9a' },
  shipped:           { bg:'#e8eaf6', color:'#283593' },
  out_for_delivery:  { bg:'#e8f5e9', color:'#2e7d32' },
  delivered:         { bg:'#e8f5e9', color:'#1b5e20' },
  cancelled:         { bg:'#ffebee', color:'#c62828' },
  returned:          { bg:'#fce4ec', color:'#880e4f' },
};

function Badge({ status }) {
  const cfg = STATUS_COLORS[status] || { bg:'#f5f5f5', color:'#757575' };
  return (
    <span style={{ background:cfg.bg, color:cfg.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'capitalize', whiteSpace:'nowrap' }}>
      {status?.replace(/_/g,' ')}
    </span>
  );
}

// ── Product Form Modal ────────────────────────────────────────
function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product?._id;
  const [form, setForm] = useState({
    name: '', category: 'cleaning', price: '', mrp: '', discount: 0,
    stock: '', unit: 'piece', description: '', shortDesc: '',
    highlights: '', isActive: true, isFeatured: false, isTopSeller: false,
    ...(product || {}),
    highlights: Array.isArray(product?.highlights) ? product.highlights.join('\n') : '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.price || !form.mrp || !form.stock) {
      alert('Name, price, MRP and stock are required'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:    Number(form.price),
        mrp:      Number(form.mrp),
        discount: Number(form.discount),
        stock:    Number(form.stock),
        highlights: form.highlights.split('\n').map(s => s.trim()).filter(Boolean),
        slug:     form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      };
      if (isEdit) await storeAPI.updateProduct ? storeAPI.updateProduct(product._id, payload) : null;
      else await storeAPI.createProduct ? storeAPI.createProduct(payload) : null;
      onSave();
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  const inp = (label, key, type='text', extra={}) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e8e8e8', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
        {...extra} />
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:540, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>✕</button>
        </div>

        {inp('Product name *', 'name')}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e8e8e8', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>Unit</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e8e8e8', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none' }}>
              {['piece','bottle','set','can','tube','kg','ml','pack'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          {inp('Price (₹) *', 'price', 'number')}
          {inp('MRP (₹) *', 'mrp', 'number')}
          {inp('Stock (qty) *', 'stock', 'number')}
        </div>

        {inp('Short description', 'shortDesc')}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'#555', display:'block', marginBottom:4 }}>
            Highlights (one per line)
          </label>
          <textarea value={form.highlights} onChange={e => set('highlights', e.target.value)}
            rows={3} placeholder="Kills 99.9% germs&#10;Long-lasting fragrance&#10;Safe for all floors"
            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e8e8e8', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
        </div>

        <div style={{ display:'flex', gap:16, marginBottom:20 }}>
          {[['isActive','Active'],['isFeatured','Featured'],['isTopSeller','Top Seller']].map(([k,l]) => (
            <label key={k} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, fontWeight:600, color:'#555' }}>
              <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)}
                style={{ width:16, height:16, cursor:'pointer' }} />
              {l}
            </label>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:13, background:'#f8f9fa', border:'none', borderRadius:12, fontWeight:600, cursor:'pointer', fontSize:14 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:13, background:BRAND, color:'#fff', border:'none', borderRadius:12, fontWeight:700, cursor:'pointer', fontSize:14, opacity:saving?0.7:1 }}>
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Product')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Store Admin Page ─────────────────────────────────────
export default function StoreAdminPage({ navigate }) {
  const [tab, setTab]             = useState('products');
  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalProduct, setModal]  = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState('');
  const [catFilter, setCat]       = useState('all');
  const [orderStatus, setOrderStatus] = useState('all');
  const [page, setPage]           = useState(1);

  // Mock data for demo (replace with API calls)
  const MOCK_PRODUCTS = [
    { _id:'p1', name:'Phenyl Floor Cleaner 1L', category:'cleaning', price:129, mrp:199, discount:35, stock:342, isActive:true, isFeatured:false, isTopSeller:true, ratings:{ average:4.5, count:2340 }, soldCount:12000 },
    { _id:'p2', name:'Professional AC Coil Cleaner', category:'tools', price:349, mrp:499, discount:30, stock:87, isActive:true, isFeatured:true, isTopSeller:false, ratings:{ average:4.7, count:890 }, soldCount:4500 },
    { _id:'p3', name:'Keratin Hair Mask 200ml', category:'beauty', price:599, mrp:899, discount:33, stock:156, isActive:true, isFeatured:false, isTopSeller:true, ratings:{ average:4.8, count:3210 }, soldCount:18000 },
    { _id:'p4', name:'Car Battery Clamps Set', category:'automotive', price:249, mrp:399, discount:38, stock:64, isActive:true, isFeatured:false, isTopSeller:false, ratings:{ average:4.3, count:450 }, soldCount:2100 },
    { _id:'p5', name:'Pest Control Spray 500ml', category:'pest_control', price:199, mrp:299, discount:33, stock:23, isActive:true, isFeatured:true, isTopSeller:false, ratings:{ average:4.6, count:1780 }, soldCount:8900 },
    { _id:'p6', name:'Microfiber Cleaning Kit (10pc)', category:'cleaning', price:299, mrp:449, discount:33, stock:0, isActive:false, isFeatured:false, isTopSeller:false, ratings:{ average:4.4, count:2100 }, soldCount:9800 },
    { _id:'p7', name:'Vitamin C Face Serum 30ml', category:'beauty', price:449, mrp:699, discount:36, stock:201, isActive:true, isFeatured:false, isTopSeller:true, ratings:{ average:4.9, count:5600 }, soldCount:32000 },
    { _id:'p8', name:'Cordless Screwdriver Set', category:'tools', price:1299, mrp:1999, discount:35, stock:38, isActive:true, isFeatured:false, isTopSeller:false, ratings:{ average:4.6, count:780 }, soldCount:3400 },
  ];

  const MOCK_ORDERS = [
    { _id:'o1', orderId:'SO1A2B3C', user:{ name:'Priya Sharma', phone:'9876543210' }, status:'delivered', pricing:{ totalAmount:728 }, createdAt:'2026-03-10', items:[{ name:'Phenyl Floor Cleaner', quantity:2 },{ name:'Pest Control Spray', quantity:1 }] },
    { _id:'o2', orderId:'SO2D4E5F', user:{ name:'Rahul Mehta', phone:'9123456780' }, status:'shipped', pricing:{ totalAmount:349 }, createdAt:'2026-03-12', items:[{ name:'AC Coil Cleaner', quantity:1 }] },
    { _id:'o3', orderId:'SO3G6H7I', user:{ name:'Anita Kumar', phone:'9988776655' }, status:'confirmed', pricing:{ totalAmount:1448 }, createdAt:'2026-03-14', items:[{ name:'Keratin Hair Mask', quantity:1 },{ name:'Vitamin C Serum', quantity:1 },{ name:'Room Freshener', quantity:2 }] },
    { _id:'o4', orderId:'SO4J8K9L', user:{ name:'Vikram S.', phone:'9011223344' }, status:'pending', pricing:{ totalAmount:249 }, createdAt:'2026-03-15', items:[{ name:'Car Battery Clamps', quantity:1 }] },
    { _id:'o5', orderId:'SO5M0N1O', user:{ name:'Sneha Patel', phone:'9765432109' }, status:'cancelled', pricing:{ totalAmount:199 }, createdAt:'2026-03-08', items:[{ name:'Pest Control Spray', quantity:1 }] },
  ];

  useEffect(() => {
    setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      setOrders(MOCK_ORDERS);
      setLoading(false);
    }, 400);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const filteredOrders = orders.filter(o =>
    orderStatus === 'all' || o.status === orderStatus
  );

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.isActive).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock < 30).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => ['pending','confirmed'].includes(o.status)).length,
    revenue: orders.filter(o => o.status !== 'cancelled').reduce((s,o) => s + o.pricing.totalAmount, 0),
  };

  const TABS = [
    { id:'products', label:'Products', count:stats.activeProducts },
    { id:'orders',   label:'Orders',   count:stats.pendingOrders },
    { id:'analytics',label:'Analytics',count:null },
  ];

  return (
    <div style={{ background:'#f8f9fa', minHeight:'100vh', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0f0f0', padding:'20px 32px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={() => navigate('admin')} style={{ background:'#f8f9fa', border:'1px solid #e0e0e0', borderRadius:10, padding:'8px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>← Admin</button>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#1a1a2e' }}>🛍️ Store Management</h1>
            <p style={{ margin:0, fontSize:13, color:'#888' }}>Products, inventory & orders</p>
          </div>
          <button onClick={() => { setModal(null); setShowModal(true); }}
            style={{ marginLeft:'auto', padding:'10px 20px', background:BRAND, color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:14, cursor:'pointer' }}>
            + Add Product
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px 32px' }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:28 }}>
          {[
            { label:'Total products',  value:stats.totalProducts,  icon:'📦', color:BRAND },
            { label:'Active',          value:stats.activeProducts, icon:'✅', color:'#27ae60' },
            { label:'Low stock (<30)', value:stats.lowStock,       icon:'⚠️', color:'#ff9800' },
            { label:'Out of stock',    value:stats.outOfStock,     icon:'❌', color:'#f44336' },
            { label:'Total orders',    value:stats.totalOrders,    icon:'🛒', color:'#2196f3' },
            { label:'Pending orders',  value:stats.pendingOrders,  icon:'⏳', color:'#ff9800' },
            { label:'Revenue',         value:`₹${stats.revenue.toLocaleString()}`, icon:'💰', color:'#4caf50' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', borderRadius:16, padding:'16px 18px', border:'1px solid #f0f0f0', borderLeft:`4px solid ${s.color}` }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#1a1a2e' }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid #f0f0f0', paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:14, fontWeight:600, color: tab===t.id ? BRAND : '#888', borderBottom: tab===t.id ? `2px solid ${BRAND}` : '2px solid transparent', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
              {t.label}
              {t.count != null && t.count > 0 && <span style={{ background:BRAND, color:'#fff', borderRadius:10, padding:'1px 8px', fontSize:11, fontWeight:800 }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <>
            <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                style={{ flex:1, minWidth:200, padding:'9px 14px', border:'1.5px solid #e8e8e8', borderRadius:12, fontSize:14, fontFamily:'inherit', outline:'none' }} />
              <select value={catFilter} onChange={e => setCat(e.target.value)}
                style={{ padding:'9px 14px', border:'1.5px solid #e8e8e8', borderRadius:12, fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff' }}>
                <option value="all">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
              </select>
            </div>

            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f0f0', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #f0f0f0', background:'#fafafa' }}>
                    {['Product','Category','Price','MRP','Stock','Status','Rating','Actions'].map(h => (
                      <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p._id} style={{ borderBottom:'1px solid #f8f9fa' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ fontWeight:600, color:'#1a1a2e', fontSize:14 }}>{p.name}</div>
                        {p.isFeatured && <span style={{ fontSize:10, background:'#e3f2fd', color:'#1565c0', padding:'2px 6px', borderRadius:6, fontWeight:700 }}>Featured</span>}
                        {p.isTopSeller && <span style={{ fontSize:10, background:'#fff3e0', color:'#e65100', padding:'2px 6px', borderRadius:6, fontWeight:700, marginLeft:4 }}>Top Seller</span>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'#555', textTransform:'capitalize' }}>{p.category.replace('_',' ')}</td>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:'#1a1a2e' }}>₹{p.price}</td>
                      <td style={{ padding:'12px 16px', fontSize:13, color:'#aaa', textDecoration:'line-through' }}>₹{p.mrp}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontWeight:700, color: p.stock === 0 ? '#f44336' : p.stock < 30 ? '#ff9800' : '#27ae60', fontSize:14 }}>
                          {p.stock === 0 ? 'Out of stock' : p.stock}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ background: p.isActive ? '#e8f5e9' : '#ffebee', color: p.isActive ? '#2e7d32' : '#c62828', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:13 }}>★ {p.ratings?.average} ({p.ratings?.count?.toLocaleString()})</td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => { setModal(p); setShowModal(true); }}
                            style={{ padding:'5px 12px', background:'#f0f4ff', color:'#3949ab', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>Edit</button>
                          <button onClick={() => { setProducts(prev => prev.map(x => x._id===p._id ? {...x, isActive:!x.isActive} : x)); }}
                            style={{ padding:'5px 12px', background: p.isActive ? '#fff3e0' : '#e8f5e9', color: p.isActive ? '#e65100' : '#2e7d32', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            {p.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div style={{ padding:48, textAlign:'center', color:'#aaa' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
                  <p>No products found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {['all','pending','confirmed','shipped','delivered','cancelled'].map(s => (
                <button key={s} onClick={() => setOrderStatus(s)}
                  style={{ padding:'7px 16px', borderRadius:20, border:'1px solid', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit',
                    background: orderStatus===s ? BRAND : '#fff', color: orderStatus===s ? '#fff' : '#555', borderColor: orderStatus===s ? BRAND : '#e0e0e0' }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {s === 'all' && <span style={{ marginLeft:6, background:'rgba(255,255,255,0.3)', borderRadius:10, padding:'1px 6px', fontSize:11 }}>{orders.length}</span>}
                </button>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {filteredOrders.map(o => (
                <div key={o._id} style={{ background:'#fff', borderRadius:16, padding:'18px 20px', border:'1px solid #f0f0f0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontWeight:800, fontSize:15, color:'#1a1a2e', fontFamily:'monospace' }}>{o.orderId}</span>
                        <Badge status={o.status} />
                      </div>
                      <p style={{ margin:'4px 0 0', fontSize:12, color:'#888' }}>
                        {o.user?.name} · {o.user?.phone} · {new Date(o.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800, fontSize:18, color:'#1a1a2e' }}>₹{o.pricing?.totalAmount}</div>
                      <div style={{ fontSize:12, color:'#888' }}>{o.items?.length} item{o.items?.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                    {o.items?.map((item, i) => (
                      <span key={i} style={{ background:'#f8f9fa', padding:'4px 10px', borderRadius:8, fontSize:12, color:'#555' }}>
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                  </div>

                  {/* Status update buttons */}
                  {!['delivered','cancelled'].includes(o.status) && (
                    <div style={{ display:'flex', gap:8 }}>
                      {o.status === 'pending'    && <button onClick={() => setOrders(prev => prev.map(x => x._id===o._id ? {...x, status:'confirmed'} : x))} style={{ padding:'7px 14px', background:'#e3f2fd', color:'#1565c0', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>Confirm</button>}
                      {o.status === 'confirmed'  && <button onClick={() => setOrders(prev => prev.map(x => x._id===o._id ? {...x, status:'packed'} : x))} style={{ padding:'7px 14px', background:'#f3e5f5', color:'#6a1b9a', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>Mark Packed</button>}
                      {o.status === 'packed'     && <button onClick={() => setOrders(prev => prev.map(x => x._id===o._id ? {...x, status:'shipped'} : x))} style={{ padding:'7px 14px', background:'#e8eaf6', color:'#283593', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>Mark Shipped</button>}
                      {o.status === 'shipped'    && <button onClick={() => setOrders(prev => prev.map(x => x._id===o._id ? {...x, status:'out_for_delivery'} : x))} style={{ padding:'7px 14px', background:'#e8f5e9', color:'#2e7d32', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>Out for Delivery</button>}
                      {o.status === 'out_for_delivery' && <button onClick={() => setOrders(prev => prev.map(x => x._id===o._id ? {...x, status:'delivered'} : x))} style={{ padding:'7px 14px', background:'#27ae60', color:'#fff', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>Mark Delivered</button>}
                      <button onClick={() => setOrders(prev => prev.map(x => x._id===o._id ? {...x, status:'cancelled'} : x))} style={{ padding:'7px 14px', background:'#ffebee', color:'#c62828', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div style={{ padding:48, textAlign:'center', color:'#aaa', background:'#fff', borderRadius:16, border:'1px solid #f0f0f0' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
                  <p>No orders in this category</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
            {[
              { title:'Top Selling Products', items: [...products].sort((a,b) => b.soldCount - a.soldCount).slice(0,5).map(p => ({ label:p.name, value:`${p.soldCount.toLocaleString()} sold` })) },
              { title:'Low Stock Alerts', items: products.filter(p => p.stock < 30).sort((a,b) => a.stock - b.stock).map(p => ({ label:p.name, value: p.stock === 0 ? '⚠️ Out of stock' : `${p.stock} left`, urgent: p.stock < 10 })) },
              { title:'Category breakdown', items: CATEGORIES.map(c => { const prods = products.filter(p => p.category === c); return { label: c.replace('_',' '), value:`${prods.length} products` }; }).filter(x => x.value !== '0 products') },
            ].map(card => (
              <div key={card.title} style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #f0f0f0' }}>
                <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1a1a2e' }}>{card.title}</h3>
                {card.items.map((item, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8f9fa' }}>
                    <span style={{ fontSize:13, color:'#555' }}>{item.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color: item.urgent ? '#f44336' : '#1a1a2e' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={modalProduct}
          onClose={() => { setShowModal(false); setModal(null); }}
          onSave={() => {
            setShowModal(false);
            setModal(null);
            // In production: refetch products
          }}
        />
      )}
    </div>
  );
}
