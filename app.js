var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nconf = require('nconf');
var mongoose = require('mongoose');
var fs = require('fs');

// Load config file.
nconf.argv().env().file({file: path.join(__dirname, '/config_backend.json')});

// Check that the required configuration is present.
var requiredConfig = ['MONGO_URI'];
requiredConfig.forEach(function(key) {
    if (nconf.get(key) == null && process.env[key] == null) {
        throw new Error(key + ' is not defined. Ensure that you set it in an ENV var or in config.json');
    }
});

// Persistence layer connection.
mongoose.connect(process.env.MONGO_URI || nconf.get('MONGO_URI'));

// Init the app.
var app = express();

// Routes to components.
var index = require('./routes/index');
var users = require('./routes/users');
var locations = require('./routes/locations');
var locationSubscriptions = require('./routes/locationSubscriptions');
var dishes = require('./routes/dishes');
var meals = require('./routes/meals');
var logs = require('./routes/logs');
var feedback = require('./routes/feedback');

app.use(favicon());

// Log requests to a file.
var accessLogStream = fs.createWriteStream(
    nconf.get('LOGS_DIR') + '/access.log',
    {flags: 'a'}
);
app.use(morgan('combined', {stream: accessLogStream}));

// And also display them in the console.
app.use(morgan('dev'));

// Increasing request size as the image comes with the dish data.
app.use(bodyParser.json({
    limit : '3mb'
}));

app.use(bodyParser.urlencoded());
app.use(cookieParser());

// Response headers.
app.use('/api', function(req, res, next) {

    // Accept different origins than the same domain.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Length, X-Requested-With');
    next();
});

// Default route.
app.use('/', index);

app.options('*', function(req, res) {
    res.status(200).end();
});

app.use('/api', index);
app.use('/api/users', users);
app.use('/api/locations', locations);
app.use('/api/location-subscriptions', locationSubscriptions);
app.use('/api/dishes', dishes);
app.use('/api/meals', meals);
app.use('/api/logs', logs);
app.use('/api/feedback', feedback);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send(err.message);
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
});

module.exports = app;
