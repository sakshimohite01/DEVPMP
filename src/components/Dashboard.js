import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import DriverDashboard from './DriverDashboard';

const Dashboard = () => {
  const { user, isAdmin, isManager, isDriver } = useAuth();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isManager) {
    return <ManagerDashboard />;
  }

  if (isDriver) {
    return <DriverDashboard />;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p>Loading...</p>
    </div>
  );
};

export default Dashboard;
