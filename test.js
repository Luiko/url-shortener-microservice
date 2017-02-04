const tape = require('tape');
const request = require('request');
const conv = require('./convert-links.js');
const DB = require('./database.js');

//insert this in databe before testing
//{ "original url" : "www.freecodecamp.com", "short url" : "7de23395" }

const url = 'https://url-shortener0.herokuapp.com/';
tape('testin server requests', t => {
    t.plan(3);
    testRequest(url, (response) =>
        t.equal(response.statusCode, 200, 'Web Page Online'));
    testRequest(url + 'new', (response, body) => {
        t.assert(response.headers['content-type'].match('application/json'),
            'get /new return json');
        t.deepEqual(JSON.parse(body), { error: 'no link sent' }, 
            'return error obj with no link sent');
    });
});
function testRequest(url, testCallback) {
    request.get(url, (error, response, body) => {
        if (error) return console.error('Error on testing/client: ', error);
        testCallback(response, body);
    });
}

const page = 'www.google.com';
tape('testing conv-links module', t => {
    t.plan(1);
    let shortUrl = conv.toShort(page);
    let isHex = /^[0123456789abcdef]+$/;
    t.assert(isHex.test(shortUrl), 'short-url is hexadecimal string');
});

tape('testing mongo database collections', t => {
    t.plan(3);
    DB.connectDB((db, err) => {
        t.error(err, 'Connection to mongo database correctly');
        db.createCollection('testCollection').then(() => {
            t.pass('test collections created correctly');
            return db.dropCollection('testCollection');
        }).then(() => {
            t.pass('test collections dropped correctly');
        }).catch(console.error).then(() => db.close());
    });
});
const page2 = { 'original url': 'www.page.com' };
tape('testing mongo database procedures', t => {
    t.plan(3);
    Promise.resolve(DB.insertDoc(page2)).then(() => {
        return DB.urlInDB(page2['original url']);
    }).then(num => {
        t.assert(num, 'link inserted'); //sometimes doesn't pass
        return DB.deleteDoc(page2);
    }).then(() => {
        return DB.urlInDB(page2['original url']);
    }).then(num => {
        t.notOk(num, 'link deleted');
    }).catch(err => {
        console.error(err);
    });
    DB.urlInDB('www.page.m').then(num => {
        t.false(num, 'should not found this link');
    });
});
tape('testing procedures with requests', t => {
    t.plan(19);
    testRequest(url + 'new?link=' + page, (response, body) => {
        if (!body) return;
        let obj = JSON.parse(body);
        t.assert(response.headers['content-type'].match('application/json'),
            'get /new?query return json');
        t.equal(obj['original url'], page, 'Json field expected');
        t.equal(Object.keys(obj).length, 2,
            'Json length expected');
        DB.urlInDB(page).then(num => {
            t.true(num, 'url added into database'); //sometimes fails
        }, err => {
            console.error(err);
        });        
    });
    testRequest(url + 'new/' + page, (response, body) => {
        let obj = JSON.parse(body);
        t.assert(response.headers['content-type'].match('application/json'),
            'get /new/:link return json');
        t.equal(obj['original url'], page,
            'Json field expected');
        t.equal(Object.keys(obj).length, 2,
            'Json length expected');
        Promise.resolve(DB.deleteDoc({ 'original url': page })).then(() => {
            return DB.urlInDB(page);
        }).then(num => {
            t.false(num, 'database restored'); //sometimes fails
        }).catch(err => {
            console.error(err);
        });
    });

    const respface = 'www.facebook.com';
    testRequest(url + 'new/' + 'https://www.facebook.com', (response, body) => {
        try {
            var obj = JSON.parse(body);
        } catch (err) {
            return console.error(err);
        }
        t.assert(response.headers['content-type'].match('application/json'),
            'get /new/:link return json');
        t.equal(obj['original url'], respface,
            'Json field expected');
        t.equal(Object.keys(obj).length, 2,
            'Json length expected');
        Promise.resolve(DB.deleteDoc({ 'original url': respface })).then(() => {
            return DB.urlInDB(respface);
        }).then(num => {
            t.false(num, 'database restored'); //sometimes fails
        }).catch(err => {
            console.error(err);
        });
    });

    const shortlinkStored = '7de23395';
    const urlStored = 'www.freecodecamp.com';
    testRequest(url + shortlinkStored, (response, body) => {
        try {
            var obj = JSON.parse(body);
        } catch (err) {
            return console.error(err);
        }
        t.assert(response.headers['content-type'].match('application/json'),
            'get /new/:link return json');
        t.equal(obj['original url'], urlStored,
            'Json field original url expected');
        t.equal(obj['short url'], shortlinkStored,
            'Json field short url expected');
        t.equal(Object.keys(obj).length, 2,
            'Json length expected');
    });
    testRequest(url + '0000000', (response, body) => {
        try {
            var obj = JSON.parse(body);
        } catch (err) {
            return console.error(err);
        }
        t.assert(response.headers['content-type'].match('application/json'),
            'get /new/:link return json');
        t.equal(obj.error, 'not found',
            'Json field error expected');
        t.equal(Object.keys(obj).length, 1,
            'Json length expected');
    });
});
tape('testing requests with bads urls', t => {
    t.plan(4);
    testRequest(url + 'new/' + 'www.fakewebpage404notfound.com'
        , (response, body) => {
        t.assert(response.headers['content-type']
            .match('application/json'),
            'get /new/:link return json with fake url');
        t.equal(JSON.parse(body).error, 'the url is not valid',
            'error message expected: the url is not valid');
    });
    testRequest(url + 'new/' + 'httasd://www.fakewebpage404notfound.com'
        , (response, body) => {
        t.assert(response.headers['content-type']
            .match('application/json'),
            'get /new/:link return json with fake url');
        t.equal(JSON.parse(body).error, 'path not found',
            'error message expected: path not found');
    });
});
