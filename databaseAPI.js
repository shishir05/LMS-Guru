/**
 * Created by Guru on 06/26/16.
 */
var mongodb = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/LMS');
var _ = require('underscore');
var bcrypt = require('bcryptjs');
var ObjectId = require('mongodb').ObjectID;
var uri = 'mongodb://localhost:27017/LMS';
var db;
//Database connection set up
mongodb.MongoClient.connect(uri, function (err, dbs) {
    if (err) throw err;
    db = dbs;
});
//mongoose set up
var dbmongoose = mongoose.connection;
dbmongoose.on('error', console.error.bind(console, 'connection error:'));
dbmongoose.once('open', function (callback) {
});

//user Table Schema
var userSchema = new mongoose.Schema({
        email: {type: 'string', required: true, trim: true, index: {unique: true}},
        password: {type: 'string', required: true, trim: true},
        name: {type: 'string', required: true, trim: true},
        course: {type: 'string', required: true, trim: true},
        phone: {type: 'number', required: true, trim: true, min: 10},
        admin: {type: 'boolean', required: true, default: false},
        book: [{
            bookId: {type: 'string', trim: true},
            issueDate: {type: 'date', trim: true},
            return: {type: 'date', trim: true},
            overdue: {type: 'boolean', trim: true}
        }]
    },
    {
        collection: "user"
    });
//user Table Modelling
var user = mongoose.model('user', userSchema);

//book Table Schema
var bookSchema = new mongoose.Schema({
        author: {type: 'string', required: true, trim: true},
        stock: {type: 'number', required: true, trim: true},
        category: {type: 'string', required: true, trim: true},
        genre: {type: 'string', required: true, trim: true},
        title: {type: 'string', required: true, trim: true}
    },
    {
        collection: "book"
    });
//book Table Modelling
var book = mongoose.model('book', bookSchema);

//fetches all books from database
exports.getAllBooks = function (req, res) {
    var query = book.find();
    query.exec(function (err, results) {
        if (err) return (err);
        res.json(results);
    })
};

//updates the book stock in book table
//update the books issued to user
exports.issueReturnBook = function (req, res) {
    var issuedBookId = req.body.issuedBookId;
    var isIssued = req.body.isIssued;
    var booksArray = req.body.booksArray;
    var userId = req.body.user;
    var changeInStock;
    user.findOneAndUpdate({_id: ObjectId(userId)}, {book: booksArray}, function (err, results) {
        if (err) {
            console.log("error" + err);
            throw err;
        }
        if (isIssued)
            changeInStock = -1
        else
            changeInStock = 1
        book.findOneAndUpdate({_id: ObjectId(issuedBookId)}, {$inc: {stock: changeInStock}}, function (err, results1) {
            if (err) {
                console.log("error" + err);
                throw err;
            }
        });
        res.json(results);
    });
};
//creates new user in db
exports.setUser = function (req, email, password, done) {
    var userDetails = req.body.userDetails;
    user.findOne({email: userDetails.email}, function (err, document) {
        if (!document) {
            bcrypt.genSalt(10, function (err, salt) {
                if (err) return err;
                // hash the password using our new salt
                bcrypt.hash(userDetails.password, salt, function (err, hash) {
                    if (err) return err;
                    var userEntry = new user({
                        name: userDetails.name,
                        email: userDetails.email,
                        password: hash,
                        phone: userDetails.phone,
                        course: userDetails.course
                    });
                    userEntry.save(function (err, details) {
                        if (err) {
                            console.log(err)
                        }
                        else {
                            console.log("user saved")
                            return done(null, details);
                        }
                    })
                });
            });
        }
        else {
            return done(null, false);
        }
    })
};

//User login function
exports.userLoginMechanism = function (username, password, done) {
    user.findOne({email: username},
        function (err, document) {
            if (err) {
                console.log(err)
                done(null, false);
            }
            else {
                if (document != null) {
                    bcrypt.compare(password, document.password, function (err, res) {
                        if (res) {
                            //case of successful log in
                            return done(null, document);
                        }
                        else {
                            //log in failed
                            return done(null, false);
                        }
                    });
                }
                else {
                    //if user already exists
                    return done(null, false);
                }
            }
        });
};

//fetches all the users
exports.allUsers = function (req, res) {
    var query = user.find();
    query.exec(function (err, results) {
        if (err) return (err)
        res.json(results);
    })
};

//gets the logged in user information
exports.getLoggedInUser = function (req, res) {
    if (typeof(req.user) != 'undefined') {
        var objectId = req.user._id
        var query = user.find({_id: ObjectId(objectId)});
        query.exec(function (err, results) {
            if (err) return (err);
            res.json({"userData": results});
        })
    }
};