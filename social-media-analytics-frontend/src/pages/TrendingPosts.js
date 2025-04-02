// src/pages/TrendingPosts.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Alert, Spinner } from 'react-bootstrap';
import PostCard from '../components/PostCard';
import api from '../services/api';

function TrendingPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setLoading(true);
        const data = await api.getTrendingPosts();
        setPosts(data);
        setError(null);
      } catch (err) {
        setError('Failed to load trending posts. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingPosts();
  }, []);

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
      <h2 className="mb-4">Trending Posts</h2>
      {posts.length === 0 ? (
        <Alert variant="info">No trending posts found</Alert>
      ) : (
        <Row>
          <Col lg={8}>
            <div className="mb-4">
              <Alert variant="info">
                {posts.length > 1 ? 
                  `These ${posts.length} posts have the highest number of comments` : 
                  'This post has the highest number of comments'}
              </Alert>
            </div>
            {posts.map(post => (
              <PostCard key={post.id} post={post} showCommentCount={true} />
            ))}
          </Col>
        </Row>
      )}
    </div>
  );
}

export default TrendingPosts;
