/**
 * Static Web UI Server
 * 
 * Serves the Kompa web interface with pre-configured server URL
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class StaticServer {
  constructor(options = {}) {
    this.port = options.port || 3000
    this.host = options.host || '0.0.0.0'
    this.staticPath = options.staticPath || path.join(__dirname, '../static')
    this.serverUrl = options.serverUrl || 'ws://localhost:8080'
    this.corsOrigin = options.corsOrigin || '*'
    this.quiet = options.quiet || false
    
    this.app = null
    this.server = null
  }

  async start() {
    this.app = express()
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', this.corsOrigin)
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Serve static files
    this.app.use(express.static(this.staticPath))

    // API endpoint to get server configuration
    this.app.get('/api/config', (req, res) => {
      res.json({
        serverUrl: this.serverUrl,
        version: '1.0.0',
        mode: 'server-peer'
      })
    })

    // Catch all - serve index.html for SPA routing
    this.app.get('*', (req, res) => {
      const indexPath = path.join(this.staticPath, 'index.html')
      res.sendFile(indexPath, (err) => {
        if (err) {
          if (!this.quiet) {
            console.error('❌ Failed to serve index.html:', err)
          }
          res.status(404).send('Web UI not found. Run `npm run build` first.')
        }
      })
    })

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve())
      } else {
        resolve()
      }
    })
  }
}