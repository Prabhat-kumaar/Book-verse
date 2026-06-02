const mongoose = require('mongoose');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (value = '') => {
    const slug = String(value)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'book';
};

const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            sparse: true,
        },
        author: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
            set: (tags) => Array.isArray(tags)
                ? tags.map((tag) => String(tag).trim()).filter(Boolean)
                : [],
        },
        language: {
            type: String,
            default: '',
            trim: true,
        },
        difficulty: {
            type: String,
            enum: ['', 'Beginner', 'Intermediate', 'Advanced'],
            default: '',
            trim: true,
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true,
        },
        fileType: {
            type: String,
            required: true,
            enum: ['pdf', 'epub'],
            lowercase: true,
            trim: true,
        },
        pdf: {
            type: String,
            trim: true,
        },
        thumbnail: {
            type: String,
            required: true,
            trim: true,
        },
        coverImage: {
            type: String,
            trim: true,
        },
        openCount: {
            type: Number,
            default: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
        },
        totalReviews: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

bookSchema.index({ createdAt: -1 });
bookSchema.index({ category: 1 });
bookSchema.index({ title: 'text', author: 'text', description: 'text', tags: 'text' }, { language_override: 'none' });

bookSchema.statics.createUniqueSlug = async function createUniqueSlug(title, docId) {
    const baseSlug = slugify(title);
    const slugPattern = new RegExp(`^${escapeRegex(baseSlug)}(?:-\\d+)?$`);
    const query = { slug: slugPattern };

    if (docId) {
        query._id = { $ne: docId };
    }

    const existingSlugs = await this.find(query).select('slug').lean();
    const used = new Set(existingSlugs.map((book) => book.slug));

    if (!used.has(baseSlug)) return baseSlug;

    let suffix = 2;
    let candidate = `${baseSlug}-${suffix}`;
    while (used.has(candidate)) {
        suffix += 1;
        candidate = `${baseSlug}-${suffix}`;
    }

    return candidate;
};

bookSchema.pre('validate', async function setBookSlug(next) {
    try {
        if (!this.slug || this.isModified('title')) {
            this.slug = await this.constructor.createUniqueSlug(this.title, this._id);
        } else {
            this.slug = slugify(this.slug);
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Book', bookSchema, 'books');
