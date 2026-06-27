FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
# Add asyncpg for PostgreSQL support
RUN pip install --no-cache-dir -r requirements.txt asyncpg redis

# Copy application source
COPY . .

# Expose port
EXPOSE 8000
