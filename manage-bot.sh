#!/bin/bash

# ==========================================
# MESH-TECH-V2.2 Management Script
# Optimized for cPanel Litespeed & Zero-Downtime
# ==========================================

BOT_NAME="mesh-v2"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure we are in the right directory
cd "$APP_DIR"

show_help() {
    echo "Usage: ./manage-bot.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start the bot with PM2"
    echo "  stop      Stop the bot"
    echo "  restart   Restart the bot"
    echo "  status    Show PM2 process status"
    echo "  logs      Tail live bot logs"
    echo "  update    Pull changes, update deps, and restart (Robust)"
    echo "  setup     Initial setup and PM2 persistence"
    echo ""
}

case "$1" in
    start)
        echo "🚀 Starting $BOT_NAME..."
        pm2 start index.js --name "$BOT_NAME" --watch --ignore-watch="node_modules sessions data tmp .git" || pm2 restart "$BOT_NAME"
        pm2 save
        ;;
    stop)
        echo "🛑 Stopping $BOT_NAME..."
        pm2 stop "$BOT_NAME"
        ;;
    restart)
        echo "🔄 Restarting $BOT_NAME..."
        pm2 restart "$BOT_NAME" || pm2 start index.js --name "$BOT_NAME"
        pm2 save
        ;;
    status)
        pm2 status "$BOT_NAME"
        ;;
    logs)
        pm2 logs "$BOT_NAME"
        ;;
    update)
        echo "🔄 Starting Robust Update for $BOT_NAME..."
        
        # 1. Pull changes while bot is running
        echo "📥 Pulling latest code..."
        git pull origin main
        
        # 2. Update dependencies while bot is running
        echo "📦 Updating dependencies..."
        npm install --no-audit --no-fund
        
        # 3. Restart the bot (minimizes downtime)
        echo "🚀 Restarting bot process..."
        pm2 restart "$BOT_NAME" || pm2 start index.js --name "$BOT_NAME"
        
        # 4. Save state for server reboots
        pm2 save
        
        echo "✅ Update complete! Bot is back online."
        ;;
    setup)
        echo "⚙️ Setting up PM2 Persistence..."
        pm2 start index.js --name "$BOT_NAME"
        pm2 save
        # Attempt to generate startup script
        pm2 startup | grep "sudo" || echo "Note: Run 'pm2 startup' manually if the bot doesn't start after server reboot."
        ;;
    *)
        show_help
        ;;
esac
