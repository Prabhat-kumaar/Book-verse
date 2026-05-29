const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env in the same folder
dotenv.config();

const User = require('./models/User');
const Book = require('./models/Book');
const Progress = require('./models/Progress');
const ReadingAnalyticsDay = require('./models/ReadingAnalyticsDay');
const SiteVisit = require('./models/SiteVisit');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const usersCount = await User.countDocuments();
        const booksCount = await Book.countDocuments();
        const progressCount = await Progress.countDocuments();
        const analyticsCount = await ReadingAnalyticsDay.countDocuments();
        const visitsCount = await SiteVisit.countDocuments();

        console.log('\n--- COLLECTION COUNTS ---');
        console.log('User:', usersCount);
        console.log('Book:', booksCount);
        console.log('Progress:', progressCount);
        console.log('ReadingAnalyticsDay:', analyticsCount);
        console.log('SiteVisit:', visitsCount);

        // Calculate pages read this month (real query)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        console.log('\nStart of month date:', startOfMonth);

        const monthlyPagesResult = await ReadingAnalyticsDay.aggregate([
            { $match: { date: { $gte: startOfMonth } } },
            { $group: { _id: null, totalPages: { $sum: '$pagesRead' } } }
        ]);
        console.log('Aggregate pages read this month:', monthlyPagesResult[0]?.totalPages || 0);

        // List some recent analytics items
        const recentAnalytics = await ReadingAnalyticsDay.find()
            .sort({ createdAt: -1 })
            .limit(10);
        
        console.log('\n--- RECENT READING ANALYTICS DAYS ---');
        recentAnalytics.forEach(item => {
            console.log(`User: ${item.user}, Date: ${item.date.toISOString().slice(0, 10)}, Pages Read: ${item.pagesRead}, Reading Seconds: ${item.readingSeconds}, Sessions: ${item.sessions}`);
        });

    } catch (e) {
        console.error('Error running check:', e);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
}

run();
