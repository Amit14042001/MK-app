const { uploadToCloudinary } = require('../middleware/uploadValidation');

/**
 * MK App — Upload Utility
 * Wrapper around Cloudinary or local storage
 */
exports.uploadToStorage = async (file, folder) => {
  if (!file) return null;
  
  // If we have a buffer (from multer)
  if (file.buffer) {
    const result = await uploadToCloudinary(file.buffer, folder);
    return result.url;
  }
  
  return null;
};
