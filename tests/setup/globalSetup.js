/**
 * MK App — Global Test Setup
 * Runs once before all test suites
 */
const mongoose = require('mongoose');

module.exports = async () => {
  // Set test environment
  process.env.NODE_ENV       = 'test';
  process.env.USE_MOCK_OTP   = 'true';
  process.env.JWT_SECRET     = 'test_secret_mk_2025_jest';
  process.env.RAZORPAY_KEY_ID = '';  // disable real Razorpay
  process.env.TWILIO_ACCOUNT_SID = ''; // disable real SMS

  console.log('\n🧪 MK App Test Suite Starting...');
  console.log(`   Node: ${process.version}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
};
