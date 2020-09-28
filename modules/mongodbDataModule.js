// ---------------------------------------- setup ----------------------------------------
// modules
const passwordHash = require('password-hash');
const fs = require('fs');

// mongoDB
const { MongoClient, ObjectID } = require ('mongodb'); // destructured version
const connectionString = 'mongodb+srv://fbw5:123456abc@cluster0.mvghe.mongodb.net/test1?retryWrites=true&w=majority';

// ---------------------------------------- functions ----------------------------------------
function connect () {
    return new Promise((resolve, reject) => {
        MongoClient.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true}).then(client => {
            resolve(client);
        }).catch(error => {
            reject(error);
        })
    })
}

function registerUser (email, password) {
    return new Promise((resolve, reject) => {
        connect().then(client => {
            const db = client.db('test1');
            db.collection('users').findOne({email: email}).then(user => {
                if (user) {
                    client.close();
                    reject('exist'); // user already exists
                } else {
                    db.collection('users').insertOne({
                        email: email,
                        password: passwordHash.generate(password)
                    }).then(response => {
                        client.close();
                        if (response.result.ok) {
                            resolve(); // registration successful
                        } else {
                            reject("can't insert"); // can't insert new user
                        }
                    }).catch(error => {
                        client.close();
                        reject(error); // server error
                    });
                }
            }).catch(error => {
                client.close();
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    })
}

function checkUser(email, password) {
    return new Promise((resolve, reject) => {
        connect().then(client => {
            const db = client.db('test1');
            db.collection('users').findOne({email: email}).then(user => {
                client.close();
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
                client.close();
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    })
}

function addBook(bookTitle, bookDescription, bookPdf, bookImages, userID) {
    return new Promise((resolve, reject) => {
        connect().then(client => {
            const db = client.db('test1');
            db.collection('books').findOne({title: bookTitle, userID: userID}).then(foundBook => {
                if (foundBook) {
                    client.close();
                    reject(3); // booktitle already exists for this user
                } else {
                    // rename & save book-images
                    const imgsArr = []
                    bookImages.forEach((bookImage, idx) => {
                        let ext = bookImage.name.substr(bookImage.name.lastIndexOf('.'));
                        let newImgName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + idx + ext;
                        bookImage.mv('./public/uploadedFiles/' + newImgName);
                        imgsArr.push('/uploadedFiles/' + newImgName); // array with filepaths
                    });
                    // rename & save pdf-file
                    let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '.pdf'; 
                    bookPdf.mv('./public/uploadedFiles/' + newPdfName);
                    let newPdfUrl = '/uploadedFiles/' + newPdfName;
                    // save new book-object into collection
                    db.collection('books').insertOne({
                        userID: userID,
                        title: bookTitle.trim(),
                        images: imgsArr,
                        pdf: newPdfUrl,
                        description: bookDescription
                    }).then(response => {
                        client.close();
                        if (response.result.ok) {
                            resolve(); // book is saved successfully
                        } else {
                            reject(new Error("can't insert book"));
                        }
                    }).catch(error => {
                        client.close();
                        reject(error); // server error
                    });
                }
            }).catch(error => {
                client.close();
                reject(error); // server error
            })
        }).catch(error => {
            reject(error); // server error
        })
    })
}

function getBooks() {
    return new Promise((resolve, reject) => {
        connect().then(client => {
            const db = client.db('test1');
            db.collection('books').find({}).toArray().then(books => {
                books.forEach(book => {
                    // book['id'] = book['_id'];
                    book.id = book._id; // change _id to id
                });
                client.close();
                resolve(books); // send array of books
            }).catch(error => {
                client.close();
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    });
}

function getBook(id) {
    return new Promise((resolve, reject) => {
        connect().then(client => {
            const db = client.db('test1');
            db.collection('books').findOne({_id: new ObjectID(id)}).then(book => {
                client.close();
                if (book) {
                    book.id = book._id; // change _id to id
                    resolve(book); // returns found book
                } else {
                    reject(new Error("Can't find a book with this id: " + id))
                }
            }).catch(error => {
                client.close();
                reject(error); // server error
            });
        }).catch(error => {
            reject(error); // server error
        })
    });
}

function userBooks(userID) {
    return new Promise((resolve, reject) => {
        connect().then(client => {
            const db = client.db('test1');
            db.collection('books').find({userID: userID}).toArray().then(books => {
                books.forEach(book => {
                    book.id = book._id; // change _id to id
                });
                client.close();
                resolve(books); // send array of books
            }).catch(error => {
                client.close();
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
                
                // update number
                let updateNum = 1;
                if (oldBookData.update) {
                    updateNum = oldBookData.update + 1;
                }
    
                // rename & save URLs & new images
                const newBookImagesUrls = [];
                bookImages.forEach((image, idx) => {
                    const ext = image.name.substr(image.name.lastIndexOf('.')); // .jpg
                    const newImageName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + updateNum + '_' + idx + ext;
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
                    // bookPdf.mv('./public' + oldBookData.pdf);
                    if (fs.existsSync('./public' + oldBookData.pdf)) {
                        fs.unlinkSync('./public' + oldBookData.pdf);
                    }
                    let newPdfName = bookTitle.trim().replace(/ /g, '_') + '_' + userID + '_' + updateNum + '.pdf'; 
                    bookPdf.mv('./public/uploadedFiles/' + newPdfName);
                    pdfUrl = '/uploadedFiles/' + newPdfName;
                }

                // update book in database
                const client = await connect();
                const db = client.db('test1');
                const response = await db.collection('books').updateOne({_id: new ObjectID(bookID)}, {
                    $set: {
                        title: bookTitle,
                        // images: [...keptImages, ...newBookImagesUrls],
                        images: keptImages.concat(newBookImagesUrls),
                        pdf: pdfUrl,
                        description: bookDescription,
                        update: updateNum
                    }
                });
                client.close();
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
                connect().then(client => {
                    const db = client.db('test1');
                    db.collection('books').deleteOne({_id: new ObjectID(bookID)}).then(() => {
                        client.close();
                        resolve();
                    }).catch(error => {
                        client.close();
                        reject(error);
                    })
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