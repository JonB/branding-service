var fs = require('fs'),
    gm = require('gm'),
    join = function (obj) {
        var arr = [], key;
        for (key in obj) {
            arr.push(obj[key]);
        }

        return arr.join('-');
    },
    loadImage = function (url, type, res, next) {
        fs.readFile(url, function (err, data) {
            if (err) {
                next(err);
            }
            res.contentType = type;
            res.end(data);
        });
    };

exports.initialise = function(server) {
    server.get({name: 'images-with-format', path: /image\/(.+)\/([0-9]+)x([0-9]+)\/(png|jpg|jpeg|gif)/}, function (req, res, next) {
        var path = './images/cache/' + join(req.params) + '.' + req.params[3],
            type = 'application/' + req.params[3]; 
        fs.exists(path, function (exists) {
            if (!exists) {
                gm('./images/' + req.params[0] + '.svg')
                    .density(2000, 2000)
                    .resize(req.params[1], req.params[2])
                    .write(path, function () {
                        loadImage(path, type, res, next);
                    });
            } else {
                loadImage(path, type, res, next);
            }
        });
    });

    server.get({name: 'images', path: '/image/:name'}, function (req, res, next) {
        loadImage('./images/' + req.params.name + '.svg', 'application/svg', res, next);
    });
};
