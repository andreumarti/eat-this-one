var express = require('express');
var mongoose = require('mongoose');

var router = express.Router();

// Required models.
var MealModel = require('../models/meal.js').model;
var TokenModel = require('../models/token.js').model;

// GET - Meals list.
router.get('/', function(req, res) {

    MealModel.find(function(error, meals) {
        if (error) {
            res.statusCode = 500;
            res.send("Error getting meals: " + error);
            return;
        }
        res.statusCode = 200;
        res.send(meals);
    });
});

// GET - Obtain a specific meal.
router.get('/:id', function(req, res) {

    var id = req.param('id');

    MealModel.findById(id, function(error, meal) {
        if (error) {
            res.statusCode = 500;
            res.send("Error getting '" + id + "' meal: " + error);
            return;
        }
        res.statusCode = 200;
        res.send(meal);
    });
});

// POST - Create a meal.
router.post('/', function(req, res) {

    if (req.param('dishid') === null) {
        res.statusCode = 400;
        res.send("Missing params, can not add meal");
        return;
    }

    if (req.param('token') === null) {
        res.statusCode = 401;
        res.send('Wrong credentials');
        return;
    }

    // Getting userid from the token.
    TokenModel.findOne({token: req.param('token')}, function(error, token) {

        if (error) {
            res.statusCode = 500;
            res.send('Error getting token: ' + error);
            return;
        }

        if (!token) {
            res.statusCode = 401;
            res.send('Wrong credentials');
            return;
        }

        var meal = new MealModel({
            dishid : req.param('dishid'),
            userid : token.userid
        });

        // TODO Check that the dish exists.

        meal.save(function(error) {
            if (error) {
                res.statusCode = 500;
                res.send("Error saving meal: " + error);
                return;
            }

            // Same output for all output formats.
            res.statusCode = 200;
            res.send(meal);
        });
    });
});

router.put('/:id', function(req, res) {
    res.send("Not supported.");
});

router.post('/:id', function(req, req) {
    res.send("Not supported.");
});

router.delete('/:id', function(req, res) {
    res.send("Not supported.");
});

router.delete('/', function(req, res) {
    res.send("Not supported.");
});

router.put('/', function(req, res) {
    res.send("Not supported.");
});

module.exports = router;
