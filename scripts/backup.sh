#!/bin/bash
# MK App — MongoDB Backup Script
set -e

echo "💾 MK App Database Backup"
echo "========================="

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_NAME="${MONGO_DB:-mk-app}"
BACKUP_PATH="$BACKUP_DIR/mk-app_$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "Backing up $DB_NAME → $BACKUP_PATH"

if [ -n "$MONGO_URI" ]; then
  mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH"
else
  mongodump --db="$DB_NAME" --out="$BACKUP_PATH"
fi

# Compress
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "mk-app_$TIMESTAMP"
rm -rf "$BACKUP_PATH"

echo "✅ Backup saved: $BACKUP_PATH.tar.gz"
echo "Size: $(du -h $BACKUP_PATH.tar.gz | cut -f1)"

# Upload to S3 if configured
if [ -n "$AWS_S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_PATH.tar.gz" "s3://$AWS_S3_BUCKET/backups/mk-app_$TIMESTAMP.tar.gz"
  echo "✅ Uploaded to S3: s3://$AWS_S3_BUCKET/backups/mk-app_$TIMESTAMP.tar.gz"
fi

# Keep only last 7 local backups
ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm
echo "🧹 Old backups cleaned (kept last 7)"
