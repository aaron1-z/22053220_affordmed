require('dotenv').config(); 
console.log("ACCESS_TOKEN loaded:", process.env.ACCESS_TOKEN); 

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.TEST_SERVER_BASE_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; 


if (!BASE_URL || !ACCESS_TOKEN) {
    console.error("FATAL Error: TEST_SERVER_BASE_URL and/or ACCESS_TOKEN were not loaded from the .env file.");
    console.error("Please ensure the .env file exists in the project root and contains the correct values.");
    process.exit(1); 
}


const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`, 
        'Content-Type': 'application/json'
    }
});


let usersData = null; // { userId: userName }
let postsData = [];   // [ { id, userId, content } ]
let commentsData = {}; // { postId: [ { id, postId, content } ] }

// --- Helper Functions to Fetch Data from Test Server ---

async function fetchAllUsers() {
    console.log("Fetching all users...");
    try {
        const response = await apiClient.get('/users');
        console.log("Users fetched successfully.");
        return response.data.users; // { "1": "John Doe", ... }
    } catch (error) {
        console.error("Error fetching users:", error.response ? error.response.data : error.message);
        // Specific check for authorization error based on the previous logs
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
             console.error("Authorization failed. Please double-check the ACCESS_TOKEN in your .env file.");
        }
        if (error.message.includes('Invalid authorization token')) { // Check error message content too
             console.error("Server explicitly reported: Invalid authorization token.");
        }
        throw new Error("Failed to fetch users from test server.");
    }
}

async function fetchPostsForUser(userId) {
    // console.log(`Fetching posts for user ${userId}...`); // Can be very verbose
    try {
        const response = await apiClient.get(`/users/${userId}/posts`);
        return response.data.posts || []; // [ { id, userid, content }, ... ]
    } catch (error) {
        // Handle cases where a user might have no posts or other errors
        if (error.response && error.response.status === 404) {
            // console.warn(`No posts found for user ${userId} or user not found.`);
            return [];
        }
        console.error(`Error fetching posts for user ${userId}:`, error.response ? error.response.data : error.message);
        // Decide if you want to throw an error or return empty array
        return []; // Returning empty allows partial success if one user fails
        // throw new Error(`Failed to fetch posts for user ${userId}.`);
    }
}

async function fetchCommentsForPost(postId) {
    // console.log(`Fetching comments for post ${postId}...`); // Can be very verbose
    try {
        const response = await apiClient.get(`/posts/${postId}/comments`);
        return response.data.comments || []; // [ { id, postid, content }, ... ]
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // console.warn(`No comments found for post ${postId} or post not found.`);
            return [];
        }
        console.error(`Error fetching comments for post ${postId}:`, error.response ? error.response.data : error.message);
        return [];
        // throw new Error(`Failed to fetch comments for post ${postId}.`);
    }
}

// --- Function to Fetch and Cache All Required Data ---
// !! WARNING: This can be time-consuming and potentially costly !!
// Call this function strategically (e.g., on startup, or periodically if needed,
// though the test implies real-time might be expected).
// Consider the cost implications mentioned in the guidelines.
async function fetchAndCacheAllData() {
    console.log("Starting data fetch and cache process...");
    try {
        // 1. Fetch all users
        const fetchedUsers = await fetchAllUsers(); // This might throw if token is invalid
        usersData = fetchedUsers; // Cache users { userId: userName }
        console.log(`Fetched ${Object.keys(usersData).length} users.`); // Log how many users were fetched


        // 2. Fetch all posts for all users
        const userIds = Object.keys(usersData);
        console.log(`Fetching posts for ${userIds.length} users...`);
        let allPosts = [];
        const postPromises = userIds.map(userId => fetchPostsForUser(userId));
        const resultsPosts = await Promise.allSettled(postPromises);

        resultsPosts.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                // Add userId to each post object for easier lookup later
                // Ensure userId is parsed correctly if it's a string key
                const currentUserId = parseInt(userIds[index], 10);
                 if (result.value && Array.isArray(result.value)) {
                    const userPosts = result.value.map(post => ({ ...post, userId: currentUserId }));
                    allPosts = allPosts.concat(userPosts);
                 } else {
                    // console.warn(`Unexpected empty or non-array post data for user ${currentUserId}`);
                 }
            } else {
                console.error(`Failed to fetch posts for user ${userIds[index]}:`, result.reason);
            }
        });
        postsData = allPosts; // Cache posts [ { id, userId, content }, ... ]
        console.log(`Fetched total ${postsData.length} posts.`);


        // 3. Fetch all comments for all posts
        // !! This is the most expensive part !! Consider alternatives if possible.
        const postIds = postsData.map(post => post.id);
        console.log(`Fetching comments for ${postIds.length} posts...`);
        let allComments = {};

        // Limit concurrent requests to avoid overwhelming the server or hitting rate limits
        const CONCURRENCY_LIMIT = 10; // Adjust as needed
        for (let i = 0; i < postIds.length; i += CONCURRENCY_LIMIT) {
            const chunkPostIds = postIds.slice(i, i + CONCURRENCY_LIMIT);
            // console.log(`Fetching comment batch starting from index ${i}`);
            const commentPromises = chunkPostIds.map(postId => fetchCommentsForPost(postId));
            const resultsComments = await Promise.allSettled(commentPromises);

            resultsComments.forEach((result, index) => {
                const postId = chunkPostIds[index]; // Get postId from the current chunk
                if (result.status === 'fulfilled') {
                    // Store even if empty, to know we checked
                    allComments[postId] = result.value || [];
                } else {
                    console.error(`Failed to fetch comments for post ${postId}:`, result.reason);
                    allComments[postId] = []; // Store empty array on failure
                }
            });
            // Optional: Small delay between batches if needed
            // await new Promise(resolve => setTimeout(resolve, 100));
        }

        commentsData = allComments; // Cache comments { postId: [comments] }
        console.log(`Fetched comments for ${Object.keys(commentsData).length} posts (attempted: ${postIds.length}).`);


        console.log("Data fetch and cache process completed.");

    } catch (error) {
        console.error("FATAL: Failed during initial data fetch and cache:", error.message);
        // No need to exit here, let the server start but endpoints might fail if data is missing
        // process.exit(1);
    }
}


// --- API Endpoints for Your Microservice ---

// Middleware to check if data is loaded
const ensureDataLoaded = (req, res, next) => {
    // Check if essential data is available. Adjust based on what endpoints need.
    if (!usersData || !postsData /* comments might not be needed for all endpoints */) {
        console.warn("Request received before data fully loaded or fetch failed.");
        return res.status(503).json({ error: "Service Unavailable: Data is initializing or fetch failed. Please try again shortly." });
    }
    next();
};


// GET /users - Top 5 users with the highest number of posts
app.get('/users', ensureDataLoaded, (req, res) => {
    console.log("GET /users request received");
    try {
        // Calculate post counts per user
        const postCounts = {}; // { userId: count }
        if (!postsData || postsData.length === 0) {
             console.warn("No post data available for /users calculation.");
             return res.status(200).json([]); // Return empty if no posts
        }

        postsData.forEach(post => {
             if (post.userId) { // Ensure post object has userId
                 postCounts[post.userId] = (postCounts[post.userId] || 0) + 1;
             }
        });

        // Sort user IDs by post count (descending)
        const sortedUserIds = Object.keys(postCounts).sort((a, b) => postCounts[b] - postCounts[a]);

        // Get top 5 users
        const top5UserIds = sortedUserIds.slice(0, 5);

        // Format response
        const topUsersResponse = top5UserIds.map(userId => ({
            userId: parseInt(userId, 10), // Ensure userId is a number
            name: usersData[userId] || `User ID ${userId}`, // Lookup name, provide fallback
            postCount: postCounts[userId]
        }));

        res.status(200).json(topUsersResponse);

    } catch (error) {
        console.error("Error processing /users request:", error);
        res.status(500).json({ error: "Internal Server Error processing user data." });
    }
});

// GET /posts?type=popular or GET /posts?type=latest
app.get('/posts', ensureDataLoaded, (req, res) => {
    console.log(`GET /posts request received with type: ${req.query.type}`);
    const type = req.query.type; // 'popular' or 'latest'

    if (!type || (type !== 'popular' && type !== 'latest')) {
        return res.status(400).json({ error: "Missing or invalid 'type' query parameter. Use 'popular' or 'latest'." });
    }

     if (!postsData || postsData.length === 0) {
        console.warn(`No post data available for /posts?type=${type} calculation.`);
        return res.status(200).json([]); // Return empty if no posts
     }

    try {
        if (type === 'latest') {
            // Sort posts by ID descending (assuming higher ID means newer)
            // If there's a real timestamp field from the API, use that instead.
            const sortedPosts = [...postsData].sort((a, b) => b.id - a.id);
            const latest5Posts = sortedPosts.slice(0, 5);
            res.status(200).json(latest5Posts);

        } else if (type === 'popular') {
            // Calculate comment counts per post
            let maxCommentCount = -1; // Start at -1 to handle posts with 0 comments correctly
            const commentCounts = {}; // { postId: count }

            // Ensure commentsData is an object
             if (typeof commentsData !== 'object' || commentsData === null) {
                  console.error("commentsData is not an object or is null.");
                  return res.status(500).json({ error: "Internal server error: Comment data corrupted." });
             }

             // Pre-calculate comment counts efficiently
             postsData.forEach(post => {
                const postId = post.id;
                const count = (commentsData[postId] && Array.isArray(commentsData[postId])) ? commentsData[postId].length : 0;
                commentCounts[postId] = count;
                if (count > maxCommentCount) {
                    maxCommentCount = count;
                }
             });


            // Handle the case where no posts have comments
            if (maxCommentCount <= 0) {
                console.log("No posts found with comments for 'popular' type.");
                // Decide requirement: return empty array or top posts with 0 comments?
                // Assuming return empty if max is 0 or less.
                return res.status(200).json([]);
            }

            // Filter posts that have the maximum comment count
            const popularPosts = postsData.filter(post => commentCounts[post.id] === maxCommentCount);

            // Add comment count to the response object for clarity (optional)
             const popularPostsResponse = popularPosts.map(post => ({
                ...post,
                commentCount: maxCommentCount
            }));

            res.status(200).json(popularPostsResponse);
        }
    } catch (error) {
        console.error(`Error processing /posts?type=${type} request:`, error);
        res.status(500).json({ error: "Internal Server Error processing post data." });
    }
});

// --- Start the Server ---
app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    console.log("Attempting initial data fetch from test server...");
    
    await fetchAndCacheAllData();
    console.log("Initial data fetch sequence complete (check logs for success/failure). Server endpoints are active.");
});