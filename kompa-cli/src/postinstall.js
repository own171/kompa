#!/usr/bin/env node

/**
 * Post-install welcome message
 */

/* eslint-disable no-console */
console.log(`
🐙 Welcome to Kompa!

Kompa is now globally installed and ready to use.

Quick start:
  kompa           # Interactive mode (short alias)
  kompa-server    # Interactive mode (full name)  
  kompa quick     # Start with defaults
  kompa dev       # Development mode

Examples:
  kompa                    # Interactive setup
  kompa quick              # Quick start on default ports
  kompa quick -p 9000      # Custom port
  kompa quick --no-web     # Server only

After starting Kompa:
  1. Share your room code with collaborators
  2. Everyone connects to the same server URL
  3. Start coding together in real-time!

Documentation: https://github.com/own171/kompa
Issues: https://github.com/own171/kompa/issues

Happy collaborating! 🚀
`)