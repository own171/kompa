#!/usr/bin/env node

/**
 * Kompa Server CLI
 * 
 * One-line command to start a collaboration server with optional web UI
 * npx @kompa/server
 */

import { program } from 'commander'
import path from 'path'
import { fileURLToPath } from 'url'
import { KompaServer } from '../src/server.js'
import { StaticServer } from '../src/static-server.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(
  await import('fs').then(fs => 
    fs.promises.readFile(path.join(__dirname, '../package.json'), 'utf8')
  )
)

/* eslint-disable no-console */

program
  .name('kompa-server')
  .description('Start a Kompa collaboration server')
  .version(packageJson.version)
  .option('-p, --port <port>', 'Collaboration server port', '8080')
  .option('-w, --web-port <port>', 'Web UI port', '3000')
  .option('--no-web', 'Disable web UI')
  .option('--web-only', 'Serve only static web UI (for development)')
  .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('--max-rooms <number>', 'Maximum number of rooms', '100')
  .option('--room-timeout <seconds>', 'Room timeout in seconds', '3600')
  .option('--cors-origin <origin>', 'CORS origin for web UI', '*')
  .option('-q, --quiet', 'Suppress startup messages')

program.parse()
const opts = program.opts()

async function startServer() {
  try {
    if (!opts.quiet) {
      console.log('🐙 Starting Kompa Server...')
    }

    let collaborationServer
    let webServer

    // Start collaboration server (unless web-only mode)
    if (!opts.webOnly) {
      collaborationServer = new KompaServer({
        port: parseInt(opts.port),
        host: opts.host,
        maxRooms: parseInt(opts.maxRooms),
        roomTimeout: parseInt(opts.roomTimeout) * 1000,
        quiet: opts.quiet
      })
      
      await collaborationServer.start()
      
      if (!opts.quiet) {
        console.log(`🚀 Collaboration server running on ws://${opts.host}:${opts.port}`)
      }
    }

    // Start web UI server (unless disabled)
    if (opts.web && !opts.webOnly) {
      const staticPath = path.join(__dirname, '../static')
      webServer = new StaticServer({
        port: parseInt(opts.webPort),
        host: opts.host,
        staticPath,
        serverUrl: `ws://${opts.host === '0.0.0.0' ? 'localhost' : opts.host}:${opts.port}`,
        corsOrigin: opts.corsOrigin,
        quiet: opts.quiet
      })
      
      await webServer.start()
      
      if (!opts.quiet) {
        console.log(`📝 Web UI running on http://${opts.host === '0.0.0.0' ? 'localhost' : opts.host}:${opts.webPort}`)
      }
    } else if (opts.webOnly) {
      // Development mode - serve web UI only
      const staticPath = path.join(__dirname, '../../../dist') // Reference main project dist
      webServer = new StaticServer({
        port: parseInt(opts.webPort),
        host: opts.host,
        staticPath,
        serverUrl: `ws://localhost:8080`, // Assume collaboration server running separately
        corsOrigin: opts.corsOrigin,
        quiet: opts.quiet
      })
      
      await webServer.start()
      
      if (!opts.quiet) {
        console.log(`📝 Web UI (dev mode) running on http://${opts.host === '0.0.0.0' ? 'localhost' : opts.host}:${opts.webPort}`)
        console.log(`🔗 Make sure collaboration server is running on ws://localhost:8080`)
      }
    }

    if (!opts.quiet) {
      console.log('')
      console.log('🎉 Kompa ready for collaboration!')
      if (opts.web || opts.webOnly) {
        const webUrl = `http://${opts.host === '0.0.0.0' ? 'localhost' : opts.host}:${opts.webPort}`
        console.log(`📖 Open: ${webUrl}`)
      }
      if (!opts.webOnly) {
        const wsUrl = `ws://${opts.host === '0.0.0.0' ? 'localhost' : opts.host}:${opts.port}`
        console.log(`🔗 Server URL: ${wsUrl}`)
      }
      console.log('💡 Press Ctrl+C to stop')
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (!opts.quiet) {
        console.log('\n🛑 Shutting down Kompa server...')
      }
      
      try {
        if (webServer) await webServer.stop()
        if (collaborationServer) await collaborationServer.stop()
        
        if (!opts.quiet) {
          console.log('✅ Kompa server stopped')
        }
        process.exit(0)
      } catch (err) {
        console.error('❌ Error during shutdown:', err)
        process.exit(1)
      }
    })

  } catch (err) {
    console.error('❌ Failed to start Kompa server:', err)
    process.exit(1)
  }
}

startServer()