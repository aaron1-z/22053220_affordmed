// src/components/UserCard.js
import React from 'react';
import { Card } from 'react-bootstrap';
import { getRandomAvatar } from '../utils/helpers';

function UserCard({ user }) {
  return (
    <Card className="mb-3">
      <Card.Body className="d-flex align-items-center">
        <img 
          src={getRandomAvatar(user.userId)} 
          alt={user.name} 
          style={{ width: 80, height: 80, borderRadius: '50%', marginRight: 15 }}
        />
        <div>
          <Card.Title>{user.name}</Card.Title>
          <Card.Text>
            Posts: <strong>{user.postCount}</strong>
          </Card.Text>
        </div>
      </Card.Body>
    </Card>
  );
}

export default UserCard;
