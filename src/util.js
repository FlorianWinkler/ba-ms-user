const exec = require('child_process').exec;
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const User = require("../src/User");

const dbUrl = "mongodb://userDB:27017/userDB";
// const dbUrl = "mongodb://10.0.0.166:27017/userDB";
const userCollectionName="user";

const numPopulateItems = 1000;

let hostname = "unknown_host";
let mongodbConn=null;


setHostname();
//wait one second until mongoDB has started properly, before retrieving DB connection
setTimeout(prepareDatabase,1000);

function getDatabaseConnection(callback) {
    if (mongodbConn == null) {
        MongoClient.connect(dbUrl, function (err, connection) {
            assert.equal(null, err);
            mongodbConn = connection;
            console.log("Retrieved new MongoDB Connection");
            callback(mongodbConn);
        });
    } else {
        callback(mongodbConn);
    }
}

function getDatabaseCollection(collectionName, callback){
    getDatabaseConnection(function(conn){
        var collection = conn.collection(collectionName);
        callback(collection);
    })
}

function prepareDatabase() {
    getDatabaseConnection(function(connection) {
            connection.dropDatabase();
            console.log("Dropped DB");
            mongodbConn = connection;
            populateDB();
        }
    );
}

function randomNumber(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function compareNumber(a,b){
    return a-b;
}

function setHostname(){
    exec('hostname', function (error, stdOut) {
        hostname = stdOut.trim();
        console.log("Hostname set to: "+hostname);
    });
}
function getHostname(){
    return hostname;
}

function populateDB() {
    let userCollection;
    let nextUserId = 0;

//--------insert Users--------
    getDatabaseCollection(userCollectionName, function (collection) {
            userCollection = collection;
            insertNextUser();
        }
    );

    function insertNextUser() {
        if (nextUserId < numPopulateItems) {
            let user = new User("User" + nextUserId, "user" + nextUserId + "@test.at", "user" + nextUserId);
            userCollection.insertOne({
                _id: nextUserId.toString(),
                user: user
            }, function (err, res) {
                nextUserId++;
                insertNextUser();
            });
        } else {
            console.log("Users inserted");
        }
    }
}


module.exports = {
    getDatabaseConnection: getDatabaseConnection,
    getDatabaseCollection: getDatabaseCollection,
    prepareDatabase: prepareDatabase,
    setHostname: setHostname,
    getHostname: getHostname,
    userCollectionName: userCollectionName,
    numPopulateItems: numPopulateItems
};
