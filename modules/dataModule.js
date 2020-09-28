// ---------------------------------------- setup ----------------------------------------
const fs = require('fs');
const passwordHash = require('password-hash');

// ---------------------------------------- functions ----------------------------------------
function registerUser (email, password) {
    return new Promise((resolve, reject) => {
        const data = JSON.parse(fs.readFileSync('./users.json'));
        const existUser = data.users.find(user => user.email == email);
        if (existUser) {
            reject('exist'); // user already exists
        } else {
            data.users.push({ // create new user object
                id: data.newId,
                email: email,
                password: passwordHash.generate(password)
            })
            data.newId++; // increase newId
            fs.writeFileSync('./users.json', JSON.stringify(data));
            resolve(); // registration is successful
        }
    })
}

function checkUser(email, password) {
    return new Promise((resolve, reject) => {
        const usersObj = JSON.parse(fs.readFileSync('./users.json'));
        // check email
        const foundUser = usersObj.users.find(user => user.email == email)  
        if (foundUser) { // check password
            if (passwordHash.verify(password, foundUser.password)) {
                resolve(foundUser); // password is correct
            } else {
                reject(3); // password is not correct
            }
        } else {
            reject(3); // user is not found
        }
    });
}

function addBook(bookTitle, bookDescription, bookPdf, bookImages) {
    return new Promise((resolve, reject) => {
        // check if bookTitle exists for this user
        const booksObj = JSON.parse(fs.readFileSync('./books.json'));
        const bookTitleExist = booksObj.books.find(book => {
            return book.title == bookTitle && book.userId == 1;
        });
        if (bookTitleExist) {
            reject(3); // booktitle already exists
        } else {
            // rename & save book-images
            const imgsArr = []
            bookImages.forEach((bookImage, idx) => {
                // get extension from image -> .jpeg
                let ext = bookImage.name.substr(bookImage.name.lastIndexOf('.'));
                // rename image -> hello_world_1_0.png
                let newImgName = bookTitle.trim().replace(/ /g, '_') + '_' + 1 + '_' + idx + ext;
                bookImage.mv('./public/uploadedFiles/' + newImgName);
                imgsArr.push('/uploadedFiles/' + newImgName); // array with filepaths
            });
            // rename & save pdf-file
            let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + 1 + '.pdf'; 
            bookPdf.mv('./public/uploadedFiles/' + newPdfName);
            let newPdfUrl = '/uploadedFiles/' + newPdfName;
            // save new book-object into json-file
            booksObj.books.push({
                id: booksObj.newId,
                title: bookTitle.trim(),
                description: bookDescription,
                images: imgsArr,
                pdf: newPdfUrl,
                userId: 1
            });
            booksObj.newId++; // increase newId
            fs.writeFileSync('./books.json', JSON.stringify(booksObj))
            resolve(); // book is saved successfully
        }
    })
}

function getBooks() {
    return new Promise((resolve, reject) => {
        const booksObj = JSON.parse(fs.readFileSync('./books.json'));
        resolve(booksObj.books); // sends only the books-array from json-file
    });
}

function getBook(id) {
    return new Promise((resolve, reject) => {
        const booksObj = JSON.parse(fs.readFileSync('./books.json'));
        // find book by ID
        const foundBook = booksObj.books.find(book => book.id == id);
        if (foundBook) {
            resolve(foundBook); // sends only the found book from json-file
        } else {
            reject(new Error('Can not find a book with this id: ' + id))
        }
    });
}

// ---------------------------------------- export ----------------------------------------
module.exports = {
    registerUser,
    checkUser,
    addBook,
    getBooks,
    getBook
}