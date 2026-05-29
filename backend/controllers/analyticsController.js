const User = require('../models/User');
const Book = require('../models/Book');
const Progress = require('../models/Progress');
const SiteStats = require('../models/SiteStats');
const ReadingAnalyticsDay = require('../models/ReadingAnalyticsDay');

const atDayStart = (dateLike) => {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getLast7DayStarts = () => {
    const today = atDayStart(new Date());
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
    });
};

const getDailyAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString?.() || '';
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const today = atDayStart(new Date());
        const day = await ReadingAnalyticsDay.findOne({ user: userId, date: today });
        res.json({
            date: today,
            pagesReadToday: day?.pagesRead || 0,
            readingHoursToday: Number((((day?.readingSeconds || 0) / 3600)).toFixed(2)),
            sessionsToday: day?.sessions || 0,
        });
    } catch (error) {
        next(error);
    }
};

const getWeeklyAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString?.() || '';
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const days = getLast7DayStarts();
        const from = days[0];
        const to = new Date(days[6]);
        to.setHours(23, 59, 59, 999);

        const rows = await ReadingAnalyticsDay.find({
            user: userId,
            date: { $gte: from, $lte: to },
        }).sort({ date: 1 });

        const map = new Map(rows.map((r) => [atDayStart(r.date).toISOString().slice(0, 10), r]));
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        const daily = days.map((d) => {
            const key = atDayStart(d).toISOString().slice(0, 10);
            const row = map.get(key);
            return {
                date: d,
                label: labels[(d.getDay() + 6) % 7],
                pagesRead: row?.pagesRead || 0,
                sessions: row?.sessions || 0,
                readingSeconds: row?.readingSeconds || 0,
            };
        });

        const weeklyPagesRead = daily.reduce((sum, item) => sum + item.pagesRead, 0);
        const weeklyReadingHours = Number((daily.reduce((sum, item) => sum + item.readingSeconds, 0) / 3600).toFixed(2));

        res.json({
            weeklyPagesRead,
            weeklyReadingHours,
            daily,
        });
    } catch (error) {
        next(error);
    }
};

const getOverallAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString?.() || '';
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const user = await User.findById(userId).select('analytics');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const analytics = user.analytics || {};
        res.json({
            totalPagesRead: analytics.totalPagesRead || 0,
            totalReadingHours: Number((((analytics.totalReadingSeconds || 0) / 3600)).toFixed(2)),
            booksCompleted: analytics.booksCompleted || 0,
            readingSessions: analytics.totalSessions || 0,
        });
    } catch (error) {
        next(error);
    }
};

const recordVisit = async (req, res, next) => {
    try {
        const stats = await SiteStats.findOneAndUpdate(
            { key: 'global' },
            { $inc: { visits: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, visits: stats.visits });
    } catch (error) {
        next(error);
    }
};

const getAdminAnalytics = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBooks = await Book.countDocuments();

        const stats = await SiteStats.findOne({ key: 'global' });
        const websiteVisits = stats ? stats.visits : 0;

        // Active Readers Today: Users who read books within the last 24h
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const activeReadersToday = await Progress.distinct('userId', {
            lastReadAt: { $gte: todayStart }
        });

        // Most Read Book based on openCount
        const mostReadBook = await Book.findOne().sort({ openCount: -1 });

        // Recent Uploads (last 5 books)
        const recentUploads = await Book.find().sort({ createdAt: -1 }).limit(5);

        res.json({
            success: true,
            totalUsers,
            totalBooks,
            websiteVisits,
            activeReadersTodayCount: activeReadersToday.length,
            mostReadBook: mostReadBook ? {
                title: mostReadBook.title,
                author: mostReadBook.author,
                openCount: mostReadBook.openCount || 0
            } : null,
            recentUploads: recentUploads.map(b => ({
                id: b._id,
                title: b.title,
                author: b.author,
                category: b.category,
                createdAt: b.createdAt
            }))
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDailyAnalytics,
    getWeeklyAnalytics,
    getOverallAnalytics,
    recordVisit,
    getAdminAnalytics,
};
