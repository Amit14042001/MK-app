/**
 * Slot Web — Wallet Page (Full)
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usersAPI, paymentsAPI } from '../utils/api';

const TXN_CONFIG = {
  credit:  { icon: '⬇️', color: '#22c55e', label: 'Added' },
  debit:   { icon: '⬆️', color: '#ef4444', label: 'Used' },
  refund:  { icon: '↩️', color: '#3b82f6', label: 'Refund' },
  cashback:{ icon: '🎁', color: '#f59e0b', label: 'Cashback' },
};

const ADD_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function WalletPage({ navigate = () => {} }) {
  const { user } = useApp();
  const [balance, setBalance]           = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [addAmount, setAddAmount]       = useState(500);
  const [custom, setCustom]             = useState('');
  const [adding, setAdding]             = useState(false);
  const [filter, setFilter]             = useState('all');

  useEffect(() => {
    if (!user) return;
    usersAPI.getWallet().then(res => {
      setBalance(res.data.balance || 0);
      setTransactions(res.data.transactions || []);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleAddMoney = async () => {
    const amount = custom ? parseInt(custom) : addAmount;
    if (!amount || amount < 10) return alert('Minimum ₹10');
    if (amount > 50000)          return alert('Maximum ₹50,000');
    setAdding(true);
    try {
      const { data } = await paymentsAPI.walletRecharge({ amount });
      // Open Razorpay
      const options = {
        key: data.key, amount: amount * 100, currency: 'INR',
        name: 'Slot Services', description: 'Wallet Recharge',
        order_id: data.order.id,
        handler: async (response) => {
          await usersAPI.addWalletMoney({ amount, razorpayPaymentId: response.razorpay_payment_id });
          setBalance(p => p + amount);
          setTransactions(p => [{ type: 'credit', amount, description: `Wallet recharge ₹${amount}`, date: new Date() }, ...p]);
          alert(`✅ ₹${amount} added to your wallet!`);
        },
        theme: { color: 'var(--color-brand)' },
      };
      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert('Razorpay not loaded. Please try again.');
      }
    } catch { alert('Payment failed. Please try again.'); }
    finally { setAdding(false); }
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
  const totalCredits = transactions.filter(t => ['credit','refund','cashback'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalDebits  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center"><div className="text-6xl mb-4">💰</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
        <span className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600">Login Now</span></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-orange-600 text-white px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-black mb-2">💰 Slot Wallet</h1>
          <div className="text-center py-6">
            <p className="text-white/70 text-sm mb-2">Available Balance</p>
            <p className="text-5xl font-black">₹{balance.toLocaleString('en-IN')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-white/10 rounded-2xl p-4">
            {[
              { label: 'Total Added', val: `₹${totalCredits.toLocaleString('en-IN')}` },
              { label: 'Total Used', val: `₹${totalDebits.toLocaleString('en-IN')}` },
              { label: 'Transactions', val: transactions.length },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-black text-white">{s.val}</p>
                <p className="text-xs text-white/70 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Add money */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Add Money</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {ADD_AMOUNTS.map(amt => (
              <button key={amt} onClick={() => { setAddAmount(amt); setCustom(''); }}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  addAmount === amt && !custom ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                ₹{amt}
              </button>
            ))}
          </div>
          <input type="number" placeholder="Enter custom amount (₹10 - ₹50,000)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-900 focus:outline-none focus:border-orange-500"
            value={custom} onChange={e => setCustom(e.target.value)} />
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-sm">Amount to add</p>
            <p className="text-2xl font-black text-gray-900">₹{custom || addAmount}</p>
          </div>
          <button onClick={handleAddMoney} disabled={adding}
            className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 text-lg">
            {adding ? 'Processing...' : 'Add Money via Razorpay 💳'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">🔒 Secured by Razorpay · 256-bit SSL encryption</p>
        </div>

        {/* Offers */}
        <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4 mb-6">
          <p className="text-sm font-bold text-orange-700">🎁 Add ₹500+ and get ₹50 cashback! Use code <span className="font-black">WALLET50</span></p>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
            <div className="flex gap-2">
              {['all','credit','debit','refund'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💸</div>
              <p className="text-gray-400">No {filter === 'all' ? '' : filter} transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, 30).map((txn, i) => {
                const cfg = TXN_CONFIG[txn.type] || TXN_CONFIG.debit;
                const isIn = ['credit','refund','cashback'].includes(txn.type);
                return (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: isIn ? '#f0fdf4' : '#fef2f2' }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{txn.description || cfg.label}</p>
                      <p className="text-xs text-gray-400">{new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <p className="font-black text-lg" style={{ color: cfg.color }}>
                      {isIn ? '+' : '-'}₹{txn.amount}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
