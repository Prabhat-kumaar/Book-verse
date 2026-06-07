const mongoose = require('mongoose');
const Blog = require('../models/Blog');

// Allowed categories for blog posts
const ALLOWED_CATEGORIES = [
    "Classic Books",
    "Study Tips",
    "Literary Analysis",
    "Reading Guides",
    "Author Profiles",
    "Tips & Tricks"
];

// Allowed statuses for blog posts
const ALLOWED_STATUSES = ["published", "draft", "archived"];

/**
 * Validator for creating a new blog post
 */
const validateCreateBlog = async (req, res, next) => {
    const errors = [];
    const { title, category, excerpt, content, coverImage, tags, relatedBooks, status } = req.body;

    // Title validation: required, string, 5-200 characters
    if (title === undefined || title === null || typeof title !== 'string' || title.trim() === '') {
        errors.push({ field: 'title', message: 'Title is required and must be a string' });
    } else if (title.trim().length < 5 || title.trim().length > 200) {
        errors.push({ field: 'title', message: 'Title must be between 5 and 200 characters' });
    }

    // Category validation: required, must match allowed enums
    if (category === undefined || category === null || typeof category !== 'string' || category.trim() === '') {
        errors.push({ field: 'category', message: 'Category is required' });
    } else if (!ALLOWED_CATEGORIES.includes(category.trim())) {
        errors.push({
            field: 'category',
            message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
        });
    }

    // Excerpt validation: required, string, max 200 characters
    if (excerpt === undefined || excerpt === null || typeof excerpt !== 'string' || excerpt.trim() === '') {
        errors.push({ field: 'excerpt', message: 'Excerpt is required' });
    } else if (excerpt.trim().length > 200) {
        errors.push({ field: 'excerpt', message: 'Excerpt cannot exceed 200 characters' });
    }

    // Content validation: required, string, min 100 characters
    if (content === undefined || content === null || typeof content !== 'string' || content.trim() === '') {
        errors.push({ field: 'content', message: 'Content is required' });
    } else if (content.trim().length < 100) {
        errors.push({ field: 'content', message: 'Content must be at least 100 characters long' });
    }

    // CoverImage validation: required, valid URL or path
    if (coverImage === undefined || coverImage === null || typeof coverImage !== 'string' || coverImage.trim() === '') {
        errors.push({ field: 'coverImage', message: 'Cover image is required' });
    } else {
        const trimmed = coverImage.trim();
        const isValidUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(trimmed);
        const isCloudinaryOrLocal = /^[\w\-\/\.]+\.[a-zA-Z]{3,4}$/.test(trimmed) || trimmed.length > 5;
        if (!isValidUrl && !isCloudinaryOrLocal) {
            errors.push({ field: 'coverImage', message: 'Cover image must be a valid URL or Cloudinary path' });
        }
    }

    // Tags validation: optional, array of strings
    if (tags !== undefined) {
        if (!Array.isArray(tags)) {
            errors.push({ field: 'tags', message: 'Tags must be an array' });
        } else {
            const hasInvalidTags = tags.some(tag => typeof tag !== 'string' || tag.trim() === '');
            if (hasInvalidTags) {
                errors.push({ field: 'tags', message: 'Each tag must be a non-empty string' });
            }
        }
    }

    // RelatedBooks validation: optional, array of MongoDB ObjectIds, max 20
    if (relatedBooks !== undefined) {
        if (!Array.isArray(relatedBooks)) {
            errors.push({ field: 'relatedBooks', message: 'Related books must be an array' });
        } else if (relatedBooks.length > 20) {
            errors.push({ field: 'relatedBooks', message: 'A blog can link to a maximum of 20 related books' });
        } else {
            const hasInvalidIds = relatedBooks.some(id => !mongoose.Types.ObjectId.isValid(id));
            if (hasInvalidIds) {
                errors.push({ field: 'relatedBooks', message: 'Related books must be valid MongoDB ObjectIds' });
            }
        }
    }

    // Status validation: optional, enum published/draft/archived
    if (status !== undefined) {
        if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
            errors.push({
                field: 'status',
                message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
            });
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors
        });
    }

    next();
};

/**
 * Validator for updating a blog post (all fields optional, validates if provided)
 */
const validateUpdateBlog = async (req, res, next) => {
    const errors = [];
    const { title, slug, category, excerpt, content, coverImage, tags, relatedBooks, status } = req.body;
    const blogId = req.params.id;

    // Title validation (optional)
    if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
            errors.push({ field: 'title', message: 'Title must be a non-empty string' });
        } else if (title.trim().length < 5 || title.trim().length > 200) {
            errors.push({ field: 'title', message: 'Title must be between 5 and 200 characters' });
        }
    }

    // Slug uniqueness check (optional)
    if (slug !== undefined) {
        if (typeof slug !== 'string' || slug.trim() === '') {
            errors.push({ field: 'slug', message: 'Slug must be a non-empty string' });
        } else {
            const trimmedSlug = slug.trim().toLowerCase();
            try {
                // Ensure slug is unique, excluding the current blog post being edited
                const existingBlog = await Blog.findOne({
                    slug: trimmedSlug,
                    _id: { $ne: blogId }
                });
                if (existingBlog) {
                    errors.push({ field: 'slug', message: 'Slug is already in use by another blog post' });
                }
            } catch (err) {
                errors.push({ field: 'slug', message: 'Error validating slug uniqueness' });
            }
        }
    }

    // Category validation (optional)
    if (category !== undefined) {
        if (typeof category !== 'string' || category.trim() === '') {
            errors.push({ field: 'category', message: 'Category must be a non-empty string' });
        } else if (!ALLOWED_CATEGORIES.includes(category.trim())) {
            errors.push({
                field: 'category',
                message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
            });
        }
    }

    // Excerpt validation (optional)
    if (excerpt !== undefined) {
        if (typeof excerpt !== 'string' || excerpt.trim() === '') {
            errors.push({ field: 'excerpt', message: 'Excerpt must be a non-empty string' });
        } else if (excerpt.trim().length > 200) {
            errors.push({ field: 'excerpt', message: 'Excerpt cannot exceed 200 characters' });
        }
    }

    // Content validation (optional)
    if (content !== undefined) {
        if (typeof content !== 'string' || content.trim() === '') {
            errors.push({ field: 'content', message: 'Content must be a non-empty string' });
        } else if (content.trim().length < 100) {
            errors.push({ field: 'content', message: 'Content must be at least 100 characters long' });
        }
    }

    // CoverImage validation (optional)
    if (coverImage !== undefined) {
        if (typeof coverImage !== 'string' || coverImage.trim() === '') {
            errors.push({ field: 'coverImage', message: 'Cover image must be a non-empty string' });
        } else {
            const trimmed = coverImage.trim();
            const isValidUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(trimmed);
            const isCloudinaryOrLocal = /^[\w\-\/\.]+\.[a-zA-Z]{3,4}$/.test(trimmed) || trimmed.length > 5;
            if (!isValidUrl && !isCloudinaryOrLocal) {
                errors.push({ field: 'coverImage', message: 'Cover image must be a valid URL or Cloudinary path' });
            }
        }
    }

    // Tags validation (optional)
    if (tags !== undefined) {
        if (!Array.isArray(tags)) {
            errors.push({ field: 'tags', message: 'Tags must be an array' });
        } else {
            const hasInvalidTags = tags.some(tag => typeof tag !== 'string' || tag.trim() === '');
            if (hasInvalidTags) {
                errors.push({ field: 'tags', message: 'Each tag must be a non-empty string' });
            }
        }
    }

    // RelatedBooks validation (optional)
    if (relatedBooks !== undefined) {
        if (!Array.isArray(relatedBooks)) {
            errors.push({ field: 'relatedBooks', message: 'Related books must be an array' });
        } else if (relatedBooks.length > 20) {
            errors.push({ field: 'relatedBooks', message: 'A blog can link to a maximum of 20 related books' });
        } else {
            const hasInvalidIds = relatedBooks.some(id => !mongoose.Types.ObjectId.isValid(id));
            if (hasInvalidIds) {
                errors.push({ field: 'relatedBooks', message: 'Related books must be valid MongoDB ObjectIds' });
            }
        }
    }

    // Status validation (optional)
    if (status !== undefined) {
        if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
            errors.push({
                field: 'status',
                message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
            });
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors
        });
    }

    next();
};

/**
 * Validator for searching blogs
 */
const validateBlogSearch = (req, res, next) => {
    const errors = [];
    const q = req.query.q;

    if (q === undefined || q === null || typeof q !== 'string' || q.trim() === '') {
        errors.push({ field: 'q', message: 'Search query parameter (q) is required' });
    } else if (q.trim().length < 2) {
        errors.push({ field: 'q', message: 'Search query must be at least 2 characters long' });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors
        });
    }

    next();
};

module.exports = {
    validateCreateBlog,
    validateUpdateBlog,
    validateBlogSearch
};
