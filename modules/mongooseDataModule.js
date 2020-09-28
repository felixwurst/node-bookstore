// ---------------------------------------- setup ----------------------------------------
// modules
const passwordHash = require('password-hash');
const fs = require('fs');

// mongoose
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const connectionString = 'mongodb+srv://fbw5:123456abc@cluster0.mvghe.mongodb.net/test1?retryWrites=true&w=majority';

// ---------------------------------------- Schemas ----------------------------------------
// Schema for constructing users
const usersSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});
// constructor for new users inside collection users
const Users = mongoose.model('users', usersSchema);

// Schema for constructing books
const booksSchema = new Schema({
    userID: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    images: {
        type: [String], // array of strings
        required: true,
        min: 1
    },
    pdf: {
        type: String,
        required: true
    },
    description: {
        type: String
    }
});
// constructor for new books inside collection books
const Books = mongoose.model('books', booksSchema);

// ---------------------------------------- functions ----------------------------------------
function connect() {
    return new Promise((resolve, reject) => {
        if (mongoose.connection.readyState === 1) {
            resolve();
        } else {
            mongoose.connect(connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useCreateIndex: true
            }).then(() => {
                resolve();
            }).catch(error => {
                reject(error);
            })
        }
    })
}

function registerUser (email, password) {
    return new Promise((resolve, reject) => {
        connect().then(() => {
            const newUser = new Users({
                email: email,
                password: passwordHash.generate(password)
            });
            newUser.save().then(result => {
                console.log(result);
                resolve(); // registration successful
            }).catch(error => {
                console.log(error.code);
                if (error.code === 11000) {
                    reject("email already exists");
                } else {
                    reject(error); // can't save new user
                }
            })
        }).catch(error => {
            reject(error); // server error
        })
    })
}

function checkUser(email, password) {
    return new Promise((resolve, reject) => {
        connect().then(() => {
            Users.findOne({ email: email }).then(user => {
                if (user) {
                    if (passwordHash.verify(password, user.password)) {
                        resolve(user); // password correct
                    } else {
                        reject(3); // password not correct
                    }
                } else {
                    reject(3); // user not found
                }
            }).catch(error => {
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    })
}

function addBook(bookTitle, bookDescription, bookPdf, bookImages, userID) {
    return new Promise((resolve, reject) => {
        connect().then(() => {
            Books.findOne({ title: bookTitle, userID: userID }).then(book => {
                if (book) {
                    reject(3); // booktitle already exists for this user
                } else {
                    // rename & save book-images
                    const imgsArr = []
                    bookImages.forEach((bookImage, idx) => {
                        let ext = bookImage.name.substr(bookImage.name.lastIndexOf('.'));
                        let newImgName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_0_' + idx + ext;
                        bookImage.mv('./public/uploadedFiles/' + newImgName);
                        imgsArr.push('/uploadedFiles/' + newImgName); // array with filepaths
                    });
                    // rename & save pdf-file
                    let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_0.pdf'; 
                    bookPdf.mv('./public/uploadedFiles/' + newPdfName);
                    let newPdfUrl = '/uploadedFiles/' + newPdfName;
                    // save new book-object into collection
                    const newBook = new Books({
                        userID: userID,
                        title: bookTitle.trim(),
                        images: imgsArr,
                        pdf: newPdfUrl,
                        description: bookDescription
                    });
                    newBook.save().then(result => {
                        // console.log(result);
                        resolve(); // book is saved successfully
                    }).catch(error => {
                        reject(error); // server error
                    })
                }
            }).catch(error => {
                reject(error); // server error
            })
        }).catch(error => {
            reject(error); // server error
        })
    })
}

function getBooks() {
    return new Promise((resolve, reject) => {
        connect().then(() => {
            Books.find().then(books => {
                console.log(books);   
                books.forEach(book => {
                    book.id = book._id; // change _id to id
                });
                resolve(books); // send array of books
            }).catch(error => {
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    });
}

function getBook(id) {
    return new Promise((resolve, reject) => {
        connect().then(() => {
                Books.findOne({_id: id}).then(book => {
                if (book) {
                    book.id = book._id; // change _id to id
                    resolve(book); // returns found book
                } else {
                    reject(new Error("Can't find a book with this id: " + id))
                }
            }).catch(error => {
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    });
}

function userBooks(userID) {
    return new Promise((resolve, reject) => {
        connect().then(() => {
            Books.find({userID: userID}).then(books => {
                books.forEach(book => {
                    book.id = book._id; // change _id to id
                });
                resolve(books); // send array of books
            }).catch(error => {
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    });
}

function updateBook(bookID, bookTitle, oldBookImagesUrls, bookDescription, bookImages, bookPdf, userID){
    return new Promise((resolve, reject) => {
        try {
            (async() => {
                // get old book
                let oldBookData = await getBook(bookID);
                // divide images in kept & deleted
                const keptImages = [];
                const deletedImages = [];
                oldBookData.images.forEach(image => {
                    if (oldBookImagesUrls.indexOf(image) >= 0) {
                        keptImages.push(image);
                    } else {
                        deletedImages.push(image);
                    }
                });
                // rename & save URLs & new images
                const newBookImagesUrls = [];
                bookImages.forEach((image, idx) => {
                    const ext = image.name.substr(image.name.lastIndexOf('.')); // .jpg
                    const newImageName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + (oldBookData.__v + 1) + '_' + idx + ext;
                    image.mv('./public/uploadedFiles/' + newImageName); 
                    newBookImagesUrls.push('/uploadedFiles/' + newImageName);
                });
                // delete images from public-folder
                deletedImages.forEach(file => {
                    if (fs.existsSync('./public' + file)) {
                        fs.unlinkSync('./public' + file);
                    }
                });
                // save pdf if user uploaded a new one 
                let pdfUrl = oldBookData.pdf;
                if (bookPdf) {
                    if (fs.existsSync('./public' + oldBookData.pdf)) {
                        fs.unlinkSync('./public' + oldBookData.pdf);
                    }
                    let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + (oldBookData.__v + 1) + '.pdf'; 
                    bookPdf.mv('./public/uploadedFiles/' + newPdfName);
                    pdfUrl = '/uploadedFiles/' + newPdfName;
                }
                // update book in database
                // const client = await connect();
                const response = await Books.updateOne({ _id: bookID }, {
                    title: bookTitle,
                    images: keptImages.concat(newBookImagesUrls),
                    pdf: pdfUrl,
                    description: bookDescription,
                    $inc: {__v: 1} // increases the version-number by 1
                })
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
                // delete images & pdf from public-folder
                book.images.forEach(image => {
                    if (fs.existsSync('./public' + image)) {
                        fs.unlinkSync('./public' + image);
                    }
                })
                if (fs.existsSync('./public' + book.pdf)) {
                    fs.unlinkSync('./public' + book.pdf);
                }
                // delete book from database
                Books.deleteOne({ _id: bookID }).then(() => {
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