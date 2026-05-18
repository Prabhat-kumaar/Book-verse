const Progress = require('../models/Progress');
const Book = require('../models/Book');
const User = require('../models/User');
const ReadingAnalyticsDay = require('../models/ReadingAnalyticsDay');
const validate = require('../utils/validate');

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 10 * 60 * 1000;
const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const getServerBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const formatUploadUrl = (req, value) => {
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
const formatProgressBook = (req, progressDoc) => {
    const source = progressDoc?.toObject ? progressDoc.toObject() : progressDoc;
    if (!source?.book) return source;
    const normalizedBook = {
        ...source.book,
        thumbnail: formatUploadUrl(req, source.book.thumbnail || ''),
        fileUrl: formatUploadUrl(req, source.book.fileUrl || source.book.pdf || ''),
        pdf: source.book.fileType === 'pdf'
            ? formatUploadUrl(req, source.book.pdf || source.book.fileUrl || '')
            : source.book.pdf || '',
    };
    return { ...source, book: normalizedBook };
};

const atDayStart = (dateLike) => {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
};

const dayDiff = (fromDate, toDate) => {
    const from = atDayStart(fromDate).getTime();
    const to = atDayStart(toDate).getTime();
    return Math.floor((to - from) / DAY_MS);
};

const updateUserStreak = async ({ userId, qualifies }) => {
    if (!qualifies) return null;
    const user = await User.findById(userId);
    if (!user) return null;

    const now = new Date();
    const todayStart = atDayStart(now);
    const streak = user.streak || {};
    const lastReadingDate = streak.lastReadingDate ? new Date(streak.lastReadingDate) : null;

    if (!lastReadingDate) {
        user.streak = {
            ...streak,
            currentStreak: 1,
            longestStreak: Math.max(1, streak.longestStreak || 0),
            lastReadingDate: todayStart,
            totalReadingDays: 1,
            streakFreezeAvailable: streak.streakFreezeAvailable ?? true,
        };
        await user.save();
        return { streakIncreased: true, streakUpdated: true, streak: user.streak };
    }

    const diff = dayDiff(lastReadingDate, todayStart);
    if (diff <= 0) {
        return { streakIncreased: false, streakUpdated: false, streak: user.streak };
    }

    let current = streak.currentStreak || 0;
    let longest = streak.longestStreak || 0;
    let totalDays = streak.totalReadingDays || 0;
    let freezeAvailable = streak.streakFreezeAvailable ?? true;
    let freezeUsedAt = streak.lastFreezeUsedAt || null;
    let streakIncreased = false;

    if (diff === 1) {
        current += 1;
        streakIncreased = true;
    } else if (diff === 2 && freezeAvailable) {
        current += 1;
        freezeAvailable = false;
        freezeUsedAt = now;
        streakIncreased = true;
    } else {
        current = 1;
        freezeAvailable = true;
        streakIncreased = true;
    }

    if (current > longest) longest = current;
    totalDays += 1;
    if (current > 0 && current % 7 === 0) freezeAvailable = true;

    user.streak = {
        currentStreak: current,
        longestStreak: longest,
        lastReadingDate: todayStart,
        totalReadingDays: totalDays,
        streakFreezeAvailable: freezeAvailable,
        lastFreezeUsedAt: freezeUsedAt,
    };
    await user.save();
    return { streakIncreased, streakUpdated: true, streak: user.streak };
};

const updateReadingAnalytics = async ({
    userId,
    existingProgress,
    resolvedCurrentPage,
    safeProgressPercentage,
    readingSeconds,
    qualifiesSession,
}) => {
    const user = await User.findById(userId);
    if (!user) return null;

    const prevPage = existingProgress ? existingProgress.currentPage || existingProgress.page || 0 : 0;
    const pageDelta = Math.max(0, resolvedCurrentPage - prevPage);
    const now = new Date();
    const todayStart = atDayStart(now);

    const analytics = user.analytics || {};
    const lastSessionAt = analytics.lastSessionAt ? new Date(analytics.lastSessionAt) : null;
    const isNewSession = qualifiesSession && (!lastSessionAt || now.getTime() - lastSessionAt.getTime() >= SESSION_GAP_MS);

    const prevPercent = existingProgress ? existingProgress.progressPercentage || 0 : 0;
    const becameCompleted = prevPercent < 95 && safeProgressPercentage >= 95;

    user.analytics = {
        totalPagesRead: (analytics.totalPagesRead || 0) + pageDelta,
        totalReadingSeconds: (analytics.totalReadingSeconds || 0) + Math.max(0, Number(readingSeconds) || 0),
        totalSessions: (analytics.totalSessions || 0) + (isNewSession ? 1 : 0),
        booksCompleted: (analytics.booksCompleted || 0) + (becameCompleted ? 1 : 0),
        lastSessionAt: isNewSession ? now : analytics.lastSessionAt || null,
    };
    await user.save();

    await ReadingAnalyticsDay.findOneAndUpdate(
        { user: user._id, date: todayStart },
        {
            $inc: {
                pagesRead: pageDelta,
                readingSeconds: Math.max(0, Number(readingSeconds) || 0),
                sessions: isNewSession ? 1 : 0,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return user.analytics;
};

const trackProgress = async (req, res, next) => {
    try {
        const userIdFromToken = req.user?._id?.toString?.().trim?.() || '';
        const {
            bookId,
            page,
            currentPage,
            totalPages,
            progressPercentage,
            readingSeconds = 0,
            locationCfi = '',
            chapterTitle = '',
            chapterIndex,
        } = req.body;
        const resolvedCurrentPage = Number.isInteger(currentPage) ? currentPage : page;

        if (!userIdFromToken) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!bookId || !validate.objectId(bookId)) {
            return res.status(400).json({ message: 'Valid bookId is required' });
        }

        if (resolvedCurrentPage === undefined) {
            return res.status(400).json({ message: 'currentPage is required' });
        }

        if (!Number.isInteger(resolvedCurrentPage) || resolvedCurrentPage < 0) {
            return res.status(400).json({ message: 'currentPage must be a non-negative integer' });
        }

        const safeTotalPages = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1;
        if (progressPercentage !== undefined) {
            const pct = Number(progressPercentage);
            if (Number.isNaN(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ message: 'percentage must be between 0 and 100' });
            }
        }

        const safeProgressPercentage =
            progressPercentage !== undefined
                ? Number(progressPercentage)
                : Math.max(0, Math.min(100, (resolvedCurrentPage / safeTotalPages) * 100));

        if (!Number.isInteger(safeTotalPages) || safeTotalPages < 1) {
            return res.status(400).json({ message: 'totalPages must be a positive integer' });
        }

        const existingBook = await Book.findById(bookId);
        if (!existingBook) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const existingProgress = await Progress.findOne({ userId: userIdFromToken, book: bookId });

        const updated = await Progress.findOneAndUpdate(
            { userId: userIdFromToken, book: bookId },
            {
                userId: userIdFromToken,
                page: resolvedCurrentPage,
                currentPage: resolvedCurrentPage,
                totalPages: safeTotalPages,
                progressPercentage: safeProgressPercentage,
                locationCfi: validate.sanitize(locationCfi, 2000),
                chapterTitle: validate.sanitize(chapterTitle, 200),
                chapterIndex: Number.isInteger(chapterIndex) && chapterIndex >= 0 ? chapterIndex : 0,
                lastReadAt: Date.now(),
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        ).populate('book');

        const qualifiesForStreak = resolvedCurrentPage >= 1 || Number(readingSeconds) >= 60;
        const streakResult = await updateUserStreak({
            userId: userIdFromToken,
            qualifies: qualifiesForStreak,
        });
        const analyticsResult = await updateReadingAnalytics({
            userId: userIdFromToken,
            existingProgress,
            resolvedCurrentPage,
            safeProgressPercentage,
            readingSeconds,
            qualifiesSession: qualifiesForStreak,
        });

        res.status(200).json({
            ...formatProgressBook(req, updated),
            streak: streakResult?.streak || null,
            streakIncreased: Boolean(streakResult?.streakIncreased),
            analytics: analyticsResult || null,
        });
    } catch (error) {
        next(error);
    }
};

const getProgressByUser = async (req, res, next) => {
    try {
        const userId = (req.user?._id || '').toString().trim();

        if (!userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const progress = await Progress.find({ userId }).populate('book');
        res.json(progress.map((item) => formatProgressBook(req, item)));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    trackProgress,
    getProgressByUser,
};
