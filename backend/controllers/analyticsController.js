const User = require('../models/User');
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

module.exports = {
    getDailyAnalytics,
    getWeeklyAnalytics,
    getOverallAnalytics,
};
