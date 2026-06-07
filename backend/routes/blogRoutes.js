const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/blogController');

// Existing auth middleware mappings
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Blog validation middleware
const {
    validateCreateBlog,
    validateUpdateBlog,
    validateBlogSearch
} = require('../middleware/blogValidation');

/* =========================================================================
   ADMIN ROUTES (Auth & Admin Role Required)
   ========================================================================= */

// 1. Create a new blog (POST /)
router.post('/', protect, admin, validateCreateBlog, createBlog);

// 2. Get all blogs for admin management (GET /admin/all)
router.get('/admin/all', protect, admin, getAllBlogsAdmin);

// 3. Get blog analytics overview (GET /admin/analytics/overview)
router.get('/admin/analytics/overview', protect, admin, getBlogAnalytics);

// 4. Get blog details by ID for admin (GET /admin/:id)
router.get('/admin/:id', protect, admin, getBlogById);

// 5. Update an existing blog (PUT /:id)
router.put('/:id', protect, admin, validateUpdateBlog, updateBlog);

// 6. Delete a blog (DELETE /:id)
router.delete('/:id', protect, admin, deleteBlog);

// 6.5 Bulk update status (PUT /admin/bulk-status)
router.put('/admin/bulk-status', protect, admin, bulkUpdateStatus);

// 6.6 Upload cover image (POST /admin/upload-cover)
router.post('/admin/upload-cover', protect, admin, upload.single('thumbnail'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded. Please use field name "thumbnail".' });
        }

        const { uploadToCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');
        let fileUrl = '';

        if (isCloudinaryConfigured) {
            fileUrl = await uploadToCloudinary(req.file.path, 'readifyai/blogs');
        } else {
            // Fallback to local server path
            fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        res.json({ success: true, url: fileUrl });
    } catch (error) {
        next(error);
    }
});

/* =========================================================================
   PUBLIC ROUTES (No Auth Required)
   ========================================================================= */

// 7. Get paginated list of published blogs (GET /)
router.get('/', getAllBlogs);

// 8. Search published blogs (GET /search)
router.get('/search', validateBlogSearch, searchBlogs);

// 9. Get published blogs by category (GET /category/:category)
router.get('/category/:category', getBlogsByCategory);

// 10. Get a single blog by slug (GET /:slug)
router.get('/:slug', getBlogBySlug);

module.exports = router;
