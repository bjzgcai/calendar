#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');

const preferredPort = 5002;
const maxPort = 5020;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

async function startDevServer() {
  try {
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`\x1b[33mPort ${preferredPort} is in use, using port ${port} instead\x1b[0m\n`);
    }

    const args = ['dev', '--turbopack', '--port', String(port)];
    const child = spawn('next', args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error('Failed to start dev server:', error);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

startDevServer();
