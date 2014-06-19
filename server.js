var restify = require('restify'),
    fs = require('fs'),
    server = restify.createServer({
      name: "iPlayer Branding Service",
      version: "0.1.0"
    });

// Create cache directories
fs.mkdir('./images/cache', function () {});

server.use(restify.queryParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());

fs.readdirSync("./routes").forEach(function(file) {
  require("./routes/" + file).initialise(server);
});

server.listen(8080, function () {
  console.log('Server listening on port 8080');
});
