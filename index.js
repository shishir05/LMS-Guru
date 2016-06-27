/**
 * Module dependencies
 */

var multer = require('multer');
var done = false;
var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('error-handler'),
    session = require('express-session'),
    routes = require('./routes'),
    api = require('./routes/api'),
    http = require('http'),
    path = require('path'),
    fs = require('node-fs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var compress = require('compression')
var databaseAPI = require('./databaseAPI');

// Constants
var DEFAULT_PORT = 80;
var PORT = process.env.PORT || DEFAULT_PORT;

// App
var app = express();
app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');
app.set('view engine', 'ejs');
app.set("jsonp callback", true);
app.set('jsonp callback name', 'code');
app.use(function (req, res, next) {
    //console.log('%s %s %s', req.method, req.url, req.path);
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }
});
app.use(compress());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));
//Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());
//user sign strategy
passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    databaseAPI.setUser
));


//user login strategy
passport.use('local-login', new LocalStrategy(
    databaseAPI.userLoginMechanism
));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.get('/logout', function (req, res) {
    req.logout();
    res.json({"status": "logout"});
});

/**
 * Routes
 */
app.options('*', function (req, res) {
    res.send(200);
});

// serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', ensureAuthenticated, routes.partials);
// JSON API
app.get('/api/name', api.name);
app.get('/logout', function (req, res) {
    req.logout();
    res.json({"status": "logout"});
});
app.post('/login', passport.authenticate('local-login'), function (req, res) {
    if (req) {
        res.json({"userData": req.user});
    }
    else {
        console.log("error")
    }
});
app.get('/getLoggedInUser', ensureAuthenticated, databaseAPI.getLoggedInUser)
app.post('/setUser', passport.authenticate('local-signup'), function (req, res) {
    if (req) {
        res.json({"userData": req.user});
    }
    else {
        console.log("error")
    }
});
app.post('/issueReturnBook', ensureAuthenticated, databaseAPI.issueReturnBook);
app.get('/allUsers', ensureAuthenticated, databaseAPI.allUsers);
app.get('/getAllBooks', ensureAuthenticated, databaseAPI.getAllBooks);
app.get('*', routes.index);
app.listen(PORT);
console.log('Running on http://localhost:' + PORT);

function ensureAuthenticated(req, res, next) {
    //case if user is loggedin and is trying to open login or sign up page,it redirect user to the respective home scrren
    if (req.isAuthenticated() && (req.path == "/partials/signup" || req.path == "/partials/login")) {
        if (!req.user.admin) {
            res.status(302);
            res.json({"redirect": "userhome"});
        }
        else {
            res.status(302);
            res.json({"redirect": "adminhome"});
        }
    }
    //case if user is not loggedin and is trying to open login or sign up page
    else if (!req.isAuthenticated() && (req.path == "/partials/signup" || req.path == "/partials/login")) {
        return next();
    }
    //case if user is student and is trying to open admin home page,user is redirected to student home page
    else if (req.isAuthenticated() && (req.path == "/partials/adminHomePage") || req.path == "/partials/issuedBooksPage") {
        if (!req.user.admin) {
            res.status(302);
            res.json({"redirect": "userhome"});
        }
        else
            return next();
    }
    //case if user is admin and is trying to open student home page,user is redirected to admin home page
    else if (req.isAuthenticated() && req.path == "/partials/userHomePage") {
        if (req.user.admin) {
            res.status(302);
            res.json({"redirect": "adminhome"});
        }
        else
            return next();
    }
    //case if user is  loggedin,then user can access api
    else if (req.isAuthenticated()) {
        return next();
    }
    //case if user is not  loggedin,then user is redirected to sign up page
    else {
        res.status(302);
        res.json({"redirect": "signup"});
    }
}

