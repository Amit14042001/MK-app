/**
 * Slot App — MongoDB Connection + Health Check
 */
const mongoose = require('mongoose');

let retries = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/slot-app';
  const options = {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
    autoIndex:          process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS:          45000,
    maxPoolSize:              10,
    minPoolSize:              2,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    retries = 0;
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);

    // Seed essential data in development
    if (process.env.NODE_ENV === 'development' && process.env.AUTO_SEED === 'true') {
      const { seedDatabase } = require('../utils/seeder');
      await seedDatabase();
    }

    return conn;
  } catch (error) {
    retries++;
    console.error(`❌ MongoDB Error (attempt ${retries}/${MAX_RETRIES}): ${error.message}`);
    if (retries < MAX_RETRIES) {
      const delay = Math.min(retries * 2000, 10000);
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
      return connectDB();
    }
    console.error('❌ MongoDB: Max retries reached. Exiting.');
    process.exit(1);
  }
};

// Event listeners
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Reconnecting...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));
mongoose.connection.on('error',       (err) => console.error('[MongoDB]', err.message));

// Graceful shutdown
process.on('SIGINT',  async () => { await mongoose.connection.close(); console.log('MongoDB closed (SIGINT)');  process.exit(0); });
process.on('SIGTERM', async () => { await mongoose.connection.close(); console.log('MongoDB closed (SIGTERM)'); process.exit(0); });

// Health check helper
const dbHealthCheck = () => ({
  status:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  readyState: mongoose.connection.readyState,
  host:     mongoose.connection.host,
  dbName:   mongoose.connection.name,
});

module.exports = { connectDB, dbHealthCheck };
