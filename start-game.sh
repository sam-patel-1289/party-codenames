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

# Try to find local IP (works on Mac/Linux)
export HOST_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}')
$COMPOSE_CMD up -d --build --force-recreate
if [ -n "$HOST_IP" ]; then
    echo "Network: http://$HOST_IP:3000 (Share this with players!)"
fi
echo "-----------------------------------------------------"
echo ""

# Show the server logs (which contains the QR Code)
sleep 2 # Give server a moment to start
$COMPOSE_CMD logs app
echo ""
echo "To stop the game, run: ./stop-game.sh"
