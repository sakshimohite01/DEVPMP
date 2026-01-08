const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);


db.serialize(() => {
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'driver')),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  
  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_number TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    last_service_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  
  db.run(`CREATE TABLE IF NOT EXISTS trips (
    trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    distance_km REAL NOT NULL,
    fuel_used_ltr REAL NOT NULL,
    time_taken_hr REAL NOT NULL,
    efficiency REAL,
    trip_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(user_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
  )`);

  
  db.run(`CREATE TABLE IF NOT EXISTS vehicle_drivers (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(vehicle_id, driver_id)
  )`);

  
  db.run(`CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(trip_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vehicle_drivers_vehicle ON vehicle_drivers(vehicle_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vehicle_drivers_driver ON vehicle_drivers(driver_id)`);
  
  
  db.run(`ALTER TABLE users ADD COLUMN mobile_number TEXT`, (err) => {
    
  });
});


db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = db;





