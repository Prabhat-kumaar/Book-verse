const Highlight = require('../models/Highlight');
const validate = require('../utils/validate');

const getUserIdFromRequest = (req) => req.user?._id?.toString?.().trim?.() || '';
const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const createHighlight = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const bookId = asTrimmedString(req.body.book || req.body.bookId);
        const cfiRange = asTrimmedString(req.body.cfiRange);
        const text = asTrimmedString(req.body.text);
        const color = asTrimmedString(req.body.color) || 'purple';

        if (!bookId || !validate.objectId(bookId)) {
            return res.status(400).json({ success: false, message: 'Valid book ID is required' });
        }

        if (!cfiRange) {
            return res.status(400).json({ success: false, message: 'cfiRange is required' });
        }

        if (!text) {
            return res.status(400).json({ success: false, message: 'Highlighted text is required' });
        }

        const allowedColors = ['purple', 'yellow', 'green', 'pink'];
        const finalColor = allowedColors.includes(color) ? color : 'purple';

        const highlight = await Highlight.create({
            userId,
            book: bookId,
            cfiRange,
            text,
            color: finalColor,
        });

        return res.status(201).json({
            success: true,
            data: highlight,
        });
    } catch (error) {
        return next(error);
    }
};

const getHighlightsByBook = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const bookId = asTrimmedString(req.params.bookId || req.query.bookId);
        if (!bookId || !validate.objectId(bookId)) {
            return res.status(400).json({ success: false, message: 'Valid bookId is required' });
        }

        const highlights = await Highlight.find({ userId, book: bookId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: highlights,
        });
    } catch (error) {
        return next(error);
    }
};

const deleteHighlight = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const highlightId = asTrimmedString(req.params.id);
        if (!highlightId || !validate.objectId(highlightId)) {
            return res.status(400).json({ success: false, message: 'Valid highlight ID is required' });
        }

        const highlight = await Highlight.findById(highlightId);
        if (!highlight) {
            return res.status(404).json({ success: false, message: 'Highlight not found' });
        }

        if (highlight.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this highlight' });
        }

        await Highlight.findByIdAndDelete(highlightId);

        return res.status(200).json({
            success: true,
            message: 'Highlight deleted successfully',
        });
    } catch (error) {
        return next(error);
    }
};

const updateHighlightNote = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const highlightId = asTrimmedString(req.params.id);
        if (!highlightId || !validate.objectId(highlightId)) {
            return res.status(400).json({ success: false, message: 'Valid highlight ID is required' });
        }

        const highlight = await Highlight.findById(highlightId);
        if (!highlight) {
            return res.status(404).json({ success: false, message: 'Highlight not found' });
        }

        if (highlight.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this highlight' });
        }

        const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
        if (note.length > 1000) {
            return res.status(400).json({ success: false, message: 'Note must be at most 1000 characters' });
        }

        highlight.note = note;
        await highlight.save();

        return res.status(200).json({
            success: true,
            data: highlight,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createHighlight,
    getHighlightsByBook,
    deleteHighlight,
    updateHighlightNote,
};
