const dns = require('node:dns');
const mongoose = require('mongoose');

// Disable command buffering globally so requests fail fast instead of hanging when the database is disconnected or full
mongoose.set('bufferCommands', false);


const looksLikePlaceholder = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return true;

    return (
        /<[^>]+>/.test(raw) ||
        /^replace_with_/i.test(raw) ||
        /^your_/i.test(raw)
    );
};

const isSrvUri = (uri = '') => /^mongodb\+srv:\/\//i.test(String(uri || '').trim());

const isSrvDnsError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return /querysrv|dns|econnrefused|enotfound|eservfail|refused|timeout/.test(message);
};

const isTruthyEnv = (value = '') => /^(1|true|yes|on)$/i.test(String(value || '').trim());

const resolveMongoUris = () => {
    const primary = (process.env.MONGO_URI || '').trim();
    const fallback = (process.env.MONGODB_URI || '').trim();
    const direct =
        (process.env.MONGO_URI_DIRECT || '').trim() ||
        (process.env.MONGODB_URI_DIRECT || '').trim();

    const validPrimary = !looksLikePlaceholder(primary) ? primary : '';
    const validFallback = !looksLikePlaceholder(fallback) ? fallback : '';
    const validDirect = !looksLikePlaceholder(direct) ? direct : '';

    return {
        primary: validPrimary,
        fallback: validFallback,
        direct: validDirect,
    };
};

const buildCandidates = ({ primary, fallback, direct }) => {
    const preferDirect = isTruthyEnv(process.env.MONGO_PREFER_DIRECT_URI);
    const entries = preferDirect
        ? [
            { label: 'MONGODB_URI_DIRECT', uri: direct },
            { label: 'MONGO_URI', uri: primary },
            { label: 'MONGODB_URI', uri: fallback },
        ]
        : [
            { label: 'MONGO_URI', uri: primary },
            { label: 'MONGODB_URI', uri: fallback },
            { label: 'MONGODB_URI_DIRECT', uri: direct },
        ];

    const seen = new Set();
    return entries.filter(({ uri }) => {
        if (!uri || seen.has(uri)) return false;
        seen.add(uri);
        return true;
    });
};

const getDnsServersFromEnv = () => {
    const raw = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8').trim();
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const applyDnsFallbackSettings = () => {
    const servers = getDnsServersFromEnv();

    try {
        dns.setDefaultResultOrder('ipv4first');
    } catch (_err) {
        // no-op for older Node versions
    }

    if (!servers.length) return true;

    try {
        dns.setServers(servers);
        console.warn(`Applied DNS fallback for MongoDB SRV lookup: ${servers.join(', ')}`);
        return true;
    } catch (error) {
        console.warn(`Could not apply DNS fallback servers: ${error.message}`);
        return false;
    }
};

const connectDB = async () => {
    const resolvedUris = resolveMongoUris();
    const candidates = buildCandidates(resolvedUris);

    if (!candidates.length) {
        throw new Error(
            'Missing valid MongoDB URI. Set MONGO_URI or MONGODB_URI (or MONGODB_URI_DIRECT) in backend/.env.'
        );
    }

    const dbName = (process.env.MONGO_DB_NAME || '').trim() || undefined;
    const rawTimeout = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000);
    const serverSelectionTimeoutMS =
        Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 10000;

    const baseConnectOptions = {
        serverSelectionTimeoutMS,
    };

    if (dbName) {
        baseConnectOptions.dbName = dbName;
    }

    const connectWithUri = async (uri) => mongoose.connect(uri, baseConnectOptions);

    let conn = null;
    let lastError = null;
    let dnsRetried = false;

    for (const candidate of candidates) {
        try {
            conn = await connectWithUri(candidate.uri);
            break;
        } catch (error) {
            lastError = error;

            const canRetryWithDns =
                !dnsRetried &&
                isSrvUri(candidate.uri) &&
                isSrvDnsError(error);

            if (canRetryWithDns) {
                dnsRetried = true;
                applyDnsFallbackSettings();

                try {
                    conn = await connectWithUri(candidate.uri);
                    break;
                } catch (retryError) {
                    lastError = retryError;
                }
            }
        }
    }

    if (!conn) {
        const reason = lastError?.message || 'Unknown MongoDB connection error';
        const atlasHint =
            'If SRV keeps failing, use Atlas "Standard connection string" and set MONGODB_URI_DIRECT (mongodb://...) in backend/.env.';

        throw new Error(`${reason}. ${atlasHint}`);
    }

    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log(`MongoDB database in use: ${conn.connection.name}`);
};

module.exports = connectDB;
