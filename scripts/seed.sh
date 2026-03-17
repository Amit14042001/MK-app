#!/bin/bash
# MK App — Database Seeder Script
set -e

echo "🌱 MK App Database Seeder"
echo "========================="

# Load env
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

ENV=${1:-development}
echo "Environment: $ENV"

if [ "$ENV" = "production" ]; then
  read -p "⚠️  Seed PRODUCTION database? Type 'yes' to confirm: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

cd backend
echo "Running seeder..."
NODE_ENV=$ENV node -e "
const { connectDB } = require('./src/config/database');
const { seedDatabase } = require('./src/utils/seeder');
connectDB().then(() => seedDatabase()).then(() => {
  console.log('✅ Seeding complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
"
