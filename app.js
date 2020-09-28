// ---------------------------------------- setup ----------------------------------------
// express
const express = require('express');
const app = express();

// modules
const fs = require('fs');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const adminRouter = require('./routes/adminRouter');

// dataModules
// const dataModule = require('./modules/dataModule'); // get data from json-files
// const dataModule = require('./modules/mongodbDataModule'); // get data from database with mongoDB
// const dataModule = require('./modules/mongooseDataModule'); // get data from database with mongoose
const dataModule = require('./modules/mysqlDataModule'); // get data from database with mySql

// views
app.set('view engine', 'ejs');
app.set('views', './views');

// app.use
app.use(express.urlencoded({ extended: false })); // false -> string or array / true -> any type
app.use(express.json()); // parses incoming requests with json payloads to an object
app.use(express.static('./public')); // public-folder
app.use(fileUpload({
    limits: { fileSize: 1 * 1024 * 1024 },
}));
app.use(session({
    secret: 'bookstore',
    resave: false,
    saveUninitialized: false,
    cookie: {}
}));
app.use(cookieParser());

// ---------------------------------------- routes ----------------------------------------
// home
app.get('/', (req, res) => {
    res.render('./main');
});

// shop
app.get('/shop', (req, res) => {
    dataModule.getBooks().then(books => {
        res.render('./shop', { books });
    })
});

// single-book
app.get('/book/:title/:id', (req, res) => {
    dataModule.getBook(req.params.id).then(book => {
        let loggedIn = false; // download-buttons are not activated
        if (req.session.user) {
            loggedIn = true; // download-buttons are activated
        }
        res.render('./single-book', { book, loggedIn })
    }).catch(error => {
        res.send('404, page not found');
    })
});

// about
app.get('/about', (req, res) => {
    res.render('./about');
});

// faq
app.get('/faq', (req, res) => {
    res.render('./faq');
});

// register
app.get('/register', (req, res) => {
    res.render('./register');
});
app.post('/register', (req, res) => {
    const email = req.body.email.trim();
    const password = req.body.password;
    const repeatPassword = req.body.repeatPassword;
    if (email && password && password == repeatPassword) {
        dataModule.registerUser(email, password).then(() => {
            res.json(1); // registration successful
        }).catch(error => {
            console.log(error);
            if (error == "exist") {
                res.json(3); // user already exists
            } else {
                res.json(4); // server error
            }
        })
    } else {
        res.json(2); // inputs not filled or passwords not the same
    }
});

// login
app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/admin');
    } else {
        res.render('./login');
    }
});
app.post('/login', (req, res) => {
    if (req.body.email && req.body.password) {
        dataModule.checkUser(req.body.email.trim(), req.body.password).then(user => {
            req.session.user = user;
            res.json(1); // login successful
        }).catch(error => {
            if (error == 3) {
                res.json(3); // email or password is wrong
            } else {
                res.json(4); // server error
            }
        })
    } else {
        res.json(2); // missing entries
    }
});

// admin
app.use('/admin', adminRouter);

// ---------------------------------------- localhost ----------------------------------------
app.listen(4000, () => {
    console.log('App listening on port 4000!');
});