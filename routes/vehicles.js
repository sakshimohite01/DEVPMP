const express = require('express');
const db = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const vehicles = await db.allAsync('SELECT * FROM vehicles ORDER BY created_at DESC');
    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      const vehicle = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      return res.json(vehicle);
    }
    
    if (req.user.role === 'driver') {
      const vehicle = await db.getAsync(
        `SELECT v.* FROM vehicles v
         JOIN vehicle_drivers vd ON v.vehicle_id = vd.vehicle_id
         WHERE v.vehicle_id = ? AND vd.driver_id = ?`,
        [req.params.id, req.user.user_id]
      );
      if (!vehicle) {
        return res.status(403).json({ error: 'You do not have access to this vehicle' });
      }
      return res.json(vehicle);
    }
    
    return res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { vehicle_number, model, fuel_type, last_service_date } = req.body;

    if (!vehicle_number || !model || !fuel_type) {
      return res.status(400).json({ error: 'Vehicle number, model, and fuel type are required' });
    }

    const existing = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_number = ?', [vehicle_number]);
    if (existing) {
      return res.status(400).json({ error: 'Vehicle number already exists' });
    }

    const result = await db.runAsync(
      'INSERT INTO vehicles (vehicle_number, model, fuel_type, last_service_date) VALUES (?, ?, ?, ?)',
      [vehicle_number, model, fuel_type, last_service_date || null]
    );

    const vehicle = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [result.lastID]);
    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { vehicle_number, model, fuel_type, last_service_date } = req.body;

    const existing = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (vehicle_number && vehicle_number !== existing.vehicle_number) {
      const duplicate = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_number = ?', [vehicle_number]);
      if (duplicate) {
        return res.status(400).json({ error: 'Vehicle number already exists' });
      }
    }

    await db.runAsync(
      'UPDATE vehicles SET vehicle_number = ?, model = ?, fuel_type = ?, last_service_date = ? WHERE vehicle_id = ?',
      [
        vehicle_number || existing.vehicle_number,
        model || existing.model,
        fuel_type || existing.fuel_type,
        last_service_date !== undefined ? last_service_date : existing.last_service_date,
        req.params.id
      ]
    );

    const vehicle = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
    res.json(vehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const vehicle = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const trips = await db.getAsync('SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ?', [req.params.id]);
    if (trips.count > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle with existing trips' });
    }

    await db.runAsync('DELETE FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/driver/available', authenticateToken, async (req, res) => {
  try {
    const vehicles = await db.allAsync('SELECT vehicle_id, vehicle_number, model, fuel_type FROM vehicles ORDER BY vehicle_number');
    res.json(vehicles);
  } catch (error) {
    console.error('Get available vehicles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/driver/assigned', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can view their assigned vehicles' });
    }

    const vehicles = await db.allAsync(
      `SELECT v.*, vd.assigned_at 
       FROM vehicles v
       JOIN vehicle_drivers vd ON v.vehicle_id = vd.vehicle_id
       WHERE vd.driver_id = ?
       ORDER BY vd.assigned_at DESC`,
      [req.user.user_id]
    );

    res.json(vehicles);
  } catch (error) {
    console.error('Get assigned vehicles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/assign', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { vehicle_id, driver_id } = req.body;

    if (!vehicle_id || !driver_id) {
      return res.status(400).json({ error: 'Vehicle ID and Driver ID are required' });
    }

    const vehicle = await db.getAsync('SELECT * FROM vehicles WHERE vehicle_id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const driver = await db.getAsync('SELECT * FROM users WHERE user_id = ? AND role = ?', [driver_id, 'driver']);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const existing = await db.getAsync(
      'SELECT * FROM vehicle_drivers WHERE vehicle_id = ? AND driver_id = ?',
      [vehicle_id, driver_id]
    );
    if (existing) {
      return res.status(400).json({ error: 'Vehicle already assigned to this driver' });
    }

    const result = await db.runAsync(
      'INSERT INTO vehicle_drivers (vehicle_id, driver_id) VALUES (?, ?)',
      [vehicle_id, driver_id]
    );

    const assignment = await db.getAsync(
      `SELECT vd.*, v.vehicle_number, v.model, u.name as driver_name, u.email as driver_email
       FROM vehicle_drivers vd
       JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
       JOIN users u ON vd.driver_id = u.user_id
       WHERE vd.assignment_id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      message: 'Vehicle assigned successfully',
      assignment
    });
  } catch (error) {
    console.error('Assign vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/assign/:vehicleId/:driverId', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { vehicleId, driverId } = req.params;

    const result = await db.runAsync(
      'DELETE FROM vehicle_drivers WHERE vehicle_id = ? AND driver_id = ?',
      [vehicleId, driverId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Vehicle unassigned successfully' });
  } catch (error) {
    console.error('Unassign vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/drivers/list', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const drivers = await db.allAsync(
      'SELECT user_id, name, email, mobile_number FROM users WHERE role = ? ORDER BY name',
      ['driver']
    );
    res.json(drivers);
  } catch (error) {
    console.error('Get drivers list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;





