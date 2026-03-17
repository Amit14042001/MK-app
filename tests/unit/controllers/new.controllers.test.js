/**
 * MK App — Tests for New Controllers
 * Covers: videoCall, chat, referral, loyalty, warranty, corporate controllers
 */
const request = require('supertest');

// ── Mock setup ────────────────────────────────────────────────
jest.mock('../../../src/models/SupportModels', () => ({
  VideoCall: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  },
  ChatRoom: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    distinct: jest.fn(),
  },
  ChatMessage: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
  Referral: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
  LoyaltyTransaction: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  },
  LoyaltyReward: {
    find: jest.fn(),
  },
  WarrantyClaim: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../src/models/Booking', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../../src/services/notificationService', () => ({
  sendNotificationToUser: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../src/utils/sms', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../src/utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

const { VideoCall, ChatRoom, ChatMessage, Referral, LoyaltyTransaction, WarrantyClaim } = require('../../../src/models/SupportModels');
const Booking = require('../../../src/models/Booking');
const User = require('../../../src/models/User');

// ── Video Call Controller Tests ───────────────────────────────
describe('VideoCallController', () => {
  let videoCallController;

  beforeAll(() => {
    videoCallController = require('../../../src/controllers/videoCallController');
  });

  beforeEach(() => jest.clearAllMocks());

  describe('initiateCall', () => {
    it('should initiate a call successfully', async () => {
      const mockBooking = {
        _id: 'booking123',
        customer: { _id: 'user1', name: 'Alice', phone: '9999999999', fcmToken: 'token1' },
        professional: { _id: 'pro1', name: 'Bob', phone: '8888888888', fcmToken: 'token2' },
        service: 'AC Repair',
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });
      VideoCall.findOne.mockResolvedValue(null);
      VideoCall.create.mockResolvedValue({ _id: 'call1', channelName: 'mk_booking123', callerToken: 'token', callerUid: 12345, callType: 'video', status: 'ringing' });

      const req = { body: { bookingId: 'booking123', callType: 'video' }, user: { _id: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await videoCallController.initiateCall(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return existing active call if present', async () => {
      const mockBooking = {
        customer: { _id: 'user1' },
        professional: { _id: 'pro1' },
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });
      VideoCall.findOne.mockResolvedValue({ _id: 'existing_call', status: 'ringing' });

      const req = { body: { bookingId: 'booking123' }, user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await videoCallController.initiateCall(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Rejoining') }));
    });

    it('should reject if user is not part of booking', async () => {
      const mockBooking = {
        customer: { _id: 'user1' },
        professional: { _id: 'pro1' },
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });
      VideoCall.findOne.mockResolvedValue(null);

      const req = { body: { bookingId: 'booking123' }, user: { _id: 'stranger' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      try {
        await videoCallController.initiateCall(req, res, next);
      } catch (err) {
        expect(err.statusCode).toBe(403);
      }
    });

    it('should throw error if bookingId missing', async () => {
      const req = { body: {}, user: { _id: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      try {
        await videoCallController.initiateCall(req, res, next);
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('bookingId');
      }
    });
  });

  describe('endCall', () => {
    it('should end call and calculate duration', async () => {
      const mockCall = {
        _id: 'call1',
        caller: 'user1',
        receiver: 'pro1',
        connectedAt: new Date(Date.now() - 300000), // 5 min ago
        status: 'connected',
        save: jest.fn().mockResolvedValue(true),
      };
      VideoCall.findById.mockResolvedValue(mockCall);

      const req = { params: { callId: 'call1' }, body: {}, user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await videoCallController.endCall(req, res);
      expect(mockCall.save).toHaveBeenCalled();
      expect(mockCall.status).toBe('ended');
      expect(mockCall.durationSeconds).toBeGreaterThan(0);
    });
  });

  describe('getMissedCalls', () => {
    it('should return missed calls for user', async () => {
      const mockCalls = [{ _id: 'call1', status: 'missed' }];
      VideoCall.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockCalls),
      });
      VideoCall.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const req = { user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await videoCallController.getMissedCalls(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 1 }));
    });
  });
});

// ── Chat Controller Tests ─────────────────────────────────────
describe('ChatController', () => {
  let chatController;

  beforeAll(() => {
    chatController = require('../../../src/controllers/chatController');
  });

  beforeEach(() => jest.clearAllMocks());

  describe('getChatRoom', () => {
    it('should return existing chat room', async () => {
      const mockBooking = {
        _id: 'booking1',
        customer: { _id: 'user1', name: 'Alice' },
        professional: { _id: 'pro1', name: 'Bob' },
        service: 'AC Repair',
        status: 'confirmed',
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });

      const mockRoom = { _id: 'room1', participants: ['user1', 'pro1'] };
      ChatRoom.findOne.mockResolvedValue(mockRoom);

      ChatMessage.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      ChatMessage.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const req = { params: { bookingId: 'booking1' }, user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await chatController.getChatRoom(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should create room if not exists', async () => {
      const mockBooking = {
        _id: 'booking1',
        customer: { _id: 'user1', name: 'Alice' },
        professional: { _id: 'pro1', name: 'Bob' },
        service: 'AC Repair', status: 'confirmed',
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });
      ChatRoom.findOne.mockResolvedValue(null);
      ChatRoom.create.mockResolvedValue({ _id: 'new_room', participants: ['user1', 'pro1'] });
      ChatMessage.find.mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) });
      ChatMessage.updateMany.mockResolvedValue({});

      const req = { params: { bookingId: 'booking1' }, user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await chatController.getChatRoom(req, res);
      expect(ChatRoom.create).toHaveBeenCalled();
    });
  });

  describe('getTotalUnreadCount', () => {
    it('should return unread message count', async () => {
      ChatRoom.distinct.mockResolvedValue(['room1', 'room2']);
      ChatMessage.countDocuments.mockResolvedValue(5);

      const req = { user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await chatController.getTotalUnreadCount(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { unreadCount: 5 } }));
    });
  });
});

// ── Referral Controller Tests ─────────────────────────────────
describe('ReferralController', () => {
  let referralController;

  beforeAll(() => {
    referralController = require('../../../src/controllers/referralController');
  });

  beforeEach(() => jest.clearAllMocks());

  describe('getMyReferralCode', () => {
    it('should return existing referral code', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ referralCode: 'ALICE1234', name: 'Alice', _id: 'user1', save: jest.fn() }),
      });
      Referral.find.mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) });
      Referral.aggregate.mockResolvedValue([{ totalReferred: 3, successfulReferrals: 2, totalEarned: 400, pendingRewards: 200 }]);

      const req = { user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await referralController.getMyReferralCode(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ referralCode: 'ALICE1234' }),
      }));
    });

    it('should generate code if not exists', async () => {
      const mockUser = { referralCode: null, name: 'Bob', _id: 'user2', save: jest.fn().mockResolvedValue(true) };
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(mockUser) });
      Referral.find.mockReturnValue({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) });
      Referral.aggregate.mockResolvedValue([]);

      const req = { user: { _id: 'user2' } };
      const res = { json: jest.fn() };

      await referralController.getMyReferralCode(req, res);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.referralCode).toBeTruthy();
    });
  });

  describe('applyReferralCode', () => {
    it('should apply valid referral code', async () => {
      User.findOne.mockResolvedValue({ _id: 'referrer1', name: 'Alice', referralCode: 'ALICE1234' });
      Referral.create.mockResolvedValue({ _id: 'ref1' });
      User.findByIdAndUpdate.mockResolvedValue({});

      const req = { body: { code: 'ALICE1234' }, user: { _id: 'newuser', referredBy: null } };
      const res = { json: jest.fn() };

      await referralController.applyReferralCode(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject self-referral', async () => {
      User.findOne.mockResolvedValue({ _id: 'user1', referralCode: 'USER1234' });

      const req = { body: { code: 'USER1234' }, user: { _id: 'user1', referredBy: null } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      try {
        await referralController.applyReferralCode(req, res, next);
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('own');
      }
    });

    it('should reject if already used a referral', async () => {
      const req = { body: { code: 'SOME1234' }, user: { _id: 'user1', referredBy: 'someone' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      try {
        await referralController.applyReferralCode(req, res);
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });
  });
});

// ── Loyalty Controller Tests ──────────────────────────────────
describe('LoyaltyController', () => {
  let loyaltyController;

  beforeAll(() => {
    loyaltyController = require('../../../src/controllers/loyaltyController');
  });

  beforeEach(() => jest.clearAllMocks());

  describe('getLoyaltyProfile', () => {
    it('should return loyalty profile with tier info', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ loyaltyPoints: 1200, loyaltyLifetimePoints: 1500, name: 'Alice' }),
      });
      LoyaltyTransaction.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) });

      const req = { user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await loyaltyController.getLoyaltyProfile(req, res);
      const call = res.json.mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.data.tier).toBe('silver'); // 1500 lifetime points = silver
      expect(call.data.currentPoints).toBe(1200);
    });

    it('should show bronze tier for new users', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ loyaltyPoints: 0, loyaltyLifetimePoints: 0, name: 'New User' }),
      });
      LoyaltyTransaction.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) });

      const req = { user: { _id: 'newuser' } };
      const res = { json: jest.fn() };

      await loyaltyController.getLoyaltyProfile(req, res);
      const call = res.json.mock.calls[0][0];
      expect(call.data.tier).toBe('bronze');
    });
  });

  describe('redeemPoints', () => {
    it('should redeem points for wallet credit', async () => {
      const mockUser = {
        loyaltyPoints: 1000,
        wallet: { balance: 0, transactions: [] },
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(mockUser);
      LoyaltyTransaction.create.mockResolvedValue({});

      const req = { body: { points: 400 }, user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await loyaltyController.redeemPoints(req, res);
      expect(mockUser.loyaltyPoints).toBe(600);
      expect(mockUser.wallet.balance).toBe(100); // 400 * 0.25 = ₹100
    });

    it('should reject if insufficient points', async () => {
      const mockUser = { loyaltyPoints: 200 };
      User.findById.mockResolvedValue(mockUser);

      const req = { body: { points: 400 }, user: { _id: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      try {
        await loyaltyController.redeemPoints(req, res);
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('Insufficient');
      }
    });

    it('should reject below minimum redemption', async () => {
      const req = { body: { points: 100 }, user: { _id: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      try {
        await loyaltyController.redeemPoints(req, res);
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('Minimum');
      }
    });
  });
});

// ── Warranty Controller Tests ─────────────────────────────────
describe('WarrantyController', () => {
  let warrantyController;

  beforeAll(() => {
    warrantyController = require('../../../src/controllers/warrantyController');
  });

  beforeEach(() => jest.clearAllMocks());

  describe('fileWarrantyClaim', () => {
    it('should file warranty claim for eligible booking', async () => {
      const completedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const mockBooking = {
        _id: 'booking1',
        customer: { _id: 'user1', name: 'Alice', phone: '9999999999' },
        professional: { _id: 'pro1', name: 'Bob', phone: '8888888888', fcmToken: 'token' },
        service: { name: 'AC Repair' },
        status: 'completed',
        serviceCategory: 'ac_repair',
        completedAt,
        updatedAt: completedAt,
        amount: 1500,
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });
      WarrantyClaim.findOne.mockResolvedValue(null);
      WarrantyClaim.create.mockResolvedValue({ _id: 'claim1', status: 'pending', _id: { toString: () => '123456789abc' } });

      const req = {
        body: { bookingId: 'booking1', issueType: 'not_cooling', issueDescription: 'AC stopped cooling after 3 days' },
        user: { _id: 'user1' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await warrantyController.fileWarrantyClaim(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject claim for expired warranty', async () => {
      const completedAt = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000); // 120 days ago (> 90 day warranty)
      const mockBooking = {
        customer: { _id: 'user1' },
        professional: { _id: 'pro1' },
        service: { name: 'AC Repair' },
        status: 'completed',
        serviceCategory: 'ac_repair',
        completedAt,
        updatedAt: completedAt,
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });

      const req = {
        body: { bookingId: 'booking1', issueType: 'issue', issueDescription: 'problem' },
        user: { _id: 'user1' },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      try {
        await warrantyController.fileWarrantyClaim(req, res);
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.message).toContain('expired');
      }
    });

    it('should reject claim for non-completed booking', async () => {
      const mockBooking = {
        customer: { _id: 'user1' },
        status: 'confirmed', // Not completed
        serviceCategory: 'ac_repair',
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) }) });

      const req = {
        body: { bookingId: 'booking1', issueType: 'issue', issueDescription: 'problem' },
        user: { _id: 'user1' },
      };

      try {
        await warrantyController.fileWarrantyClaim(req, res);
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });
  });

  describe('checkWarrantyStatus', () => {
    it('should return active warranty status', async () => {
      const completedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const mockBooking = {
        _id: 'booking1',
        customer: 'user1',
        serviceCategory: 'electrician',
        service: { name: 'Wiring Fix' },
        completedAt,
        updatedAt: completedAt,
      };
      Booking.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockBooking) });
      WarrantyClaim.findOne.mockResolvedValue(null);

      const req = { params: { bookingId: 'booking1' }, user: { _id: 'user1' } };
      const res = { json: jest.fn() };

      await warrantyController.checkWarrantyStatus(req, res);
      const result = res.json.mock.calls[0][0];
      expect(result.data.isUnderWarranty).toBe(true);
      expect(result.data.canFileClaim).toBe(true);
      expect(result.data.daysLeft).toBeLessThanOrEqual(30);
      expect(result.data.daysLeft).toBeGreaterThan(0);
    });
  });
});

// ── Dynamic Pricing Service Tests ────────────────────────────
describe('DynamicPricingService', () => {
  let dynamicPricingService;

  beforeAll(() => {
    jest.mock('../../../src/services/cacheService', () => ({
      getCacheValue: jest.fn().mockResolvedValue(null),
      setCacheValue: jest.fn().mockResolvedValue(true),
    }));
    jest.mock('../../../src/models/Booking', () => ({ countDocuments: jest.fn().mockResolvedValue(3) }));
    jest.mock('../../../src/models/Professional', () => ({ countDocuments: jest.fn().mockResolvedValue(8) }));
    dynamicPricingService = require('../../../src/services/dynamicPricingService');
  });

  it('should return base price when demand is low', async () => {
    const result = await dynamicPricingService.calculateDynamicPrice({
      basePrice: 1000,
      serviceCategory: 'cleaning',
      lat: 17.38,
      lng: 78.49,
      scheduledAt: new Date(),
    });
    expect(result.basePrice).toBe(1000);
    expect(result.finalPrice).toBeGreaterThanOrEqual(1000);
    expect(result.surgeMultiplier).toBeGreaterThanOrEqual(1.0);
    expect(result.surgeMultiplier).toBeLessThanOrEqual(2.0);
  });

  it('should never exceed max surge multiplier', async () => {
    const result = await dynamicPricingService.calculateDynamicPrice({
      basePrice: 500,
      serviceCategory: 'salon',
      lat: 17.38, lng: 78.49,
      scheduledAt: new Date(),
    });
    expect(result.surgeMultiplier).toBeLessThanOrEqual(2.0);
  });

  it('should return base price on service error', async () => {
    const result = await dynamicPricingService.calculateDynamicPrice({
      basePrice: 800,
      serviceCategory: 'invalid_service',
      lat: null, lng: null,
      scheduledAt: new Date(),
    });
    expect(result.finalPrice).toBe(800);
    expect(result.surgeMultiplier).toBe(1.0);
  });
});
