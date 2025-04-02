// src/components/PostCard.js
import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { getRandomPostImage, getRandomAvatar } from '../utils/helpers';

function PostCard({ post, showCommentCount = false }) {
  return (
    <Card className="mb-4">
      <Card.Img variant="top" src={getRandomPostImage(post.id)} />
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <img 
            src={getRandomAvatar(post.userId)} 
            alt="User" 
            style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 10 }}
          />
          <div>
            <div className="fw-bold">User ID: {post.userId}</div>
            <small className="text-muted">Post ID: {post.id}</small>
          </div>
        </div>
        
        <Card.Text>{post.content}</Card.Text>
        
        {showCommentCount && post.commentCount !== undefined && (
          <Badge bg="primary" className="mt-2">
            {post.commentCount} comments
          </Badge>
        )}
      </Card.Body>
    </Card>
  );
}

export default PostCard;
