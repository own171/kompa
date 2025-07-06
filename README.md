<div align="center">
  <img src="./logo.png" alt="Kompa Logo" width="200" height="200"/>
  
  # Kompa
  
  ### Real-time collaborative code editor that works everywhere
  
  [![CI Status](https://github.com/own171/kompa/workflows/CI/badge.svg)](https://github.com/own171/kompa/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
  
</div>

## Quick Start

Install globally and run from anywhere:

```bash
npm install -g kompa-server
kompa
```

That's it! Your browser opens to a collaborative code editor. Share the room code with others to code together in real-time.

## CLI Commands

```bash
# Interactive setup (recommended)
kompa

# Quick start with defaults  
kompa quick

# Custom ports
kompa quick -p 8081 -w 3001

# Server only (no web UI)
kompa quick --no-web

# Help
kompa --help
```

## How it works

Kompa uses a server-as-peer architecture where the server participates directly in collaboration instead of just relaying messages. This means:

- **Works everywhere**: No NAT/firewall issues like traditional P2P
- **Simple deployment**: One command starts everything  
- **Real-time sync**: Conflict-free collaborative editing with Y.js
- **No setup**: Just run the command and start collaborating

## Development

```bash
git clone https://github.com/own171/kompa.git
cd kompa
npm install
npm start
```

## Technical stuff

- **Frontend**: React + Monaco Editor + Y.js CRDT
- **Backend**: Node.js + WebSocket + Y.js  
- **Architecture**: Server-as-peer (not traditional P2P mesh)
- **Network**: WebSocket-only (works through corporate firewalls)

---

<div align="center">
  
*Built with ❤️ by developers who got tired of collaboration tools that don't work*

</div>