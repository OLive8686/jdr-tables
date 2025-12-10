import { useState, useEffect, useCallback } from 'react';
import { sessions, campaigns, registrations, logEvent } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useData = () => {
  const { currentUser, profile } = useAuth();
  const [sessionsList, setSessionsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [archives, setArchives] = useState([]);
  const [deletedSessions, setDeletedSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger toutes les donnees
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsData, deletedData, campaignsData] = await Promise.all([
        sessions.getAll(),
        sessions.getDeleted(),
        campaigns.getAll()
      ]);

      // Separer sessions actives et archives (basé sur starts_at)
      const now = new Date();
      const activeSessions = [];
      const archivedSessions = [];

      (sessionsData || []).forEach(session => {
        const startDate = new Date(session.starts_at);
        // Une session est archivee si elle est passee (date de debut < maintenant) ou annulee/terminee
        if (session.status === 'completed' || session.status === 'cancelled' || startDate < now) {
          archivedSessions.push(session);
        } else {
          activeSessions.push(session);
        }
      });

      setSessionsList(activeSessions);
      setArchives(archivedSessions);
      setDeletedSessions(deletedData || []);
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
      const newSession = await sessions.create({
        game_type: sessionData.game_type || 'oneshot',
        title: sessionData.title,
        description: sessionData.description,
        external_url: sessionData.external_url || null,
        system: sessionData.system,
        campaign_id: sessionData.campaign_id || null,
        session_number: sessionData.session_number || 0,
        starts_at: sessionData.starts_at,
        min_players: sessionData.min_players || 3,
        max_players: sessionData.max_players || 5,
        trigger_warnings: sessionData.trigger_warnings || []
      });

      // Preinscrire les joueurs si specifies
      if (sessionData.preregistered_players && sessionData.preregistered_players.length > 0) {
        for (const playerId of sessionData.preregistered_players) {
          try {
            await registrations.registerPlayer(newSession.id, playerId);
          } catch (regErr) {
            console.warn('Failed to preregister player:', playerId, regErr);
          }
        }
      }

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
        external_url: sessionData.external_url || null,
        system: sessionData.system,
        campaign_id: sessionData.campaign_id || null,
        session_number: sessionData.session_number,
        starts_at: sessionData.starts_at,
        min_players: sessionData.min_players,
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
      // Soft delete - marque comme supprimé au lieu de supprimer
      await sessions.softDelete(id);
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

  const restoreSession = async (id) => {
    setLoading(true);
    setError('');
    try {
      await sessions.restore(id);
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la restauration';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeleteSession = async (id) => {
    setLoading(true);
    setError('');
    try {
      await sessions.permanentDelete(id);
      await loadData();
      return { success: true };
    } catch (err) {
      const message = err.message || 'Erreur lors de la suppression definitive';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const duplicateSession = async (sessionData) => {
    setLoading(true);
    setError('');
    try {
      // Creer une copie avec une nouvelle date (demain par defaut)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7); // Dans une semaine
      const newStartsAt = tomorrow.toISOString().split('T')[0] + 'T' +
        (sessionData.starts_at ? new Date(sessionData.starts_at).toTimeString().substring(0, 5) : '20:00') + ':00';

      const newSession = await sessions.create({
        game_type: sessionData.game_type,
        title: sessionData.title + ' (copie)',
        description: sessionData.description,
        external_url: sessionData.external_url,
        system: sessionData.system,
        campaign_id: sessionData.campaign_id,
        session_number: (sessionData.session_number || 0) + 1,
        starts_at: newStartsAt,
        min_players: sessionData.min_players || 3,
        max_players: sessionData.max_players || 5,
        trigger_warnings: sessionData.trigger_warnings || []
      });

      await logEvent('session_duplicated', 'session', newSession.id, { original_id: sessionData.id });
      await loadData();
      return { success: true, session: newSession };
    } catch (err) {
      const message = err.message || 'Erreur lors de la duplication';
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
      const oldSessions = sessionsList.filter(s => new Date(s.starts_at) < new Date());

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
    deletedSessions,
    loading,
    error,
    setError,

    // Actions
    loadData,
    createSession,
    updateSession,
    deleteSession,
    restoreSession,
    permanentlyDeleteSession,
    duplicateSession,
    joinSession,
    leaveSession,
    createCampaign,
    archiveOldSessions
  };
};
