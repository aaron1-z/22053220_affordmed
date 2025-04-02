// src/utils/helpers.js
// Utility to generate random avatar and post images
export const getRandomAvatar = (userId) => {
    // Use a deterministic approach so the same user always gets the same image
    return `https://i.pravatar.cc/150?img=${userId % 70}`;
  };
  
  export const getRandomPostImage = (postId) => {
    // Get a random image based on post ID
    return `https://picsum.photos/seed/${postId}/400/300`;
  };
  
  // Format date (assuming you might add timestamps in the future)
  export const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    return new Date(timestamp).toLocaleString();
  };