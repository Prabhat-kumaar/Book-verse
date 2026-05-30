const crypto = require('crypto');
const geoip = require('geoip-lite');
const User = require('../models/User');
const Book = require('../models/Book');
const Progress = require('../models/Progress');
const SiteStats = require('../models/SiteStats');
const ReadingAnalyticsDay = require('../models/ReadingAnalyticsDay');
const SiteVisit = require('../models/SiteVisit');
const VisitorIP = require('../models/VisitorIP');
const SiteVisitLog = require('../models/SiteVisitLog');

const getClientIp = (req) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    return ip.trim();
};

const isLocalhost = (ip) => {
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.');
};

const isAdminIp = (ip) => {
    const adminIpsRaw = process.env.ADMIN_IPS || '';
    const adminIps = adminIpsRaw.split(',').map(item => item.trim()).filter(Boolean);
    return adminIps.includes(ip);
};

const hashIp = (ip) => {
    return crypto.createHash('sha256').update(ip).digest('hex');
};

const getDeviceType = (userAgent = '') => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
        return 'Tablet';
    }
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android') || ua.includes('webos') || ua.includes('blackberry')) {
        return 'Mobile';
    }
    return 'Desktop';
};

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

const getCalendarAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString?.() || '';
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        threeMonthsAgo.setHours(0, 0, 0, 0);

        const rows = await ReadingAnalyticsDay.find({
            user: userId,
            date: { $gte: threeMonthsAgo }
        }).select('date pagesRead').sort({ date: 1 });

        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const recordVisit = async (req, res, next) => {
    try {
        const ip = getClientIp(req);

        if (isLocalhost(ip) || isAdminIp(ip)) {
            const stats = await SiteStats.findOne({ key: 'global' });
            const visits = stats ? stats.visits : 0;
            const uniqueVisitors = stats ? stats.uniqueVisitors : 0;
            return res.json({ success: true, visits, uniqueVisitors, skipped: true });
        }

        const hashedIp = hashIp(ip);
        const geo = geoip.lookup(ip);
        const country = geo ? (geo.country || 'Unknown') : 'Unknown';
        const deviceType = getDeviceType(req.headers['user-agent']);
        
        const { path = '/', sessionId = 'sess_unknown' } = req.body;
        const hour = new Date().getHours();

        const today = atDayStart(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Check if all-time unique (New Visitor)
        const isAllTimeUnique = !(await SiteVisitLog.exists({ hashedIp }));

        // Check if daily unique
        const isDailyUnique = !(await SiteVisitLog.exists({
            hashedIp,
            createdAt: { $gte: today, $lt: tomorrow }
        }));

        // Log the visit to SiteVisitLog
        await SiteVisitLog.create({
            hashedIp,
            path,
            country,
            deviceType,
            sessionId,
            hour,
            isNewVisitor: isAllTimeUnique
        });

        // Increment global stats
        const statsUpdate = { $inc: { visits: 1 } };
        if (isAllTimeUnique) {
            statsUpdate.$inc.uniqueVisitors = 1;
        }
        const stats = await SiteStats.findOneAndUpdate(
            { key: 'global' },
            statsUpdate,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Increment daily stats
        const visitUpdate = { $inc: { count: 1 } };
        if (isDailyUnique) {
            visitUpdate.$inc.uniqueCount = 1;
        }
        await SiteVisit.findOneAndUpdate(
            { date: today },
            visitUpdate,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, visits: stats.visits, uniqueVisitors: stats.uniqueVisitors });
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
        const uniqueVisitors = stats ? stats.uniqueVisitors : 0;

        // Calculate bounce rate
        const sessionStats = await SiteVisitLog.aggregate([
            { $group: { _id: '$sessionId', count: { $sum: 1 } } }
        ]);
        const totalSessions = sessionStats.length;
        const bouncedSessions = sessionStats.filter(s => s.count === 1).length;
        const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

        // Active Readers Today: Users who read books within the last 24h
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const activeReadersToday = await Progress.distinct('userId', {
            lastReadAt: { $gte: todayStart }
        });

        // New Users Today & This Week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);

        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: todayStart }
        });

        const newUsersThisWeek = await User.countDocuments({
            createdAt: { $gte: oneWeekAgo }
        });

        // Most Read Book based on openCount
        const mostReadBook = await Book.findOne().sort({ openCount: -1 });

        // Top 5 Popular Books by openCount
        const popularBooks = await Book.find().sort({ openCount: -1 }).limit(5);

        // Recent Uploads (last 5 books)
        const recentUploads = await Book.find().sort({ createdAt: -1 }).limit(5);

        // Recent 5 Registrations
        const recentRegistrations = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username email role createdAt');

        // AI Genre Suggestions based on aggregated progress reading categories (genres)
        const topGenres = await Progress.aggregate([
            {
                $lookup: {
                    from: 'books',
                    localField: 'book',
                    foreignField: '_id',
                    as: 'bookInfo'
                }
            },
            { $unwind: '$bookInfo' },
            {
                $group: {
                    _id: '$bookInfo.category',
                    count: { $sum: 1 },
                    totalTime: { $sum: '$readingTime' }
                }
            },
            { $sort: { count: -1, totalTime: -1 } },
            { $limit: 3 }
        ]);

        const categoriesToSuggest = topGenres.length > 0
            ? topGenres.map(g => g._id)
            : ['Programming', 'AI', 'Business']; // Fallbacks if no reading activity yet

        const suggestedBooks = await Book.find({
            category: { $in: categoriesToSuggest }
        })
        .sort({ openCount: -1, createdAt: -1 })
        .limit(5);

        res.json({
            success: true,
            totalUsers,
            totalBooks,
            websiteVisits,
            uniqueVisitors,
            bounceRate,
            activeReadersTodayCount: activeReadersToday.length,
            newUsersToday,
            newUsersThisWeek,
            mostReadBook: mostReadBook ? {
                title: mostReadBook.title,
                author: mostReadBook.author,
                openCount: mostReadBook.openCount || 0
            } : null,
            popularBooks: popularBooks.map(b => ({
                id: b._id,
                title: b.title,
                author: b.author,
                openCount: b.openCount || 0
            })),
            recentUploads: recentUploads.map(b => ({
                id: b._id,
                title: b.title,
                author: b.author,
                category: b.category,
                createdAt: b.createdAt
            })),
            recentRegistrations: recentRegistrations.map(u => ({
                id: u._id,
                username: u.username,
                email: u.email || 'N/A',
                role: u.role,
                createdAt: u.createdAt
            })),
            aiSuggestions: {
                topGenres: topGenres.map(g => ({ category: g._id, count: g.count })),
                books: suggestedBooks.map(b => ({
                    id: b._id,
                    title: b.title,
                    author: b.author,
                    category: b.category,
                    thumbnail: b.thumbnail,
                    openCount: b.openCount || 0
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

const getAdminDetails = async (req, res, next) => {
    try {
        const stats = await SiteStats.findOne({ key: 'global' });
        const websiteVisits = stats ? stats.visits : 0;
        const uniqueVisitors = stats ? stats.uniqueVisitors : 0;

        // 1. Monthly Reads (total pages read this calendar month)
        const startOfMonth = atDayStart(new Date());
        startOfMonth.setDate(1);

        const startOfLastMonth = new Date(startOfMonth);
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        const endOfLastMonth = new Date(startOfMonth);
        endOfLastMonth.setMilliseconds(-1);

        const [monthlyPagesResult, lastMonthPagesResult] = await Promise.all([
            ReadingAnalyticsDay.aggregate([
                { $match: { date: { $gte: startOfMonth } } },
                { $group: { _id: null, totalPages: { $sum: '$pagesRead' } } }
            ]),
            ReadingAnalyticsDay.aggregate([
                { $match: { date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                { $group: { _id: null, totalPages: { $sum: '$pagesRead' } } }
            ])
        ]);

        const monthlyPages = monthlyPagesResult[0]?.totalPages || 0;
        const lastMonthPages = lastMonthPagesResult[0]?.totalPages || 0;
        let monthlyReadsDiff = '0% vs last month';
        if (lastMonthPages > 0) {
            const diff = (((monthlyPages - lastMonthPages) / lastMonthPages) * 100).toFixed(1);
            monthlyReadsDiff = `${diff >= 0 ? '+' : ''}${diff}% vs last month`;
        } else if (monthlyPages > 0) {
            monthlyReadsDiff = `+100.0% vs last month`;
        }

        // 2. Completion Rate (percentage of completed books across all users)
        const totalProgress = await Progress.countDocuments();
        const completedProgress = await Progress.countDocuments({ completed: true });
        const completionRate = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0;
        const completionHint = totalProgress > 0 ? `${completedProgress} of ${totalProgress} books` : 'No reading sessions';

        // 3. Avg Session (average reading session time in minutes)
        const sessionStats = await ReadingAnalyticsDay.aggregate([
            { $match: { sessions: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    totalSeconds: { $sum: '$readingSeconds' },
                    totalSessionsCount: { $sum: '$sessions' }
                }
            }
        ]);
        const totalSeconds = sessionStats[0]?.totalSeconds || 0;
        const totalSessions = sessionStats[0]?.totalSessionsCount || 1;
        const avgSessionMinutes = Math.round((totalSeconds / totalSessions) / 60);
        const avgSessionHint = totalSeconds > 0 ? `Based on ${totalSessions} sessions` : 'No sessions recorded';

        // 4. Returning Readers (percentage of active readers with > 1 total session)
        const totalUniqueUsers = await Progress.distinct('userId');
        const userSessionCounts = await ReadingAnalyticsDay.aggregate([
            {
                $group: {
                    _id: '$user',
                    totalSessions: { $sum: '$sessions' }
                }
            },
            { $match: { totalSessions: { $gt: 1 } } }
        ]);
        const returningUsersCount = userSessionCounts.length;
        const returningPercentage = totalUniqueUsers.length > 0
            ? Math.round((returningUsersCount / totalUniqueUsers.length) * 100)
            : 0;
        const returningHint = totalUniqueUsers.length > 0
            ? `${returningUsersCount} of ${totalUniqueUsers.length} total readers`
            : 'No active readers';

        // 5. Visits Chart (Day, Month, Year toggles)
        // Day Series (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dayData = await SiteVisit.find({
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: 1 });

        const dayMap = new Map(dayData.map(v => [v.date.toISOString().slice(0, 10), { visits: v.count, unique: v.uniqueCount || 0 }]));
        const daySeries = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const key = d.toISOString().slice(0, 10);
            const data = dayMap.get(key) || { visits: 0, unique: 0 };
            daySeries.push({
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                visits: data.visits,
                unique: data.unique
            });
        }

        // Month Series (Last 12 Months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const monthData = await SiteVisit.aggregate([
            { $match: { date: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    visits: { $sum: '$count' },
                    unique: { $sum: { $ifNull: ['$uniqueCount', 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const monthMap = new Map(monthData.map(m => [`${m._id.year}-${String(m._id.month).padStart(2, '0')}`, { visits: m.visits, unique: m.unique }]));
        const monthSeries = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const data = monthMap.get(key) || { visits: 0, unique: 0 };
            monthSeries.push({
                label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                visits: data.visits,
                unique: data.unique
            });
        }

        // Year Series (Last 5 Years)
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        fiveYearsAgo.setHours(0, 0, 0, 0);

        const yearData = await SiteVisit.aggregate([
            { $match: { date: { $gte: fiveYearsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$date' } },
                    visits: { $sum: '$count' },
                    unique: { $sum: { $ifNull: ['$uniqueCount', 0] } }
                }
            },
            { $sort: { '_id.year': 1 } }
        ]);

        const yearMap = new Map(yearData.map(y => [y._id.year, { visits: y.visits, unique: y.unique }]));
        const yearSeries = [];
        const currentYear = new Date().getFullYear();
        for (let i = 4; i >= 0; i--) {
            const y = currentYear - i;
            const data = yearMap.get(y) || { visits: 0, unique: 0 };
            yearSeries.push({
                label: String(y),
                visits: data.visits,
                unique: data.unique
            });
        }

        // 6. Geographic Origins (Top 5 countries)
        const geoStats = await SiteVisitLog.aggregate([
            { $group: { _id: '$country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const geographicData = geoStats.map(g => ({
            country: g._id || 'Unknown',
            count: g.count
        }));

        // 7. Device Breakdown
        const deviceStats = await SiteVisitLog.aggregate([
            { $group: { _id: '$deviceType', count: { $sum: 1 } } }
        ]);
        const deviceBreakdown = {
            Desktop: 0,
            Mobile: 0,
            Tablet: 0,
            Unknown: 0
        };
        deviceStats.forEach(d => {
            const key = d._id || 'Unknown';
            if (deviceBreakdown[key] !== undefined) {
                deviceBreakdown[key] = d.count;
            } else {
                deviceBreakdown.Unknown += d.count;
            }
        });

        // 8. Popular Pages (Top 5 routes)
        const pageStats = await SiteVisitLog.aggregate([
            { $match: { path: { $type: 'string', $not: /^\/admin/i } } },
            { $group: { _id: '$path', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const popularPages = pageStats.map(p => ({
            path: p._id || '/',
            count: p.count
        }));

        // 9. Peak Hours (visits by hour 0-23)
        const hourStats = await SiteVisitLog.aggregate([
            { $group: { _id: '$hour', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
        hourStats.forEach(h => {
            if (h._id >= 0 && h._id < 24) {
                peakHours[h._id].count = h.count;
            }
        });

        // 10. Bounce Rate and New vs Returning
        // Get visits grouped by session to identify bounces
        const visitSessionStats = await SiteVisitLog.aggregate([
            { $group: { _id: '$sessionId', count: { $sum: 1 } } }
        ]);
        const totalVisitSessions = visitSessionStats.length;
        const bouncedSessions = visitSessionStats.filter(s => s.count === 1).length;
        const bounceRateVal = totalVisitSessions > 0 ? Math.round((bouncedSessions / totalVisitSessions) * 100) : 0;

        // New vs Returning Unique Visitors
        const newVisitors = await SiteVisitLog.distinct('hashedIp', { isNewVisitor: true });
        const allVisitors = await SiteVisitLog.distinct('hashedIp');
        const newCount = newVisitors.length;
        const returningCount = Math.max(0, allVisitors.length - newCount);

        res.json({
            success: true,
            websiteVisits,
            uniqueVisitors,
            overview: {
                monthlyReads: { value: monthlyPages.toLocaleString(), hint: monthlyReadsDiff },
                completionRate: { value: `${completionRate}%`, hint: completionHint },
                avgSession: { value: `${avgSessionMinutes}m`, hint: avgSessionHint },
                returningReaders: { value: `${returningPercentage}%`, hint: returningHint }
            },
            charts: {
                day: daySeries,
                month: monthSeries,
                year: yearSeries
            },
            advanced: {
                geographicData,
                deviceBreakdown,
                popularPages,
                peakHours,
                bounceRate: bounceRateVal,
                newvsReturning: {
                    newCount,
                    returningCount
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDailyAnalytics,
    getWeeklyAnalytics,
    getOverallAnalytics,
    getCalendarAnalytics,
    recordVisit,
    getAdminAnalytics,
    getAdminDetails,
};
