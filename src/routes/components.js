var sass = require('node-sass'),
    fs = require('fs'),
    mu = require('mustache'),
    crypto = require('crypto'),
    cache = new (require('mem-cache'))();

var partials = (function() {
    var obj = {};
    fs.readdirSync("./components").forEach(function(component) {
        obj[component] = fs.readFileSync('./components/' + component + '/markup.mustache').toString();
    });

    return obj;
})();

var renderSass = function (component, config) {
    var theme = 'iplayer', css;

    if (config && config.theme) {
        theme = config.theme;
    }

    css = cache.get('css:' + component + ':' + theme);

    if (!css) {
        console.log('Rendering sass', component);
        css = sass.renderSync({
            file: './components/' + component + '/styles.scss',
            outputStyle: 'compressed',
            includePaths: ['themes/' + theme]
        });
        cache.set('css:' + component + ':' + theme, css);
    }

    return css;
};

var renderMustache = function (component, config, callback) {
    var config = config || {},
        md5 = crypto.createHash('md5'),
        key = md5.update(JSON.stringify(config)).digest('hex'),
        html = cache.get('html:' + component + ':' + key),
        template;

    if (!Object.keys(config).length) {
        config = JSON.parse(
            fs.readFileSync('./components/' + component + '/config.json').toString()
        );
    }

    if (!html) {
        console.log('Rendering mustache', component);
        template = fs.readFileSync('./components/' + component + '/markup.mustache');
        html = mu.render(template.toString(), config, partials);

        cache.set('html:' + component + ':' + key, html);
    }

    return html;
}

exports.initialise = function(server) {
    server.get('/preview/all', function (req, res, next) {
        var components = fs.readdirSync('./components/'), css = [], markup = [], i, stats;

        for (i = 0; i < components.length; i++) {
            stats = fs.statSync('./components/' + components[i]);
            if (stats.isDirectory()) {
                css.push(renderSass(components[i], {theme: req.params.theme}));
                markup.push(
                    '<h2 class="branding-service">' +
                    '<a href="' + server.router.render('component', {component: components[i]}) + '">' +
                    components[i].charAt(0).toUpperCase() + components[i].replace('-', ' ').slice(1) +
                    '</a></h2>' +
                    renderMustache(components[i], req.query)
                );
            }
        };

        var index = mu.render(
            fs.readFileSync('./src/index.mustache').toString(),
            {
                content: markup.join('<hr class="branding-service" />'),
                css: css.join()
            }
        );
        res.contentType = 'text/html';
        res.write(index);
        res.end();
        return;
    });

    server.get({name: 'preview', path: '/preview/:component'}, function (req, res, next) {
        var css = renderSass(req.params.component, {theme: req.params.theme}),
            markup = renderMustache(req.params.component, req.query),
            index = mu.render(
                fs.readFileSync('./src/index.mustache').toString(),
                {
                    content: '<h2 class="branding-service">' +
                        '<a href="' + server.router.render('component', {component: req.params.component}) + '">' +
                        req.params.component.charAt(0).toUpperCase() + req.params.component.replace('-', ' ').slice(1) +
                        '</a></h2>' +
                        markup,
                    css: css
                }
            );

        res.contentType = 'text/html';
        res.write(index);
        res.end();
    });

    server.get({name: 'component', path: '/component/:component'}, function (req, res, next) {
        res.send({
            markup: renderMustache(req.params.component),
            styles: renderSass(req.params.component),
            preview: server.router.render('preview', {component: req.params.component})
        });
        return next();
    });

    server.post('/component/:component', function (req, res, next) {
        res.send({
            markup: renderMustache(req.params.component, req.body),
            styles: renderSass(req.params.component, req.body),
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
