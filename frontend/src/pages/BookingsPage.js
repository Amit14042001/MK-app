/**
 * Slot Web — Bookings Page (Full)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { bookingsAPI } from '../utils/api';

const BRAND='var(--color-brand)', INK900='#1c1c1e', INK500='#6e6e73', INK100='#e5e5ea', INK50='#f2f2f7';

const STATUS={
  pending:               {color:'#E65100',bg:'#FFF3E0',label:'Pending',icon:'⏳'},
  confirmed:             {color:'#1565C0',bg:'#E3F2FD',label:'Confirmed',icon:'✅'},
  professional_assigned: {color:'#1565C0',bg:'#E3F2FD',label:'Pro Assigned',icon:'👷'},
  professional_arriving: {color:'#6A1B9A',bg:'#F3E5F5',label:'On The Way',icon:'🚗'},
  professional_arrived:  {color:'#6A1B9A',bg:'#F3E5F5',label:'Arrived',icon:'🏠'},
  in_progress:           {color:'#E65100',bg:'#FFF3E0',label:'In Progress',icon:'🔧'},
  completed:             {color:'#2E7D32',bg:'#E8F5E9',label:'Completed',icon:'🎉'},
  cancelled:             {color:'#C62828',bg:'#FFEBEE',label:'Cancelled',icon:'❌'},
  rescheduled:           {color:'#1565C0',bg:'#E3F2FD',label:'Rescheduled',icon:'📅'},
};

const TABS=[
  {key:'upcoming', label:'Upcoming',statuses:['pending','confirmed','professional_assigned','professional_arriving','professional_arrived','in_progress']},
  {key:'completed',label:'Completed',statuses:['completed']},
  {key:'cancelled',label:'Cancelled',statuses:['cancelled','no_show']},
  {key:'all',      label:'All',      statuses:[]},
];

function BookingCard({booking,navigate,onCancel}){
  const [hov,setHov]=useState(false);
  const st=STATUS[booking.status]||STATUS.pending;
  const live=['professional_assigned','professional_arriving','professional_arrived','in_progress'].includes(booking.status);
  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={()=>navigate('booking-detail',{bookingId:booking._id})}
      style={{background:'#fff',borderRadius:16,border:`1px solid ${INK100}`,overflow:'hidden',cursor:'pointer',
        boxShadow:hov?'0 4px 16px rgba(0,0,0,0.09)':'0 2px 8px rgba(0,0,0,0.06)',
        transition:'all 0.2s',transform:hov?'translateY(-2px)':'none',marginBottom:14}}>
      {live&&<div style={{background:'#fff3e0',borderBottom:'1px solid #ffe0b2',padding:'8px 20px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:8,height:8,borderRadius:4,background:BRAND}}/>
        <span style={{fontSize:13,fontWeight:700,color:'#E65100'}}>LIVE — Tap to track</span>
      </div>}
      <div style={{padding:'18px 20px'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:52,height:52,background:INK50,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{booking.service?.icon||'🔧'}</div>
            <div>
              <p style={{margin:0,fontWeight:700,fontSize:15,color:INK900}}>{booking.service?.name||'Service'}</p>
              <p style={{margin:0,fontSize:12,color:INK500}}>#{booking.bookingId}</p>
            </div>
          </div>
          <span style={{padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,background:st.bg,color:st.color,whiteSpace:'nowrap'}}>{st.icon} {st.label}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 16px',fontSize:13,color:INK500,marginBottom:14}}>
          <div style={{display:'flex',gap:6}}><span>📅</span><span>{new Date(booking.scheduledDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>
          <div style={{display:'flex',gap:6}}><span>⏰</span><span>{booking.scheduledTimeSlot||'—'}</span></div>
          {booking.address?.city&&<div style={{display:'flex',gap:6,gridColumn:'1/-1'}}><span>📍</span><span>{booking.address.area?`${booking.address.area}, `:''}{booking.address.city}</span></div>}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:14,borderTop:`1px solid ${INK50}`}}>
          <div>
            <p style={{margin:0,fontSize:11,color:INK500}}>Total</p>
            <p style={{margin:0,fontWeight:800,fontSize:18,color:INK900}}>₹{booking.pricing?.totalAmount||0}</p>
          </div>
          <div style={{display:'flex',gap:8}} onClick={e=>e.stopPropagation()}>
            {live&&<button onClick={()=>navigate('tracking',{bookingId:booking._id})}
              style={{padding:'8px 14px',background:BRAND,color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer'}}>📍 Track</button>}
            {['pending','confirmed'].includes(booking.status)&&<>
              <button onClick={()=>onCancel(booking)}
                style={{padding:'8px 14px',background:'#ffebee',color:'#c62828',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            </>}
            {booking.status==='completed'&&!booking.isReviewed&&
              <button onClick={()=>navigate('review',{bookingId:booking._id})}
                style={{padding:'8px 14px',background:BRAND,color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer'}}>⭐ Rate</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage({navigate=()=>{}}){
  const {user}=useApp();
  const [activeTab,setActiveTab]=useState('upcoming');
  const [bookings,setBookings]=useState([]);
  const [loading,setLoading]=useState(true);
  const [hasMore,setHasMore]=useState(true);
  const [pg,setPg]=useState(1);

  const fetch=useCallback(async(tab=activeTab,reset=true)=>{
    try{
      setLoading(reset);
      const t=TABS.find(x=>x.key===tab);
      const params={page:reset?1:pg+1,limit:10};
      if(t?.statuses?.length)params.status=t.statuses.join(',');
      const {data}=await bookingsAPI.getAll(params);
      const list=data.bookings||[];
      setBookings(reset?list:prev=>[...prev,...list]);
      setHasMore(list.length===10);
      if(!reset)setPg(p=>p+1);
    }catch{}finally{setLoading(false);}
  },[activeTab,pg]);

  useEffect(()=>{if(user)fetch(activeTab,true);},[activeTab,user]);

  const handleCancel=(booking)=>{
    if(!window.confirm(`Cancel booking for ${booking.service?.name}?`))return;
    bookingsAPI.cancel(booking._id,'Cancelled by customer')
      .then(()=>fetch(activeTab,true)).catch(()=>alert('Could not cancel.'));
  };

  if(!user)return(
    <div style={{minHeight:'100vh',background:INK50,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:56,marginBottom:16}}>🔐</div>
        <h2 style={{margin:'0 0 8px',fontSize:22,fontWeight:700,color:INK900}}>Login Required</h2>
        <p style={{margin:'0 0 24px',color:INK500}}>Please login to view your bookings</p>
        <button onClick={()=>navigate('login')} style={{padding:'12px 28px',background:BRAND,color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,cursor:'pointer'}}>Login Now</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:INK50,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{maxWidth:780,margin:'0 auto',padding:'32px 24px 60px'}}>
        <h1 style={{margin:'0 0 24px',fontSize:28,fontWeight:800,color:INK900}}>My Bookings</h1>
        <div style={{display:'flex',gap:6,background:'#fff',padding:6,borderRadius:16,border:`1px solid ${INK100}`,marginBottom:24}}>
          {TABS.map(tab=>(
            <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{flex:1,padding:'10px 12px',borderRadius:12,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.18s',background:activeTab===tab.key?BRAND:'transparent',color:activeTab===tab.key?'#fff':INK500}}>
              {tab.label}
            </button>
          ))}
        </div>
        {loading?(
          <div style={{textAlign:'center',padding:'60px 0',color:INK500}}><div style={{fontSize:32,marginBottom:12}}>⏳</div><p>Loading…</p></div>
        ):bookings.length===0?(
          <div style={{textAlign:'center',padding:'60px 0'}}>
            <div style={{fontSize:56,marginBottom:16}}>📋</div>
            <h3 style={{margin:'0 0 8px',fontSize:18,fontWeight:700,color:INK900}}>No {activeTab} bookings</h3>
            <p style={{margin:'0 0 24px',color:INK500}}>{activeTab==='upcoming'?"You don't have any upcoming bookings.":`No ${activeTab} bookings found.`}</p>
            {activeTab==='upcoming'&&<button onClick={()=>navigate('services')} style={{padding:'12px 28px',background:BRAND,color:'#fff',border:'none',borderRadius:12,fontWeight:700,fontSize:15,cursor:'pointer'}}>Book a Service</button>}
          </div>
        ):(
          <>
            {bookings.map(b=><BookingCard key={b._id} booking={b} navigate={navigate} onCancel={handleCancel}/>)}
            {hasMore&&<button onClick={()=>fetch(activeTab,false)} style={{width:'100%',padding:14,background:'#fff',color:BRAND,border:`2px solid ${BRAND}20`,borderRadius:12,fontWeight:600,fontSize:14,cursor:'pointer',marginTop:8}}>Load More</button>}
          </>
        )}
      </div>
    </div>
  );
}
