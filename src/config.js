/**
 * Application & API Configuration
 */

const isDev = process.env.NODE_ENV === 'development';

// In development, target Local IIS Express (https://localhost:44396)
// In production, target Live Production Server (https://apiicampus.dbasesolutions.in)
export const BASE_URL = isDev
  ? (process.env.REACT_APP_BASE_URL || 'https://localhost:44396')
  : (process.env.REACT_APP_BASE_URL || 'https://apiicampus.dbasesolutions.in');

export const BACKEND_URL = BASE_URL;

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

// Detect current mode
export const IS_LIVE_ENV = BASE_URL.includes('apiicampus.dbasesolutions.in');
export const CURRENT_SWAGGER_URL = IS_LIVE_ENV 
  ? API_ENVIRONMENTS.LIVE.swaggerUrl 
  : API_ENVIRONMENTS.LOCAL.swaggerUrl;

/**
 * Helper to construct full API endpoint URL
 */
export const getApiEndpoint = (path = '') => {
  if (!path) return BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  return `${cleanBase}${cleanPath}`;
};

// Application Constants
export const CONFIG = {
  APP_NAME: 'iCampus Beat',
  TOKEN_EXPIRATION_MS: 60 * 60 * 1000,
  ACTIVE_BACKEND: BASE_URL,
  SWAGGER_URL: CURRENT_SWAGGER_URL,
  IS_LIVE: IS_LIVE_ENV,
};

export default CONFIG;

