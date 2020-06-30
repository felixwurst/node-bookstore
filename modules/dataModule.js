// ---------------------------------------- setup ----------------------------------------
const fs = require('fs');

// ---------------------------------------- functions ----------------------------------------
function registerUser (email, password) {
    // console.log(email);
    // console.log(password);
    return new Promise((resolve, reject) => {
        const data = JSON.parse(fs.readFileSync('./users.json'));
        const existUser = data.users.find(user => user.email == email);
        if (existUser) {
            reject('exist'); // error: user already exists -> app.js
        } else {
            data.users.push({ // create new user object
                id: data.newId,
                email: email,
                password: password
            })
            data.newId++; // increase newId
            fs.writeFileSync('./users.json', JSON.stringify(data));
            resolve(); // success: registration is successful -> app.js
        }
    })
}

function addBook(bookTitle, bookDetails, bookPDF, bookImages) {
    // console.log(bookTitle);
    // console.log(bookDetails);
    // console.log(bookPDF);
    // console.log(bookImages);
    return new Promise((resolve, reject) => {
        // check if bookTitle exists for this user
        const booksObj = JSON.parse(fs.readFileSync('./books.json'));
        const bookTitleExist = booksObj.books.find(book => {
            return book.title == bookTitle && book.userId == 1;
        });

        if (bookTitleExist) {
            reject(3); // error: booktitle already exists-> adminRouter.js
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
            bookPDF.mv('./public/uploadedFiles/' + newPdfName);
            let newPdfUrl = '/uploadedFiles/' + newPdfName;

            // save new book-object in json-file
            booksObj.books.push({
                id: booksObj.newId,
                title: bookTitle.trim(),
                description: bookDetails,
                imgs: imgsArr,
                pdfUrl: newPdfUrl,
                userId: 1
            });
            booksObj.newId++; // increase newId
            fs.writeFileSync('./books.json', JSON.stringify(booksObj))
            resolve(); // success: book is saved -> adminRouter.js
        }
    })
}

function getBooks() {
    return new Promise((resolve, reject) => {
        const booksObj = JSON.parse(fs.readFileSync('./books.json'));
        resolve(booksObj.books); // only send books-array from json-file
    });
}

// ---------------------------------------- export ----------------------------------------
module.exports = {
    registerUser,
    addBook,
    getBooks
}