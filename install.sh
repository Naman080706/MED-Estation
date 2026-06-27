#!/bin/bash

# ==============================================================================
# MED-Estation Full-Stack Installation Script
# ==============================================================================
# This script installs all necessary dependencies for both the Python Backend
# and the Next.js Frontend. Run this before your first time using start.sh.
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}📦 Installing MED-Estation Dependencies${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Backend Dependencies
echo -e "${YELLOW}▶️ 1/2: Installing Backend Dependencies (Python)...${NC}"
cd backend || exit 1
python3 -m pip install --upgrade pip
pip install -r requirements.txt

# Manually ensure strict libraries missed in earlier env installs
pip install greenlet prophet
cd ..
echo -e "${GREEN}✅ Backend Dependencies Installed!${NC}\n"

# 2. Frontend Dependencies
echo -e "${YELLOW}▶️ 2/2: Installing Frontend Dependencies (Node.js)...${NC}"
cd Frontend || exit 1

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo -e "${RED}❌ Error: npm could not be found. Please install Node.js!${NC}"
    exit 1
fi

npm install
cd ..
echo -e "${GREEN}✅ Frontend Dependencies Installed!${NC}\n"

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}🎉 All setup complete! You can now run:${NC}"
echo -e "   ${YELLOW}./start.sh${NC}"
echo -e "${BLUE}=======================================${NC}"
