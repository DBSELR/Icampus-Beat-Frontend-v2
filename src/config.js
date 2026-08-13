/**
 * Application & API Configuration
 * Centralized config for switching between Live and Local backend environments.
 */

// Available Backend Environments
export const API_ENVIRONMENTS = {
  LIVE: {
    name: 'Live Production Server',
    baseUrl: 'https://apiicampus.dbasesolutions.in',
    swaggerUrl: 'https://apiicampus.dbasesolutions.in/swagger/index.html',
  },
  LOCAL: {
    name: 'Local IIS Express Server',
    baseUrl: 'https://localhost:44396',
    swaggerUrl: 'https://localhost:44396/swagger/index.html',
  },
};

// Current active URLs (reads from .env or defaults to Live)
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || API_ENVIRONMENTS.LIVE.baseUrl;
export const BASE_URL = process.env.REACT_APP_BASE_URL || '';

// Detect current mode
export const IS_LIVE_ENV = BACKEND_URL.includes('apiicampus.dbasesolutions.in');
export const CURRENT_SWAGGER_URL = IS_LIVE_ENV 
  ? API_ENVIRONMENTS.LIVE.swaggerUrl 
  : API_ENVIRONMENTS.LOCAL.swaggerUrl;

/**
 * Helper to construct full API endpoint URL
 * @param {string} path - API endpoint path (e.g. '/api/Login')
 * @returns {string} Full URL or relative endpoint
 */
export const getApiEndpoint = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_URL ? `${BASE_URL}${cleanPath}` : cleanPath;
};

// Application Constants
export const CONFIG = {
  APP_NAME: 'iCampus Beat',
  TOKEN_EXPIRATION_MS: 60 * 60 * 1000, // 1 hour
  ACTIVE_BACKEND: BACKEND_URL,
  SWAGGER_URL: CURRENT_SWAGGER_URL,
  IS_LIVE: IS_LIVE_ENV,
};

export default CONFIG;
