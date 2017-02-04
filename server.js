const pug = require('pug');
const express = require('express');
const conv = require('./convert-links.js');
const http = require('http');
const DB = require('./database.js');
let page = pug.renderFile('./index.pug', {
    pagename: 'URL Shortener Microservice',
    url: 'https://url-shortener0.herokuapp.com'
});

const app = express();
app.set('port', process.env.PORT || 5858);
app.use(express.static(__dirname + '/public'));
app.get('/', (_, res) => res.send(page));

const urlparser = /^(https?:[\\\/]+)?([^\/\\]+)/;
function parseUrl(link) {
    let urlarr = [];
    let options = {};
    try {
        urlarr = urlparser.exec(link);
        options.hostname = urlarr[2];
        options.path = link.replace(urlparser, '');
        if (!options.path) delete options.path;
    } catch (err) {
        console.error(new Error('Can\'nt parse link:' + link));
    }
    return options;
}
function asynRequest(options) {
    return new Promise((fulfill, reject) => {
        let req = http.request(options, res => {
            if (res.statusCode < 400) {
                fulfill(res);
            } else reject(new Error(res.statusMessage));
        });
        req.on('error', err => {
            reject(err);
        });
        req.end();
    });
}
function handleNewUrl(res, link) {
    const options = parseUrl(link);
    DB.urlInDB(link).then(num => {
        const create = !Boolean(num);
        let data = null;
        let d = {};
        if (create) {
            return asynRequest(options).then(() => {
                data = {
                    'original url': link,
                    'short url': conv.toShort(link),
                    'serverTime': Date.now()
                };
                Object.assign(d, data);
                DB.insertDoc(d);
                delete data.serverTime;
                return [data, create];
            });
        } else {
            return DB.takeDocument({ 'original url': link }).then(doc => {
                return [doc, create];
            });
        }
    }).then(arr => {
        const create = arr[1];
        res.status(create? 201: 202).json(arr[0]);
    }).catch(err => {
        if (err.message === 'BADPATH') return res.json({ error: 'the url is valid, the path is not' });
        if (err.code === 'ENOTFOUND') return res.json({ error: 'the url is not valid' });
        if (err.statusCode < 500) return res.json({ error: 'bad request' });
        else res.json({ error: 'server problems ' + err.message });
    });
}
app.get('/new', (req, res) => {
    let query = req.query;
    if (!Object.keys(query).length) return res.send({ error: 'no link sent' });

    handleNewUrl(res, query.link);
});
app.get('/new/:link', (req, res) => {
    let link = req.params.link;
    if (!link) return res.send.json({ error: 'link param no found' });

    handleNewUrl(res, link);
});
app.all(/\/new\/(.)/, (req, res) => {
    const regexp = /\/new\/https?:\/\//;
    if (!regexp.test(req.path)) return res.status(404).json({ error: 'path not found' });
    let link = req.path.replace(regexp, '');
    handleNewUrl(res, link);
});
app.get('/:shortlink', (req, res) => {
    let link = req.params.shortlink;
    if (!link) return;
    DB.takeDocument({ 'short url': link }).then(doc => {
        if (doc) res.json(doc);
        else res.json({ error: 'not found' });
    });
});
app.listen(app.get('port'),
    () => console.log('Server listening in port ' + app.get('port'))
);
