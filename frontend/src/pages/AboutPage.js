/**
 * MK Web — About / Landing Page Sections (Full)
 * About, Why MK, Cities, Press, Careers
 */
import React, { useState } from 'react';

const STATS = [
  { value: '50L+', label: 'Services Delivered', icon: '✅' },
  { value: '4.8★', label: 'Average Rating', icon: '⭐' },
  { value: '1500+', label: 'Verified Professionals', icon: '👷' },
  { value: '12+', label: 'Cities', icon: '🏙️' },
  { value: '99%', label: 'Satisfaction Rate', icon: '😊' },
  { value: '24/7', label: 'Customer Support', icon: '📞' },
];

const VALUES = [
  { icon: '🔒', title: 'Verified & Trusted', desc: 'Every professional undergoes a thorough background check, skill test, and police verification before joining the MK network.' },
  { icon: '💯', title: 'Quality Guaranteed', desc: 'Not happy? We redo the service for free or give you a full refund. Our 30-day re-service warranty covers all bookings.' },
  { icon: '💰', title: 'Fair & Transparent Pricing', desc: 'What you see is what you pay. No hidden charges, no surprise fees. Price locked at the time of booking.' },
  { icon: '⚡', title: 'On-Time Guarantee', desc: 'Professionals arrive within the scheduled window. If they\'re late, you get a discount automatically.' },
  { icon: '🌿', title: 'Eco-Friendly Products', desc: 'We only use WHO-approved, child-safe, and eco-friendly cleaning and treatment products.' },
  { icon: '📱', title: 'Real-Time Tracking', desc: 'Track your professional in real-time from the moment they leave until they arrive at your doorstep.' },
];

const CITIES = [
  { name: 'Hyderabad', icon: '🏙️', services: 45, pros: 320 },
  { name: 'Bangalore', icon: '🌿', services: 48, pros: 380 },
  { name: 'Mumbai', icon: '🌊', services: 50, pros: 450 },
  { name: 'Delhi NCR', icon: '🏛️', services: 52, pros: 510 },
  { name: 'Chennai', icon: '🎭', services: 40, pros: 280 },
  { name: 'Pune', icon: '🏫', services: 38, pros: 240 },
  { name: 'Kolkata', icon: '🌺', services: 35, pros: 200 },
  { name: 'Ahmedabad', icon: '🏗️', services: 30, pros: 160 },
  { name: 'Jaipur', icon: '🏰', services: 25, pros: 130 },
  { name: 'Kochi', icon: '🌴', services: 22, pros: 100 },
  { name: 'Chandigarh', icon: '🌻', services: 20, pros: 90 },
  { name: 'Surat', icon: '💎', services: 18, pros: 80 },
];

const TEAM = [
  { name: 'Manoj Kumar', role: 'Founder & CEO', bio: 'Ex-Swiggy, IIT Bombay. Built MK after years of struggling to find reliable home services.', icon: '👨‍💼' },
  { name: 'Priya Sharma', role: 'CTO', bio: 'Ex-Google, BITS Pilani. Leads technology and product development.', icon: '👩‍💻' },
  { name: 'Arun Reddy', role: 'COO', bio: 'Ex-Urban Company, IIM Ahmedabad. Oversees operations in all cities.', icon: '👨‍💼' },
  { name: 'Sunita Patel', role: 'Head of Professionals', bio: 'Trains and manages our network of 1500+ verified professionals.', icon: '👩‍🔧' },
];

const FAQS = [
  { q: 'How does MK verify its professionals?', a: 'Every professional undergoes Aadhaar verification, police verification, skill testing, and background checks before being onboarded. We also do periodic re-verification.' },
  { q: 'Are your products safe for children and pets?', a: 'Yes. All our cleaning and treatment products are WHO-approved, child-safe, and eco-friendly. We never use harsh chemicals.' },
  { q: 'What is your cancellation policy?', a: 'Cancel more than 4 hours before → Full refund. Cancel 1-4 hours before → 50% refund. Cancel within 1 hour → No refund.' },
  { q: 'How do I become a professional on MK?', a: 'Apply on our Pro App or website. Submit documents, pass skill test, and complete training. Approval in 2-3 days.' },
  { q: 'Do you operate on Sundays and holidays?', a: 'Yes! We operate 365 days a year, including Sundays and public holidays. Some services have limited slots on holidays.' },
];

export default function AboutPage() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-orange-500/20 border border-orange-500/30 px-4 py-2 rounded-full text-sm font-semibold text-orange-300 mb-6">
            🏠 India's Most Trusted Home Services
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            We bring the best<br/>professionals to <span className="text-orange-400">your home</span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            MK Services connects you with verified, skilled professionals for all your home service needs — from plumbing to salon, AC repair to deep cleaning.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <span data-href="/" className="px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-colors text-lg">
              Book a Service
            </span>
            <a href="#cities" className="px-8 py-4 bg-white/10 border border-white/30 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-lg">
              Check Your City
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Our Story */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Our Story</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Born from frustration. Built with passion. Trusted by millions.
            </p>
          </div>
          <div className="prose prose-lg max-w-none text-gray-600 space-y-4">
            <p>MK Services was founded in 2022 by Manoj Kumar after a frustrating experience trying to find a reliable plumber for a burst pipe at midnight. The search took 6 hours, and the "professional" who arrived had no tools and no skills.</p>
            <p>That day, Manoj decided to build the platform he wished had existed — one where every professional is verified, every job has a warranty, and every customer is treated with respect.</p>
            <p>Today, MK operates in 12 cities with over 1,500 verified professionals and has delivered 50 lakh+ services with a 4.8-star average rating. We're just getting started.</p>
          </div>
        </div>
      </div>

      {/* Why MK */}
      <div className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Why Choose MK?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Our Leadership Team</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map(member => (
              <div key={member.name} className="text-center">
                <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
                  {member.icon}
                </div>
                <h3 className="font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm text-orange-500 font-semibold mb-2">{member.role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cities */}
      <div id="cities" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Available in 12+ Cities</h2>
            <p className="text-xl text-gray-500">Expanding to new cities every month</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CITIES.map(city => (
              <Link to={`/?city=${city.name}`} key={city.name}
                className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all">
                <div className="text-3xl mb-2">{city.icon}</div>
                <p className="font-bold text-gray-900">{city.name}</p>
                <p className="text-xs text-gray-400 mt-1">{city.services}+ services</p>
                <p className="text-xs text-gray-400">{city.pros}+ professionals</p>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <span className="text-gray-400 ml-4 flex-shrink-0">{expandedFaq === i ? '▲' : '▼'}</span>
                </button>
                {expandedFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-gray-900 to-orange-900 text-white py-20 px-6 text-center">
        <h2 className="text-4xl font-black mb-4">Ready to experience the MK difference?</h2>
        <p className="text-white/70 text-xl mb-8 max-w-2xl mx-auto">Join 2 million+ happy customers across India</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <span data-href="/" className="px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-colors text-lg">
            Book Your First Service
          </span>
          <a href="/pro-app" className="px-8 py-4 bg-white/10 border border-white/30 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors text-lg">
            Join as Professional
          </a>
        </div>
      </div>
    </div>
  );
}
