import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, vehiclesAPI, authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignedDrivers, setAssignedDrivers] = useState([]);
  const [vehicleEfficiency, setVehicleEfficiency] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    vehicle_id: '',
    driver_id: '',
  });

  useEffect(() => {
    if (isManager) {
      loadDashboardData();
    }
  }, [isManager]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, driversRes, assignedRes, efficiencyRes] = await Promise.all([
        vehiclesAPI.getAll(),
        vehiclesAPI.getDriversList(),
        dashboardAPI.getAssignedDrivers(),
        dashboardAPI.getVehicleEfficiency(),
      ]);

      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
      setAssignedDrivers(assignedRes.data);
      setVehicleEfficiency(efficiencyRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVehicle = async (e) => {
    e.preventDefault();
    try {
      await vehiclesAPI.assignVehicle(assignFormData.vehicle_id, assignFormData.driver_id);
      alert('Vehicle assigned successfully!');
      setAssignFormData({ vehicle_id: '', driver_id: '' });
      setShowAssignForm(false);
      loadDashboardData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign vehicle');
    }
  };

  const handleUnassignVehicle = async (vehicleId, driverId) => {
    if (!window.confirm('Are you sure you want to unassign this vehicle from the driver?')) {
      return;
    }

    try {
      await vehiclesAPI.unassignVehicle(vehicleId, driverId);
      alert('Vehicle unassigned successfully!');
      loadDashboardData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to unassign vehicle');
    }
  };

  if (!isManager) {
    return (
      <div className="manager-dashboard">
        <h2>Access Denied</h2>
        <p>Only managers can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

  return (
    <div className="manager-dashboard">
      <h2>Manager Dashboard</h2>
      <p className="welcome-text">Welcome, {user?.name}!</p>

      {/* Vehicle List */}
      <div className="section">
        <div className="section-header">
          <h3>Vehicle List</h3>
          <button onClick={() => navigate('/vehicles')} className="btn-primary">
            Manage Vehicles
          </button>
        </div>
        <div className="vehicles-grid">
          {vehicles.slice(0, 6).map((vehicle) => (
            <div
              key={vehicle.vehicle_id}
              className="vehicle-card"
              onClick={() => navigate(`/vehicles/${vehicle.vehicle_id}`)}
            >
              <h4>{vehicle.vehicle_number}</h4>
              <p className="vehicle-model">{vehicle.model}</p>
              <p className="vehicle-fuel">{vehicle.fuel_type}</p>
              <p className="vehicle-service">
                Last Service: {vehicle.last_service_date || 'Never'}
              </p>
            </div>
          ))}
        </div>
        {vehicles.length > 6 && (
          <p className="view-more" onClick={() => navigate('/vehicles')}>
            View all {vehicles.length} vehicles →
          </p>
        )}
      </div>

      {/* Driver List */}
      <div className="section">
        <div className="section-header">
          <h3>Driver List</h3>
        </div>
        <div className="drivers-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile Number</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center' }}>
                    No drivers found.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.user_id}>
                    <td>{driver.name}</td>
                    <td>{driver.email}</td>
                    <td>{driver.mobile_number || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Assignment */}
      <div className="section">
        <div className="section-header">
          <h3>Assign Vehicle to Driver</h3>
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="btn-primary"
          >
            {showAssignForm ? 'Cancel' : 'Assign Vehicle'}
          </button>
        </div>
        {showAssignForm && (
          <form onSubmit={handleAssignVehicle} className="assign-form">
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle *</label>
                <select
                  value={assignFormData.vehicle_id}
                  onChange={(e) => setAssignFormData({ ...assignFormData, vehicle_id: e.target.value })}
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.vehicle_number} - {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Driver *</label>
                <select
                  value={assignFormData.driver_id}
                  onChange={(e) => setAssignFormData({ ...assignFormData, driver_id: e.target.value })}
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.user_id} value={driver.user_id}>
                      {driver.name} ({driver.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Assign Vehicle
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Assigned Drivers */}
      <div className="section">
        <h3>Assigned Drivers</h3>
        <div className="assigned-drivers">
          {assignedDrivers.length === 0 ? (
            <p className="no-data">No drivers assigned to vehicles yet.</p>
          ) : (
            assignedDrivers.map((vehicle) => (
              <div key={vehicle.vehicle_id} className="vehicle-drivers-card">
                <h4>
                  {vehicle.vehicle_number} - {vehicle.model}
                </h4>
                <div className="drivers-list">
                  {vehicle.drivers.map((driver) => (
                    <div key={driver.driver_id} className="driver-item">
                      <div className="driver-info">
                        <strong>{driver.driver_name}</strong>
                        <span className="driver-email">{driver.driver_email}</span>
                      </div>
                      <div className="driver-stats">
                        <span>Trips: {driver.trip_count}</span>
                        <span>Efficiency: {driver.avg_efficiency || 'N/A'} km/L</span>
                      </div>
                      <button
                        onClick={() => handleUnassignVehicle(vehicle.vehicle_id, driver.driver_id)}
                        className="btn-unassign"
                        title="Unassign Vehicle"
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Efficiency Chart */}
      <div className="section">
        <h3>Vehicle Efficiency Chart</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={vehicleEfficiency.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vehicle_number" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg_efficiency" fill="#667eea" name="Efficiency (km/L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;





