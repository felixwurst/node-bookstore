// ---------------------------------------- setup ----------------------------------------
// modules
const express = require ('express');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const dataModule = require('./modules/dataModule');
const adminRouter = require('./routes/adminRouter');

// app
const app = express();
// app-set -> views
app.set('view engine', 'ejs');
app.set('views', './views');
// app-use
app.use(express.urlencoded({extended: false})); // false -> string or array / true -> any type
app.use(express.json()); // parses incoming requests with json payloads to an object
app.use(express.static('./public')); // public-folder
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
}));
app.use(session({
    secret: 'bookstore',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } 
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
        res.render('./shop', {books});
    })
});

// single-book
app.get('/shop/:title', (req, res) => {
    const bookTitle = req.params.title; // e.g. Harry_Potter
    const booksObj = JSON.parse(fs.readFileSync('./books.json'));
    const foundBookTitle = booksObj.books.find(book => book.title.trim().replace(/ /g, '_') == bookTitle);
    
    // console.log(foundBookTitle);
    if (foundBookTitle) {
        res.render('./single-book', {
            title: foundBookTitle.title,
            description: foundBookTitle.description,
            imgs: foundBookTitle.imgs,
            pdfUrl: foundBookTitle.pdfUrl
        });
    } else {
        res.send("404: Not found");
    }
});

// login
app.get('/login', (req, res) => {
    res.render('./login');
});

// register
app.get('/register', (req, res) => {
    res.render('./register');
});
app.post('/register', (req, res) => {
    // console.log(req.body);
    const email = req.body.email.trim();
    const password = req.body.password;
    const repeatPassword = req.body.repeatPassword;
    if (email && password && password == repeatPassword) {
        // console.log('Inputs are ok');
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
        res.json(2); // inputs not filled || passwords not the same
    }
});

// admin
app.use('/admin', adminRouter);

// ---------------------------------------- localhost ----------------------------------------
app.listen(3000, () => {
    console.log('App listening on port 3000!');
});