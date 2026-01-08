import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="home-container">
      <nav className="home-navbar">
        <div className="navbar-content">
          <h1 className="navbar-brand">SmartFleet Monitor</h1>
          <button onClick={handleLoginClick} className="login-btn">
            Login
          </button>
        </div>
      </nav>

      <div className="home-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Driver Efficiency and  Vehicle Performance
            <br />
             Monitoring Portal
          </h1>
          <p className="hero-subtitle">
            Track vehicle performance, monitor driver efficiency, and optimize your fleet operations
          </p>
          <div className="hero-features">
            <div className="feature-card">
              <div className="feature-icon">🚛</div>
              <h3>Vehicle Management</h3>
              <p>Monitor and manage your entire fleet</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Performance Analytics</h3>
              <p>Real-time insights and efficiency metrics</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👤</div>
              <h3>Driver Tracking</h3>
              <p>Track driver performance and efficiency</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⛽</div>
              <h3>Fuel Management</h3>
              <p>Monitor fuel usage and optimize costs</p>
            </div>
          </div>
          <button onClick={handleLoginClick} className="cta-button">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;





