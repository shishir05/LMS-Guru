'use strict';
// Declare app level module which depends on filters, and services

var app = angular.module('myApp', [
    'ngRoute', 'angular.filter', 'ui.bootstrap'
])

app.config(function ($routeProvider, $locationProvider, $httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    $httpProvider.interceptors.push(function ($q, $location) {
        return {
            'responseError': function (rejection) {
                if (rejection.status == 302) {
                    if (JSON.parse(rejection.data).redirect == 'adminhome') {
                        $location.path('/admin');
                    }
                    else if (JSON.parse(rejection.data).redirect == 'userhome') {
                        $location.path('/user');
                    }
                    else if (JSON.parse(rejection.data).redirect == 'signup') {
                        $location.path('/signup');
                    }
                }
                return $q.reject(rejection);
            }
        };
    });

    $routeProvider.
        when('/signup', {
            templateUrl: 'partials/signup'
        }).
        when('/admin', {
            templateUrl: 'partials/adminHomePage'
        }).
        when('/user', {
            templateUrl: 'partials/userHomePage'
        }).
        when('/login', {
            templateUrl: 'partials/login'
        }).
        when('/issuedbooks', {
            templateUrl: 'partials/issuedBooksPage'
        }).
        otherwise({
            redirectTo: '/login'
        });
    $locationProvider.html5Mode(true);
})
    .run(function ($http, $rootScope) {
        //When the app starts,run is executed first and stores the information of logged in user in $rootScope.loggedInUser variable.
        $http.get('/getLoggedInUser').then(function (data) {
            $rootScope.loggedInUser = data.data.userData[0];
        })
    })
    .controller('signUpCtrl', function ($scope, $http, $location, $rootScope) {
        $scope.signUpError = false;
        //addUser registers the user as student
        $scope.addUser = function () {
            $http.post('/setUser', {
                email: $scope.user.email,
                password: $scope.user.password,
                userDetails: $scope.user
            }).then(function (data) {
                $rootScope.loggedInUser = data.data.userData;
                $location.path('user')
            }, function (err) {
                //if username already exists,API throws an error
                if (err.data == 'Unauthorized')
                    $scope.signUpError = true;
            })
        }
    })
    .controller('headerCtrl', function ($scope, $http, $location, $rootScope) {
        $scope.logout = function () {
            $http.get('/logout').then(function (data) {
                //on successful clears the information of user from $rootScope.loggedInUser variable
                $rootScope.loggedInUser = undefined;
                $location.path('/login');
            })
        }
    })
    .controller('loginCtrl', function ($scope, $http, $location, $rootScope) {
        //login is used for signing the student and admin
        $scope.login = function () {
            $scope.loginError = false;
            $http.post('/login', {username: $scope.user.email, password: $scope.user.password}).then(function (data) {
                //based on account type,user is redirected to admin home or user home
                if (data.data.userData.admin) {
                    $rootScope.loggedInUser = data.data.userData;
                    $location.path('/admin')
                }
                else {
                    $rootScope.loggedInUser = data.data.userData;
                    $location.path('/user')
                }
            }, function (err) {
                //if invalid email or password is entered,API throws an error
                if (err.data == 'Unauthorized')
                    $scope.loginError = true;
            })
        }
    })
    .controller('userHomeCtrl', function ($scope, $http, productSearchService, $rootScope) {
        //function is used to issue the book to particular student
        $scope.issueBook = function (book) {
            var issueDate = new Date();
            var returnAfter = 7;//duration after which the book should be returned
            var returnDate = new Date();
            returnDate.setDate(issueDate.getDate() + returnAfter);
            //checks whether the book is already issued to logged in student or not
            //If book is already issued to loggedin student,then 'return book' request is sent to Server
            if (book.isIssued) {
                $rootScope.loggedInUser.book = _.reject($rootScope.loggedInUser.book, function (mybook) {
                    return mybook.bookId == book._id
                })
            }

            //If book is not issued to loggedin student,then 'issue book' request is sent to Server
            else {
                $rootScope.loggedInUser.book.push({'bookId': book._id, 'issueDate': issueDate, 'return': returnDate});
            }
            $http.post('/issueReturnBook', {
                issuedBookId: book._id,//unique book id
                isIssued: book.isIssued,//book Issue or return request
                user: $rootScope.loggedInUser._id,//unique user id
                booksArray: $rootScope.loggedInUser.book//Array of all books issued to loggedIn user
            }).then(function (data) {
                $scope.getAllBooks();//reloads all book from server with latest stock information
            })
        }
        $scope.searchThisProduct = '';

        //fetches all book from server with latest stock information
        $scope.getAllBooks = function () {
            $http.get('/getAllBooks').then(function (data) {
                var flag = 0;
                _.each(data.data, function (bk) {
                    _.each($rootScope.loggedInUser.book, function (mybook) {
                        //running a loop on all books array and checking which books are issued to loggedin user
                        //Setting isIssued variable as true or false to show ISSUE BOOK or RETURN BOOK Button on USERPAGE
                        if (mybook.bookId == bk._id) {
                            flag = 1
                            bk.isIssued = true;
                            bk.issueDate = mybook.issueDate;
                            bk.return = mybook.return;
                        }
                    })
                    if (flag == 0) {
                        bk.isIssued = false;
                    }
                })
                $scope.AllBooks = data.data;
            })
                .then(function () {
                    //Popuating Data fro search Purpose
                    var searchProductsArray = $scope.AllBooks;
                    searchProductsArray = searchProductsArray.sort(function (a, b) {
                        var product1 = a.title;
                        var product2 = b.title;
                        if (product1 > product2) return 1;
                        if (product1 < product2) return -1;
                        return 0;
                    });
                    $scope.data = {"searchProductsArray": [], "search": ''};
                    $scope.search = function () {
                        if ($scope.data.search != '') {
                            productSearchService.searchThisProduct($scope.data.search, searchProductsArray).then(
                                function (matches) {
                                    $scope.data.searchProductsArray = [];
                                    _.each(matches, function (item) {
                                        if (item.searchByTitle)
                                            $scope.data.searchProductsArray.push(item.title);
                                        else
                                            $scope.data.searchProductsArray.push(item.category);
                                        $scope.data.searchProductsArray = _.uniq($scope.data.searchProductsArray)
                                    })
                                }
                            )
                        }
                        else {
                            $scope.data = {"searchProductsArray": [], "search": ''};
                        }
                    }
                    //function is invoked when er click any book name in search drop down list
                    $scope.selectThis = function (val) {
                        $scope.searchThisProduct = val;
                        $scope.data = {"searchProductsArray": [], "search": val};
                    }
                    //clears search drop down list
                    $scope.clear = function (val) {
                        if (val == '') {
                            $scope.searchThisProduct = '';
                            $scope.data = {"searchProductsArray": [], "search": ''};
                        }
                    }
                    //removes the search filter
                    $scope.cancelSearch = function () {
                        $scope.searchThisProduct = '';
                        $scope.data.search = '';
                    }
                })
        }
        $scope.getAllBooks();
    })
    .controller('issuedBookCtrl', function ($scope, $http) {
        //This section is used by admin, to see the list of all books issued to students
        $scope.issuedBookList = [];
        $http.get('/getAllBooks').then(function (data) {
            //all books from Database are stored into AllBooks array
            $scope.AllBooks = data.data;
            $http.get('/allUsers').then(function (userData) {
                //gets the list of all users
                _.each($scope.AllBooks, function (book) {
                    var users = [];
                    _.each(userData.data, function (user) {
                        _.each(user.book, function (books) {
                            if (book._id == books.bookId) {
                                users.push({
                                    'name': user.name,
                                    'email': user.email,
                                    'phone': user.phone,
                                    issueDate: books.issueDate,
                                    return: books.return
                                })
                            }
                        })
                    })
                    //creating a new array issuedBookList which list of all books and the student to whom that book is issued
                    $scope.issuedBookList.push({
                        'title': book.title,
                        'author': book.author,
                        'genre': book.genre,
                        'users': users
                    })
                })
            })
        })
    })
    .controller('adminHomeCtrl', function ($scope, $http) {
        //fetches the list of all book from database
        $http.get('/getAllBooks').then(function (data) {
            $scope.AllBooks = data.data;
        })
    })
    .filter('filterStock', function () {
        //in admin home page, admin can filter books according to no of books in stocks i.e  'all'  for all books, 'out' for out of stock books, 'in' for in stock books
        return function (allbooks, stock) {
            if (allbooks) {
                if (stock == 'all') {
                    return allbooks;
                }
                else {
                    return allbooks.filter(function (singleProduct) {
                        if (stock == 'out') {
                            return singleProduct.stock == 0
                        }
                        else if (stock == 'in') {
                            return singleProduct.stock > 0
                        }
                        return false;
                    });
                }
            }
        }
    })
    .filter('searchFilter', function () {
        //in user home , user can search book on the basis of title and category.
        return function (products, searchThis) {
            if (products) {
                //if search box is empty, returns all the books
                if (searchThis == '') {
                    return products;
                }
                else {

                    //if search box is contains valid title or category then it returns the book on the basis of input in text box
                    return products.filter(function (singleProduct) {
                        if (singleProduct.title == searchThis) {
                            return true;
                        }
                        else if (singleProduct.category == searchThis) {
                            return true;
                        }
                        return false;
                    });
                }
            }
        }
    })
    .service('productSearchService', function ($q, $timeout) {
        var matches;
        var searchThisProduct = function (searchFilter, searchProductsArray) {
        var deferred = $q.defer();
            matches = searchProductsArray.filter(function (singleProduct) {
                if (singleProduct.title.toLowerCase().indexOf(searchFilter.toLowerCase()) >= 0) {
                    singleProduct.searchByTitle = true;
                   return true;
                }
                else if (singleProduct.category.toLowerCase().indexOf(searchFilter.toLowerCase()) >= 0) {
                    singleProduct.searchByTitle = false;
                    return true;
                }
            })
            $timeout(function () {
                deferred.resolve(matches);
            }, 100);
            return deferred.promise;
        };
        return {
            searchThisProduct: searchThisProduct
        }
    })
    .directive('numbersOnly', function () {
        //directive prevent user to enter number in telephone textbox
        return {
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {
                        var transformedInput = text.replace(/[^0-9]/g, '');

                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    });
