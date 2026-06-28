const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Common request utility that automatically handles headers,
 * JSON parsing, multipart/form-data body detection, error states,
 * and injecting the JWT bearer token.
 */
export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { message: 'Failed to parse response from server' };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Server request failed');
  }

  return data;
}

export default request;
