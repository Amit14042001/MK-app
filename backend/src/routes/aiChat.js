/**
 * Slot App — AI Chatbot Booking Assistant
 * LLM-powered: "Book AC service Sunday 10am" → auto-creates booking
 * Uses Anthropic Claude API via backend proxy (keeps API key server-side)
 * UC does NOT have this — competitive advantage
 */
const express  = require('express');
const router   = express.Router();
const Booking  = require('../models/Booking');
const Service  = require('../models/Service');
const Category = require('../models/Category');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── System prompt for the booking assistant ───────────────────
const SYSTEM_PROMPT = `You are Slot Assistant, an AI booking helper for Slot App (a home services platform like Urban Company in India).

Your job: Help customers book home services through natural conversation.

Available service categories: Cleaning, Salon at Home, AC & Appliances, Electrical, Plumbing, Carpentry, Painting, Pest Control, Massage & Spa, Yoga & Fitness, Physiotherapy, Automotive (battery, oil change, jump start).

When a user wants to book:
1. Extract: service type, date, time, any special requirements
2. If info is incomplete, ask for ONE missing piece at a time
3. Once you have service + date + time, respond with a JSON action block

Always respond in this format when you have enough info to book:
<action>
{
  "type": "create_booking",
  "service": "exact service name from categories",
  "category": "category slug",
  "date": "YYYY-MM-DD",
  "timeSlot": "HH:MM AM/PM – HH:MM AM/PM",
  "specialInstructions": "any notes from user"
}
</action>

For queries about existing bookings, pricing, or support:
<action>
{"type": "query", "intent": "check_bookings|get_price|get_support", "params": {}}
</action>

Rules:
- Be friendly, concise, use emoji sparingly
- Always confirm the booking details before creating
- Price range: cleaning ₹299–999, salon ₹399–2999, AC service ₹499–1499, plumbing ₹299–999
- Time slots: 8AM–10AM, 10AM–12PM, 12PM–2PM, 2PM–4PM, 4PM–6PM, 6PM–8PM
- If user says "today" or "tomorrow", use actual date
- Respond in English. If user writes in Hindi/Telugu, respond in the same language`;

// ── POST /ai-chat/message ─────────────────────────────────────
router.post('/message', protect, asyncHandler(async (req, res) => {
  const { message, conversationHistory = [] } = req.body;
  if (!message?.trim()) throw new AppError('Message is required', 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: rule-based response when no API key
    return res.json({ success: true, reply: fallbackResponse(message), action: null });
  }

  // Build messages array with history
  const messages = [
    ...conversationHistory.slice(-10), // keep last 10 turns for context
    { role: 'user', content: message },
  ];

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            apiKey,
      'anthropic-version':    '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 500,
      system:     SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[AI Chat] Claude API error:', err);
    return res.json({ success: true, reply: fallbackResponse(message), action: null });
  }

  const data  = await response.json();
  const reply = data.content?.[0]?.text || 'Sorry, I had trouble understanding. Please try again.';

  // Parse action from reply
  let action = null;
  const actionMatch = reply.match(/<action>\s*([\s\S]*?)\s*<\/action>/);
  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
    } catch { action = null; }
  }

  // Strip action block from visible reply
  const cleanReply = reply.replace(/<action>[\s\S]*?<\/action>/g, '').trim();

  // If action is create_booking, execute it
  let bookingResult = null;
  if (action?.type === 'create_booking') {
    bookingResult = await executeBooking(action, req.user._id);
  }

  res.json({
    success: true,
    reply:   cleanReply,
    action,
    booking: bookingResult,
    assistantMessage: { role: 'assistant', content: reply }, // for client to add to history
  });
}));

// ── Execute booking from AI action ───────────────────────────
async function executeBooking(action, userId) {
  try {
    // Find matching service
    const service = await Service.findOne({
      isActive: true,
      $or: [
        { name:  { $regex: action.service,  $options: 'i' } },
        { slug:  { $regex: action.category, $options: 'i' } },
        { tags:  { $elemMatch: { $regex: action.service, $options: 'i' } } },
      ],
    }).lean();

    if (!service) return { error: `Service "${action.service}" not found` };

    const user = await User.findById(userId).lean();
    const defaultAddr = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0];
    if (!defaultAddr) return { error: 'No saved address. Please add an address in your profile first.' };

    const booking = await Booking.create({
      customer:         userId,
      service:          service._id,
      scheduledDate:    new Date(action.date),
      scheduledTime:    action.timeSlot,
      address:          defaultAddr,
      specialInstructions: action.specialInstructions || 'Booked via AI Assistant',
      status:           'pending',
      source:           'ai_chat',
      payment:          { method: 'online', status: 'pending' },
      pricing: {
        basePrice:      service.startingPrice,
        convenienceFee: service.startingPrice >= 500 ? 0 : 29,
        taxes:          Math.round(service.startingPrice * 0.18),
        totalAmount:    service.startingPrice + Math.round(service.startingPrice * 0.18) + (service.startingPrice >= 500 ? 0 : 29),
      },
    });

    await Service.findByIdAndUpdate(service._id, { $inc: { totalBookings: 1 } });

    return {
      bookingId:   booking.bookingId,
      service:     service.name,
      date:        action.date,
      timeSlot:    action.timeSlot,
      totalAmount: booking.pricing.totalAmount,
    };
  } catch (e) {
    console.error('[AI Chat] Booking error:', e.message);
    return { error: 'Booking creation failed. Please try again.' };
  }
}

// ── Fallback rule-based response (when no API key) ───────────
function fallbackResponse(message) {
  const t = message.toLowerCase();
  if (t.includes('book') || t.includes('service'))
    return "I'd love to help you book a service! Please tell me:\n1. What service do you need? (cleaning, AC, salon, etc.)\n2. When would you like it? (date + time)\n3. Any special requirements?";
  if (t.includes('price') || t.includes('cost') || t.includes('how much'))
    return "Here are our starting prices:\n• Cleaning: ₹299+\n• Salon at Home: ₹399+\n• AC Service: ₹499+\n• Plumbing: ₹299+\n\nFinal price depends on your requirements. Want to book now?";
  if (t.includes('cancel') || t.includes('reschedule'))
    return "To cancel or reschedule, go to My Bookings → tap on your booking → select Cancel/Reschedule. Or I can help you do it here — just share your booking ID.";
  if (t.includes('hi') || t.includes('hello') || t.includes('hey'))
    return "Hi! 👋 I'm your Slot Assistant. I can help you:\n• Book a home service\n• Check your bookings\n• Get price estimates\n\nWhat would you like to do?";
  return "I can help you book home services, check prices, or manage your bookings. What do you need today?";
}

// ── GET /ai-chat/suggestions ─────────────────────────────────
router.get('/suggestions', protect, asyncHandler(async (req, res) => {
  const suggestions = [
    'Book AC service this Sunday',
    'I need deep cleaning for 2BHK',
    'Plumber needed tomorrow morning',
    'Salon appointment for Saturday',
    'How much does electrical work cost?',
    'Show my recent bookings',
  ];
  res.json({ success: true, data: suggestions });
}));

// ── POST /ai-chat/diagnose ── AI problem diagnosis ─────────────
router.post('/diagnose', protect, asyncHandler(async (req, res) => {
  const { problem } = req.body;
  if (!problem || problem.trim().length < 5)
    throw new AppError('Problem description required (min 5 chars)', 400);

  const systemPrompt = `You are an expert home services diagnostic AI for Slot App, an Indian home services platform.
A customer has described a home problem. Your job is to:
1. Identify the exact service needed
2. Estimate the price range in Indian Rupees
3. Assess urgency (high/medium/low)
4. Provide a clear diagnosis
5. List what the professional will check (checklist, 3-5 items)
6. Give 2-3 quick tips the customer can do before the pro arrives

Respond ONLY with valid JSON in this exact format:
{
  "service": "Service name",
  "icon": "single emoji",
  "category": "service-slug",
  "minPrice": 499,
  "maxPrice": 1499,
  "urgency": "high|medium|low",
  "diagnosis": "Clear 1-2 sentence diagnosis",
  "checklist": ["Item 1", "Item 2", "Item 3"],
  "tips": ["Tip 1", "Tip 2"]
}

Valid category slugs: ac-appliances, plumbing, electrical, cleaning, pest-control, painting, beauty, carpentry, massage, salon
Price ranges in INR for Indian market.`;

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model:      'claude-opus-4-20250514',
      max_tokens: 600,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: `Problem: ${problem}` }],
    });
    const raw = msg.content?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const diagnosis = JSON.parse(cleaned);
    res.json({ success: true, diagnosis });
  } catch (e) {
    // Fallback: keyword-based local diagnosis
    const p = problem.toLowerCase();
    let diagnosis;
    if (p.match(/ac|air.?cond|cool|refriger/))
      diagnosis = { service: 'AC Service & Repair', icon: '❄️', category: 'ac-appliances', minPrice: 499, maxPrice: 1499, urgency: 'high', diagnosis: 'Your AC requires professional servicing. Common causes: low gas, dirty filters, or compressor issues.', checklist: ['Gas level check', 'Filter cleaning', 'Coil cleaning', 'Compressor test'], tips: ['Turn off AC to prevent compressor damage', 'Check circuit breaker hasn\'t tripped'] };
    else if (p.match(/leak|drip|pipe|tap|water|drain|block/))
      diagnosis = { service: 'Plumbing Service', icon: '🔧', category: 'plumbing', minPrice: 299, maxPrice: 899, urgency: 'high', diagnosis: 'A plumbing issue has been detected. Prompt attention prevents water damage.', checklist: ['Leak source detection', 'Joint inspection', 'Drain clearing', 'Pressure test'], tips: ['Turn off main water valve if leaking badly', 'Avoid using affected fixture'] };
    else if (p.match(/light|electric|switch|power|wire|fuse|mcb/))
      diagnosis = { service: 'Electrical Service', icon: '⚡', category: 'electrical', minPrice: 399, maxPrice: 999, urgency: 'medium', diagnosis: 'Electrical issue detected. Could be loose connections, faulty switch, or tripped MCB.', checklist: ['MCB/fuse inspection', 'Switch replacement', 'Socket testing', 'Wiring check'], tips: ['Check MCB box for tripped switches', 'Do not attempt DIY electrical repairs'] };
    else if (p.match(/pest|cockroach|rat|ant|insect|termite/))
      diagnosis = { service: 'Pest Control', icon: '🪲', category: 'pest-control', minPrice: 799, maxPrice: 1999, urgency: 'medium', diagnosis: 'Pest infestation detected. Professional treatment needed to prevent spread.', checklist: ['Infestation survey', 'Species identification', 'Targeted treatment', 'Entry-point sealing'], tips: ['Seal food in airtight containers', 'Remove standing water sources'] };
    else if (p.match(/clean|dirt|dust|hygiene|deep/))
      diagnosis = { service: 'Deep Cleaning', icon: '🧹', category: 'cleaning', minPrice: 999, maxPrice: 2999, urgency: 'low', diagnosis: 'Professional deep cleaning recommended for a thorough sanitisation.', checklist: ['Kitchen cleaning', 'Bathroom scrub', 'Floor mopping', 'Dusting & vacuuming'], tips: ['Clear large items from floors', 'Inform team of sensitive surfaces'] };
    else
      return res.status(422).json({ success: false, message: 'Could not diagnose from description. Please describe the problem in more detail.' });

    res.json({ success: true, diagnosis });
  }
}));

// ── POST /ai-chat/photo-quote ── Vision AI price quote ─────────
router.post('/photo-quote', protect, asyncHandler(async (req, res) => {
  const { imageBase64, imageType = 'image/jpeg' } = req.body;
  if (!imageBase64) throw new AppError('Image required', 400);

  const systemPrompt = `You are an expert home services estimator AI for Slot App, an Indian home services platform.
A customer has sent you a photo of their home problem. Analyze the image carefully and:
1. Identify what service is needed
2. Estimate what you can see (damaged area size, severity level, extent of problem)
3. Provide a price range in Indian Rupees
4. Rate your confidence: high/medium/low
5. List what you detected in the image (3-5 specific observations)
6. List what's included in the service (3-4 items)

Respond ONLY with valid JSON:
{
  "service": "Service name",
  "icon": "single emoji",
  "category": "service-slug",
  "minPrice": 499,
  "maxPrice": 1499,
  "confidence": "high|medium|low",
  "analysis": "2-3 sentence analysis of what you see and why",
  "detected": ["observation 1", "observation 2", "observation 3"],
  "includes": ["included item 1", "included item 2", "included item 3"]
}

Valid categories: ac-appliances, plumbing, electrical, cleaning, pest-control, painting, carpentry, massage, salon
Be realistic with Indian pricing. Paint job per room: ₹3,000–8,000. Deep cleaning 2BHK: ₹1,200–2,500. AC service: ₹499–1,500.`;

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model:      'claude-opus-4-20250514',
      max_tokens: 700,
      system:     systemPrompt,
      messages:   [{
        role:    'user',
        content: [{
          type:   'image',
          source: { type: 'base64', media_type: imageType, data: imageBase64 },
        }, {
          type: 'text',
          text: 'Please analyze this home problem photo and give me a price quote.',
        }],
      }],
    });
    const raw     = msg.content?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const quote   = JSON.parse(cleaned);
    res.json({ success: true, quote });
  } catch (e) {
    res.status(422).json({ success: false, message: 'Could not analyze photo. Please ensure the image shows the problem clearly.' });
  }
}));

module.exports = router;
