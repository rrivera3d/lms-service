#!/usr/bin/env node

/**
 * Module dependencies.
 */
const express = require("express");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;
const config = require('./config');
const http = require('http');

const app = require('./app/service');
app.use(express.static(__dirname+ "/../"));


/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || config.PORT);
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
let wss = new WebSocketServer({server: server});
app.wss = wss;

console.log("websocket server created");

wss.on("connection", function(socket) {

  console.info("websocket connection open");

  // Broadcast to everyone else.
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({
        events: [
          {
            type: "PING",
            payload: {}
          }
        ]
      });
      setTimeout(() => {
        client.send(msg);
      }, 3000);
    }
  });

  socket.on("close", function () {
    console.log("websocket connection close");
  });

  socket.on('error', () => console.log('errored'));
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Service listening on ' + bind);
}
