/**
 * API Service for AIML Department Academic Management System
 * Handles communication between Frontend and Backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetch backend health status
 * In development, requests to /api/health are proxied to the Express server
 */
export const checkBackendHealth = async () => {
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/api/health` : '/api/health';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to connect to backend service'
    };
  }
};
