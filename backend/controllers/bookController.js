const Book = require('../models/Book');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const toFileUrl = (req, file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

const addBook = async (req, res, next) => {
    try {
        const title = asTrimmedString(req.body.title);
        const author = asTrimmedString(req.body.author);
        const category = asTrimmedString(req.body.category);

        const pdfUrlInput = asTrimmedString(req.body.pdf);
        const thumbnailUrlInput = asTrimmedString(req.body.thumbnail);

        const pdfFile = req.files?.pdf?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        const pdf = pdfUrlInput || (pdfFile ? toFileUrl(req, pdfFile) : '');
        const thumbnail = thumbnailUrlInput || (thumbnailFile ? toFileUrl(req, thumbnailFile) : '');

        if (!title || !author || !category || !pdf || !thumbnail) {
            return res.status(400).json({ message: 'All book fields are required and cannot be empty' });
        }

        const book = await Book.create({ title, author, category, pdf, thumbnail });
        res.status(201).json(book);
    } catch (error) {
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation error', errors: messages });
        }
        next(error);
    }
};

const getAllBooks = async (req, res, next) => {
    try {
        const { category } = req.query;
        const filter = category ? { category: { $regex: new RegExp(category.trim(), 'i') } } : {};
        const books = await Book.find(filter).sort({ createdAt: -1 });
        if (books.length === 0 && category) {
            return res.json({ message: 'No books found for this category' });
        }
        res.json(books);
    } catch (error) {
        next(error);
    }
};

const getBooksByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
        const categoryRegex = new RegExp(escapeRegex(category.trim()), 'i');
        const books = await Book.find({ category: { $regex: categoryRegex } });
        if (books.length === 0) {
            return res.json({ message: 'No books found for this category' });
        }
        res.json(books);
    } catch (error) {
        next(error);
    }
};

const updateBook = async (req, res, next) => {
    try {
        const bookId = req.params.id;
        const { title, author, category, pdf, thumbnail } = req.body;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        book.title = title || book.title;
        book.author = author || book.author;
        book.category = category || book.category;
        book.pdf = pdf || book.pdf;
        book.thumbnail = thumbnail || book.thumbnail;

        const updatedBook = await book.save();
        res.json(updatedBook);
    } catch (error) {
        next(error);
    }
};

const deleteBook = async (req, res, next) => {
    try {
        const bookId = req.params.id;
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const deletedBook = await Book.findByIdAndDelete(bookId);
        return res.status(200).json(deletedBook);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addBook,
    getAllBooks,
    getBooksByCategory,
    updateBook,
    deleteBook,
};
