import { useState, useEffect, useCallback } from 'react';
import { sessions, campaigns, registrations, logEvent } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useData = () => {
  const { currentUser, profile } = useAuth();
  const [sessionsList, setSessionsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger toutes les donnees
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsData, campaignsData] = await Promise.all([
        sessions.getAll(),
        campaigns.getAll()
      ]);

      // Separer sessions actives et archives
      const now = new Date();
      const activeSessions = [];
      const archivedSessions = [];

      (sessionsData || []).forEach(session => {
        const endDate = new Date(session.ends_at);
        if (session.status === 'completed' || session.status === 'cancelled' || endDate < now) {
          archivedSessions.push(session);
        } else {
          activeSessions.push(session);
        }
      });

      setSessionsList(activeSessions);
      setArchives(archivedSessions);
      setCampaignsList(campaignsData || []);
      setError('');
    } catch (err) {
      setError('Erreur de connexion a Supabase');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au demarrage et toutes les 30 secondes
  useEffect(() => {
    if (currentUser) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [loadData, currentUser]);

  // === SESSIONS ===

  const createSession = async (sessionData) => {
    setLoading(true);
    setError('');
    try {
      await sessions.create({
        game_type: sessionData.game_type || 'oneshot',
        title: sessionData.title,
        description: sessionData.description,
        system: sessionData.system,
        campaign_id: sessionData.campaign_id || null,
        session_number: sessionData.session_number || 0,
        starts_at: sessionData.starts_at,
        ends_at: sessionData.ends_at,
        max_players: sessionData.max_players || 5,
        trigger_warnings: sessionData.trigger_warnings || []
      });
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la creation';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (id, sessionData) => {
    setLoading(true);
    setError('');
    try {
      await sessions.update(id, {
        game_type: sessionData.game_type,
        title: sessionData.title,
        description: sessionData.description,
        system: sessionData.system,
        campaign_id: sessionData.campaign_id || null,
        session_number: sessionData.session_number,
        starts_at: sessionData.starts_at,
        ends_at: sessionData.ends_at,
        max_players: sessionData.max_players,
        status: sessionData.status,
        trigger_warnings: sessionData.trigger_warnings || []
      });
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la modification';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id) => {
    setLoading(true);
    setError('');
    try {
      await sessions.delete(id);
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la suppression';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      await registrations.register(sessionId);
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de l\'inscription';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const leaveSession = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      await registrations.unregister(sessionId);
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la desinscription';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // === CAMPAGNES ===

  const createCampaign = async (campaignData) => {
    setLoading(true);
    setError('');
    try {
      await campaigns.create({
        name: campaignData.name,
        description: campaignData.description,
        system: campaignData.system,
        trigger_warnings: campaignData.trigger_warnings || []
      });
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la creation';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // === ARCHIVES ===

  const archiveOldSessions = async () => {
    setLoading(true);
    setError('');
    try {
      // Marquer les sessions passees comme "completed"
      const now = new Date().toISOString();
      const oldSessions = sessionsList.filter(s => new Date(s.ends_at) < new Date());

      for (const session of oldSessions) {
        await sessions.update(session.id, { status: 'completed' });
      }

      await logEvent('sessions_archived', 'session', null, { count: oldSessions.length });
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de l\'archivage';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    // Donnees
    sessions: sessionsList,
    campaigns: campaignsList,
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
