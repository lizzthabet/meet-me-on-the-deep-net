// Borrowed directly from https://dev.to/adamcoster/create-a-live-reload-server-for-front-end-development-3gnp :)
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const HTTP_PORT = 8089;
const WEBSOCKET_PORT = 8090;
const CLIENT_WEBSOCKET_CODE = fs.readFileSync(path.join(__dirname,'client-websocket.js'),'utf8');

// Websocket server (for allowing browser and dev server to have 2-way communication)
// We don't even need to do anything except create the instance!
const wss = new WebSocket.Server({
  port: WEBSOCKET_PORT
});

/**
 * @typedef {import('http').IncomingMessage} req
 * @typedef {import('http').ServerResponse} res
*/

/** Use classic server-logic to serve a static file (e.g. default to 'index.html' etc)
 * @param {string} route
 * @param {res} res
 * @returns {boolean} Whether or not the page exists and was served
 */
function serveStaticPageIfExists(route,res) {
  // We don't care about performance for a dev server, so sync functions are fine.
  // If the route exists it's either the exact file we want or the path to a directory
  // in which case we'd serve up the 'index.html' file.
  if(fs.existsSync(route)){
    if(fs.statSync(route).isDirectory()){
      return serveStaticPageIfExists(path.join(route,'index.html'),res);
    }
    else if(fs.statSync(route).isFile()){
      res.writeHead(200);
      /** @type {string|Buffer} */
      let file = fs.readFileSync(route);
      if(route.endsWith('.html')){
        // Inject the client-side websocket code.
        // This sounds fancier than it is; simply
        // append the script to the end since
        // browsers allow for tons of deviation
        // from *technically correct* HTML.
        file = `${file.toString()}\n\n<script>${CLIENT_WEBSOCKET_CODE}</script>`;
      }
      res.end(file);
      return true;
    }
  }
  return false;
}

/** General request handler and router
 * @param {req} req
 * @param {res} res
*/
const requestHandler = function (req, res) {
  const method = req.method.toLowerCase();
  if(method=='get'){
    // No need to ensure the route can't access other local files,
    // since this is for development only.
    const route = path.normalize(path.join(__dirname,'public',req.url));
    if(serveStaticPageIfExists(route,res)){
      return;
    }
  }
  res.writeHead(404);
  res.end();
}

const server = http.createServer(requestHandler);
server.listen(HTTP_PORT);
console.log(`Server listening port ${HTTP_PORT}...`)