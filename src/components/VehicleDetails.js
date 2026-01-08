import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehiclesAPI, tripsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './VehicleDetails.css';

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager, isAdmin, isDriver } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isManager || isAdmin || isDriver) {
      loadVehicleData();
    }
  }, [id, isManager, isAdmin, isDriver]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);
      const vehicleRes = await vehiclesAPI.getById(id);
      const tripsRes = await tripsAPI.getAll();
      
      setVehicle(vehicleRes.data);
      
      const vehicleTrips = tripsRes.data.filter(trip => trip.vehicle_id === parseInt(id));
      setTrips(vehicleTrips);
    } catch (error) {
      console.error('Error loading vehicle data:', error);
      alert('Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  if (!isManager && !isAdmin && !isDriver) {
    return (
      <div className="vehicle-details">
        <h2>Access Denied</h2>
        <p>You do not have access to view vehicle details.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading vehicle details...</div>;
  }

  if (!vehicle) {
    return (
      <div className="vehicle-details">
        <h2>Vehicle Not Found</h2>
        <button onClick={() => navigate('/vehicles')} className="btn-primary">
          Back to Vehicles
        </button>
      </div>
    );
  }

  const avgMileage =
    trips.length > 0
      ? trips.reduce((sum, trip) => sum + (trip.efficiency || 0), 0) / trips.length
      : null;

  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0);
  const totalFuel = trips.reduce((sum, trip) => sum + (trip.fuel_used_ltr || 0), 0);

  
  const daysSinceService = vehicle.last_service_date
    ? Math.floor((new Date() - new Date(vehicle.last_service_date)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="vehicle-details">
      <div className="vehicle-header">
        <button onClick={() => navigate('/vehicles')} className="back-button">
          ← Back to Vehicles
        </button>
        <h2>Vehicle Details</h2>
      </div>

      <div className="vehicle-info-card">
        <div className="vehicle-basic-info">
          <h3>{vehicle.vehicle_number}</h3>
          <p className="vehicle-model">{vehicle.model}</p>
          <p className="vehicle-fuel-type">Fuel Type: {vehicle.fuel_type}</p>
        </div>
      </div>

      {/* Average Mileage */}
      <div className="section">
        <h3>Average Mileage (Efficiency)</h3>
        <div className="mileage-display">
          <div className="mileage-card">
            <h4>Average Efficiency</h4>
            <p className="mileage-value">
              {avgMileage ? `${avgMileage.toFixed(2)} km/L` : 'No trips recorded'}
            </p>
            <p className="mileage-detail">
              Based on {trips.length} trip{trips.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="mileage-stats">
            <div className="stat-item">
              <span className="stat-label">Total Distance:</span>
              <span className="stat-value">{totalDistance.toFixed(2)} km</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Fuel Used:</span>
              <span className="stat-value">{totalFuel.toFixed(2)} L</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Trips:</span>
              <span className="stat-value">{trips.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="section">
        <h3>Service Information</h3>
        <div className="service-info">
          <div className="service-card">
            <h4>Last Service Date</h4>
            <p className="service-date">
              {vehicle.last_service_date
                ? new Date(vehicle.last_service_date).toLocaleDateString()
                : 'Never serviced'}
            </p>
            {daysSinceService !== null && (
              <p className="service-days">
                {daysSinceService > 0
                  ? `${daysSinceService} days ago`
                  : 'Today'}
              </p>
            )}
          </div>
          <div className="service-status-card">
            <h4>Service Status</h4>
            {!vehicle.last_service_date ? (
              <span className="status-badge warning">No Service Record</span>
            ) : daysSinceService > 90 ? (
              <span className="status-badge danger">Due for Service</span>
            ) : daysSinceService > 60 ? (
              <span className="status-badge warning">Service Due Soon</span>
            ) : (
              <span className="status-badge success">Service Up to Date</span>
            )}
            <p className="service-recommendation">
              {!vehicle.last_service_date
                ? 'Schedule initial service'
                : daysSinceService > 90
                ? 'Service overdue - schedule immediately'
                : daysSinceService > 60
                ? 'Service recommended within 30 days'
                : 'Next service recommended in 30-60 days'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="section">
        <h3>Recent Trips</h3>
        {trips.length === 0 ? (
          <p className="no-data">No trips recorded for this vehicle.</p>
        ) : (
          <div className="trips-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Distance (km)</th>
                  <th>Fuel (L)</th>
                  <th>Efficiency (km/L)</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 10).map((trip) => (
                  <tr key={trip.trip_id}>
                    <td>{new Date(trip.trip_date).toLocaleDateString()}</td>
                    <td>
                      {trip.start_location} → {trip.end_location}
                    </td>
                    <td>{trip.distance_km}</td>
                    <td>{trip.fuel_used_ltr}</td>
                    <td>{trip.efficiency?.toFixed(2)}</td>
                    <td>{trip.driver_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDetails;





