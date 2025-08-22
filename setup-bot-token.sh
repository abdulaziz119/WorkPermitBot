#!/bin/bash

# Quick setup script for adding BOT_TOKEN
echo "🤖 WorkPermitBot - BOT_TOKEN Setup"
echo "=================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Creating from example..."
    cp .env.example .env
fi

# Prompt for BOT_TOKEN
echo ""
echo "📝 Please enter your Telegram Bot Token:"
echo "   (Get it from @BotFather on Telegram)"
echo ""
read -p "BOT_TOKEN: " bot_token

if [ -z "$bot_token" ]; then
    echo "❌ BOT_TOKEN cannot be empty!"
    exit 1
fi

# Update .env file
if grep -q "^BOT_TOKEN=" .env; then
    # Replace existing BOT_TOKEN
    sed -i.bak "s/^BOT_TOKEN=.*/BOT_TOKEN=$bot_token/" .env
    echo "✅ BOT_TOKEN updated in .env file"
else
    # Add BOT_TOKEN if not exists
    echo "BOT_TOKEN=$bot_token" >> .env
    echo "✅ BOT_TOKEN added to .env file"
fi

# Restart the app container
echo ""
echo "🔄 Restarting application..."
docker-compose restart app

echo ""
echo "⏳ Waiting for app to start..."
sleep 5

# Check container status
echo ""
echo "📊 Container Status:"
docker-compose ps app

echo ""
echo "📋 Recent logs:"
docker-compose logs app --tail=10

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔗 Your bot should now be working!"
echo "📱 Try sending /start to your bot on Telegram"
echo ""
echo "📊 Monitor logs: docker-compose logs -f app"
