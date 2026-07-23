#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 * cfn-lsp-proxy-client — Bridges stdio ↔ TCP for JetBrains LSP integration
 *
 * JetBrains IDE spawns this via createCommandLine(), expecting stdio LSP communication.
 * This script connects to the cfn-lsp-proxy TCP server and bridges the two transports.
 *
 * Usage: cfn-lsp-proxy-client.js --port=PORT
 */

import { connect } from 'net';

// Parse port from command line
const portArg = process.argv.find((a) => a.startsWith('--port='));
if (!portArg) {
    process.stderr.write('Usage: cfn-lsp-proxy-client.js --port=PORT\n');
    process.exit(1);
}

const port = Number.parseInt(portArg.split('=')[1], 10);

if (Number.isNaN(port) || port <= 0 || port > 65_535) {
    process.stderr.write(`Invalid port: ${portArg}\n`);
    process.exit(1);
}

// Connect to the proxy
const socket = connect({ port, host: '127.0.0.1' }, () => {
    process.stderr.write(`Connected to cfn-lsp-proxy on port ${port}\n`);
});

// Pipe: IDE (stdin) → proxy (TCP)
process.stdin.pipe(socket);

// Pipe: proxy (TCP) → IDE (stdout)
socket.pipe(process.stdout);

// Handle socket errors
socket.on('error', (err: Error) => {
    process.stderr.write(`Proxy connection error: ${err.message}\n`);
    process.exit(1);
});

// Handle socket close
socket.on('close', () => {
    process.stderr.write('Proxy connection closed\n');
    process.exit(0);
});

// Cleanup on process signals
process.on('SIGTERM', () => {
    socket.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    socket.destroy();
    process.exit(0);
});

// Keep the process running while socket is open
process.stdin.resume();
