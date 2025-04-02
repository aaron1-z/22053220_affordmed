// src/pages/TopUsers.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Alert, Spinner } from 'react-bootstrap';
import UserCard from '../components/UserCard';
import api from '../services/api';

function TopUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setLoading(true);
        const data = await api.getTopUsers();
        setUsers(data);
        setError(null);
      } catch (err) {
        setError('Failed to load top users. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopUsers();
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
      <h2 className="mb-4">Top Users</h2>
      {users.length === 0 ? (
        <Alert variant="info">No users found</Alert>
      ) : (
        <Row>
          <Col md={8} lg={6}>
            {users.map(user => (
              <UserCard key={user.userId} user={user} />
            ))}
          </Col>
        </Row>
      )}
    </div>
  );
}

export default TopUsers;