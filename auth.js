/**
 * Created by abhishekrathore on 1/30/15.
 */

module.exports = function () {
    "use strict";
    return auth;
};

var auth={};
auth.isAuthenticated = function (req, res, next) {
    "use strict";
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect("/login");
    }
};

