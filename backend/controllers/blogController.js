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
        let { slug } = req.params;

        // Redirect old legacy/outdated slug to the new canonical slug
        if (slug === 'current-best-selling-books-10-outstanding-titles-worth-reading') {
            slug = 'top-10-best-free-books-to-read-online-2026';
        }

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
const { uploadBase64ToCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');

/**
 * Helper function to extract and upload base64 images inside editor content to Cloudinary
 */
const processContentImages = async (content) => {
    if (!content) return content;
    if (!isCloudinaryConfigured) {
        console.warn('[blogController] Cloudinary not configured. Skipping processing of base64 images in content.');
        return content;
    }

    // Match all base64 image src in content (data:image/png;base64,...)
    const base64Regex = /src=["'](data:image\/[^;]+;base64,[^"']+)["']/g;
    const matches = [...content.matchAll(base64Regex)];
    
    if (matches.length === 0) return content;

    console.log(`[${new Date().toISOString()}] [blogController] Found ${matches.length} base64 images in content. Processing...`);

    const uploadPromises = matches.map(async (match) => {
        const base64Data = match[1];
        try {
            const url = await uploadBase64ToCloudinary(base64Data, 'readifyai/blogs/inline');
            return { original: base64Data, url };
        } catch (error) {
            console.error(`[${new Date().toISOString()}] [blogController] Failed to upload inline base64 image:`, error.message);
            return { original: base64Data, url: null };
        }
    });

    const results = await Promise.all(uploadPromises);

    let updatedContent = content;
    for (const result of results) {
        if (result.url) {
            updatedContent = updatedContent.replaceAll(result.original, result.url);
        }
    }

    console.log(`[${new Date().toISOString()}] [blogController] Completed processing base64 images. Replaced count: ${results.filter(r => r.url).length}`);
    return updatedContent;
};

/**
 * 5. Create a new blog post
 * Route: POST /api/blogs
 * Admin only
 */
const createBlog = async (req, res, next) => {
    try {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [createBlog] Start request processing.`);

        const { title, category, excerpt, content, coverImage, tags, relatedBooks, status, seoTitle, seoDescription, seoKeywords } = req.body;

        // Validation of required fields
        console.log(`[${new Date().toISOString()}] [createBlog] Step 1: Validation start.`);
        const requiredCheck = validate.required(
            { title, category, excerpt, content, coverImage },
            ['title', 'category', 'excerpt', 'content', 'coverImage']
        );

        if (!requiredCheck.valid) {
            console.warn(`[${new Date().toISOString()}] [createBlog] Validation failed: ${requiredCheck.message}`);
            return res.status(400).json({ success: false, message: requiredCheck.message });
        }

        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            console.warn(`[${new Date().toISOString()}] [createBlog] Authorization failed: Not authorized as admin`);
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }
        console.log(`[${new Date().toISOString()}] [createBlog] Step 1: Validation success. Time taken: ${Date.now() - startTime}ms`);

        // Image processing (Uploading inline base64 images in content to Cloudinary)
        console.log(`[${new Date().toISOString()}] [createBlog] Step 2: Image processing / upload start.`);
        const imageProcessStart = Date.now();
        let processedContent;
        try {
            processedContent = await processContentImages(content);
        } catch (imgError) {
            console.error(`[${new Date().toISOString()}] [createBlog] Image processing exception:`, imgError.message || imgError);
            return res.status(500).json({ 
                success: false, 
                message: `Failed to process/upload images embedded in content: ${imgError.message || imgError}` 
            });
        }
        console.log(`[${new Date().toISOString()}] [createBlog] Step 2: Image processing complete. Time taken: ${Date.now() - imageProcessStart}ms`);

        // DB write
        console.log(`[${new Date().toISOString()}] [createBlog] Step 3: DB Write start.`);
        const dbWriteStart = Date.now();
        let blog;
        try {
            blog = await Blog.create({
                title,
                category,
                excerpt,
                content: processedContent,
                coverImage,
                tags: tags || [],
                relatedBooks: relatedBooks || [],
                status: status || 'draft',
                author: req.user._id,
                seoTitle,
                seoDescription,
                seoKeywords
            });
        } catch (dbError) {
            console.error(`[${new Date().toISOString()}] [createBlog] DB Write exception:`, dbError.message || dbError);
            return res.status(500).json({ 
                success: false, 
                message: `Failed to write blog post to database: ${dbError.message || dbError}` 
            });
        }
        
        const dbWriteDuration = Date.now() - dbWriteStart;
        console.log(`[${new Date().toISOString()}] [createBlog] Step 3: DB Write success. Time taken: ${dbWriteDuration}ms`);
        console.log(`[${new Date().toISOString()}] [createBlog] Request fully completed. Total time: ${Date.now() - startTime}ms`);

        res.status(201).json({ blog });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [createBlog] Catch-all error:`, error.message || error);
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
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [updateBlog] Start request processing for ID: ${req.params.id}`);

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            console.warn(`[${new Date().toISOString()}] [updateBlog] Blog not found for ID: ${req.params.id}`);
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            console.warn(`[${new Date().toISOString()}] [updateBlog] Authorization failed: Not authorized as admin`);
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        // Ownership check
        if (blog.author.toString() !== req.user._id.toString()) {
            console.warn(`[${new Date().toISOString()}] [updateBlog] Ownership check failed: user is not author`);
            return res.status(403).json({ success: false, message: 'Not authorized to update this blog' });
        }

        console.log(`[${new Date().toISOString()}] [updateBlog] Step 1: Validation and ownership success. Time taken: ${Date.now() - startTime}ms`);

        // Image processing (Uploading inline base64 images in content to Cloudinary)
        console.log(`[${new Date().toISOString()}] [updateBlog] Step 2: Image processing / upload start.`);
        const imageProcessStart = Date.now();
        let processedContent = req.body.content;
        if (processedContent !== undefined) {
            try {
                processedContent = await processContentImages(processedContent);
            } catch (imgError) {
                console.error(`[${new Date().toISOString()}] [updateBlog] Image processing exception:`, imgError.message || imgError);
                return res.status(500).json({ 
                    success: false, 
                    message: `Failed to process/upload images embedded in content: ${imgError.message || imgError}` 
                });
            }
        }
        console.log(`[${new Date().toISOString()}] [updateBlog] Step 2: Image processing complete. Time taken: ${Date.now() - imageProcessStart}ms`);

        // Update fields dynamically
        const allowedFields = [
            'title', 'slug', 'category', 'excerpt', 'tags',
            'relatedBooks', 'status', 'seoTitle', 'seoDescription', 'seoKeywords', 'coverImage'
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                blog[field] = req.body[field];
            }
        });

        if (processedContent !== undefined) {
            blog.content = processedContent;
        }

        // DB write
        console.log(`[${new Date().toISOString()}] [updateBlog] Step 3: DB Write start.`);
        const dbWriteStart = Date.now();
        try {
            // Saving will trigger pre-save / pre-validate hooks
            await blog.save();
        } catch (dbError) {
            console.error(`[${new Date().toISOString()}] [updateBlog] DB Write exception:`, dbError.message || dbError);
            return res.status(500).json({ 
                success: false, 
                message: `Failed to write blog post updates to database: ${dbError.message || dbError}` 
            });
        }
        
        const dbWriteDuration = Date.now() - dbWriteStart;
        console.log(`[${new Date().toISOString()}] [updateBlog] Step 3: DB Write success. Time taken: ${dbWriteDuration}ms`);
        console.log(`[${new Date().toISOString()}] [updateBlog] Request fully completed. Total time: ${Date.now() - startTime}ms`);

        res.json({ blog });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] [updateBlog] Catch-all error:`, error.message || error);
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
 * Route: GET /api/blogs/admin/:id
 * Admin only (used in editing / management page)
 */
const getBlogById = async (req, res, next) => {
    try {
        // Authorization check
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized as admin' });
        }

        if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'Invalid blog ID' });
        }

        const blog = await Blog.findById(req.params.id)
            .select('title slug category excerpt content coverImage tags relatedBooks status seoTitle seoDescription seoKeywords')
            .lean();

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
