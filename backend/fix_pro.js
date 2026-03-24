const mongoose = require('mongoose');
const User = require('./src/models/User');
const Professional = require('./src/models/Professional');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to:', process.env.MONGODB_URI);
  
  let user = await User.findOne({ phone: '9876543211' });
  if (!user) {
    user = await User.create({
      name: 'Pro User',
      phone: '9876543211',
      role: 'professional',
      isPhoneVerified: true
    });
    console.log('Created new professional user');
  } else {
    user.role = 'professional';
    await user.save();
    console.log('Updated existing user role to professional');
  }

  let pro = await Professional.findOne({ user: user._id });
  if (!pro) {
    pro = await Professional.create({
      user: user._id,
      experience: 5,
      isVerified: true,
      verificationStatus: 'approved',
      isOnline: true,
      isAvailable: true,
      wallet: { balance: 500, transactions: [] },
      totalEarnings: 500,
      completedBookings: 1,
      commissionRate: 20,
      skills: []
    });
    console.log('Created professional profile');
  } else {
    pro.isVerified = true;
    pro.verificationStatus = 'approved';
    pro.isOnline = true;
    await pro.save();
    console.log('Updated professional profile');
  }

  // Set OTP to 1234
  user.otp = {
    code: '1234',
    expiresAt: new Date(Date.now() + 3600000),
    attempts: 0
  };
  await user.save();
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
