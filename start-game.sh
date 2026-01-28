#!/bin/bash
echo "Starting Codenames Game..."

# Try using 'docker compose' (V2), fall back to 'docker-compose' (V1) if needed, or fail.
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Docker options 'docker compose' or 'docker-compose' not found."
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

$COMPOSE_CMD up -d --build --force-recreate

if [ $? -ne 0 ]; then
    echo "Error: Failed to start the game."
    exit 1
fi

echo ""
echo "Game is running!"
echo "-----------------------------------------------------"
echo "Local:   http://localhost:3000"
# Try to find local IP (works on Mac/Linux)
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}')
if [ -n "$IP" ]; then
    echo "Network: http://$IP:3000 (Share this with players!)"
fi
echo "-----------------------------------------------------"
echo ""
echo "To stop the game, run: ./stop-game.sh"
