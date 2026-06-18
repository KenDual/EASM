#!/bin/bash
set -e

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Add current user to docker group
usermod -aG docker "$USER"

# Setup UFW firewall
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Clone repo (update REPO_URL)
# git clone https://github.com/YOUR_USERNAME/homework-2.git ~/homework-2

echo "VM setup complete. Re-login for docker group to take effect."
