#!/bin/bash
# ============================================================
# MK App — Production Deployment Script
# Usage: ./scripts/deploy.sh [--env production] [--pull]
# ============================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()     { echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"; }
error()   { echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"; exit 1; }
section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
info()    { echo -e "${CYAN}[$(date +'%H:%M:%S')] ℹ️  $1${NC}"; }

# ── Defaults ─────────────────────────────────────────────────
ENV="production"
PULL=false
SEED=false
BACKUP=true

# ── Parse args ───────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)      ENV="$2";   shift 2 ;;
    --pull)     PULL=true;  shift ;;
    --seed)     SEED=true;  shift ;;
    --no-backup) BACKUP=false; shift ;;
    *) error "Unknown arg: $1" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

section "MK App Deployment [$ENV]"

# ── Prereq checks ────────────────────────────────────────────
section "Prerequisites"
command -v docker        >/dev/null || error "Docker not installed"
command -v docker-compose >/dev/null || error "docker-compose not installed"

[[ -f ".env" ]] || error ".env file missing! Copy .env.example to .env and fill in values."

source .env
[[ -n "${JWT_SECRET:-}" ]] || warn "JWT_SECRET not set — using default (INSECURE for production!)"
[[ -n "${RAZORPAY_KEY_ID:-}" ]] || warn "RAZORPAY_KEY_ID not set — payments won't work"
[[ -n "${FIREBASE_PROJECT_ID:-}" ]] || warn "FIREBASE_PROJECT_ID not set — push notifications disabled"

log "Prerequisites OK"

# ── Git pull ──────────────────────────────────────────────────
if [[ "$PULL" == "true" ]]; then
  section "Git Pull"
  git pull origin main || error "Git pull failed"
  log "Code updated"
fi

# ── Backup ───────────────────────────────────────────────────
if [[ "$BACKUP" == "true" ]] && docker ps | grep -q mk_mongodb; then
  section "Database Backup"
  BACKUP_FILE="backups/mk_backup_$(date +%Y%m%d_%H%M%S).gz"
  mkdir -p backups
  docker exec mk_mongodb mongodump \
    --username "${MONGO_ROOT_USER:-admin}" \
    --password "${MONGO_ROOT_PASSWORD:-mkapp_secret_2026}" \
    --authenticationDatabase admin \
    --db mk_app \
    --archive="/tmp/backup.gz" \
    --gzip 2>/dev/null || warn "Backup failed (non-fatal)"
  docker cp mk_mongodb:/tmp/backup.gz "$BACKUP_FILE" 2>/dev/null && \
    log "Backup saved: $BACKUP_FILE" || warn "Backup copy failed"
fi

# ── Build images ─────────────────────────────────────────────
section "Building Docker Images"
info "Building backend..."
docker-compose build --no-cache backend
log "Backend image built"

info "Building frontend..."
docker-compose build --no-cache frontend
log "Frontend image built"

# ── Deploy ────────────────────────────────────────────────────
section "Deploying Services"

# Stop and remove old containers (preserve volumes)
docker-compose down --remove-orphans

# Pull latest base images
docker-compose pull mongodb redis nginx

# Start all services
docker-compose up -d

# ── Wait for health ──────────────────────────────────────────
section "Health Checks"

wait_healthy() {
  local name=$1; local max=30; local i=0
  info "Waiting for $name..."
  while ! docker inspect --format='{{.State.Health.Status}}' "mk_${name}" 2>/dev/null | grep -q "healthy"; do
    if [[ $i -ge $max ]]; then
      warn "$name health check timed out"
      docker-compose logs --tail=20 "$name"
      return 1
    fi
    sleep 2; ((i++))
  done
  log "$name healthy"
}

wait_healthy mongodb
wait_healthy redis
wait_healthy backend

# ── Seed (optional) ──────────────────────────────────────────
if [[ "$SEED" == "true" ]]; then
  section "Database Seeding"
  docker exec mk_backend node src/utils/seeder.js || warn "Seeding failed"
  log "Database seeded"
fi

# ── Verify ────────────────────────────────────────────────────
section "Verification"

sleep 3

HEALTH=$(curl -sf http://localhost:5000/api/v1/health 2>/dev/null || echo '{}')
MONGO_STATUS=$(echo "$HEALTH" | grep -o '"mongodb":"[^"]*"' | cut -d'"' -f4)
REDIS_STATUS=$(echo "$HEALTH" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4)

if [[ "$MONGO_STATUS" == "connected" ]]; then
  log "MongoDB: connected"
else
  warn "MongoDB: $MONGO_STATUS"
fi

if [[ "$REDIS_STATUS" == "connected" ]]; then
  log "Redis: connected"
else
  warn "Redis: $REDIS_STATUS (non-fatal — app works without cache)"
fi

# ── Summary ──────────────────────────────────────────────────
section "Deployment Complete 🚀"

echo ""
echo -e "${GREEN}  Services running:${NC}"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker-compose ps

echo ""
echo -e "${CYAN}  URLs:${NC}"
echo "  🌐 App:        http://localhost"
echo "  🔌 API:        http://localhost:5000/api/v1"
echo "  ❤️  Health:     http://localhost:5000/api/v1/health"
echo ""
echo -e "${CYAN}  Dev tools (docker-compose --profile dev up):${NC}"
echo "  🗄️  Mongo UI:   http://localhost:8081"
echo "  🔴 Redis UI:   http://localhost:8082"
echo ""
echo -e "${YELLOW}  Logs:${NC}"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f nginx"
echo ""
