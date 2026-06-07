const Blog = require('../models/Blog');
const Book = require('../models/Book');
const User = require('../models/User');
const validate = require('../utils/validate');

/**
 * 1. Get a paginated list of published blogs
 * Route: GET /api/blogs
 * Query params: page, limit, category, search, sort (latest/popular)
 */
const getAllBlogs = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        // Base filter: only published blogs
        const filter = { status: 'published' };

        // Category filter (exact match)
        if (req.query.category) {
            filter.category = req.query.category.trim();
        }

        // Search query filter (regex match on title, content, or tags)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search.trim(), 'i');
            filter.$or = [
                { title: searchRegex },
                { content: searchRegex },
                { tags: searchRegex }
            ];
        }

        // Sort configuration
        let sortOption = { createdAt: -1 };
        if (req.query.sort === 'popular') {
            sortOption = { viewCount: -1 };
        } else if (req.query.sort === 'latest') {
            sortOption = { createdAt: -1 };
        }

        const [blogs, totalCount] = await Promise.all([
            Blog.find(filter)
                .populate('author', 'username avatar')
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
            Blog.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            blogs,
            totalCount,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 2. Get a single blog by slug
 * Route: GET /api/blogs/slug/:slug
 * Increments viewCount by 1
 * Populates author (username, avatar) and relatedBooks
 */
const getBlogBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({ slug })
            .populate('author', 'username avatar')
            .populate('relatedBooks');

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Increment view count using the instance method
        await blog.incrementViewCount();

        // Fetch similar blogs
        const relatedPosts = await blog.getRelatedBlogs();

        res.json({
            blog,
            relatedPosts,
            relatedBooks: blog.relatedBooks
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 3. Search published blogs by title, content, or tags
 * Route: GET /api/blogs/search
 * Query param: q (search query)
 */
const searchBlogs = async (req, res, next) => {
    try {
        const queryStr = req.query.q ? req.query.q.trim() : '';
        if (!queryStr) {
            return res.json({ blogs: [] });
        }

        const searchRegex = new RegExp(queryStr, 'i');
        const filter = {
            status: 'published',
            $or: [
                { title: searchRegex },
                { content: searchRegex },
                { tags: searchRegex }
            ]
        };

        const blogs = await Blog.find(filter)
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ blogs });
    } catch (error) {
        next(error);
    }
};

/**
 * 4. Get all published blogs in a specific category
 * Route: GET /api/blogs/category
 * Query param: category
 */
const getBlogsByCategory = async (req, res, next) => {
    try {
        const category = (req.query.category || req.params.category || '').trim();
        if (!category) {
            return res.status(400).json({ success: false, message: 'Category is required' });
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        const filter = { status: 'published', category };

        const [blogs, totalCount] = await Promise.all([
            Blog.find(filter)
                .populate('author', 'username avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Blog.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            blogs,
            totalCount,
            totalPages
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 5. Create a new blog post
 * Route: POST /api/blogs
 * Admin only
 */
const createBlog = async (req, res, next) => {
    try {
        const { title, category, excerpt, content, coverImage, tags, relatedBooks, status, seoTitle, seoDescription, seoKeywords } = req.body;

        // Validation of required fields
        const requiredCheck = validate.required(
            { title, category, excerpt, content, coverImage },
            ['title', 'category', 'excerpt', 'content', 'coverImage']
        );

        if (!requiredCheck.valid) {
            return res.status(400).json({ success: false, message: requiredCheck.message });
        }

        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        const blog = await Blog.create({
            title,
            category,
            excerpt,
            content,
            coverImage,
            tags: tags || [],
            relatedBooks: relatedBooks || [],
            status: status || 'draft',
            author: req.user._id,
            seoTitle,
            seoDescription,
            seoKeywords
        });

        res.status(201).json({ blog });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
        }
        next(error);
    }
};

/**
 * 6. Update an existing blog post
 * Route: PUT /api/blogs/:id
 * Admin only (Only owner can update)
 */
const updateBlog = async (req, res, next) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        // Ownership check
        if (blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this blog' });
        }

        const allowedFields = [
            'title', 'slug', 'category', 'excerpt', 'content', 'tags',
            'relatedBooks', 'status', 'seoTitle', 'seoDescription', 'seoKeywords', 'coverImage'
        ];

        // Update fields dynamically
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                blog[field] = req.body[field];
            }
        });

        // Saving will trigger pre-save / pre-validate hooks
        await blog.save();

        res.json({ blog });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
        }
        next(error);
    }
};

/**
 * 7. Soft delete a blog post (set status to "archived")
 * Route: DELETE /api/blogs/:id
 * Admin only (Only owner can delete)
 */
const deleteBlog = async (req, res, next) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        // Ownership check
        if (blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this blog' });
        }

        blog.status = 'archived';
        await blog.save();

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

/**
 * 8. Get blog statistics and analytics
 * Route: GET /api/blogs/analytics
 * Admin only
 */
const getBlogAnalytics = async (req, res, next) => {
    try {
        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        const range = req.query.range || 'all-time';
        const now = new Date();
        let dateFilter = {};

        if (range === 'this-month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { createdAt: { $gte: startOfMonth } };
        } else if (range === 'last-30') {
            const last30 = new Date();
            last30.setDate(now.getDate() - 30);
            dateFilter = { createdAt: { $gte: last30 } };
        } else if (range === 'custom') {
            const start = req.query.startDate ? new Date(req.query.startDate) : null;
            const end = req.query.endDate ? new Date(req.query.endDate) : null;
            if (start || end) {
                dateFilter = { createdAt: {} };
                if (start) {
                    dateFilter.createdAt.$gte = start;
                }
                if (end) {
                    const endOfDay = new Date(end);
                    endOfDay.setHours(23, 59, 59, 999);
                    dateFilter.createdAt.$lte = endOfDay;
                }
            }
        }

        // Fetch counts for stats overview (within date filter)
        const [
            totalBlogs,
            publishedCount,
            draftCount,
            archivedCount,
            totalCount
        ] = await Promise.all([
            Blog.countDocuments({ ...dateFilter, status: { $ne: 'archived' } }),
            Blog.countDocuments({ ...dateFilter, status: 'published' }),
            Blog.countDocuments({ ...dateFilter, status: 'draft' }),
            Blog.countDocuments({ ...dateFilter, status: 'archived' }),
            Blog.countDocuments(dateFilter)
        ]);

        const viewsResult = await Blog.aggregate([
            { $match: { ...dateFilter, status: { $ne: 'archived' } } },
            { $group: { _id: null, total: { $sum: '$viewCount' } } }
        ]);
        const totalViews = viewsResult[0] ? viewsResult[0].total : 0;

        // Limit to 10 for the top blogs table
        const mostViewedBlogs = await Blog.find({ ...dateFilter, status: { $ne: 'archived' } })
            .sort({ viewCount: -1 })
            .limit(10)
            .populate('author', 'username avatar')
            .lean();

        const averageViewsPerBlog = totalBlogs > 0 ? Number((totalViews / totalBlogs).toFixed(2)) : 0;

        const categoryStats = await Blog.aggregate([
            { $match: { ...dateFilter, status: { $ne: 'archived' } } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalViews: { $sum: '$viewCount' }
                }
            },
            { $sort: { totalViews: -1 } }
        ]);

        const topCategories = categoryStats.map((item) => ({
            category: item._id,
            count: item.count,
            totalViews: item.totalViews
        }));

        // Engagement metrics: created this month vs last month
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const [postsThisMonth, postsLastMonth] = await Promise.all([
            Blog.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
            Blog.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } })
        ]);

        res.json({
            analytics: {
                totalBlogs,
                totalViews,
                mostViewedBlogs,
                averageViewsPerBlog,
                topCategories,
                publishedCount,
                draftCount,
                archivedCount,
                totalCount,
                postsThisMonth,
                postsLastMonth
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 9. Get blog details by ID
 * Route: GET /api/blogs/id/:id
 * Admin only (used in editing / management page)
 */
const getBlogById = async (req, res, next) => {
    try {
        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        const blog = await Blog.findById(req.params.id)
            .populate('author', 'username avatar')
            .populate('relatedBooks');

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        res.json({ blog });
    } catch (error) {
        next(error);
    }
};

/**
 * 10. Get all blogs for Admin management (published + draft + archived)
 * Route: GET /api/blogs/admin/all
 * Admin only
 */
const getAllBlogsAdmin = async (req, res, next) => {
    try {
        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.category) {
            filter.category = req.query.category;
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search.trim(), 'i');
            filter.$or = [
                { title: searchRegex },
                { content: searchRegex },
                { tags: searchRegex }
            ];
        }

        const [blogs, totalCount] = await Promise.all([
            Blog.find(filter)
                .populate('author', 'username avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Blog.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            blogs,
            totalCount,
            totalPages
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 11. Bulk update status for blog posts (Admin only)
 * Route: PUT /api/blogs/admin/bulk-status
 */
const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { ids, status } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or empty IDs array' });
        }

        if (!['published', 'draft', 'archived'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }

        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        const updateData = { status };
        if (status === 'published') {
            updateData.publishedAt = new Date();
        }

        const result = await Blog.updateMany(
            { _id: { $in: ids } },
            { $set: updateData }
        );

        res.json({
            success: true,
            message: `Successfully updated status to "${status}" for ${result.modifiedCount} blog posts.`
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllBlogs,
    getBlogBySlug,
    searchBlogs,
    getBlogsByCategory,
    createBlog,
    updateBlog,
    deleteBlog,
    getBlogAnalytics,
    getBlogById,
    getAllBlogsAdmin,
    bulkUpdateStatus
};
