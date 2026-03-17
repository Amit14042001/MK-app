/**
 * MK App — Global Test Teardown
 */
const mongoose = require('mongoose');

module.exports = async () => {
  // Close all mongoose connections
  await mongoose.disconnect().catch(() => {});
  console.log('\n✅ MK App Test Suite Complete\n');
};
