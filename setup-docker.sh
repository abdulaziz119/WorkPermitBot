#!/bin/bash

# WorkPermitBot Docker Setup Script
echo "🚀 Setting up WorkPermitBot with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your BOT_TOKEN before running the application!"
    echo "📖 You can get BOT_TOKEN from @BotFather on Telegram"
else
    echo "✅ .env file already exists"
fi

# Create logs directory
mkdir -p logs

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

# Show logs
echo "📋 Application logs:"
docker-compose logs app --tail=20

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Available commands:"
echo "  docker-compose up -d          # Start services"
echo "  docker-compose down           # Stop services"
echo "  docker-compose logs app       # View app logs"
echo "  docker-compose logs postgres  # View database logs"
echo "  docker-compose ps             # Check service status"
echo ""
echo "🔗 Application should be running on http://localhost:3000"
echo "🗄️  PostgreSQL is available on localhost:5432"
echo ""
echo "⚠️  Don't forget to update BOT_TOKEN in .env file!"
