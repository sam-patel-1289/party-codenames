# Crossfire Codenames 🕵️‍♂️📺

> **The ultimate living room game night upgrade.**  
> Play Codenames on your TV, using your phones as secret controllers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![React](https://img.shields.io/badge/react-18-cyan)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)

## 🎯 Why Crossfire?

Standard board games are fun, but passing around a small key card or hunching over a table can be annoying properly. 

**Crossfire Codenames** modernizes the experience for your living room:

- **📺 The TV is the Board**: A beautiful, shared screen shows the word grid, score, and whose turn it is.
- **📱 Phone as Controller**: Spymasters connect with their phones to see the "Key Card" privately. No more hiding behind a box lid!
- **⚡ Instant Setup**: No cards to shuffle. Just run one command.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Docker Desktop** (Required to run the server)
- **Google Chrome** (Highly Recommended for the best experience on TV and Mobile)

### 2. Run the Game
Open your terminal in the project folder and run:

```bash
./start-game.sh
```

This magic script will:
1.  Build the entire application (Frontend + Backend).
2.  Start the local server.
3.  **Automatically detect your WiFi IP** and tell you exactly what URL to share with your friends.

### 3. Connect Players
Once the game is running, you will see a **Network URL** in your terminal (e.g., `http://192.168.1.50:3000`).

- **TV / Host Computer**: Open `http://localhost:3000` in **Chrome**.
- **Spymasters (Phones)**: Connect to the **Network URL** (must be on the same WiFi).

---

## 🛑 How to Stop
When your game night is over, shut everything down cleanly:

```bash
./stop-game.sh
```

---

## 🛠️ Troubleshooting

**"This site can't be reached" on phones?**
1.  Ensure your phone and computer are on the **exact same WiFi network**.
2.  Check if your computer's firewall is blocking **Port 3000**.
3.  Double-check the IP address shown in the terminal.

---

## 🧩 Technologies
Built with modern web tech to ensure a smooth, app-like experience:
- **Core**: React, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui
- **Realtime**: Socket.io (Instant sync between TV and Phones)
- **Deployment**: Docker & Nginx
