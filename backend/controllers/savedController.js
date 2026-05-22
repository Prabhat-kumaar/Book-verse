const mongoose = require('mongoose');
const SavedCollection = require('../models/SavedCollection');
const SavedBook = require('../models/SavedBook');
const Book = require('../models/Book');

const DEFAULT_COLLECTION_NAME = 'Saved Books';
const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const getServerBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const normalizeUploadUrl = (req, value = '') => {
    const raw = asTrimmedString(value);
    if (!raw) return '';
    if (/^(blob:|data:)/i.test(raw)) return raw;
    const baseUrl = getServerBaseUrl(req);
    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            if (parsed.pathname.startsWith('/uploads/')) {
                return `${baseUrl}${parsed.pathname}${parsed.search || ''}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }
    if (raw.startsWith('/uploads/')) return `${baseUrl}${raw}`;
    if (raw.startsWith('uploads/')) return `${baseUrl}/${raw}`;
    return `${baseUrl}/uploads/${raw}`;
};
const normalizeSavedDoc = (req, doc) => {
    const source = doc?.toObject ? doc.toObject() : doc;
    if (!source?.book) return source;
    return {
        ...source,
        book: {
            ...source.book,
            thumbnail: normalizeUploadUrl(req, source.book.thumbnail || ''),
            fileUrl: normalizeUploadUrl(req, source.book.fileUrl || source.book.pdf || ''),
            pdf: normalizeUploadUrl(req, source.book.pdf || ''),
        },
    };
};

const ensureDefaultCollection = async (userId) => {
    const existing = await SavedCollection.findOne({ user: userId, name: DEFAULT_COLLECTION_NAME });
    if (existing) return existing;
    return SavedCollection.create({ user: userId, name: DEFAULT_COLLECTION_NAME });
};

const getCollections = async (req, res, next) => {
    try {
        await ensureDefaultCollection(req.user._id);
        const collections = await SavedCollection.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
            {
                $lookup: {
                    from: 'savedbooks',
                    localField: '_id',
                    foreignField: 'collection',
                    as: 'savedItems',
                },
            },
            {
                $addFields: {
                    count: { $size: '$savedItems' },
                },
            },
            { $project: { savedItems: 0 } },
            { $sort: { createdAt: 1 } },
        ]);
        res.json(collections);
    } catch (error) {
        next(error);
    }
};

const createCollection = async (req, res, next) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Collection name is required' });

        const duplicate = await SavedCollection.findOne({
            user: req.user._id,
            name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });
        if (duplicate) return res.status(409).json({ message: 'Collection name already exists' });

        const collection = await SavedCollection.create({
            user: req.user._id,
            name,
        });
        res.status(201).json({ ...collection.toObject(), count: 0 });
    } catch (error) {
        next(error);
    }
};

const renameCollection = async (req, res, next) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Collection name is required' });

        const collection = await SavedCollection.findOne({ _id: req.params.id, user: req.user._id });
        if (!collection) return res.status(404).json({ message: 'Collection not found' });
        if (collection.name === DEFAULT_COLLECTION_NAME) {
            return res.status(400).json({ message: 'Default collection cannot be renamed' });
        }

        const duplicate = await SavedCollection.findOne({
            user: req.user._id,
            _id: { $ne: collection._id },
            name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });
        if (duplicate) return res.status(409).json({ message: 'Collection name already exists' });

        collection.name = name;
        await collection.save();
        res.json(collection);
    } catch (error) {
        next(error);
    }
};

const deleteCollection = async (req, res, next) => {
    try {
        const collection = await SavedCollection.findOne({ _id: req.params.id, user: req.user._id });
        if (!collection) return res.status(404).json({ message: 'Collection not found' });
        if (collection.name === DEFAULT_COLLECTION_NAME) {
            return res.status(400).json({ message: 'Default collection cannot be deleted' });
        }

        await SavedBook.deleteMany({ user: req.user._id, collection: collection._id });
        await collection.deleteOne();
        res.json({ message: 'Collection deleted' });
    } catch (error) {
        next(error);
    }
};

const saveBook = async (req, res, next) => {
    try {
        const { bookId, collectionId } = req.body;
        if (!bookId) return res.status(400).json({ message: 'bookId is required' });
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ message: 'Book not found' });

        let targetCollection = null;
        if (collectionId) {
            targetCollection = await SavedCollection.findOne({ _id: collectionId, user: req.user._id });
            if (!targetCollection) return res.status(404).json({ message: 'Collection not found' });
        } else {
            targetCollection = await ensureDefaultCollection(req.user._id);
        }

        const saved = await SavedBook.findOneAndUpdate(
            { user: req.user._id, book: bookId, collection: targetCollection._id },
            { $setOnInsert: { savedAt: new Date() } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).populate('book').populate('collection');

        res.status(201).json(normalizeSavedDoc(req, saved));
    } catch (error) {
        next(error);
    }
};

const removeSavedBook = async (req, res, next) => {
    try {
        const removed = await SavedBook.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!removed) return res.status(404).json({ message: 'Saved item not found' });
        res.json({ message: 'Saved book removed' });
    } catch (error) {
        next(error);
    }
};

const getSavedBooksByCollection = async (req, res, next) => {
    try {
        const collection = await SavedCollection.findOne({ _id: req.params.collectionId, user: req.user._id });
        if (!collection) return res.status(404).json({ message: 'Collection not found' });

        const books = await SavedBook.find({ user: req.user._id, collection: collection._id })
            .populate('book')
            .sort({ savedAt: -1 });
        res.json(books.map((item) => normalizeSavedDoc(req, item)));
    } catch (error) {
        next(error);
    }
};

const getSavedStatus = async (req, res, next) => {
    try {
        const saved = await SavedBook.find({ user: req.user._id })
            .select('_id book collection savedAt')
            .lean();
        res.json(saved);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCollection,
    deleteCollection,
    getCollections,
    getSavedBooksByCollection,
    getSavedStatus,
    removeSavedBook,
    renameCollection,
    saveBook,
};
