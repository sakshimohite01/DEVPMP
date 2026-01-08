import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState(null);
  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, reportType]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        dashboardAPI.getStats(),
        authAPI.getAllUsers(),
        dashboardAPI.getReports(reportType),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      
      const reportsData = reportsRes.data;
      if (reportType === 'summary') {
        setReports(reportsData);
      } else {
        setReports(Array.isArray(reportsData) ? reportsData : reportsData || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setReports(null);
    } finally {
      setLoading(false);
    }
  };

  const exportReportToCSV = () => {
    if (!reports) {
      alert('No report data to export');
      return;
    }

    let csvContent = '';
    let filename = `report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'summary') {
      csvContent = 'Summary Report\n\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Trips,${reports.trips}\n`;
      csvContent += `Total Distance (km),${reports.totalDistance?.toFixed(2) || 0}\n`;
      csvContent += `Total Fuel (L),${reports.totalFuel?.toFixed(2) || 0}\n`;
      csvContent += `Average Efficiency (km/L),${reports.avgEfficiency || 0}\n`;
      csvContent += `Total Vehicles,${reports.totalVehicles}\n\n`;
      csvContent += 'Users by Role\n';
      csvContent += 'Role,Count\n';
      reports.users?.forEach((u) => {
        csvContent += `${u.role},${u.count}\n`;
      });
    } else if (reportType === 'driver-performance') {
      csvContent = 'Driver Performance Report\n\n';
      csvContent += 'Driver Name,Email,Trips,Total Distance (km),Total Fuel (L),Avg Efficiency (km/L),Avg Speed (km/h)\n';
      if (Array.isArray(reports)) {
        reports.forEach((driver) => {
          csvContent += `"${driver.name}","${driver.email}",${driver.trip_count || 0},${driver.total_distance?.toFixed(2) || 0},${driver.total_fuel?.toFixed(2) || 0},"${driver.avg_efficiency || 'N/A'}","${driver.avg_speed || 'N/A'}"\n`;
        });
      }
    } else if (reportType === 'vehicle-performance') {
      csvContent = 'Vehicle Performance Report\n\n';
      csvContent += 'Vehicle Number,Model,Fuel Type,Trips,Total Distance (km),Total Fuel (L),Avg Efficiency (km/L),Last Service\n';
      if (Array.isArray(reports)) {
        reports.forEach((vehicle) => {
          csvContent += `"${vehicle.vehicle_number}","${vehicle.model}","${vehicle.fuel_type}",${vehicle.trip_count || 0},${vehicle.total_distance?.toFixed(2) || 0},${vehicle.total_fuel?.toFixed(2) || 0},"${vehicle.avg_efficiency || 'N/A'}","${vehicle.last_service_date || 'Never'}"\n`;
        });
      }
    }

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getDriverEfficiencyData = () => {
    if (!reports || !Array.isArray(reports) || reportType !== 'driver-performance') {
      return [];
    }
    return reports
      .filter(d => d.avg_efficiency && d.avg_efficiency !== 'N/A')
      .map(driver => ({
        name: driver.name.split(' ')[0],
        efficiency: parseFloat(driver.avg_efficiency) || 0,
        trips: driver.trip_count || 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10);
  };

  const getVehiclePerformanceData = () => {
    if (!reports || !Array.isArray(reports) || reportType !== 'vehicle-performance') {
      return [];
    }
    return reports
      .filter(v => v.avg_efficiency && v.avg_efficiency !== 'N/A')
      .map(vehicle => ({
        name: vehicle.vehicle_number,
        efficiency: parseFloat(vehicle.avg_efficiency) || 0,
        distance: vehicle.total_distance || 0,
        fuel: vehicle.total_fuel || 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10);
  };

  const getVehicleDistanceData = () => {
    if (!reports || !Array.isArray(reports) || reportType !== 'vehicle-performance') {
      return [];
    }
    return reports
      .map(vehicle => ({
        name: vehicle.vehicle_number,
        distance: vehicle.total_distance || 0,
      }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 8);
  };

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <h2>Access Denied</h2>
        <p>Only admins can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <p className="welcome-text">Welcome, {user?.name}!</p>

      {/* System Metrics Overview */}
      <div className="section">
        <h3>System Metrics Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Users</h4>
            <p className="stat-value">{users.length}</p>
            <p className="stat-detail">
              {users.filter(u => u.role === 'admin').length} Admin,{' '}
              {users.filter(u => u.role === 'manager').length} Manager,{' '}
              {users.filter(u => u.role === 'driver').length} Driver
            </p>
          </div>
          <div className="stat-card">
            <h4>Total Trips</h4>
            <p className="stat-value">{stats?.totalTrips || 0}</p>
          </div>
          <div className="stat-card">
            <h4>Total Vehicles</h4>
            <p className="stat-value">{stats?.totalVehicles || 0}</p>
          </div>
          <div className="stat-card">
            <h4>Total Distance</h4>
            <p className="stat-value">{stats?.totalDistance?.toFixed(2) || 0} km</p>
          </div>
          <div className="stat-card">
            <h4>Total Fuel Used</h4>
            <p className="stat-value">{stats?.totalFuelUsed?.toFixed(2) || 0} L</p>
          </div>
          <div className="stat-card">
            <h4>Average Efficiency</h4>
            <p className="stat-value">{stats?.averageEfficiency || 0} km/L</p>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="section">
        <div className="section-header">
          <h3>User Management</h3>
          <button onClick={() => navigate('/users')} className="btn-primary">
            Manage Users
          </button>
        </div>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((user) => (
                <tr key={user.user_id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>{user.role}</span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length > 5 && (
            <p className="view-more" onClick={() => navigate('/users')}>
              View all {users.length} users →
            </p>
          )}
        </div>
      </div>

      {/* Reports */}
      <div className="section">
        <div className="section-header">
          <h3>Reports</h3>
          <div className="report-controls">
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="report-select">
              <option value="summary">Summary Report</option>
              <option value="driver-performance">Driver Performance</option>
              <option value="vehicle-performance">Vehicle Performance</option>
            </select>
            <button onClick={exportReportToCSV} className="btn-primary">
              Export Report
            </button>
          </div>
        </div>
        <div className="reports-content">
          {reportType === 'summary' && reports && (
            <div className="report-summary">
              <div className="report-card">
                <h4>System Summary</h4>
                <ul>
                  <li>Total Trips: {reports.trips}</li>
                  <li>Total Distance: {reports.totalDistance?.toFixed(2)} km</li>
                  <li>Total Fuel: {reports.totalFuel?.toFixed(2)} L</li>
                  <li>Average Efficiency: {reports.avgEfficiency} km/L</li>
                  <li>Total Vehicles: {reports.totalVehicles}</li>
                </ul>
                <div className="user-breakdown">
                  <h5>Users by Role:</h5>
                  {reports.users?.map((u) => (
                    <p key={u.role}>
                      {u.role}: {u.count}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
          {reportType === 'driver-performance' && reports && Array.isArray(reports) && (
            <div className="report-table">
              <div className="table-header">
                <p className="table-title">Driver Performance Details</p>
                <button onClick={exportReportToCSV} className="btn-export">
                  ⬇ Download CSV
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>Email</th>
                    <th>Trips</th>
                    <th>Total Distance</th>
                    <th>Total Fuel</th>
                    <th>Avg Efficiency</th>
                    <th>Avg Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((driver) => (
                    <tr key={driver.user_id}>
                      <td>{driver.name}</td>
                      <td>{driver.email}</td>
                      <td>{driver.trip_count || 0}</td>
                      <td>{driver.total_distance?.toFixed(2) || 0} km</td>
                      <td>{driver.total_fuel?.toFixed(2) || 0} L</td>
                      <td>{driver.avg_efficiency || 'N/A'} km/L</td>
                      <td>{driver.avg_speed || 'N/A'} km/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reportType === 'driver-performance' && reports && Array.isArray(reports) && getDriverEfficiencyData().length > 0 && (
            <div className="charts-section">
              <div className="chart-container">
                <h4>Top Drivers by Fuel Efficiency</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getDriverEfficiencyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Efficiency (km/L)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#667eea" name="Fuel Efficiency (km/L)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-container">
                <h4>Driver Trips Distribution</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getDriverEfficiencyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Number of Trips', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trips" fill="#28a745" name="Trips" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {reportType === 'driver-performance' && (!reports || !Array.isArray(reports)) && (
            <div className="error-message">
              <p>No driver performance data available</p>
            </div>
          )}
          {reportType === 'vehicle-performance' && reports && Array.isArray(reports) && (
            <div className="report-table">
              <div className="table-header">
                <p className="table-title">Vehicle Performance Details</p>
                <button onClick={exportReportToCSV} className="btn-export">
                  ⬇ Download CSV
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Vehicle Number</th>
                    <th>Model</th>
                    <th>Fuel Type</th>
                    <th>Trips</th>
                    <th>Total Distance</th>
                    <th>Total Fuel</th>
                    <th>Avg Efficiency</th>
                    <th>Last Service</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((vehicle) => (
                    <tr key={vehicle.vehicle_id}>
                      <td>{vehicle.vehicle_number}</td>
                      <td>{vehicle.model}</td>
                      <td>{vehicle.fuel_type}</td>
                      <td>{vehicle.trip_count || 0}</td>
                      <td>{vehicle.total_distance?.toFixed(2) || 0} km</td>
                      <td>{vehicle.total_fuel?.toFixed(2) || 0} L</td>
                      <td>{vehicle.avg_efficiency || 'N/A'} km/L</td>
                      <td>{vehicle.last_service_date || 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reportType === 'vehicle-performance' && reports && Array.isArray(reports) && getVehiclePerformanceData().length > 0 && (
            <div className="charts-section">
              <div className="chart-container">
                <h4>Top Vehicles by Fuel Efficiency</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getVehiclePerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Efficiency (km/L)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#667eea" name="Fuel Efficiency (km/L)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-container">
                <h4>Vehicle Distance Traveled</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getVehicleDistanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => value.toFixed(2)} />
                    <Legend />
                    <Bar dataKey="distance" fill="#17a2b8" name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {reportType === 'vehicle-performance' && (!reports || !Array.isArray(reports)) && (
            <div className="error-message">
              <p>No vehicle performance data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;





