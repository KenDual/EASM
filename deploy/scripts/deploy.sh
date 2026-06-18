#!/bin/bash
set -e

cd ~/homework-2
git pull origin deploy
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
echo "Deploy complete"
