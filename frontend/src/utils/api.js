import axios from 'axios';

// Configure axios defaults
const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
// Ensure baseURL ends with /api/ for consistent path joining
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL + '/' : 
                rawBaseURL.endsWith('/api/') ? rawBaseURL : 
                rawBaseURL.endsWith('/') ? rawBaseURL + 'api/' : rawBaseURL + '/api/';

axios.defaults.baseURL = baseURL;
// axios.defaults.headers.common['Content-Type'] = 'application/json'; // Remove this global default to allow FormData to work correctly

// Request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // For demo users, add a special header to help the backend identify the simulated user
      if (token === 'demo-token') {
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
          try {
            const parsedUser = JSON.parse(demoUser);
            config.headers['X-Demo-User'] = parsedUser.username;
          } catch (e) {
            console.warn('Error parsing demo user for header', e);
          }
        }
      }
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldGuard = error.config?.__sessionGuard;
    if (shouldGuard && error.response?.status === 401) {
      const token = localStorage.getItem('token');
       if (token) {
        window.dispatchEvent(new CustomEvent('app:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
