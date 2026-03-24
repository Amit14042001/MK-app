const { initFirebaseAdmin, sendTopicNotification } = require('./src/config/firebase');
require('dotenv').config();

const testNotification = async () => {
  initFirebaseAdmin();
  try {
    const response = await sendTopicNotification({
      topic: 'all_users',
      title: 'Slot - Test Notification',
      body: 'Hello! This is a test push notification from your Slot App backend. 🏠✨',
      data: {
        type: 'test',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    });
    console.log('✅ Test notification sent successfully to topic: all_users');
    console.log('FCM Response:', response);
  } catch (err) {
    console.error('❌ Error sending test notification:', err.message);
  }
  process.exit(0);
};

testNotification();
