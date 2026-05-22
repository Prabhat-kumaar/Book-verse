const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Admin = require('../models/Admin');

dotenv.config();

const usage = () => {
    console.log('Usage: npm run reset:admin -- <email> <newPassword>');
};

const main = async () => {
    const [, , emailArg, passwordArg] = process.argv;
    const email = (emailArg || '').trim().toLowerCase();
    const newPassword = (passwordArg || '').trim();

    if (!email || !newPassword) {
        usage();
        process.exit(1);
    }

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGO_URI or MONGODB_URI is not set in .env');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: { password: passwordHash, role: 'admin' } },
        { new: true }
    );

    const updatedLegacyAdmin = await Admin.findOneAndUpdate(
        { email },
        { $set: { password: passwordHash } },
        { new: true }
    );

    if (!updatedUser && !updatedLegacyAdmin) {
        await User.create({
            username: email,
            email,
            password: newPassword,
            role: 'admin',
        });

        console.log(`Created new admin user: ${email}`);
    } else {
        console.log(`Admin password reset successful for: ${email}`);
    }

    await mongoose.disconnect();
};

main().catch(async (error) => {
    console.error(`Failed to reset admin password: ${error.message}`);
    try {
        await mongoose.disconnect();
    } catch (_err) {
        // no-op
    }
    process.exit(1);
});
