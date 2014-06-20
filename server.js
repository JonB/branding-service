var restify = require('restify'),
    fs = require('fs'),
    server = restify.createServer({
      name: "iPlayer Branding Service",
      version: "0.1.0"
    });

// Create cache directories
fs.mkdir('./images/cache', function () {});

server.get(/\/fonts\/.+/, restify.serveStatic({
  directory: __dirname
}));

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());

fs.readdirSync("./src/routes").forEach(function(file) {
  require("./src/routes/" + file).initialise(server);
});

server.listen(8080, function () {
  console.log('Server listening on port 8080');
});
