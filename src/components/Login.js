import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { value: 'admin', label: 'Admin', icon: '👑', description: 'Full system access and user management' },
    { value: 'manager', label: 'Manager', icon: '📊', description: 'View analytics and manage vehicles' },
    { value: 'driver', label: 'Driver', icon: '🚗', description: 'Log trips and view your performance' }
  ];

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    
    if (role === 'admin') {
      setEmail('admin@example.com');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedRole) {
      setError('Please select a role first');
      setLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button onClick={handleBack} className="back-button">← Back to Home</button>
        <h1>SmartFleet Monitor</h1>
        <h2>Login</h2>
        
        {!selectedRole ? (
          <div className="role-selection">
            <p className="role-selection-title">Select your role to continue:</p>
            <div className="role-options">
              {roles.map((role) => (
                <div
                  key={role.value}
                  className="role-card"
                  onClick={() => handleRoleSelect(role.value)}
                >
                  <div className="role-icon">{role.icon}</div>
                  <h3>{role.label}</h3>
                  <p>{role.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="selected-role-badge">
              <span>{roles.find(r => r.value === selectedRole)?.icon}</span>
              <span>{roles.find(r => r.value === selectedRole)?.label}</span>
              <button onClick={() => setSelectedRole(null)} className="change-role-btn">Change</button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            
                      </>
        )}
      </div>
    </div>
  );
};

export default Login;
