# Vehicle Performance Tracking System

A complete web-based system for tracking vehicle and driver performance in manufacturing and logistics sectors.

## Features

- **User & Role Management**: Login for Admin, Manager, and Driver with role-based access
- **Trip Management**: Drivers record trips with auto-calculated efficiency
- **Vehicle Management**: Managers assign vehicles and track service dates
- **Efficiency Dashboard**: Charts and metrics for performance analysis
- **Maintenance Reminders**: Alerts for vehicles due for service

## Tech Stack

- **Frontend**: React.js, React Router, Recharts
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: JWT

## Project Structure

```
├── src/                    # React frontend
│   ├── components/        # React components
│   ├── context/           # React Context (Auth)
│   └── services/          # API service layer
├── routes/                # Express API routes
├── middleware/            # Express middleware (auth)
├── database/             # Database setup and schema
├── scripts/              # Utility scripts
└── server.js             # Express server entry point
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Initialize database (creates default admin user):**
```bash
npm run init-db
```

This creates a default admin account:
- Email: `admin@example.com`
- Password: `admin123`

3. **Start the backend server:**
```bash
npm start
```

The backend API will run on `http://localhost:5000`

4. **Start the frontend (in a new terminal):**
```bash
cd src  # Actually, frontend is in root, so just:
npm start
```

Or if you have the React app in a separate directory, navigate there and run `npm start`.

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/me` - Get current user

### Vehicles
- `GET /api/vehicles` - Get all vehicles (Manager/Admin)
- `GET /api/vehicles/:id` - Get single vehicle
- `POST /api/vehicles` - Create vehicle (Manager/Admin)
- `PUT /api/vehicles/:id` - Update vehicle (Manager/Admin)
- `DELETE /api/vehicles/:id` - Delete vehicle (Admin only)
- `GET /api/vehicles/driver/available` - Get available vehicles (Driver)

### Trips
- `GET /api/trips` - Get trips (all for Manager/Admin, own for Driver)
- `GET /api/trips/:id` - Get single trip
- `POST /api/trips` - Create trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Dashboard
- `GET /api/dashboard/stats` - Overall statistics
- `GET /api/dashboard/top-drivers` - Top drivers by efficiency
- `GET /api/dashboard/vehicle-efficiency` - Vehicle efficiency metrics
- `GET /api/dashboard/fuel-usage` - Fuel usage over time
- `GET /api/dashboard/maintenance-reminders` - Maintenance reminders
- `GET /api/dashboard/low-efficiency-vehicles` - Low efficiency vehicles

## Default Admin Account

After running `npm run init-db`, you can login with:
- **Email**: admin@example.com
- **Password**: admin123

## Environment Variables

Create a `.env` file in the root directory (optional):

```
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
REACT_APP_API_URL=http://localhost:5000/api
```

## Development

- Backend: `npm run dev` (uses nodemon for auto-reload)
- Frontend: `npm start` (React development server)

## Database

The SQLite database is automatically created at `database/database.sqlite` on first server start.

## Notes

- The frontend expects the backend API at `http://localhost:5000/api` by default
- Make sure both servers are running for the application to work properly
- The database file is gitignored and will be created automatically
