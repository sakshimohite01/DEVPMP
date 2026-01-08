import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isManager, isDriver } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
         SmartFleet Monitor
        </Link>
        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/dashboard" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            Dashboard
          </Link>
          {isManager && (
            <Link to="/vehicles" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
              Vehicles
            </Link>
          )}
          <Link to="/trips" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
            Trips
          </Link>
          {user?.role === 'admin' && (
            <Link to="/users" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
              Users
            </Link>
          )}
          <div className="navbar-user-info">
            <span>{user?.name} ({user?.role})</span>
          </div>
          <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="navbar-link btn-logout">
            Logout
          </button>
        </div>
        <div className="hamburger" onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
