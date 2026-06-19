const mongoose = require('mongoose');

// Helper function to slugify titles
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        category: {
            type: String,
            required: true,
            enum: [
                "Classic Books",
                "Study Tips",
                "Literary Analysis",
                "Reading Guides",
                "Author Profiles",
                "Tips & Tricks"
            ]
        },
        excerpt: {
            type: String,
            required: true,
            maxlength: 200
        },
        coverImage: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        tags: {
            type: [String],
            default: []
        },
        relatedBooks: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Book'
            }],
            default: [],
            validate: [
                {
                    validator: function (val) {
                        return val.length <= 5;
                    },
                    message: '{PATH} cannot have more than 5 books'
                }
            ]
        },
        status: {
            type: String,
            enum: ["published", "draft", "archived"],
            default: "draft"
        },
        viewCount: {
            type: Number,
            default: 0
        },
        shareCount: {
            type: Number,
            default: 0
        },
        publishedAt: {
            type: Date,
            default: null
        },
        seoTitle: {
            type: String
        },
        seoDescription: {
            type: String,
            maxlength: 160
        },
        seoKeywords: {
            type: [String],
            default: []
        }
    },
    {
        timestamps: true
    }
);

// Indexes
blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ viewCount: -1 });
blogSchema.index({ status: 1, createdAt: -1 });

// Pre-validate hook to auto-generate slug from title if not provided
blogSchema.pre('validate', function (next) {
    if (!this.slug && this.title) {
        this.slug = slugify(this.title);
    }
    next();
});

// Pre-save hook to handle publishing date
blogSchema.pre('save', function (next) {
    // If status changes to "published", set publishedAt to current date
    if (this.isModified('status') && this.status === 'published') {
        this.publishedAt = new Date();
    }
    next();
});

// Methods
// incrementViewCount() - increment viewCount by 1
blogSchema.methods.incrementViewCount = function () {
    this.viewCount += 1;
    return this.save();
};

// getRelatedBlogs() - return 3 similar blogs by category and tags
blogSchema.methods.getRelatedBlogs = function () {
    const query = {
        _id: { $ne: this._id },
        status: 'published'
    };

    const orConditions = [];
    if (this.category) {
        orConditions.push({ category: this.category });
    }
    if (this.tags && this.tags.length > 0) {
        orConditions.push({ tags: { $in: this.tags } });
    }

    if (orConditions.length > 0) {
        query.$or = orConditions;
    }

    return this.model('Blog').find(query).limit(3);
};

// toJSON() - hide sensitive fields
blogSchema.methods.toJSON = function () {
    const blog = this.toObject();
    delete blog.__v;
    return blog;
};

module.exports = mongoose.model('Blog', blogSchema);
