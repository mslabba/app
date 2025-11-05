import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';

// Initialize Cloudinary
const cld = new Cloudinary({
  cloud: {
    cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME
  }
});

/**
 * Upload image to Cloudinary
 * @param {File} file - The image file to upload
 * @param {string} folder - Optional folder name (e.g., 'players', 'teams', 'sponsors')
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadImageToCloudinary = async (file, folder = 'auction') => {
  const formData = new FormData();

  // Add the file
  formData.append('file', file);

  // Add upload preset (we'll create this in Cloudinary dashboard)
  formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'auction_uploads');

  // Add folder
  formData.append('folder', folder);

  // Add additional metadata
  formData.append('resource_type', 'image');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      public_id: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary: ' + error.message);
  }
};

/**
 * Generate optimized image URL from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  if (!publicId) return '';

  const {
    width = 500,
    height = 500,
    crop = 'auto',
    gravity = 'auto',
    quality: imgQuality = 'auto',
    format: imgFormat = 'auto'
  } = options;

  const img = cld
    .image(publicId)
    .format(imgFormat)
    .quality(imgQuality)
    .resize(auto().gravity(autoGravity()).width(width).height(height));

  return img.toURL();
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {number} size - Thumbnail size (default: 150)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (publicId, size = 150) => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto'
  });
};

/**
 * Generate responsive image URLs
 * @param {string} publicId - Cloudinary public ID
 * @returns {Object} Object with different sized URLs
 */
export const getResponsiveImageUrls = (publicId) => {
  return {
    thumbnail: getThumbnailUrl(publicId, 150),
    small: getOptimizedImageUrl(publicId, { width: 300, height: 300 }),
    medium: getOptimizedImageUrl(publicId, { width: 600, height: 600 }),
    large: getOptimizedImageUrl(publicId, { width: 1200, height: 1200 }),
    original: getOptimizedImageUrl(publicId, { width: 2000, height: 2000 })
  };
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return '';

  const urlParts = url.split('/');
  const uploadIndex = urlParts.findIndex(part => part === 'upload');

  if (uploadIndex === -1) return '';

  // Get everything after version number (if present)
  let publicIdParts = urlParts.slice(uploadIndex + 1);

  // Remove version if present (starts with 'v' followed by numbers)
  if (publicIdParts[0] && publicIdParts[0].match(/^v\d+$/)) {
    publicIdParts = publicIdParts.slice(1);
  }

  // Join the remaining parts and remove file extension
  const publicIdWithExt = publicIdParts.join('/');
  return publicIdWithExt.replace(/\.[^/.]+$/, '');
};

export { cld };
export default {
  uploadImageToCloudinary,
  getOptimizedImageUrl,
  getThumbnailUrl,
  getResponsiveImageUrls,
  extractPublicIdFromUrl
};