// Configuration de l'API
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper pour les requêtes
const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur serveur');
  }

  return data;
};

// API Sessions
export const sessionsApi = {
  getAll: () => request('/sessions'),

  create: (sessionData) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  }),

  update: (id, sessionData) => request(`/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(sessionData)
  }),

  delete: (id) => request(`/sessions/${id}`, {
    method: 'DELETE'
  }),

  join: (id, playerName) => request(`/sessions/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({ playerName })
  }),

  leave: (id, playerName) => request(`/sessions/${id}/leave`, {
    method: 'POST',
    body: JSON.stringify({ playerName })
  })
};

// API Campagnes
export const campaignsApi = {
  getAll: () => request('/campaigns'),

  create: (campaignData) => request('/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaignData)
  }),

  update: (id, campaignData) => request(`/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(campaignData)
  }),

  delete: (id) => request(`/campaigns/${id}`, {
    method: 'DELETE'
  })
};

// API Archives
export const archivesApi = {
  getAll: () => request('/archives'),

  archiveOld: () => request('/archives/archive-old', {
    method: 'POST'
  })
};

export default {
  sessions: sessionsApi,
  campaigns: campaignsApi,
  archives: archivesApi
};
