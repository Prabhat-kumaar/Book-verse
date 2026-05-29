const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const isConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
        api_key: process.env.CLOUDINARY_API_KEY.trim(),
        api_secret: process.env.CLOUDINARY_API_SECRET.trim()
    });
}

/**
 * Uploads a local file to Cloudinary and deletes it locally afterward.
 * @param {string} localPath - Absolute path to the local file
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string|null>} Secure absolute URL or null if failed
 */
const uploadToCloudinary = async (localPath, folder = 'bookverse') => {
    if (!isConfigured) {
        console.warn('[Cloudinary] Skipping upload because Cloudinary environment variables are not set.');
        return null;
    }

    try {
        if (!localPath || !fs.existsSync(localPath)) {
            console.error('[Cloudinary] Local file path does not exist:', localPath);
            return null;
        }

        console.log(`[Cloudinary] Starting upload for: ${localPath}`);
        const result = await cloudinary.uploader.upload(localPath, {
            folder: folder,
            resource_type: 'auto'
        });

        console.log(`[Cloudinary] Successfully uploaded to: ${result.secure_url}`);
        
        // Dynamic clean up of the local file
        try {
            fs.unlinkSync(localPath);
            console.log(`[Cloudinary] Cleaned up temporary local file: ${localPath}`);
        } catch (unlinkError) {
            console.warn(`[Cloudinary] Could not remove temp file ${localPath}:`, unlinkError.message);
        }

        return result.secure_url;
    } catch (error) {
        console.error('[Cloudinary] Upload exception occurred:', error.message || error);
        
        // Always try to clean up the temporary local file on failure
        try {
            if (localPath && fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                console.log(`[Cloudinary] Cleaned up temporary local file on error: ${localPath}`);
            }
        } catch (unlinkError) {
            // no-op
        }
        
        throw error;
    }
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured: !!isConfigured,
    uploadToCloudinary
};
