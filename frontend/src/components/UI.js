import { useState, forwardRef } from 'react';

// ═══════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════
export function Button({
  variant = 'primary',   // primary | secondary | ghost | danger | success
  size = 'md',           // sm | md | lg | xl
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  style,
  ...props
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-semi)',
    letterSpacing: '-0.01em', borderRadius: 'var(--radius-full)',
    transition: `all var(--dur-base) var(--ease-out)`,
    whiteSpace: 'nowrap', border: '1.5px solid transparent',
    position: 'relative', overflow: 'hidden',
    width: fullWidth ? '100%' : undefined,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };

  const sizes = {
    sm: { padding: '8px 16px', fontSize: 13, height: 36 },
    md: { padding: '11px 22px', fontSize: 15, height: 44 },
    lg: { padding: '14px 28px', fontSize: 16, height: 52 },
    xl: { padding: '16px 36px', fontSize: 17, height: 58 },
  };

  const variants = {
    primary: {
      background: 'var(--color-brand)',
      color: '#fff',
      boxShadow: 'var(--shadow-brand)',
    },
    secondary: {
      background: 'var(--color-brand-light)',
      color: 'var(--color-brand)',
      border: '1.5px solid var(--color-brand-mid)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-ink-700)',
      border: '1.5px solid var(--color-ink-100)',
    },
    danger: {
      background: 'var(--color-error-bg)',
      color: 'var(--color-error)',
      border: '1.5px solid #ffd0ce',
    },
    success: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      border: '1.5px solid #bbf7d0',
    },
    dark: {
      background: 'var(--color-ink-900)',
      color: '#fff',
    },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.filter = 'brightness(1.06)';
          if (variant === 'primary') e.currentTarget.style.boxShadow = 'var(--shadow-brand-lg)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.filter = '';
        e.currentTarget.style.boxShadow = variant === 'primary' ? 'var(--shadow-brand)' : '';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      {...props}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} color={variant === 'primary' ? '#fff' : 'var(--color-brand)'} /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

// ═══════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════
export const Input = forwardRef(({
  label, error, hint, icon, iconRight, prefix, suffix,
  size = 'md', fullWidth = false, style, wrapperStyle, ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  const sizes = {
    sm: { padding: '9px 14px', fontSize: 13, height: 38 },
    md: { padding: '12px 16px', fontSize: 15, height: 48 },
    lg: { padding: '14px 18px', fontSize: 16, height: 54 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: fullWidth ? '100%' : undefined, ...wrapperStyle }}>
      {label && (
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', color: 'var(--color-ink-700)', letterSpacing: 'var(--tracking-wide)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 14, color: focused ? 'var(--color-brand)' : 'var(--color-ink-400)', transition: 'color var(--dur-base)', fontSize: 17, display: 'flex', pointerEvents: 'none', zIndex: 1 }}>
            {icon}
          </span>
        )}
        {prefix && (
          <div style={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-ink-600)', fontSize: 14, fontWeight: 600, pointerEvents: 'none', zIndex: 1 }}>
            {prefix}
            <div style={{ width: 1, height: 18, background: 'var(--color-ink-200)' }} />
          </div>
        )}
        <input
          ref={ref}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: fullWidth ? '100%' : undefined,
            ...sizes[size],
            paddingLeft: icon ? 44 : prefix ? 72 : sizes[size].padding.split(' ')[1],
            paddingRight: iconRight || suffix ? 44 : sizes[size].padding.split(' ')[1],
            border: `2px solid ${error ? 'var(--color-error)' : focused ? 'var(--color-brand)' : 'var(--color-ink-100)'}`,
            borderRadius: 'var(--radius-lg)',
            background: '#fff',
            color: 'var(--color-ink-900)',
            outline: 'none',
            transition: `border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)`,
            boxShadow: focused ? '0 0 0 4px rgba(241,92,34,0.12)' : error ? '0 0 0 4px rgba(255,59,48,0.10)' : 'none',
            ...style,
          }}
          {...props}
        />
        {iconRight && (
          <span style={{ position: 'absolute', right: 14, color: 'var(--color-ink-400)', fontSize: 17, display: 'flex', pointerEvents: 'none' }}>
            {iconRight}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 'var(--weight-medium)' }}>⚠ {error}</span>}
      {hint && !error && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-400)' }}>{hint}</span>}
    </div>
  );
});

// ═══════════════════════════════════════════════
// BADGE / CHIP
// ═══════════════════════════════════════════════
export function Badge({ children, variant = 'default', dot = false, size = 'sm' }) {
  const variants = {
    default: { bg: 'var(--color-ink-100)', color: 'var(--color-ink-600)' },
    brand: { bg: 'var(--color-brand-light)', color: 'var(--color-brand)' },
    success: { bg: 'var(--color-success-bg)', color: '#1a7a3a' },
    warning: { bg: 'var(--color-warning-bg)', color: '#9a5700' },
    error: { bg: 'var(--color-error-bg)', color: 'var(--color-error)' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
    new: { bg: '#e8f5e9', color: '#2e7d32' },
    popular: { bg: '#fff3e0', color: '#e65100' },
    dark: { bg: 'var(--color-ink-900)', color: '#fff' },
  };
  const v = variants[variant] || variants.default;
  const sizes = { xs: { px: '6px 10px', fs: 10 }, sm: { px: '5px 10px', fs: 11 }, md: { px: '6px 14px', fs: 12 } };
  const s = sizes[size] || sizes.sm;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: s.px, borderRadius: 'var(--radius-full)',
      fontSize: s.fs, fontWeight: 'var(--weight-bold)',
      letterSpacing: 'var(--tracking-wider)',
      background: v.bg, color: v.color,
      textTransform: 'uppercase',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: v.color, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════
// CHIP (filter pill)
// ═══════════════════════════════════════════════
export function Chip({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '9px 18px', borderRadius: 'var(--radius-full)',
        border: `1.5px solid ${active ? 'var(--color-brand)' : 'var(--color-ink-100)'}`,
        background: active ? 'var(--color-brand)' : '#fff',
        color: active ? '#fff' : 'var(--color-ink-600)',
        fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: `all var(--dur-base) var(--ease-out)`,
        boxShadow: active ? 'var(--shadow-brand)' : 'var(--shadow-xs)',
        transform: active ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════
// STAR RATING
// ═══════════════════════════════════════════════
export function StarRating({ rating, count, size = 'sm', showCount = true }) {
  const sizes = { xs: 11, sm: 13, md: 15, lg: 18 };
  const fs = sizes[size] || 13;
  const stars = Math.round(rating * 2) / 2;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <svg key={i} width={fs} height={fs} viewBox="0 0 20 20" fill={i <= Math.floor(stars) ? '#f5a623' : i - 0.5 === stars ? 'url(#half)' : '#e0e0e0'}>
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="#f5a623" />
                <stop offset="50%" stopColor="#e0e0e0" />
              </linearGradient>
            </defs>
            <path d="M10 1l2.39 4.84 5.35.78-3.87 3.77.91 5.32L10 13.27l-4.78 2.44.91-5.32L2.26 6.62l5.35-.78z" />
          </svg>
        ))}
      </div>
      <span style={{ fontSize: fs + 1, fontWeight: 'var(--weight-bold)', color: 'var(--color-ink-700)' }}>{rating.toFixed(1)}</span>
      {showCount && count && (
        <span style={{ fontSize: fs, color: 'var(--color-ink-400)' }}>({count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count})</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// CARD
// ═══════════════════════════════════════════════
export function Card({ children, hover = true, padding, style, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-xl)',
        border: `1.5px solid ${hov ? 'var(--color-brand-mid)' : 'var(--color-ink-100)'}`,
        boxShadow: hov ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: hov && onClick ? 'translateY(-3px)' : 'none',
        transition: `all var(--dur-slow) var(--ease-out)`,
        cursor: onClick ? 'pointer' : 'default',
        padding: padding || undefined,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════
// SERVICE CARD — exact Urban Company style
// ═══════════════════════════════════════════════
export function ServiceCard({ service, navigate }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => navigate('service-detail', { serviceId: service.slug || service._id })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        cursor: 'pointer', position: 'relative',
        border: `1.5px solid ${hov ? 'var(--color-brand-mid)' : 'var(--color-ink-100)'}`,
        boxShadow: hov ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
        transform: hov ? 'translateY(-4px)' : 'none',
        transition: `all var(--dur-slow) var(--ease-out)`,
      }}
    >
      {/* Image area */}
      <div style={{
        height: 120, background: `linear-gradient(135deg, ${service.bgColor || '#fff3ee'} 0%, ${service.bgColor2 || '#fde4d7'} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -20, bottom: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
        }} />
        {service.images && service.images.length > 0 ? (
          <img
            src={service.images[0]}
            alt={service.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform var(--dur-slow) var(--ease-spring)',
              transform: hov ? 'scale(1.08)' : 'scale(1)',
            }}
          />
        ) : (
          <span style={{
            fontSize: 52,
            filter: hov ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
            transform: hov ? 'scale(1.1)' : 'scale(1)',
            transition: 'all var(--dur-slow) var(--ease-spring)',
            display: 'block',
          }}>{service.icon}</span>
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {service.isNew && <Badge variant="new" size="xs">NEW</Badge>}
          {service.isPopular && <Badge variant="popular" size="xs">🔥 HOT</Badge>}
        </div>

        {service.discount && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'var(--color-error)', color: '#fff',
            padding: '3px 8px', borderRadius: 'var(--radius-full)',
            fontSize: 10, fontWeight: 800,
          }}>{service.discount}% OFF</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)', color: 'var(--color-ink-900)', marginBottom: 5, lineHeight: 'var(--leading-snug)' }}>
          {service.name}
        </div>
        <StarRating rating={service.rating || 4.8} count={service.totalRatings} size="xs" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span style={{ fontWeight: 'var(--weight-heavy)', fontSize: 'var(--text-md)', color: 'var(--color-ink-900)' }}>
            ₹{service.startingPrice}
          </span>
          {service.originalPrice && (
            <span style={{ textDecoration: 'line-through', color: 'var(--color-ink-300)', fontSize: 'var(--text-sm)' }}>
              ₹{service.originalPrice}
            </span>
          )}
        </div>
      </div>

      {/* Hover CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(241,92,34,0.97) 0%, rgba(241,92,34,0) 100%)',
        padding: '24px 16px 14px',
        opacity: hov ? 1 : 0,
        transform: hov ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all var(--dur-base) var(--ease-out)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 'var(--weight-bold)', fontSize: 13 }}>View Service →</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════
export function Spinner({ size = 20, color = 'var(--color-brand)', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0, ...style }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ═══════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════
export function Skeleton({ width, height, style, rounded }) {
  return (
    <div style={{
      width, height,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.4s ease infinite',
      borderRadius: rounded === 'full' ? 9999 : rounded || 10,
      ...style,
    }}>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════
export function SectionHeader({ title, subtitle, cta, onCtaClick, style }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)', ...style }}>
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)', fontWeight: 400,
          color: 'var(--color-ink-900)', lineHeight: 'var(--leading-tight)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: subtitle ? 6 : 0,
        }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-400)', margin: 0 }}>{subtitle}</p>}
      </div>
      {cta && (
        <button onClick={onCtaClick}
          style={{
            fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)',
            color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.gap = '8px'}
          onMouseLeave={e => e.currentTarget.style.gap = '4px'}
        >{cta} <span>→</span></button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════
export function Divider({ label, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-ink-100)' }} />
      {label && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-300)', fontWeight: 'var(--weight-semi)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--color-ink-100)' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn var(--dur-base) var(--ease-out)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxWidth: '100%', background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl)',
          animation: 'scaleIn var(--dur-slow) var(--ease-spring)',
          overflow: 'hidden',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {title && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-ink-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)', color: 'var(--color-ink-900)' }}>{title}</h3>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-ink-50)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-500)' }}>×</button>
          </div>
        )}
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TOAST — exported for AppContext
// ═══════════════════════════════════════════════
export function Toast({ toast }) {
  if (!toast) return null;
  const configs = {
    success: { bg: '#1a3a22', border: '#30d158', icon: '✓', iconBg: 'rgba(48,209,88,0.2)' },
    error: { bg: '#3a1a1a', border: '#ff3b30', icon: '!', iconBg: 'rgba(255,59,48,0.2)' },
    info: { bg: '#1a2a3a', border: '#0a84ff', icon: 'i', iconBg: 'rgba(10,132,255,0.2)' },
    warning: { bg: '#3a2a1a', border: '#ff9f0a', icon: '⚠', iconBg: 'rgba(255,159,10,0.2)' },
  };
  const c = configs[toast.type] || configs.success;

  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999,
      background: c.bg, border: `1px solid ${c.border}20`,
      borderLeft: `3px solid ${c.border}`,
      padding: '14px 20px', borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 12,
      minWidth: 260, maxWidth: 440,
      animation: 'slideUp 0.3s var(--ease-spring)',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.border, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
        {c.icon}
      </div>
      <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  );
}
