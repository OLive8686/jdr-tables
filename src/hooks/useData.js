import { useState, useEffect, useCallback } from 'react';
import { sessionsApi, campaignsApi, archivesApi } from '../services/api';

export const useData = () => {
  const [sessions, setSessions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger toutes les données
  const loadData = useCallback(async () => {
    try {
      const [sessionsData, campaignsData, archivesData] = await Promise.all([
        sessionsApi.getAll(),
        campaignsApi.getAll(),
        archivesApi.getAll()
      ]);

      setSessions(sessionsData);
      setCampaigns(campaignsData);
      setArchives(archivesData);
      setError('');
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error(err);
    }
  }, []);

  // Charger au démarrage et toutes les 30 secondes
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // === SESSIONS ===

  const createSession = async (sessionData) => {
    setLoading(true);
    setError('');
    try {
      await sessionsApi.create(sessionData);
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (id, sessionData) => {
    setLoading(true);
    setError('');
    try {
      await sessionsApi.update(id, sessionData);
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id) => {
    setLoading(true);
    setError('');
    try {
      await sessionsApi.delete(id);
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (id, playerName) => {
    setLoading(true);
    setError('');
    try {
      await sessionsApi.join(id, playerName);
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const leaveSession = async (id, playerName) => {
    setLoading(true);
    setError('');
    try {
      await sessionsApi.leave(id, playerName);
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // === CAMPAGNES ===

  const createCampaign = async (campaignData) => {
    setLoading(true);
    setError('');
    try {
      await campaignsApi.create(campaignData);
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // === ARCHIVES ===

  const archiveOldSessions = async () => {
    setLoading(true);
    setError('');
    try {
      await archivesApi.archiveOld();
      await loadData();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    // Données
    sessions,
    campaigns,
    archives,
    loading,
    error,
    setError,

    // Actions
    loadData,
    createSession,
    updateSession,
    deleteSession,
    joinSession,
    leaveSession,
    createCampaign,
    archiveOldSessions
  };
};
