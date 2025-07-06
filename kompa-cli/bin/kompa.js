#!/usr/bin/env node

/**
 * Kompa Global CLI
 * 
 * Install globally: npm install -g kompa
 * Run anywhere: kompa
 */

import { program } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import open from 'open'
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
console.log(chalk.blue(`
🐙 Kompa v${packageJson.version}
The collaboration server that works everywhere!
`))

program
  .name('kompa')
  .description('Instant collaboration server deployment')
  .version(packageJson.version)

// Default command - interactive mode
program
  .command('start', { isDefault: true })
  .description('Start Kompa collaboration server (interactive)')
  .option('-p, --port <port>', 'Collaboration server port', '8080')
  .option('-w, --web-port <port>', 'Web UI port', '3000')
  .option('--no-web', 'Disable web UI')
  .option('-q, --quiet', 'Suppress startup messages')
  .option('--no-open', 'Don\'t open browser automatically')
  .action(async (options) => {
    try {
      if (!options.quiet) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'startServer',
            message: 'Start Kompa collaboration server?',
            default: true
          },
          {
            type: 'input',
            name: 'port',
            message: 'Server port:',
            default: options.port,
            when: (answers) => answers.startServer
          },
          {
            type: 'input', 
            name: 'webPort',
            message: 'Web UI port:',
            default: options.webPort,
            when: (answers) => answers.startServer && options.web
          },
          {
            type: 'confirm',
            name: 'openBrowser',
            message: 'Open browser automatically?',
            default: !options.noOpen,
            when: (answers) => answers.startServer && options.web
          }
        ])

        if (!answers.startServer) {
          console.log(chalk.yellow('Cancelled. Run `kompa` again when ready!'))
          process.exit(0)
        }

        options.port = answers.port
        options.webPort = answers.webPort
        options.openBrowser = answers.openBrowser
      }

      await startKompaServer(options)
    } catch (err) {
      console.error(chalk.red('❌ Failed to start Kompa:', err.message))
      process.exit(1)
    }
  })

// Quick command - no interaction
program
  .command('quick')
  .description('Start server with defaults (no interaction)')
  .option('-p, --port <port>', 'Server port', '8080')
  .option('-w, --web-port <port>', 'Web UI port', '3000')
  .option('--no-web', 'Disable web UI')
  .option('--no-open', 'Don\'t open browser')
  .action(async (options) => {
    try {
      await startKompaServer({ ...options, quiet: true })
    } catch (err) {
      console.error(chalk.red('❌ Failed to start Kompa:', err.message))
      process.exit(1)
    }
  })

// Dev command - for development
program
  .command('dev')
  .description('Development mode (serves static files from dist)')
  .option('-p, --port <port>', 'Server port', '8080')
  .option('-w, --web-port <port>', 'Web UI port', '3000')
  .action(async (options) => {
    try {
      await startKompaServer({ ...options, dev: true })
    } catch (err) {
      console.error(chalk.red('❌ Failed to start Kompa dev server:', err.message))
      process.exit(1)
    }
  })

async function startKompaServer(options) {
  const {
    port = '8080',
    webPort = '3000', 
    web = true,
    quiet = false,
    openBrowser = true,
    dev = false
  } = options

  if (!quiet) {
    console.log(chalk.blue('🚀 Starting Kompa server...'))
  }

  let webServer

  // Start collaboration server
  const collaborationServer = new KompaServer({
    port: parseInt(port),
    host: '0.0.0.0',
    quiet
  })
  
  try {
    await collaborationServer.start()
    
    if (!quiet) {
      console.log(chalk.green(`✅ Collaboration server running on ws://localhost:${port}`))
    }
  } catch (err) {
    console.error(chalk.red(`❌ ${err.message}`))
    process.exit(1)
  }

  // Start web UI server
  if (web) {
    const staticPath = dev 
      ? path.join(process.cwd(), 'dist') 
      : path.join(__dirname, '../static')
      
    webServer = new StaticServer({
      port: parseInt(webPort),
      host: '0.0.0.0',
      staticPath,
      serverUrl: `ws://localhost:${port}`,
      quiet
    })
    
    try {
      await webServer.start()
    } catch (err) {
      console.error(chalk.red(`❌ ${err.message}`))
      process.exit(1)
    }
    
    const webUrl = `http://localhost:${webPort}`
    
    if (!quiet) {
      console.log(chalk.green(`✅ Web UI running on ${webUrl}`))
      console.log('')
      console.log(chalk.blue.bold('🎉 Kompa is ready!'))
      console.log(chalk.white(`📖 Open: ${webUrl}`))
      console.log(chalk.white(`🔗 Server: ws://localhost:${port}`))
      console.log('')
      console.log(chalk.gray('💡 Share the room code with others to collaborate'))
      console.log(chalk.gray('⚡ Press Ctrl+C to stop the server'))
    }

    // Open browser automatically
    if (openBrowser && !quiet) {
      setTimeout(() => {
        open(webUrl)
      }, 1000)
    }
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    if (!quiet) {
      console.log(chalk.yellow('\n🛑 Shutting down Kompa...'))
    }
    
    try {
      if (webServer) await webServer.stop()
      if (collaborationServer) await collaborationServer.stop()
      
      if (!quiet) {
        console.log(chalk.green('✅ Kompa stopped'))
      }
      process.exit(0)
    } catch (err) {
      console.error(chalk.red('❌ Error during shutdown:', err.message))
      process.exit(1)
    }
  })
}

program.parse()