// Sample image URLs for testing the image upload functionality
export const sampleImages = {
  events: {
    logos: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=200&h=200&fit=crop&crop=center'
    ],
    banners: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=300&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=300&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800&h=300&fit=crop&crop=center'
    ]
  },
  teams: {
    logos: [
      'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=200&h=200&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=200&h=200&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200&h=200&fit=crop&crop=center'
    ]
  },
  players: {
    photos: [
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=200&h=250&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=200&h=250&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=250&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=250&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=250&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=250&fit=crop&crop=face'
    ]
  }
};

// Helper function to get a random sample image
export const getRandomSampleImage = (type, subtype) => {
  const images = sampleImages[type]?.[subtype];
  if (!images || images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)];
};

// Helper function to get all sample images of a type
export const getSampleImages = (type, subtype) => {
  return sampleImages[type]?.[subtype] || [];
};
