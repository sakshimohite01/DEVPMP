import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tripsAPI, vehiclesAPI } from '../services/api';
import './DriverDashboard.css';

const DriverDashboard = () => {
  const { user, isDriver } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignedVehicles, setAssignedVehicles] = useState([]);
  const [showTripForm, setShowTripForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    start_location: '',
    end_location: '',
    distance_km: '',
    fuel_used_ltr: '',
    time_taken_hr: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDriver) {
      loadData();
    }
  }, [isDriver]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tripsRes, vehiclesRes, assignedRes] = await Promise.all([
        tripsAPI.getAll(),
        vehiclesAPI.getAvailable(),
        vehiclesAPI.getAssigned(),
      ]);
      setTrips(tripsRes.data);
      setVehicles(vehiclesRes.data);
      setAssignedVehicles(assignedRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tripData = {
        ...formData,
        distance_km: parseFloat(formData.distance_km),
        fuel_used_ltr: parseFloat(formData.fuel_used_ltr),
        time_taken_hr: parseFloat(formData.time_taken_hr),
      };

      await tripsAPI.create(tripData);
      alert('Trip logged successfully!');
      resetForm();
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to log trip');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      start_location: '',
      end_location: '',
      distance_km: '',
      fuel_used_ltr: '',
      time_taken_hr: '',
    });
    setShowTripForm(false);
  };

  if (!isDriver) {
    return (
      <div className="driver-dashboard">
        <h2>Access Denied</h2>
        <p>Only drivers can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0);
  const avgEfficiency =
    trips.length > 0
      ? trips.reduce((sum, trip) => sum + (trip.efficiency || 0), 0) / trips.length
      : 0;

  return (
    <div className="driver-dashboard">
      <h2>Driver Dashboard</h2>
      <p className="welcome-text">Welcome, {user?.name}!</p>

      {/* Assigned Vehicles */}
      {assignedVehicles.length > 0 && (
        <div className="section">
          <h3>My Assigned Vehicles</h3>
          <div className="assigned-vehicles-grid">
            {assignedVehicles.map((vehicle) => (
              <div key={vehicle.vehicle_id} className="assigned-vehicle-card">
                <h4>{vehicle.vehicle_number}</h4>
                <p className="vehicle-model">{vehicle.model}</p>
                <p className="vehicle-fuel">Fuel Type: {vehicle.fuel_type}</p>
                {vehicle.last_service_date && (
                  <p className="vehicle-service">
                    Last Service: {new Date(vehicle.last_service_date).toLocaleDateString()}
                  </p>
                )}
                <div className="vehicle-details-link">
                  <button
                    onClick={() => window.location.href = `/vehicles/${vehicle.vehicle_id}`}
                    className="btn-view-details"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Trips</h3>
          <p className="stat-value">{trips.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Distance</h3>
          <p className="stat-value">{totalDistance.toFixed(2)} km</p>
        </div>
        <div className="stat-card">
          <h3>Average Efficiency</h3>
          <p className="stat-value">{avgEfficiency.toFixed(2)} km/L</p>
        </div>
      </div>

      {/* Trip Logging Form */}
      <div className="section">
        <div className="section-header">
          <h3>Trip Logging</h3>
          <button
            onClick={() => setShowTripForm(!showTripForm)}
            className="btn-primary"
          >
            {showTripForm ? 'Cancel' : 'Log New Trip'}
          </button>
        </div>

        {showTripForm && (
          <form onSubmit={handleSubmit} className="trip-form">
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle *</label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
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
                <label>Start Location *</label>
                <input
                  type="text"
                  value={formData.start_location}
                  onChange={(e) => setFormData({ ...formData, start_location: e.target.value })}
                  required
                  placeholder="e.g., Warehouse A"
                />
              </div>

              <div className="form-group">
                <label>End Location *</label>
                <input
                  type="text"
                  value={formData.end_location}
                  onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                  required
                  placeholder="e.g., Delivery Point B"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Distance (km) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fuel Used (liters) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fuel_used_ltr}
                  onChange={(e) => setFormData({ ...formData, fuel_used_ltr: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time Taken (hours) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.time_taken_hr}
                  onChange={(e) => setFormData({ ...formData, time_taken_hr: e.target.value })}
                  required
                />
              </div>
            </div>

            {formData.distance_km && formData.fuel_used_ltr && (
              <div className="efficiency-preview">
                <strong>Estimated Efficiency: </strong>
                {(parseFloat(formData.distance_km) / parseFloat(formData.fuel_used_ltr)).toFixed(2)} km/L
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Submit Trip
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Reset
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recent Trips */}
      <div className="section">
        <h3>Recent Trips</h3>
        {trips.length === 0 ? (
          <p className="no-data">No trips logged yet. Log your first trip above!</p>
        ) : (
          <div className="trips-list">
            {trips.slice(0, 5).map((trip) => (
              <div key={trip.trip_id} className="trip-card">
                <div className="trip-header">
                  <h4>
                    {trip.start_location} → {trip.end_location}
                  </h4>
                  <span className="trip-date">
                    {new Date(trip.trip_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="trip-details">
                  <span>Vehicle: {trip.vehicle_number}</span>
                  <span>Distance: {trip.distance_km} km</span>
                  <span>Fuel: {trip.fuel_used_ltr} L</span>
                  <span>Efficiency: {trip.efficiency?.toFixed(2)} km/L</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;





