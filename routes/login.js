var express = require('express');
var mongoose = require('mongoose');

var encrypt = require('../lib/encrypt.js');

var router = express.Router();

// Required models.
var UserModel = require('../models/user.js').model;
var TokenModel = require('../models/token.js').model;

// POST - Login an user.
router.post('/', function(req, res) {

    if (req.param('email') === null ||
            req.param('password') === null) {
        res.statusCode = 400;
        res.send('Missing parameters');
        return;
    }

    // Encrypt password and save encrypted too.
    var password = encrypt.APassword(req.param('password'));

    var userdata = {
        email : req.param('email'),
        password : password
    };

    UserModel.findOne(userdata, function(error, user) {
        if (error) {
            res.statusCode = 500;
            res.send('Error getting token: ' + error);
            return;
        }

        if (!user) {
            res.statusCode = 401;
            res.send('Wrong credentials');
            return;
        }

        // Generate random token.
        var generatedToken = encrypt.AString();

        var tokendata = {
            token : generatedToken,
            userid : user.id,
            expires : 0
        };
        var token = TokenModel(tokendata);
        token.save(function(error) {
            if (error) {
                res.statusCode = 500;
                res.send('Error creating token: ' + error);
                return;
            }

            res.statusCode = 200;
            res.send(token.token);
        });
    });
});

module.exports = router;
