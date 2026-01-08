const express = require('express');
const db = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const totalTrips = await db.getAsync('SELECT COUNT(*) as count FROM trips');
    
    const totalDrivers = await db.getAsync('SELECT COUNT(*) as count FROM users WHERE role = ?', ['driver']);
    
    const totalVehicles = await db.getAsync('SELECT COUNT(*) as count FROM vehicles');
    
    const totalFuel = await db.getAsync('SELECT SUM(fuel_used_ltr) as total FROM trips');
    
    const totalDistance = await db.getAsync('SELECT SUM(distance_km) as total FROM trips');
    
    const avgEfficiency = await db.getAsync('SELECT AVG(efficiency) as avg FROM trips');
    
    const avgSpeed = await db.getAsync(
      'SELECT AVG(distance_km / time_taken_hr) as avg FROM trips WHERE time_taken_hr > 0'
    );

    res.json({
      totalTrips: totalTrips.count || 0,
      totalDrivers: totalDrivers.count || 0,
      totalVehicles: totalVehicles.count || 0,
      totalFuelUsed: totalFuel.total || 0,
      totalDistance: totalDistance.total || 0,
      averageEfficiency: avgEfficiency.avg ? parseFloat(avgEfficiency.avg.toFixed(2)) : 0,
      averageSpeed: avgSpeed.avg ? parseFloat(avgSpeed.avg.toFixed(2)) : 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/assigned-drivers', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const assignedDrivers = await db.allAsync(
      `SELECT 
        v.vehicle_id,
        v.vehicle_number,
        v.model,
        u.user_id as driver_id,
        u.name as driver_name,
        u.email as driver_email,
        vd.assigned_at,
        COUNT(t.trip_id) as trip_count,
        AVG(t.efficiency) as avg_efficiency
       FROM vehicle_drivers vd
       JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
       JOIN users u ON vd.driver_id = u.user_id
       LEFT JOIN trips t ON v.vehicle_id = t.vehicle_id AND u.user_id = t.driver_id
       GROUP BY v.vehicle_id, v.vehicle_number, v.model, u.user_id, u.name, u.email, vd.assigned_at
       ORDER BY v.vehicle_number, u.name`
    );

    const vehicleDrivers = {};
    assignedDrivers.forEach(item => {
      if (!vehicleDrivers[item.vehicle_id]) {
        vehicleDrivers[item.vehicle_id] = {
          vehicle_id: item.vehicle_id,
          vehicle_number: item.vehicle_number,
          model: item.model,
          drivers: []
        };
      }
      vehicleDrivers[item.vehicle_id].drivers.push({
        driver_id: item.driver_id,
        driver_name: item.driver_name,
        driver_email: item.driver_email,
        assigned_at: item.assigned_at,
        trip_count: item.trip_count || 0,
        avg_efficiency: item.avg_efficiency ? parseFloat(item.avg_efficiency.toFixed(2)) : null
      });
    });

    res.json(Object.values(vehicleDrivers));
  } catch (error) {
    console.error('Get assigned drivers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/top-drivers', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const drivers = await db.allAsync(
      `SELECT 
        u.user_id,
        u.name,
        COUNT(t.trip_id) as trip_count,
        AVG(t.efficiency) as avg_efficiency,
        SUM(t.distance_km) as total_distance,
        SUM(t.fuel_used_ltr) as total_fuel
       FROM users u
       JOIN trips t ON u.user_id = t.driver_id
       WHERE u.role = 'driver'
       GROUP BY u.user_id, u.name
       ORDER BY avg_efficiency DESC
       LIMIT ?`,
      [limit]
    );

    res.json(drivers.map(d => ({
      ...d,
      avg_efficiency: parseFloat(d.avg_efficiency.toFixed(2))
    })));
  } catch (error) {
    console.error('Get top drivers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/vehicle-efficiency', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const vehicles = await db.allAsync(
      `SELECT 
        v.vehicle_id,
        v.vehicle_number,
        v.model,
        v.fuel_type,
        COUNT(t.trip_id) as trip_count,
        AVG(t.efficiency) as avg_efficiency,
        SUM(t.distance_km) as total_distance,
        SUM(t.fuel_used_ltr) as total_fuel
       FROM vehicles v
       LEFT JOIN trips t ON v.vehicle_id = t.vehicle_id
       GROUP BY v.vehicle_id, v.vehicle_number, v.model, v.fuel_type
       ORDER BY avg_efficiency DESC`
    );

    res.json(vehicles.map(v => ({
      ...v,
      avg_efficiency: v.avg_efficiency ? parseFloat(v.avg_efficiency.toFixed(2)) : null,
      trip_count: v.trip_count || 0,
      total_distance: v.total_distance || 0,
      total_fuel: v.total_fuel || 0
    })));
  } catch (error) {
    console.error('Get vehicle efficiency error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/fuel-usage', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const period = req.query.period || 'month'; // day, week, month
    
    let dateFormat;
    if (period === 'day') {
      dateFormat = '%Y-%m-%d';
    } else if (period === 'week') {
      dateFormat = '%Y-%W';
    } else {
      dateFormat = '%Y-%m';
    }

    const fuelData = await db.allAsync(
      `SELECT 
        strftime(?, trip_date) as period,
        SUM(fuel_used_ltr) as total_fuel,
        SUM(distance_km) as total_distance,
        AVG(efficiency) as avg_efficiency
       FROM trips
       GROUP BY period
       ORDER BY period DESC
       LIMIT 12`,
      [dateFormat]
    );

    res.json(fuelData.map(d => ({
      ...d,
      avg_efficiency: d.avg_efficiency ? parseFloat(d.avg_efficiency.toFixed(2)) : null
    })));
  } catch (error) {
    console.error('Get fuel usage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/maintenance-reminders', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const daysThreshold = parseInt(req.query.days) || 30;
    
    const vehicles = await db.allAsync(
      `SELECT 
        v.*,
        CASE 
          WHEN v.last_service_date IS NULL THEN 'No service record'
          WHEN date('now', '-' || ? || ' days') >= date(v.last_service_date) THEN 'Due for service'
          ELSE 'OK'
        END as service_status,
        julianday('now') - julianday(v.last_service_date) as days_since_service
       FROM vehicles v
       ORDER BY v.last_service_date ASC`,
      [daysThreshold]
    );

    res.json(vehicles);
  } catch (error) {
    console.error('Get maintenance reminders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/low-efficiency-vehicles', authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 10; // km/liter threshold
    
    const vehicles = await db.allAsync(
      `SELECT 
        v.vehicle_id,
        v.vehicle_number,
        v.model,
        v.fuel_type,
        AVG(t.efficiency) as avg_efficiency,
        COUNT(t.trip_id) as trip_count
       FROM vehicles v
       JOIN trips t ON v.vehicle_id = t.vehicle_id
       GROUP BY v.vehicle_id, v.vehicle_number, v.model, v.fuel_type
       HAVING avg_efficiency < ?
       ORDER BY avg_efficiency ASC`,
      [threshold]
    );

    res.json(vehicles.map(v => ({
      ...v,
      avg_efficiency: parseFloat(v.avg_efficiency.toFixed(2))
    })));
  } catch (error) {
    console.error('Get low efficiency vehicles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports', authorizeRoles('admin'), async (req, res) => {
  try {
    const reportType = req.query.type || 'summary';
    
    let reportData = {};
    
    if (reportType === 'summary') {
      const stats = await db.getAsync('SELECT COUNT(*) as total_trips, SUM(distance_km) as total_distance, SUM(fuel_used_ltr) as total_fuel, AVG(efficiency) as avg_efficiency FROM trips');
      const userStats = await db.allAsync('SELECT role, COUNT(*) as count FROM users GROUP BY role');
      const vehicleStats = await db.getAsync('SELECT COUNT(*) as total_vehicles FROM vehicles');
      
      reportData = {
        trips: stats.total_trips || 0,
        totalDistance: stats.total_distance || 0,
        totalFuel: stats.total_fuel || 0,
        avgEfficiency: stats.avg_efficiency ? parseFloat(stats.avg_efficiency.toFixed(2)) : 0,
        users: userStats,
        totalVehicles: vehicleStats.total_vehicles || 0
      };
    } else if (reportType === 'driver-performance') {
      const drivers = await db.allAsync(
        `SELECT 
          u.user_id,
          u.name,
          u.email,
          COUNT(t.trip_id) as trip_count,
          SUM(t.distance_km) as total_distance,
          SUM(t.fuel_used_ltr) as total_fuel,
          AVG(t.efficiency) as avg_efficiency,
          AVG(t.distance_km / t.time_taken_hr) as avg_speed
         FROM users u
         LEFT JOIN trips t ON u.user_id = t.driver_id
         WHERE u.role = 'driver'
         GROUP BY u.user_id, u.name, u.email
         ORDER BY avg_efficiency DESC`
      );
      
      reportData = drivers.map(d => ({
        ...d,
        avg_efficiency: d.avg_efficiency ? parseFloat(d.avg_efficiency.toFixed(2)) : null,
        avg_speed: d.avg_speed ? parseFloat(d.avg_speed.toFixed(2)) : null
      }));
    } else if (reportType === 'vehicle-performance') {
      const vehicles = await db.allAsync(
        `SELECT 
          v.vehicle_id,
          v.vehicle_number,
          v.model,
          v.fuel_type,
          v.last_service_date,
          COUNT(t.trip_id) as trip_count,
          SUM(t.distance_km) as total_distance,
          SUM(t.fuel_used_ltr) as total_fuel,
          AVG(t.efficiency) as avg_efficiency
         FROM vehicles v
         LEFT JOIN trips t ON v.vehicle_id = t.vehicle_id
         GROUP BY v.vehicle_id, v.vehicle_number, v.model, v.fuel_type, v.last_service_date
         ORDER BY v.vehicle_number`
      );
      
      reportData = vehicles.map(v => ({
        ...v,
        avg_efficiency: v.avg_efficiency ? parseFloat(v.avg_efficiency.toFixed(2)) : null
      }));
    }
    
    res.json(reportData);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
