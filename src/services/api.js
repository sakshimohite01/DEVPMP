import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, 
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Backend API is not available. Please ensure the server is running at', API_URL);
    }
    return Promise.reject(error);
  }
);


export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getAllUsers: () => api.get('/auth/users'),
  updateUser: (id, userData) => api.put(`/auth/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};


export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getAvailable: () => api.get('/vehicles/driver/available'),
  getAssigned: () => api.get('/vehicles/driver/assigned'),
  assignVehicle: (vehicleId, driverId) => api.post('/vehicles/assign', { vehicle_id: vehicleId, driver_id: driverId }),
  unassignVehicle: (vehicleId, driverId) => api.delete(`/vehicles/assign/${vehicleId}/${driverId}`),
  getDriversList: () => api.get('/vehicles/drivers/list'),
};


export const tripsAPI = {
  getAll: () => api.get('/trips'),
  getById: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips', data),
  update: (id, data) => api.put(`/trips/${id}`, data),
  delete: (id) => api.delete(`/trips/${id}`),
};


export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getTopDrivers: (limit = 10) => api.get(`/dashboard/top-drivers?limit=${limit}`),
  getVehicleEfficiency: () => api.get('/dashboard/vehicle-efficiency'),
  getFuelUsage: (period = 'month') => api.get(`/dashboard/fuel-usage?period=${period}`),
  getMaintenanceReminders: (days = 30) => api.get(`/dashboard/maintenance-reminders?days=${days}`),
  getLowEfficiencyVehicles: (threshold = 10) => api.get(`/dashboard/low-efficiency-vehicles?threshold=${threshold}`),
  getAssignedDrivers: () => api.get('/dashboard/assigned-drivers'),
  getReports: (type = 'summary') => api.get(`/dashboard/reports?type=${type}`),
};

export default api;

