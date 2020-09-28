// ---------------------------------------- setup ----------------------------------------
// modules
const passwordHash = require('password-hash');
const fs = require('fs');
// mySql
const mySql = require('mysql');

// ---------------------------------------- functions ----------------------------------------
let con = null;
function connect() {
    return new Promise((resolve, reject) => {
        if (con) {
            if (con.state === 'disconnected') {
                con.connect(error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                })
            } else {
                resolve();
            }
        } else {
            con = mySql.createConnection({
                multipleStatements: true,
                host: 'localhost',
                port: 3306,
                user: 'admin',
                password: '12345678',
                database: 'fbw5_test'
            });
            con.connect(error => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        }
    })
}

function runQuery(queryString) {
    return new Promise((resolve, reject) => {
        connect().then(() => {
            con.query(queryString, (error, result, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            })
        }).catch(error => {
            reject(error);
        })
    })
}

function registerUser (email, password) {
    return new Promise((resolve, reject) => {
        runQuery(`INSERT INTO users (email, password) 
        VALUES ('${email}', '${passwordHash.generate(password)}')`).then(result => {
            console.log(result);
            resolve(); // registration successful
        }).catch(error => {
            console.log(error);
            if (error.errno === 1062) {
                reject("email already exists");
            } else {
                reject(error); // can't save new user
            }
        })
    })
}

function checkUser(email, password) {
    return new Promise((resolve, reject) => {
        runQuery(`SELECT * FROM users WHERE email LIKE '${email}'`).then(users => {
            // console.log(users);
            if (users.length === 0) {
                reject(3); // user not found
            } else {
                if (passwordHash.verify(password, users[0].password)) {
                    users[0]._id = users[0].id; // add property _id to user
                    resolve(users[0]); // password correct
                } else {
                    reject(3); // password not correct
                }
            }
        }).catch(error => {
            reject(error); // server error
        });
    })
}

function addBook(bookTitle, bookDescription, bookPdf, bookImages, userID) {
    return new Promise((resolve, reject) => {
        // rename & save pdf-file
        let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_0.pdf';
        bookPdf.mv('./public/uploadedFiles/' + newPdfName);
        let newPdfUrl = '/uploadedFiles/' + newPdfName;
        // save new book into mySql-table
        runQuery(`INSERT INTO books (userID, title, pdf, description) 
        VALUES (${userID}, '${bookTitle}', '${newPdfUrl}', '${bookDescription}')`).then(result => {
            console.log(result);
            // rename & save book-images
            let savedImagesQuery = '';
            bookImages.forEach((bookImage, idx) => {
                let ext = bookImage.name.substr(bookImage.name.lastIndexOf('.'));
                let newImageName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_0_' + idx + ext;
                bookImage.mv('./public/uploadedFiles/' + newImageName);
                const imageUrl = '/uploadedFiles/' + newImageName;
                // insertId = id from book which has been inserted before 
                savedImagesQuery += `INSERT INTO images (image, bookID) VALUES ('${imageUrl}', '${result.insertId}');`
            });
            runQuery(savedImagesQuery).then(() => {
                resolve(); // book is saved successfully
            }).catch(error => {
                reject(error);
            })
        }).catch(error => {
            if (error.errno === 1062) {
                reject(3); // book-title already exists
            } else {
                reject(error);
            }
        })
    })
}

function getBooks() {
    return new Promise((resolve, reject) => {
        // get complete content from tables books & images
        runQuery('SELECT books.*, images.* FROM books INNER JOIN images ON books.id = images.bookID').then(results => {
            // console.log(results);
            const booksArr = []; 
            // build array of books from table-rows, each image has his own row, other elements are duplicated
            results.forEach(result => {
                // if book with id already exists push the remaining images
                let book = booksArr.find(element => element.id == result.bookID);
                if (book) { // row with 2nd image, 3rd image...
                    book.images.push(result.image);
                } else { // row with 1st image
                    booksArr.push({
                        id: result.bookID,
                        userID: result.userID,
                        title: result.title,
                        pdf: result.pdf,
                        description: result.description,
                        images: [result.image]
                    })
                }
            });
            resolve(booksArr); // send array of books                
        }).catch(error => {
            reject(error); // server error
        });
    });
}

function getBook(id) {
    return new Promise((resolve, reject) => {
        // get book & images with a specific bookID
        runQuery(`SELECT books.*, images.* FROM books 
        INNER JOIN images ON books.id = images.bookID 
        WHERE images.bookID = ${id}`).then(results => {
            // console.log(results);
            if (results.length) {
                const book = {};
                // 3 results/rows for 3 images, only image-url is different in each row
                results.forEach(result => {
                    // console.log(result);
                    if (book.id) { // 2nd image, 3rd image...
                        book.images.push(result.image);
                    } else { // 1st image
                        book.id = result.bookID;
                        book.userID = result.userID;
                        book.title = result.title;
                        book.pdf = result.pdf;
                        book.description = result.description;
                        book.images = [result.image];
                    }
                });
                resolve(book);
            } else {
                reject(new Error("Can't find a book with this id: " + id))
            }
        }).catch(error => {
            reject(error); // server error
        });
    });
}

function userBooks(userID) {
    return new Promise((resolve, reject) => {
        // get complete content from tables books & images
        runQuery(`SELECT books.*, images.* FROM books
        INNER JOIN images ON books.id = images.bookID 
        WHERE books.userID = ${userID}`).then(results => {
            // console.log(results);
            const booksArr = [];
            // build array of books from table-rows, each image has his own row, other elements are duplicated
            results.forEach(result => {
                // if book with id already exists push the remaining images
                let book = booksArr.find(element => element.id == result.bookID);
                if (book) { // row with 2nd image, 3rd image...
                    book.images.push(result.image);
                } else { // row with 1st image
                    booksArr.push({
                        id: result.bookID,
                        userID: result.userID,
                        title: result.title,
                        pdf: result.pdf,
                        description: result.description,
                        images: [result.image]
                    })
                }
                resolve(booksArr); // send array of books                
            });
        }).catch(error => {
            reject(error); // server error
        });
    });
}

function updateBook(bookID, bookTitle, oldBookImagesUrls, bookDescription, bookImages, bookPdf, userID){
    return new Promise((resolve, reject) => {
        try {
            (async() => {
                // get data from old book
                let oldBookData = await getBook(bookID);

                // divide image-URLs from old book in kept & deleted images
                const keptImages = [];
                const deletedImages = [];
                oldBookData.images.forEach(image => {
                    if (oldBookImagesUrls.indexOf(image) >= 0) {
                        keptImages.push(image);
                    } else {
                        deletedImages.push(image);
                    }
                });

                // new images: rename & save to database & public
                const currentTime = Date.now();
                let newImagesQuery = '';
                bookImages.forEach((image, idx) => {
                    // create URL for image
                    const ext = image.name.substr(image.name.lastIndexOf('.')); // .jpg
                    const newImageName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + currentTime + '_' + idx + ext;
                    const newImageUrl = '/uploadedFiles/' + newImageName;
                    // add new URL to a query for database
                    newImagesQuery += `INSERT INTO images (image, bookID) VALUES ('${newImageUrl}', ${bookID});`;
                    // save image into public-folder
                    image.mv('./public/uploadedFiles/' + newImageName);
                });

                // old images: delete from database & public
                deleteImagesQuery = '';
                deletedImages.forEach(file => {
                    // add URL from deleted image to a query for database
                    deleteImagesQuery += `DELETE FROM images WHERE image LIKE '${file}' AND bookID = ${bookID};`;
                    // delete images from public-folder
                    if (fs.existsSync('./public' + file)) {
                        fs.unlinkSync('./public' + file);
                    }
                });

                // save new pdf if user uploaded one
                let pdfUrl = oldBookData.pdf;
                if (bookPdf) {
                    // rename pdf
                    let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + currentTime + '.pdf';
                    // delete old pdf from public-folder
                    if (fs.existsSync('./public' + oldBookData.pdf)) {
                        fs.unlinkSync('./public' + oldBookData.pdf);
                    }
                    // save new pdf into public-folder
                    bookPdf.mv('./public/uploadedFiles/' + newPdfName);
                    // updated pdf-URL for database
                    pdfUrl = '/uploadedFiles/' + newPdfName;
                }

                // update book in database
                const response = await runQuery(`UPDATE books SET title='${bookTitle}', pdf='${pdfUrl}', description='${bookDescription}'
                WHERE id = ${bookID};` + newImagesQuery + deleteImagesQuery);

                resolve();
            })()
        } catch (error) {
            reject(error);
        }
    })
}

function deleteBook(bookID, userID) {
    return new Promise((resolve, reject) => {
        getBook(bookID).then(book => {
            if (book.userID === userID) {
                // delete images from public-folder
                book.images.forEach(image => {
                    if (fs.existsSync('./public' + image)) {
                        fs.unlinkSync('./public' + image);
                    }
                })
                // delete pdf from public-folder
                if (fs.existsSync('./public' + book.pdf)) {
                    fs.unlinkSync('./public' + book.pdf);
                }
                // delete book from database
                runQuery(`DELETE FROM books WHERE id LIKE ${bookID}`).then(() => {
                // Books.deleteOne({ _id: bookID }).then(() => {
                    resolve();
                }).catch(error => {
                    reject(error);
                })
            } else {
                // userID from user who uploaded the book and who wants to delete it is not the same
                reject(new Error('Do you try to hack us?'));
            }
        }).catch(error => {
            reject(error);
        })
    })
}

// function deleteBook(bookID, userID) {
//     return new Promise((resolve, reject) => {
//         getBook(bookID).then(book => {
//             if (book.userID === userID) {
//                 // delete images & pdf from public-folder
//                 book.images.forEach(image => {
//                     if (fs.existsSync('./public' + image)) {
//                         fs.unlinkSync('./public' + image);
//                     }
//                 })
//                 if (fs.existsSync('./public' + book.pdf)) {
//                     fs.unlinkSync('./public' + book.pdf);
//                 }
//                 // delete book from database
//                 Books.deleteOne({ _id: bookID }).then(() => {
//                     resolve();
//                 }).catch(error => {
//                     reject(error);
//                 })
//             } else {
//                 // userID from user who uploaded the book and who wants to delete it is not the same
//                 reject(new Error('Do you try to hack us?'));
//             }
//         }).catch(error => {
//             reject(error);
//         })
//     })
// }

// ---------------------------------------- export ----------------------------------------
module.exports = {
    registerUser,
    checkUser,
    addBook,
    getBooks,
    getBook,
    userBooks,
    updateBook,
    deleteBook
}