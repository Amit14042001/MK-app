const { createClient } = require('redis');
require('dotenv').config({ path: '../.env' });

const test = async () => {
  const url = process.env.REDIS_URL;
  console.log('Testing URL:', url);
  const client = createClient({ url });
  client.on('error', (err) => console.error('Error:', err));
  await client.connect();
  console.log('Connected!');
  await client.disconnect();
};

test().catch(console.error);
