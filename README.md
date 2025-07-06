<div align="center">
  <img src="./logo.png" alt="Kompa Logo" width="200" height="200"/>
  
  # Kompa
  
  ### The P2P Collaborative Code Editor That Just Works
  
  *Real-time collaboration • Zero servers • Pure browser magic*
  
  [![CI Status](https://github.com/own171/kompa/workflows/CI/badge.svg)](https://github.com/own171/kompa/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
  
</div>

---

## 🐙 What is Kompa?

Kompa is a **pure peer-to-peer collaborative code editor** that runs entirely in your browser. No servers, no accounts, no hassle. Just share a room code and start coding together instantly.

### ✨ The Magic

- **🔗 Direct P2P**: Your code flows directly between browsers via WebRTC
- **⚡ Instant Sync**: See changes as your teammates type, with zero conflicts
- **🎨 Live Cursors**: Watch exactly where everyone is editing in real-time
- **🌐 Zero Infrastructure**: Only needs a tiny signaling server for initial handshake
- **📱 Ephemeral Rooms**: Temporary spaces that vanish when everyone leaves

## 🚀 Quick Demo

```bash
# 1. Clone and start
git clone https://github.com/own171/kompa
cd kompa && npm install && npm start

# 2. Open http://localhost:3000 in multiple browser tabs
# 3. Create a room in one tab, join with same code in others
# 4. Start coding together! ✨
```

## 🎯 Why Choose Kompa?

| Traditional Tools                     | 🐙 Kompa                               |
| ------------------------------------- | -------------------------------------- |
| ❌ Requires servers & accounts        | ✅ Works instantly in any browser      |
| ❌ Complex setup & configuration      | ✅ Share a link, start coding          |
| ❌ Data stored on third-party servers | ✅ Your code stays between you & peers |
| ❌ Monthly subscription fees          | ✅ Completely free & open source       |
| ❌ Vendor lock-in                     | ✅ Run anywhere, own your data         |

## ✨ Features That Make You Go "Wow"

- **🔗 True P2P Magic**: Your code travels directly between browsers - no middleman
- **⚡ Sub-100ms Sync**: Changes appear faster than you can blink
- **🎨 Rainbow Cursors**: See exactly where your teammates are working
- **🌈 Smart Conflict Resolution**: Multiple people, same line, zero problems
- **🎯 Language Support**: JavaScript, TypeScript, Python, Java, C++, and more
- **📱 Responsive Design**: Code together on desktop, tablet, or mobile
- **🔧 Developer-First**: Built by developers, for developers

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18+
- A modern browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

```bash
# Clone the magic
git clone https://github.com/own171/kompa.git
cd kompa

# Install dependencies
npm install

# Start the collaboration party 🎉
npm start
```

The app will be available at `http://localhost:3000`

### Your First Collaboration Session

1. **Create a Room**: Click "Create New Room" to get a unique room code like `swift-fox-42`
2. **Share the Code**: Send the room code to your teammates
3. **Start Coding**: Everyone joins the same room and starts editing together
4. **Magic Happens**: Watch cursors move and text sync in real-time! ✨

## 🏗️ How It Works (The Nerdy Bits)

```
┌─────────────┐    WebSocket     ┌─────────────────┐    WebSocket     ┌─────────────┐
│   Browser   │◄────────────────►│ Signaling Server│◄────────────────►│   Browser   │
│     A       │                  │ (Tiny & Simple) │                  │     B       │
└─────────────┘                  └─────────────────┘                  └─────────────┘
       │                                                                      │
       │                        WebRTC Magic ✨                              │
       └──────────────────────Direct P2P Connection──────────────────────────┘
                               (Your code flows here)
```

### The Tech Stack That Powers Kompa

- **React 18** - Modern UI that doesn't get in your way
- **Monaco Editor** - The same editor that powers VS Code
- **Y.js CRDT** - Conflict-free text synchronization (the secret sauce)
- **WebRTC** - Direct browser-to-browser connections
- **Simple-Peer** - Makes WebRTC actually simple
- **Vite** - Lightning-fast development and builds

## 🎮 Usage Examples

### Quick Pair Programming Session

```bash
# Terminal 1: Start Kompa
npm start

# Browser 1: Create room "debug-session-23"
# Browser 2: Join room "debug-session-23"
# Both: Start debugging that nasty bug together!
```

### Team Code Review

```bash
# Share room code in Slack: "Join kompa room: review-pr-456"
# Everyone joins and reviews code in real-time
# Make suggestions by editing directly
# No more "Can you scroll down?" in calls!
```

### Teaching & Mentoring

```bash
# Teacher creates room: "learn-react-hooks"
# Students join and follow along as teacher types
# Everyone can ask questions by editing comments
# Learn by doing, together!
```

## 🛠️ Development

### Project Structure

```
kompa/
├── src/
│   ├── components/          # React components
│   │   ├── CodeEditor.jsx   # Main editor with collaboration
│   │   ├── RoomJoin.jsx     # Room creation/joining
│   │   └── cursors/         # Live cursor system
│   ├── hooks/               # Custom React hooks
│   │   └── useP2PRoom.js    # Main P2P orchestration
│   ├── p2p/                 # P2P networking layer
│   │   ├── websocket-discovery.js
│   │   └── webrtc-peer.js
│   ├── collaboration/       # CRDT & sync magic
│   │   ├── crdt.js
│   │   └── sync-browser.js
│   └── utils/               # Helper functions
├── signaling-server.js      # Tiny WebSocket server
└── tests/                   # Because we're professionals
```

### Development Scripts

```bash
npm run dev          # Start Vite dev server
npm run signaling    # Start signaling server only
npm start           # Start both (recommended)
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Check code quality
npm run format      # Format code beautifully
```

### Contributing

We love contributors! Here's how to join the party:

1. **Fork** the repo
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Code** something awesome
4. **Test** your changes: `npm test`
5. **Format** your code: `npm run format`
6. **Submit** a pull request

Check out our [Contributing Guide](CONTRIBUTING.md) for more details!

## 🎯 Performance & Scalability

### What Makes Kompa Fast

- **Local-First**: Your edits are instant, sync happens in background
- **Direct P2P**: No round-trip to servers
- **Optimized CRDT**: Y.js is battle-tested and memory efficient
- **Smart Debouncing**: Cursor updates are throttled for performance

### Current Limits (And Our Plans)

- **~8 peers max** in mesh topology (working on star topology for more)
- **Text files only** (planning multi-file support)
- **No persistence** (considering optional backup feature)

## 🚨 Troubleshooting

### Common Issues & Quick Fixes

**🔥 "Can't connect to peers"**

```bash
# Check if signaling server is running
npm run signaling

# Verify WebRTC isn't blocked by firewall/VPN
# Try a different network or disable VPN temporarily
```

**🔥 "Changes not syncing"**

```bash
# Check browser console for errors
# Refresh both browsers and rejoin room
# Make sure you're in the same room code
```

**🔥 "Cursor positions look weird"**

```bash
# This usually fixes itself in a few seconds
# If not, try refreshing the editor (F5)
```

### Debug Mode

```bash
# Enable detailed logging
REACT_APP_DEBUG=true npm start
```

## 🌟 Roadmap & Future

### Coming Soon™

- [ ] **File Tree Support** - Edit multiple files together
- [ ] **Room Persistence** - Optional save/restore for important sessions


## 📜 License

Released under the [MIT License](LICENSE). Go wild! 🎉

## 🙏 Thanks

Huge thanks to the amazing open source projects that make Kompa possible:

- [Y.js](https://docs.yjs.dev/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Simple-Peer](https://github.com/feross/simple-peer) 
- [React](https://reactjs.org/)
  
---

<div align="center">
  
  **Built with ❤️**
  
  *Star ⭐ this repo if Kompa makes your coding life better!*
  
</div>
