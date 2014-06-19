var sass = require('node-sass'),
    fs = require('fs'),
    mu = require('mustache'),
    cache = new (require('mem-cache'))();

var partials = (function() {
    var obj = {};
    fs.readdirSync("./components").forEach(function(component) {
        obj[component] = fs.readFileSync('./components/' + component + '/markup.mustache').toString();
    });

    return obj;
})();

var renderSass = function (component, brand) {
    var css = cache.get('css:' + component + ':' + brand),
        theme = brand || 'iplayer';

    if (!css) {
        console.log('Rendering sass', component);
        css = sass.renderSync({
            file: './components/' + component + '/styles.scss',
            outputStyle: 'compressed',
            includePaths: ['themes/' + theme]
        });
        cache.set('css:' + component + ':' + brand, css);
    }

    return css;
};

var renderMustache = function (component, query, callback) {
    var html = cache.get('html:' + component),
        config, template;

    if (!html) {
        console.log('Rendering mustache', component);
        config = JSON.parse(fs.readFileSync('./components/' + component + '/config.json'));
        template = fs.readFileSync('./components/' + component + '/markup.mustache');
        html = mu.render(template.toString(), config, partials);

        cache.set('html:' + component, html);
    }

    return html;
}

exports.initialise = function(server) {
    server.get({name: 'preview', path: '/preview/:component'}, function (req, res, next) {
        var css = renderSass(req.params.component, req.params.theme),
            markup = renderMustache(req.params.component, req.query);

        res.contentType = 'text/html';
        res.write(
            '<div id="tviplayer">' +
            '<h1>' + req.params.component + '</h1>' + 
            markup + 
            '</div>' +
            '<link rel="stylesheet" href="http://static.bbci.co.uk/frameworks/barlesque/2.60.9/orb/4/style/orb.css" />' +
            '<style>' + css + '</style>'
        );
        res.end();
    });

    server.get('/component/:component', function (req, res, next) {
        res.send({
            markup: renderMustache(req.params.component, req.query),
            styles: renderSass(req.params.component),
            preview: server.router.render('preview', {component: req.params.component})
        });
        return next();
    });

    server.get({name: 'styles', path: '/styles/:component'}, function (req, res, next) {
        var response = {};
        response[req.params.component] = renderSass(req.params.component);
        res.send(response);
        return next();
    });

    server.get({name: 'markup', path:'/markup/:component'}, function (req, res, next) {
        renderMustache(req.params.component, req.query, function (data) {
            res.send({markup: data});
            return next();
        });
    });
};
