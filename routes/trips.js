const express = require('express');
const db = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    let trips;
    if (req.user.role === 'driver') {
      trips = await db.allAsync(
        `SELECT t.*, u.name as driver_name, v.vehicle_number, v.model 
         FROM trips t 
         JOIN users u ON t.driver_id = u.user_id 
         JOIN vehicles v ON t.vehicle_id = v.vehicle_id 
         WHERE t.driver_id = ? 
         ORDER BY t.trip_date DESC`,
        [req.user.user_id]
      );
    } else {
      trips = await db.allAsync(
        `SELECT t.*, u.name as driver_name, v.vehicle_number, v.model 
         FROM trips t 
         JOIN users u ON t.driver_id = u.user_id 
         JOIN vehicles v ON t.vehicle_id = v.vehicle_id 
         ORDER BY t.trip_date DESC`
      );
    }
    res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    let trip;
    if (req.user.role === 'driver') {
      trip = await db.getAsync(
        `SELECT t.*, u.name as driver_name, v.vehicle_number, v.model 
         FROM trips t 
         JOIN users u ON t.driver_id = u.user_id 
         JOIN vehicles v ON t.vehicle_id = v.vehicle_id 
         WHERE t.trip_id = ? AND t.driver_id = ?`,
        [req.params.id, req.user.user_id]
      );
    } else {
      trip = await db.getAsync(
        `SELECT t.*, u.name as driver_name, v.vehicle_number, v.model 
         FROM trips t 
         JOIN users u ON t.driver_id = u.user_id 
         JOIN vehicles v ON t.vehicle_id = v.vehicle_id 
         WHERE t.trip_id = ?`,
        [req.params.id]
      );
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vehicle_id, start_location, end_location, distance_km, fuel_used_ltr, time_taken_hr } = req.body;

    if (!vehicle_id || !start_location || !end_location || !distance_km || !fuel_used_ltr || !time_taken_hr) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const distance = parseFloat(distance_km);
    const fuel = parseFloat(fuel_used_ltr);
    const time = parseFloat(time_taken_hr);

    if (isNaN(distance) || isNaN(fuel) || isNaN(time) || distance <= 0 || fuel <= 0 || time <= 0) {
      return res.status(400).json({ error: 'Distance, fuel, and time must be positive numbers' });
    }

    const vehicle = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const efficiency = distance / fuel;

    const driver_id = req.user.role === 'admin' || req.user.role === 'manager' 
      ? (req.body.driver_id || req.user.user_id)
      : req.user.user_id;

    const result = await db.runAsync(
      `INSERT INTO trips (driver_id, vehicle_id, start_location, end_location, distance_km, fuel_used_ltr, time_taken_hr, efficiency) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [driver_id, vehicle_id, start_location, end_location, distance, fuel, time, efficiency]
    );

    const trip = await db.getAsync(
      `SELECT t.*, u.name as driver_name, v.vehicle_number, v.model 
       FROM trips t 
       JOIN users u ON t.driver_id = u.user_id 
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id 
       WHERE t.trip_id = ?`,
      [result.lastID]
    );

    res.status(201).json(trip);
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    let trip;
    if (req.user.role === 'driver') {
      trip = await db.getAsync('SELECT * FROM trips WHERE trip_id = ? AND driver_id = ?', [req.params.id, req.user.user_id]);
    } else {
      trip = await db.getAsync('SELECT * FROM trips WHERE trip_id = ?', [req.params.id]);
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { vehicle_id, start_location, end_location, distance_km, fuel_used_ltr, time_taken_hr } = req.body;

    const finalDistance = distance_km !== undefined ? parseFloat(distance_km) : trip.distance_km;
    const finalFuel = fuel_used_ltr !== undefined ? parseFloat(fuel_used_ltr) : trip.fuel_used_ltr;
    const finalTime = time_taken_hr !== undefined ? parseFloat(time_taken_hr) : trip.time_taken_hr;

    const efficiency = finalDistance / finalFuel;

    await db.runAsync(
      `UPDATE trips SET 
        vehicle_id = ?, 
        start_location = ?, 
        end_location = ?, 
        distance_km = ?, 
        fuel_used_ltr = ?, 
        time_taken_hr = ?, 
        efficiency = ? 
       WHERE trip_id = ?`,
      [
        vehicle_id || trip.vehicle_id,
        start_location || trip.start_location,
        end_location || trip.end_location,
        finalDistance,
        finalFuel,
        finalTime,
        efficiency,
        req.params.id
      ]
    );

    const updatedTrip = await db.getAsync(
      `SELECT t.*, u.name as driver_name, v.vehicle_number, v.model 
       FROM trips t 
       JOIN users u ON t.driver_id = u.user_id 
       JOIN vehicles v ON t.vehicle_id = v.vehicle_id 
       WHERE t.trip_id = ?`,
      [req.params.id]
    );

    res.json(updatedTrip);
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    let trip;
    if (req.user.role === 'driver') {
      trip = await db.getAsync('SELECT * FROM trips WHERE trip_id = ? AND driver_id = ?', [req.params.id, req.user.user_id]);
    } else {
      trip = await db.getAsync('SELECT * FROM trips WHERE trip_id = ?', [req.params.id]);
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    await db.runAsync('DELETE FROM trips WHERE trip_id = ?', [req.params.id]);
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
