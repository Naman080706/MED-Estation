#!/bin/bash

# ==============================================================================
# MED-Estation Full-Stack Startup Script
# ==============================================================================
# This script launches both the Next.js Frontend and the FastAPI Backend.
# It handles background process management so that pressing Ctrl+C gracefully
# shuts down both servers without leaving orphan ports running.
# ==============================================================================

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}🚀 Starting MED-Estation Platform...${NC}"
echo -e "${BLUE}=======================================${NC}"

# Function to handle graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}⚠️ Shutdown signal received...${NC}"
    echo -e "${YELLOW}🛑 Stopping Frontend...${NC}"
    kill $FRONTEND_PID 2>/dev/null
    
    echo -e "${YELLOW}🛑 Stopping Backend...${NC}"
    kill $BACKEND_PID 2>/dev/null
    
    echo -e "${GREEN}✅ All processes terminated successfully!${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Start the FastAPI Backend
echo -e "${GREEN}▶️ Booting FastAPI Backend (Port 8002)...${NC}"
# Free port 8002 if already in use (e.g. from a previous run)
if command -v lsof >/dev/null 2>&1; then
  (lsof -ti:8002 | xargs kill -9) 2>/dev/null || true
  sleep 1
fi
# Activate venv and launch from root so relative imports work
source "$(dirname "$0")/.venv/bin/activate" 2>/dev/null || true
python -m uvicorn backend.main:app --port 8002 --reload &
BACKEND_PID=$!

# Give the backend time to boot up
sleep 3

# 2. Start the Next.js Frontend
echo -e "${GREEN}▶️ Booting Next.js Frontend (Port 3002)...${NC}"
cd Frontend || exit 1
PORT=3002 npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}✅ System is LIVE!${NC}"
echo -e "   🌐 Frontend is running at: ${YELLOW}http://localhost:3002${NC}"
echo -e "   ⚙️  Backend API is running at: ${YELLOW}http://localhost:8002/docs${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Press ${RED}Ctrl+C${NC} to stop both servers."

# Wait for all background processes indefinitely so the script stays active
wait
