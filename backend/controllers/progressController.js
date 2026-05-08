const Progress = require('../models/Progress');
const Book = require('../models/Book');

const trackProgress = async (req, res, next) => {
    try {
        const { userId, bookId, page, currentPage, totalPages, progressPercentage } = req.body;
        const trimmedUserId = userId?.trim();
        const resolvedCurrentPage = Number.isInteger(currentPage) ? currentPage : page;

        if (!trimmedUserId || !bookId || resolvedCurrentPage === undefined) {
            return res.status(400).json({ message: 'userId, bookId, and currentPage are required' });
        }

        if (!Number.isInteger(resolvedCurrentPage) || resolvedCurrentPage < 0) {
            return res.status(400).json({ message: 'currentPage must be a non-negative integer' });
        }

        const safeTotalPages = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1;
        const safeProgressPercentage =
            typeof progressPercentage === 'number' && Number.isFinite(progressPercentage)
                ? Math.max(0, Math.min(100, progressPercentage))
                : Math.max(0, Math.min(100, (resolvedCurrentPage / safeTotalPages) * 100));

        if (!Number.isInteger(safeTotalPages) || safeTotalPages < 1) {
            return res.status(400).json({ message: 'totalPages must be a positive integer' });
        }

        const existingBook = await Book.findById(bookId);
        if (!existingBook) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const updated = await Progress.findOneAndUpdate(
            { userId: trimmedUserId, book: bookId },
            {
                page: resolvedCurrentPage,
                currentPage: resolvedCurrentPage,
                totalPages: safeTotalPages,
                progressPercentage: safeProgressPercentage,
                lastReadAt: Date.now(),
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        ).populate('book');

        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

const getProgressByUser = async (req, res, next) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            res.status(400);
            throw new Error('userId query parameter is required');
        }

        const progress = await Progress.find({ userId: userId.trim() }).populate('book');
        res.json(progress);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    trackProgress,
    getProgressByUser,
};
