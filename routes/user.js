require('dotenv').config();
const express = require('express');
const router = express.Router();
const assert = require("assert");
const User = require('../src/User');
const util = require('../src/util');

let reqcounter = 0;
let nextUserId = util.numPopulateItems+1000;

router.get('/', function(req, res, next) {
    res.send('User-Service running!');
});

router.get('/preparedb', function(req, res, next) {
    util.prepareDatabase();
    res.send('Populating User DB...');
});

router.post('/register', registerUser);

function registerUser(req, res) {
    reqcounter++;
    let user = new User(
        req.body.username+nextUserId,
        req.body.email+nextUserId+"@test.at",
        req.body.password+nextUserId);
    let randomTenant = util.tenantBaseString+Math.floor((Math.random() * util.numTenants));
    // console.log("Tenant: "+randomTenant);
    findUserByUsername(user.username, randomTenant, function(dbResponse){
        if(dbResponse == null){
            if(checkUserRequirements(user)){
                insertUser(user, randomTenant, function(insertedUser){
                    res.json(insertedUser);
                });
            }
            else{
                res.status(412).end();
            }
        }
        else{
            nextUserId+=1000;
            console.log("Increased next User ID by 1000");
            registerUser(req,res);
        }
    });
}


router.post('/login', function(req, res) {
    reqcounter++;
    let random = Math.floor((Math.random() * util.numPopulateItems));
    let username = req.body.username+random;
    let password = req.body.password+random;
    let randomTenant = util.tenantBaseString+Math.floor((Math.random() * util.numTenants));
    // console.log("Tenant: "+randomTenant);
    findUserByUsername(username, randomTenant, function(dbResponse){
        if(dbResponse != null && checkUserCredentials(dbResponse.user,password)){
            // res.status(200).end();
            res.status(200).json({
                username: username,
                password: password
            });
        }
        else{
            console.log(dbResponse);
            res.status(401).end();
        }
    });
});

//without URL Parameter for Random user retrieval
router.get('/get', function(req, res) {
    reqcounter++;
    let randomUserId = Math.floor((Math.random() * util.numPopulateItems)).toString();
    let randomTenant = util.tenantBaseString+Math.floor((Math.random() * util.numTenants));
    // console.log(randomTenant+" "+randomUserId);
    findUserById(randomUserId, randomTenant, function(dbResponse){
        if(dbResponse != null ){
            res.json(dbResponse);
        }
        else{
            res.status(400).end();
        }
    });
});

//with URL Parameter for usage with shoppingCart Service
router.get('/get/:tenant/:userId', function(req, res) {
    reqcounter++;
    findUserById(req.params.userId, req.params.tenant, function(dbResponse){
        if(dbResponse != null ){
            res.json(dbResponse);
        }
        else{
            res.status(400).end();
        }
    });
});

function insertUser(user, tenant, callback){
    util.getDatabaseCollection(tenant,function (collection) {
            collection.insertOne({
                _id: nextUserId+"",
                user: user
            }, function (err, res) {
                if(err != null && err.code === 11000){
                    //conn.close();
                    //console.log(err);
                    console.log("Caught duplicate Key error while writing document! Retry...");
                    setTimeout(insertUser,100,user,callback);
               }
                else {
                    assert.equal(err, null);
                    //console.log("Inserted successfully:"+res.ops[0]._id);
                    nextUserId++;
                    callback({
                       _id: res.ops[0]._id,
                       user: user
                    });
               }
            });
        });
}


function findUserByUsername(username, tenant, callback) {
    util.getDatabaseCollection(tenant, (async function (collection) {
        let retUser = await collection.findOne({"user.username": username});
        //console.log(retUser);
        callback(retUser);
    }));
}

function findUserById(id, tenant, callback) {
    util.getDatabaseCollection(tenant,(async function (collection) {
        let retUser = await collection.findOne({"_id": id.toString()});
        // console.log(retUser);
        callback(retUser);
    }));
}

function checkUserCredentials(user, password){
    return user.password === password;
}

function checkUserRequirements(user){
    return user.password.length > 4 && user.email.includes("@") && user.email.includes(".");
}


module.exports = router;
