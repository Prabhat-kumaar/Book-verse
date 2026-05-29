const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Configure environment
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const SiteVisitLog = require('../models/SiteVisitLog');
const SiteStats = require('../models/SiteStats');
const SiteVisit = require('../models/SiteVisit');
const { recordVisit, getAdminDetails } = require('../controllers/analyticsController');

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.jsonData = data;
        return res;
    };
    return res;
};

const runTests = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await connectDB();

        console.log("Cleaning up test visit logs...");
        await SiteVisitLog.deleteMany({});
        await SiteStats.deleteOne({ key: 'global' });
        await SiteVisit.deleteMany({});

        console.log("\n--- TEST 1: Skipping localhost visits ---");
        const reqLocal = {
            headers: {
                'x-forwarded-for': '127.0.0.1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            socket: {},
            body: { path: '/', sessionId: 'sess_1' }
        };
        const resLocal = mockRes();
        await recordVisit(reqLocal, resLocal, (err) => { console.error("Next called:", err); });
        console.log("Skipped local status:", resLocal.jsonData);
        const localLogsCount = await SiteVisitLog.countDocuments({});
        console.log("SiteVisitLog count for local:", localLogsCount);

        console.log("\n--- TEST 2: Normal visit tracking & hashing ---");
        // Use an external IP (e.g. 8.8.8.8 which resolves to US via geoip)
        const reqNormal = {
            headers: {
                'x-forwarded-for': '8.8.8.8',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            socket: {},
            body: { path: '/books', sessionId: 'sess_normal_1' }
        };
        const resNormal = mockRes();
        await recordVisit(reqNormal, resNormal, (err) => { console.error("Next called:", err); });
        console.log("Normal visit response:", resNormal.jsonData);

        const logs = await SiteVisitLog.find({});
        console.log("Hashed IP in log:", logs[0]?.hashedIp);
        console.log("Country resolved:", logs[0]?.country);
        console.log("Device Type resolved:", logs[0]?.deviceType);
        console.log("Path resolved:", logs[0]?.path);
        console.log("Hour resolved:", logs[0]?.hour);
        console.log("IsNew Visitor:", logs[0]?.isNewVisitor);

        console.log("\n--- TEST 3: Duplicate session page view (Same IP, different path, same session) ---");
        const reqSameSess = {
            headers: {
                'x-forwarded-for': '8.8.8.8',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            socket: {},
            body: { path: '/categories', sessionId: 'sess_normal_1' }
        };
        const resSameSess = mockRes();
        await recordVisit(reqSameSess, resSameSess, (err) => { console.error("Next called:", err); });
        console.log("Second pageview response:", resSameSess.jsonData);
        
        const logs2 = await SiteVisitLog.find({});
        console.log("Total visit logs logged:", logs2.length);
        console.log("IsNew Visitor for second pageview:", logs2[1]?.isNewVisitor);

        console.log("\n--- TEST 4: Mobile Device visit and different Country ---");
        // IP 1.1.1.1 resolves to AU
        const reqAU = {
            headers: {
                'x-forwarded-for': '1.1.1.1',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15'
            },
            socket: {},
            body: { path: '/books', sessionId: 'sess_mobile_au' }
        };
        const resAU = mockRes();
        await recordVisit(reqAU, resAU, (err) => { console.error("Next called:", err); });
        console.log("AU Mobile visit response:", resAU.jsonData);

        console.log("\n--- TEST 5: Admin Details Aggregations Output ---");
        const resDetails = mockRes();
        await getAdminDetails({}, resDetails, (err) => { console.error("Next called:", err); });
        console.log("\nAggregated Details response advanced property:");
        console.log(JSON.stringify(resDetails.jsonData?.advanced, null, 2));

        console.log("\nAll tests completed successfully. Closing connection...");
        await mongoose.connection.close();
    } catch (err) {
        console.error("Test execution failed:", err);
        process.exit(1);
    }
};

runTests();
