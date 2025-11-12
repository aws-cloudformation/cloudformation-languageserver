const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

// --- Configuration ---
const LSP_SERVER_CMD = 'node';
const LSP_SERVER_ARGS = ['bundle/development/cfn-lsp-server-standalone.js', '--stdio'];

function createLspMessage(messageJson) {
  const messageStr = JSON.stringify(messageJson);
  const contentLength = Buffer.byteLength(messageStr, 'utf-8');
  
  const header = `Content-Length: ${contentLength}\r\n\r\n`;
  
  const headerBuffer = Buffer.from(header, 'ascii');
  const messageBuffer = Buffer.from(messageStr, 'utf-8');
  
  return Buffer.concat([headerBuffer, messageBuffer]);
}

function setupMessageReader(stdout, onMessage) {
  let buffer = Buffer.alloc(0);
  let contentLength = -1;

  stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    
    while (true) {
      if (contentLength === -1) {
        const headerMatch = buffer.toString('ascii').match(/Content-Length: (\d+)\r\n\r\n/);
        if (headerMatch) {
          contentLength = parseInt(headerMatch[1], 10);
          const headerEnd = headerMatch.index + headerMatch[0].length;
          buffer = buffer.slice(headerEnd);
        } else {
          break;
        }
      }

      if (contentLength > -1) {
        if (buffer.length >= contentLength) {
          const messageBytes = buffer.slice(0, contentLength);
          const message = JSON.parse(messageBytes.toString('utf-8'));
          
          buffer = buffer.slice(contentLength);
          contentLength = -1;
          
          onMessage(message); // Pass the parsed message to the callback
        } else {
          break;
        }
      }
    }
  });
}

// --- Main Logic ---
async function main() {
  const projectRoot = path.resolve(process.cwd());
  // LSP uses 'file://' URIs
  const projectRootUri = `file://${projectRoot}`;

  console.log(`Starting LSP server: ${LSP_SERVER_CMD} ${LSP_SERVER_ARGS.join(' ')}`);
  console.log(`Project Root: ${projectRootUri}\n`);

  const server = spawn(LSP_SERVER_CMD, LSP_SERVER_ARGS);

  // Listen for and log any errors from the server process
  server.stderr.on('data', (data) => {
    console.log(`[LSP SERVER LOG]: ${data}`);
  });
  
  server.on('exit', (code) => {
    console.log(`\nServer process exited with code ${code}`);
  });

  setupMessageReader(server.stdout, (message) => {
    console.log('\n<--- Received ' + (message.id ? 'response' : 'notification') + ' ---\n', JSON.stringify(message, null, 2));

    if (message.id === 1) {
      sendInitialized(server.stdin);
    }
  });

  // === 1. Send 'initialize' request ===
  const initializeRequest = {
    jsonrpc: "2.0",
    id: 1, // Use a unique ID for requests
    method: "initialize",
    params: {
      processId: process.pid,
      rootUri: projectRootUri,
      capabilities: {
        // Announce minimal capabilities for this example
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: false,
            didSave: true,
            willSaveWaitUntil: false
          }
        }
      },
      trace: "off"
    }
  };

  const messageBuffer = createLspMessage(initializeRequest);
  console.log("--- Sending 'initialize' --->\n", JSON.stringify(initializeRequest, null, 2));
  server.stdin.write(messageBuffer);
}

/**
 * @param {import('stream').Writable} stdin
 */
function sendInitialized(stdin) {
  // === 2. Send 'initialized' notification ===
  const initializedNotification = {
    jsonrpc: "2.0",
    method: "initialized",
    params: {} // No params for this notification
  };

  const messageBuffer = createLspMessage(initializedNotification);
  console.log('\n--- Sending "initialized" --->\n', JSON.stringify(initializedNotification, null, 2));
  stdin.write(messageBuffer);
}

main().catch(err => {
  console.error("An error occurred:", err);
  process.exit(1);
});
