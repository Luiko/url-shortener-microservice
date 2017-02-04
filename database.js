const mongodb = require('mongodb');

const MongoClient = mongodb.MongoClient;

//connection string stored in heroku config values
const url = process.env.DBConStr;

function connectDB(fn) {
    if (fn) {
        MongoClient.connect(url, (err, db) => {
            if (err) return console.error(err);
            fn(db, err);
        });
    }
    else {
        return MongoClient.connect(url);
    }
}
function insertDoc(data) {
    connectDB((db, err) => {
        if (err) console.error(err);
        const collection = db.collection('urlShortened');
        data.dbConnDelay = Date.now() - data.serverTime;
        collection.insert(data);
        db.close();
    });
}
function deleteDoc(data) {
    connectDB((db, err) => {
        if (err) console.error(err);
        const collection = db.collection('urlShortened');
        collection.remove(data);
        db.close();
    });
}
function urlInDB(link) {
    return connectDB().then(db => {
        const collection = db.collection('urlShortened');
        const num = collection.find({ 'original url': link }).count();
        db.close();
        return num;
    });
}
function takeDocument(data) {
    return connectDB().then(db => {
        const collection = db.collection('urlShortened');
        const prom = collection.find(data, { _id: 0, serverTime: 0, dbConnDelay: 0}).toArray();
        db.close();
        return prom;
    }).then(arr => {
        return arr[0];
    }).catch(err => {
        console.error(err);
    });
}

module.exports = {
    connectDB: connectDB,
    urlInDB: urlInDB,
    deleteDoc: deleteDoc,
    insertDoc: insertDoc,
    takeDocument, takeDocument
};
