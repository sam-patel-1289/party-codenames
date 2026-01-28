#!/bin/bash
echo "Stopping Codenames Game..."

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose down
elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
else
    echo "Error: Docker not found."
    exit 1
fi

echo "Game stopped."
