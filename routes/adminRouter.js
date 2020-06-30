// ---------------------------------------- setup ----------------------------------------
const express = require('express');
const dataModule = require('../modules/dataModule');
const adminRouter = express.Router();

// ---------------------------------------- routes ----------------------------------------
// addbook
adminRouter.get('/addbook', (req, res) => {
    res.render('./addbook');
});
adminRouter.post('/addbook', (req, res) => {
    // console.log(req.body);
    // console.log(req.files); // images & pdf -> {bookImage0:{...},bookImage1:{...},bookPDF:{...}}
    // console.log(Object.keys(req.files)); // get property-names/keys -> ['bookImage0','bookImage1','bookImage2','bookPDF']
    const bookTitle = req.body.bookTitle;
    const bookDetails = req.body.bookDetails;
    const bookPDF = req.files.bookPDF; // req.files['bookPDF'] would be the same

    if (req.files) {
        // all inputs have to be used, req.files needs more than one key -> pdf & img
        if (bookTitle && bookDetails && bookPDF && Object.keys(req.files).length > 1) {
            const bookImages = [];
            for (const key in req.files) { // for-in loops through the properties of an object
                if (req.files[key].mimetype != 'application/pdf') {
                    bookImages.push(req.files[key]); // image-objects(no pdfs) are pushed
                }
            }
            dataModule.addBook(bookTitle, bookDetails, bookPDF, bookImages).then(() => {
                res.json(1); // book is saved(images, pdf & json)
            }).catch(error => {
                if (error == 3) {
                    res.json(3); // booktitle already exists
                }
            });
        } else {
            res.json(2); // not all inputs are filled
        }
    } else {
        res.json(2); // no files are selected
    }
});

// ---------------------------------------- export ----------------------------------------
module.exports = adminRouter;