import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tripsAPI, vehiclesAPI } from '../services/api';
import './Trips.css';

const Trips = () => {
  const { user, isManager } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    start_location: '',
    end_location: '',
    distance_km: '',
    fuel_used_ltr: '',
    time_taken_hr: '',
  });

  useEffect(() => {
    loadTrips();
    loadVehicles();
  }, []);

  const loadTrips = async () => {
    try {
      const response = await tripsAPI.getAll();
      setTrips(response.data);
    } catch (error) {
      console.error('Error loading trips:', error);
      alert('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAvailable();
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
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

      if (editingTrip) {
        await tripsAPI.update(editingTrip.trip_id, tripData);
      } else {
        await tripsAPI.create(tripData);
      }
      loadTrips();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save trip');
    }
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setFormData({
      vehicle_id: trip.vehicle_id,
      start_location: trip.start_location,
      end_location: trip.end_location,
      distance_km: trip.distance_km.toString(),
      fuel_used_ltr: trip.fuel_used_ltr.toString(),
      time_taken_hr: trip.time_taken_hr.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }
    try {
      await tripsAPI.delete(id);
      loadTrips();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete trip');
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
    setEditingTrip(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading trips...</div>;
  }

  return (
    <div className="trips">
      <div className="trips-header">
        <h2>Trip Management</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Log New Trip
        </button>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="form-card">
            <h3>{editingTrip ? 'Edit Trip' : 'Log New Trip'}</h3>
            <form onSubmit={handleSubmit}>
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
                />
              </div>
              <div className="form-group">
                <label>End Location *</label>
                <input
                  type="text"
                  value={formData.end_location}
                  onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                  required
                />
              </div>
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
              {formData.distance_km && formData.fuel_used_ltr && (
                <div className="efficiency-preview">
                  <strong>Estimated Efficiency: </strong>
                  {(parseFloat(formData.distance_km) / parseFloat(formData.fuel_used_ltr)).toFixed(2)} km/L
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingTrip ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="trips-table">
        <table>
          <thead>
            <tr>
              {isManager && <th>Driver</th>}
              <th>Vehicle</th>
              <th>Route</th>
              <th>Distance (km)</th>
              <th>Fuel (L)</th>
              <th>Time (hr)</th>
              <th>Efficiency (km/L)</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 9 : 8} style={{ textAlign: 'center' }}>
                  No trips found. Log your first trip!
                </td>
              </tr>
            ) : (
              trips.map((trip) => (
                <tr key={trip.trip_id}>
                  {isManager && <td>{trip.driver_name}</td>}
                  <td>{trip.vehicle_number}</td>
                  <td>
                    {trip.start_location} → {trip.end_location}
                  </td>
                  <td>{trip.distance_km}</td>
                  <td>{trip.fuel_used_ltr}</td>
                  <td>{trip.time_taken_hr}</td>
                  <td>{trip.efficiency?.toFixed(2)}</td>
                  <td>{new Date(trip.trip_date).toLocaleDateString()}</td>
                  <td>
                    {(isManager || trip.driver_id === user.user_id) && (
                      <>
                        <button onClick={() => handleEdit(trip)} className="btn-edit">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(trip.trip_id)}
                          className="btn-delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Trips;

