import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehiclesAPI } from '../services/api';
import './Vehicles.css';

const Vehicles = () => {
  const { isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    model: '',
    fuel_type: 'Petrol',
    last_service_date: '',
  });

  useEffect(() => {
    if (isManager) {
      loadVehicles();
    }
  }, [isManager]);

  const loadVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      alert('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle.vehicle_id, formData);
      } else {
        await vehiclesAPI.create(formData);
      }
      loadVehicles();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      model: vehicle.model,
      fuel_type: vehicle.fuel_type,
      last_service_date: vehicle.last_service_date || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }
    try {
      await vehiclesAPI.delete(id);
      loadVehicles();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_number: '',
      model: '',
      fuel_type: 'Petrol',
      last_service_date: '',
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  if (!isManager) {
    return (
      <div className="vehicles">
        <h2>Access Denied</h2>
        <p>Only managers and admins can access vehicle management.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading vehicles...</div>;
  }

  return (
    <div className="vehicles">
      <div className="vehicles-header">
        <h2>Vehicle Management</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Add Vehicle
        </button>
      </div>

      {showForm && (
        <div className="form-modal">
          <div className="form-card">
            <h3>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Vehicle Number *</label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Model *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fuel Type *</label>
                <select
                  value={formData.fuel_type}
                  onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  required
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Last Service Date</label>
                <input
                  type="date"
                  value={formData.last_service_date}
                  onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingVehicle ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="vehicles-table">
        <table>
          <thead>
            <tr>
              <th>Vehicle Number</th>
              <th>Model</th>
              <th>Fuel Type</th>
              <th>Last Service</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  No vehicles found. Add your first vehicle!
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.vehicle_id}>
                  <td>{vehicle.vehicle_number}</td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.fuel_type}</td>
                  <td>{vehicle.last_service_date || 'Never'}</td>
                  <td>
                    <button onClick={() => navigate(`/vehicles/${vehicle.vehicle_id}`)} className="btn-view">
                      View Details
                    </button>
                    <button onClick={() => handleEdit(vehicle)} className="btn-edit">
                      Edit
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(vehicle.vehicle_id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
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

export default Vehicles;

