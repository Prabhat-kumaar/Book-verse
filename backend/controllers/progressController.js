const Progress = require('../models/Progress');
const Book = require('../models/Book');
const User = require('../models/User');
const ReadingAnalyticsDay = require('../models/ReadingAnalyticsDay');
const validate = require('../utils/validate');

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 10 * 60 * 1000;
const CONTINUE_READING_LIMIT = 30;
const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args) => isDev && console.log(...args);

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const asFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const clampPercentage = (value) => {
    const parsed = asFiniteNumber(value);
    if (parsed === null) return null;
    return Math.max(0, Math.min(100, parsed));
};
const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    return fallback;
};
const parseNonNegativeInt = (value, fallback = 0) => {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    return fallback;
};
const getUserIdFromRequest = (req) => req.user?._id?.toString?.().trim?.() || '';

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

const formatProgressBook = (req, bookDoc) => {
    if (!bookDoc || typeof bookDoc !== 'object' || !bookDoc._id) return null;
    return {
        ...bookDoc,
        thumbnail: formatUploadUrl(req, bookDoc.thumbnail || ''),
        fileUrl: formatUploadUrl(req, bookDoc.fileUrl || bookDoc.pdf || ''),
        pdf: bookDoc.fileType === 'pdf'
            ? formatUploadUrl(req, bookDoc.pdf || bookDoc.fileUrl || '')
            : (bookDoc.pdf || ''),
    };
};

const formatProgressItem = (req, progressDoc) => {
    const source = progressDoc?.toObject ? progressDoc.toObject() : progressDoc;
    if (!source) return null;

    const rawCurrentPage = parsePositiveInt(source.currentPage ?? source.page, 1);
    const rawTotalPages = parsePositiveInt(source.totalPages, 1);
    const safeCurrentPage = Math.max(1, Math.min(rawCurrentPage, rawTotalPages));
    const computedPctFromPage = Math.round((safeCurrentPage / rawTotalPages) * 100);
    const safePercentage = clampPercentage(source.progressPercentage ?? computedPctFromPage);
    const resolvedPercentage = safePercentage === null ? 0 : safePercentage;
    const resolvedCfi = asTrimmedString(source.locationCfi || source.epubCfi || source.cfi || '');
    const normalizedBook = formatProgressBook(req, source.book);

    return {
        ...source,
        userId: source.userId?.toString?.() || source.userId || '',
        book: normalizedBook || source.book || null,
        bookId: normalizedBook?._id?.toString?.() || source.book?._id?.toString?.() || source.book?.toString?.() || '',
        page: safeCurrentPage,
        currentPage: safeCurrentPage,
        totalPages: rawTotalPages,
        percentage: resolvedPercentage,
        progressPercentage: resolvedPercentage,
        epubCfi: resolvedCfi,
        locationCfi: resolvedCfi,
        cfi: resolvedCfi,
        chapterTitle: source.chapterTitle || '',
        chapterIndex: parseNonNegativeInt(source.chapterIndex, 0),
        fileType: source.fileType || normalizedBook?.fileType || 'pdf',
        readingTime: Math.max(0, Number(source.readingTime) || 0),
        completed: Boolean(source.completed || resolvedPercentage >= 98),
        lastReadAt: source.lastReadAt || source.updatedAt || source.createdAt || new Date(0).toISOString(),
    };
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
    const isNewSession = qualifiesSession
        && (!lastSessionAt || now.getTime() - lastSessionAt.getTime() >= SESSION_GAP_MS);

    const prevPercent = existingProgress ? existingProgress.progressPercentage || 0 : 0;
    const becameCompleted = prevPercent < 98 && safeProgressPercentage >= 98;
    const safeReadingSeconds = Math.max(0, Number(readingSeconds) || 0);

    user.analytics = {
        totalPagesRead: (analytics.totalPagesRead || 0) + pageDelta,
        totalReadingSeconds: (analytics.totalReadingSeconds || 0) + safeReadingSeconds,
        totalSessions: (analytics.totalSessions || 0) + (isNewSession ? 1 : 0),
        booksCompleted: (analytics.booksCompleted || 0) + (becameCompleted ? 1 : 0),
        lastSessionAt: isNewSession ? now : analytics.lastSessionAt || null,
    };

    // Validate daily statistics state before applying update to prevent impossible/seeded data
    const dailyRecord = await ReadingAnalyticsDay.findOne({ user: user._id, date: todayStart });
    const newPagesRead = (dailyRecord?.pagesRead || 0) + pageDelta;
    const newReadingSeconds = (dailyRecord?.readingSeconds || 0) + safeReadingSeconds;
    const newSessions = (dailyRecord?.sessions || 0) + (isNewSession ? 1 : 0);

    // Rule 1: If pagesRead > 100 AND readingSeconds === 0, reject the update
    if (newPagesRead > 100 && newReadingSeconds === 0) {
        throw new Error('Impossible data: Cannot read more than 100 pages in 0 seconds.');
    }

    // Rule 2: If sessions > 0 AND readingSeconds === 0, reject the update
    if (newSessions > 0 && newReadingSeconds === 0) {
        throw new Error('Impossible data: Cannot log active sessions with 0 reading seconds.');
    }

    // Rule 5: Minimum readingSeconds per page rule (at least 2 seconds per page)
    if (newPagesRead > 0) {
        const secondsPerPage = newReadingSeconds / newPagesRead;
        if (secondsPerPage < 2) {
            throw new Error('Impossible data: Human reading speed limit violated (minimum 2 seconds per page).');
        }
    }

    await user.save();

    await ReadingAnalyticsDay.findOneAndUpdate(
        { user: user._id, date: todayStart },
        {
            $inc: {
                pagesRead: pageDelta,
                readingSeconds: safeReadingSeconds,
                sessions: isNewSession ? 1 : 0,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return user.analytics;
};

const resolveProgressPayload = ({
    existingProgress,
    requestBody,
    bookDoc,
}) => {
    const rawCurrentPage = requestBody.currentPage ?? requestBody.page;
    const rawTotalPages = requestBody.totalPages;
    const rawCfi = requestBody.epubCfi ?? requestBody.locationCfi ?? requestBody.cfi;
    const rawReadingTime = requestBody.readingTime ?? requestBody.readingSeconds ?? requestBody.readingDuration;

    const fallbackTotal = existingProgress?.totalPages || bookDoc?.totalPages || 100;
    const totalPages = parsePositiveInt(rawTotalPages, fallbackTotal);

    const fallbackCurrent = existingProgress?.currentPage || existingProgress?.page || 1;
    const currentPage = Math.max(
        1,
        Math.min(parsePositiveInt(rawCurrentPage, fallbackCurrent), totalPages)
    );

    const progressPercentage = Math.round((currentPage / totalPages) * 100);

    const locationCfi = asTrimmedString(rawCfi);
    const chapterTitle = validate.sanitize(requestBody.chapterTitle, 200) || '';
    const chapterIndex = parseNonNegativeInt(requestBody.chapterIndex, existingProgress?.chapterIndex || 0);
    const readingTimeDelta = Math.max(0, Math.floor(Number(rawReadingTime) || 0));
    
    const completed = currentPage >= totalPages || progressPercentage >= 98 || Boolean(requestBody.completed);

    const fileType = (() => {
        const fromBody = asTrimmedString(requestBody.fileType).toLowerCase();
        if (fromBody === 'epub' || fromBody === 'pdf') return fromBody;
        if (bookDoc?.fileType === 'epub' || bookDoc?.fileType === 'pdf') return bookDoc.fileType;
        return existingProgress?.fileType || 'pdf';
    })();

    return {
        currentPage,
        totalPages,
        progressPercentage,
        locationCfi,
        chapterTitle,
        chapterIndex,
        readingTimeDelta,
        completed,
        fileType,
    };
};

const saveProgress = async (req, res, next) => {
    try {
        const userIdFromToken = getUserIdFromRequest(req);
        const userIdFromBody = asTrimmedString(req.body?.userId);
        const resolvedUserId = userIdFromToken || userIdFromBody;

        if (!resolvedUserId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
        if (userIdFromToken && userIdFromBody && userIdFromToken !== userIdFromBody) {
            return res.status(403).json({ success: false, message: 'userId mismatch' });
        }

        const bookId = asTrimmedString(req.body?.bookId);
        if (!bookId || !validate.objectId(bookId)) {
            return res.status(400).json({ success: false, message: 'Valid bookId is required' });
        }

        const existingBook = await Book.findById(bookId);
        if (!existingBook) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        const existingProgress = await Progress.findOne({ userId: resolvedUserId, book: bookId });
        const payload = resolveProgressPayload({
            existingProgress,
            requestBody: req.body || {},
            bookDoc: existingBook,
        });

        // Backend Cooldown Protection: Ignore identical updates within 5 seconds
        if (existingProgress &&
            existingProgress.currentPage === payload.currentPage &&
            existingProgress.locationCfi === payload.locationCfi &&
            Date.now() - new Date(existingProgress.updatedAt).getTime() < 5000) {
            
            devLog('[Backend Progress] Cooldown hit - ignoring identical update');
            const normalized = formatProgressItem(req, existingProgress);
            return res.status(200).json({
                success: true,
                message: 'Progress ignored (cooldown)',
                data: normalized,
            });
        }

        const update = {
            userId: resolvedUserId,
            book: bookId,
            currentPage: payload.currentPage,
            totalPages: payload.totalPages,
            progressPercentage: payload.progressPercentage,
            locationCfi: payload.locationCfi,
            chapterTitle: payload.chapterTitle,
            chapterIndex: payload.chapterIndex,
            fileType: payload.fileType,
            completed: payload.completed,
            lastReadAt: new Date(),
        };

        const updateOperation = payload.readingTimeDelta > 0
            ? { $set: update, $inc: { readingTime: payload.readingTimeDelta } }
            : { $set: update };

        const updatedProgress = await Progress.findOneAndUpdate(
            { userId: resolvedUserId, book: bookId },
            updateOperation,
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        ).populate('book');

        const qualifiesForStreak = payload.currentPage > 1
            || payload.progressPercentage > 0
            || payload.readingTimeDelta >= 3
            || Boolean(payload.locationCfi);

        const streakResult = await updateUserStreak({
            userId: resolvedUserId,
            qualifies: qualifiesForStreak,
        });
        const analyticsResult = await updateReadingAnalytics({
            userId: resolvedUserId,
            existingProgress,
            resolvedCurrentPage: payload.currentPage,
            safeProgressPercentage: payload.progressPercentage,
            readingSeconds: payload.readingTimeDelta,
            qualifiesSession: qualifiesForStreak,
        });

        const normalized = formatProgressItem(req, updatedProgress);
        devLog('[Backend Progress] Saved progress:', {
            userId: resolvedUserId,
            bookId,
            currentPage: normalized?.currentPage,
            totalPages: normalized?.totalPages,
            percentage: normalized?.progressPercentage,
            completed: normalized?.completed,
        });

        return res.status(200).json({
            success: true,
            message: 'Progress saved',
            data: {
                ...normalized,
                streak: streakResult?.streak || null,
                streakIncreased: Boolean(streakResult?.streakIncreased),
                analytics: analyticsResult || null,
            },
        });
    } catch (error) {
        return next(error);
    }
};

const getProgressByBook = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const bookId = asTrimmedString(req.params?.bookId || req.query?.bookId);
        if (!bookId || !validate.objectId(bookId)) {
            return res.status(400).json({ success: false, message: 'Valid bookId is required' });
        }

        const progress = await Progress.findOne({ userId, book: bookId }).populate('book');
        return res.status(200).json({
            success: true,
            data: progress ? formatProgressItem(req, progress) : null,
        });
    } catch (error) {
        return next(error);
    }
};

const getContinueReading = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const progressDocs = await Progress.find({
            userId,
            completed: false,
            progressPercentage: { $gt: 0, $lt: 100 },
        })
            .sort({ lastReadAt: -1 })
            .limit(10)
            .populate('book');

        const data = progressDocs
            .map((item) => formatProgressItem(req, item))
            .filter((item) => Boolean(item?.book?._id));

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return next(error);
    }
};

const getProgressByUser = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const queryBookId = asTrimmedString(req.query?.bookId);
        if (queryBookId && queryBookId !== 'undefined') {
            if (!validate.objectId(queryBookId)) {
                return res.status(400).json({ success: false, message: 'Valid bookId is required' });
            }
            const byBook = await Progress.findOne({ userId, book: queryBookId }).populate('book');
            const item = byBook ? formatProgressItem(req, byBook) : null;
            return res.status(200).json({
                success: true,
                data: item ? [item] : [],
            });
        }

        const progress = await Progress.find({ userId })
            .sort({ lastReadAt: -1 })
            .populate('book');
        const data = progress
            .map((item) => formatProgressItem(req, item))
            .filter((item) => Boolean(item?.book?._id));

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return next(error);
    }
};

const markProgressCompleted = async (req, res, next) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const bookId = asTrimmedString(req.body?.bookId);
        if (!bookId || !validate.objectId(bookId)) {
            return res.status(400).json({ success: false, message: 'Valid bookId is required' });
        }

        const existingBook = await Book.findById(bookId);
        if (!existingBook) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        const existingProgress = await Progress.findOne({ userId, book: bookId });
        const totalPages = existingProgress?.totalPages || existingBook?.totalPages || 100;

        const update = {
            userId,
            book: bookId,
            currentPage: totalPages,
            totalPages,
            progressPercentage: 100,
            completed: true,
            lastReadAt: new Date(),
        };

        const updatedProgress = await Progress.findOneAndUpdate(
            { userId, book: bookId },
            { $set: update },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        ).populate('book');

        const streakResult = await updateUserStreak({
            userId,
            qualifies: true,
        });

        const analyticsResult = await updateReadingAnalytics({
            userId,
            existingProgress,
            resolvedCurrentPage: totalPages,
            safeProgressPercentage: 100,
            readingSeconds: 0,
            qualifiesSession: true,
        });

        const normalized = formatProgressItem(req, updatedProgress);

        return res.status(200).json({
            success: true,
            message: 'Book marked as completed',
            data: {
                ...normalized,
                streak: streakResult?.streak || null,
                streakIncreased: Boolean(streakResult?.streakIncreased),
                analytics: analyticsResult || null,
            },
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    saveProgress,
    trackProgress: saveProgress,
    getProgressByBook,
    getContinueReading,
    getProgressByUser,
    markProgressCompleted,
};
