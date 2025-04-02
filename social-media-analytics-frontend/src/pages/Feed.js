// src/pages/Feed.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Alert, Spinner, Button } from 'react-bootstrap';
import PostCard from '../components/PostCard';
import api from '../services/api';

function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLatestPosts = async () => {
    try {
      setRefreshing(true);
      const data = await api.getLatestPosts();
      setPosts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load latest posts. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestPosts();
    
    // Set up an interval to refresh the feed every 30 seconds
    const interval = setInterval(() => {
      fetchLatestPosts();
    }, 30000);

    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchLatestPosts();
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Latest Feed</h2>
        <Button 
          variant="outline-primary" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Feed'}
        </Button>
      </div>
      
      {posts.length === 0 ? (
        <Alert variant="info">No posts found</Alert>
      ) : (
        <Row>
          <Col lg={8}>
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </Col>
        </Row>
      )}
    </div>
  );
}

export default Feed;
