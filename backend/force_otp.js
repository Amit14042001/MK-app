const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const phone = '9000000000';
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone, name: 'Test User' });
  }
  user.otp = { code: '1234', expiresAt: new Date(Date.now() + 600000), attempts: 0 };
  await user.save();
  console.log('OTP forced to 1234 for 9000000000');
  process.exit(0);
}
run();
