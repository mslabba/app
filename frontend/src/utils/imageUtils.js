/**
 * Convert Google Drive sharing links to direct image URLs that work in <img> tags
 * @param {string} url - Original URL (Google Drive link or direct URL)
 * @returns {string} - Converted URL or original if not a Google Drive link
 */
export const convertGoogleDriveUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // If it's not a Google Drive link, return as is
  if (!url.toLowerCase().includes('drive.google.com')) {
    return url;
  }

  // Extract file ID from various Google Drive URL formats
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const fileId = match[1];
      // Use lh3.googleusercontent.com format for better CORS compatibility
      // This format works better with cross-origin requests than thumbnail API
      return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
    }
  }

  return url;
};

/**
 * Get all possible Google Drive URL formats for an image
 * Useful for fallback attempts when one format doesn't work
 * @param {string} url - Original URL
 * @returns {array} - Array of alternative URLs to try
 */
export const getGoogleDriveAlternativeUrls = (url) => {
  if (!url || typeof url !== 'string') {
    return [url];
  }

  // Extract file ID
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/
  ];

  let fileId = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      fileId = match[1];
      break;
    }
  }

  if (!fileId) {
    return [url];
  }

  // Return multiple URL formats to try as fallbacks
  // Ordered by CORS-friendliness
  return [
    `https://lh3.googleusercontent.com/d/${fileId}=w400`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
  ];
};

/**
 * Get optimized Google Drive thumbnail URL with custom size
 * @param {string} url - Original URL
 * @param {string} size - Thumbnail size (w200, w400, w800, etc.)
 * @returns {string} - Converted URL
 */
export const getGoogleDriveThumbnail = (url, size = 'w400') => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // If it's not a Google Drive link, return as is
  if (!url.toLowerCase().includes('drive.google.com')) {
    return url;
  }

  // Extract file ID
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
    }
  }

  return url;
};

/**
 * Component wrapper for img tag with Google Drive URL conversion
 * Usage: <PlayerImage src={player.photo_url} alt={player.name} className="..." />
 */
export const PlayerImage = ({ src, alt, className, ...props }) => {
  const convertedSrc = convertGoogleDriveUrl(src);

  return (
    <img
      src={convertedSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        // Fallback to a placeholder if image fails to load
        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
      }}
      {...props}
    />
  );
};
