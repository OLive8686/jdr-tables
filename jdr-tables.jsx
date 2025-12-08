/**
 * Composant React pour Tables de JDR
 * À utiliser dans un environnement de développement React ou Claude artifacts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Crown, User, UserPlus, UserMinus,
  Edit, Trash2, Plus, BookPlus, Archive, RefreshCw,
  LogOut, X, CalendarDays, List, Dice6
} from 'lucide-react';

// ============ CONFIGURATION ============
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/VOTRE_SCRIPT_ID/exec';

// ============ UTILS ============
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// ============ API ============
const api = {
  async get(action) {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
    return response.json();
  },
  async post(action, data) {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    return response.json();
  }
};

// ============ COMPOSANTS ============

// Page de connexion
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isGM, setIsGM] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim(), isGM);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dice6 className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Tables de JDR</h1>
          <p className="text-gray-500 mt-2">Gérez vos sessions de jeu de rôle</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre nom
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Entrez votre nom..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGM"
              checked={isGM}
              onChange={(e) => setIsGM(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="isGM" className="ml-3 text-gray-700">
              Je suis Maître du Jeu (MJ)
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105"
          >
            Entrer
          </button>
        </form>
      </div>
    </div>
  );
};

// Modal générique
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// Carte de session
const SessionCard = ({
  session, currentUser, isGM, isArchive,
  onJoin, onLeave, onEdit, onDelete, onRemovePlayer, loading
}) => {
  const isUserRegistered = session.players.includes(currentUser);
  const isSessionGM = session.gm === currentUser;
  const isFull = session.players.length >= session.maxPlayers;
  const needsMorePlayers = session.players.length < session.minPlayers;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg truncate">{session.campaign}</h3>
          <span className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-full">
            Épisode {session.episode}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center text-gray-600">
          <Calendar className="mr-2 text-purple-600" size={18} />
          <span>{formatDate(session.date)}</span>
          <span className="mx-2">•</span>
          <Clock className="mr-2 text-purple-600" size={18} />
          <span>{session.time}</span>
        </div>

        <div className="flex items-center text-gray-600">
          <Crown className="mr-2 text-yellow-500" size={18} />
          <span className="font-medium">{session.gm}</span>
          <span className="ml-2 text-sm text-gray-400">(MJ)</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Joueurs ({session.players.length}/{session.maxPlayers})
            </span>
            {needsMorePlayers && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                Min {session.minPlayers} requis
              </span>
            )}
            {isFull && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                Complet
              </span>
            )}
          </div>

          {session.players.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {session.players.map((player, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                    player === currentUser ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <User size={14} />
                  <span>{player}</span>
                  {isSessionGM && !isArchive && (
                    <button
                      onClick={() => onRemovePlayer(session.id, player)}
                      className="ml-1 hover:text-red-600"
                      disabled={loading}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm italic">Aucun joueur inscrit</p>
          )}
        </div>

        {!isArchive && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {!isSessionGM && (
              <>
                {isUserRegistered ? (
                  <button
                    onClick={() => onLeave(session.id)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-lg transition disabled:opacity-50"
                  >
                    <UserMinus size={18} />
                    Se désinscrire
                  </button>
                ) : (
                  <button
                    onClick={() => onJoin(session.id)}
                    disabled={loading || isFull}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 py-2 px-4 rounded-lg transition disabled:opacity-50"
                  >
                    <UserPlus size={18} />
                    S'inscrire
                  </button>
                )}
              </>
            )}

            {isSessionGM && (
              <>
                <button
                  onClick={() => onEdit(session)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  <Edit size={18} />
                  Modifier
                </button>
                <button
                  onClick={() => onDelete(session.id)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Formulaire de session
const SessionForm = ({ session, campaigns, currentUser, onSubmit, onClose, loading }) => {
  const isEditing = !!session;
  const userCampaigns = campaigns.filter(c => c.gm === currentUser);

  const [formData, setFormData] = useState({
    date: session?.date || '',
    time: session?.time || '20:00',
    campaign: session?.campaign || '',
    episode: session?.episode || '1',
    minPlayers: session?.minPlayers || 3,
    maxPlayers: session?.maxPlayers || 5
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, id: session?.id });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Campagne *</label>
        {isEditing ? (
          <input type="text" value={formData.campaign} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-100" />
        ) : (
          <select
            value={formData.campaign}
            onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            required
          >
            <option value="">Sélectionner une campagne</option>
            {userCampaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.date}
            min={today}
            max="2026-12-31"
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Épisode</label>
        <input
          type="text"
          value={formData.episode}
          onChange={(e) => setFormData({ ...formData, episode: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min joueurs</label>
          <input
            type="number"
            value={formData.minPlayers}
            min="1"
            max="10"
            onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max joueurs</label>
          <input
            type="number"
            value={formData.maxPlayers}
            min="1"
            max="10"
            onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Chargement...' : isEditing ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
};

// Formulaire de campagne
const CampaignForm = ({ currentUser, onSubmit, onClose, loading }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, gm: currentUser });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: La Malédiction de Strahd"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Décrivez votre campagne..."
          rows={3}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">
          Annuler
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
          {loading ? 'Chargement...' : 'Créer'}
        </button>
      </div>
    </form>
  );
};

// Vue Calendrier
const CalendarView = ({ sessions, ...props }) => {
  const sessionsByDate = sessions.reduce((acc, session) => {
    if (!acc[session.date]) acc[session.date] = [];
    acc[session.date].push(session);
    return acc;
  }, {});

  const sortedDates = Object.keys(sessionsByDate).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date}>
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="text-purple-600" size={20} />
            {formatDate(date)}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {sessionsByDate[date].map(session => (
              <SessionCard key={session.id} session={session} {...props} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Vue Liste
const ListView = ({ sessions, ...props }) => {
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedSessions.map(session => (
        <SessionCard key={session.id} session={session} {...props} />
      ))}
    </div>
  );
};

// ============ APPLICATION PRINCIPALE ============
const JDRTablesApp = () => {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('rpg_username') || '');
  const [isGM, setIsGM] = useState(localStorage.getItem('rpg_isGM') === 'true');
  const [viewMode, setViewMode] = useState('list');
  const [showArchive, setShowArchive] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [sessionsRes, campaignsRes, archivesRes] = await Promise.all([
        api.get('getSessions'),
        api.get('getCampaigns'),
        api.get('getArchives')
      ]);
      if (sessionsRes.success) setSessions(sessionsRes.data);
      if (campaignsRes.success) setCampaigns(campaignsRes.data);
      if (archivesRes.success) setArchives(archivesRes.data);
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, loadData]);

  const handleLogin = (username, gmStatus) => {
    localStorage.setItem('rpg_username', username);
    localStorage.setItem('rpg_isGM', gmStatus.toString());
    setCurrentUser(username);
    setIsGM(gmStatus);
  };

  const handleLogout = () => {
    localStorage.removeItem('rpg_username');
    localStorage.removeItem('rpg_isGM');
    setCurrentUser('');
    setIsGM(false);
  };

  const handleJoinSession = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('joinSession', { sessionId, playerName: currentUser });
      if (res.success) await loadData();
      else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleLeaveSession = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('leaveSession', { sessionId, playerName: currentUser });
      if (res.success) await loadData();
      else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleRemovePlayer = async (sessionId, playerName) => {
    if (!confirm(`Retirer ${playerName} ?`)) return;
    setLoading(true);
    try {
      const res = await api.post('removePlayer', { sessionId, playerName });
      if (res.success) await loadData();
      else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleCreateSession = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('createSession', { ...data, gm: currentUser });
      if (res.success) {
        setShowCreateSession(false);
        await loadData();
      } else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleUpdateSession = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('updateSession', data);
      if (res.success) {
        setEditingSession(null);
        await loadData();
      } else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette session ?')) return;
    setLoading(true);
    try {
      const res = await api.post('deleteSession', { id: sessionId });
      if (res.success) await loadData();
      else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleCreateCampaign = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('createCampaign', data);
      if (res.success) {
        setShowCreateCampaign(false);
        await loadData();
      } else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  const handleArchive = async () => {
    setLoading(true);
    try {
      const res = await api.post('archiveOldSessions', {});
      if (res.success) await loadData();
      else setError(res.error);
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  if (!currentUser) return <LoginPage onLogin={handleLogin} />;

  const displayedSessions = showArchive ? archives : sessions;
  const ViewComponent = viewMode === 'calendar' ? CalendarView : ListView;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Dice6 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Tables de JDR</h1>
                <p className="text-sm text-gray-500">
                  {currentUser} {isGM && <span className="text-purple-600 font-medium">(MJ)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={loadData} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
              </button>
              <button
                onClick={() => setShowArchive(!showArchive)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${showArchive ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              >
                <Archive size={18} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
              >
                {viewMode === 'list' ? <CalendarDays size={18} /> : <List size={18} />}
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {isGM && !showArchive && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <button onClick={() => setShowCreateSession(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                <Plus size={18} /> Session
              </button>
              <button onClick={() => setShowCreateCampaign(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                <BookPlus size={18} /> Campagne
              </button>
              <button onClick={handleArchive} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50">
                <Archive size={18} /> Archiver
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={18} /></button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {displayedSessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              {showArchive ? <Archive className="text-gray-400" size={40} /> : <Calendar className="text-gray-400" size={40} />}
            </div>
            <h2 className="text-xl font-medium text-gray-600">
              {showArchive ? 'Aucune archive' : 'Aucune session'}
            </h2>
          </div>
        ) : (
          <ViewComponent
            sessions={displayedSessions}
            currentUser={currentUser}
            isGM={isGM}
            isArchive={showArchive}
            onJoin={handleJoinSession}
            onLeave={handleLeaveSession}
            onEdit={setEditingSession}
            onDelete={handleDeleteSession}
            onRemovePlayer={handleRemovePlayer}
            loading={loading}
          />
        )}
      </main>

      <Modal isOpen={showCreateSession} onClose={() => setShowCreateSession(false)} title="Créer une session">
        <SessionForm campaigns={campaigns} currentUser={currentUser} onSubmit={handleCreateSession} onClose={() => setShowCreateSession(false)} loading={loading} />
      </Modal>

      <Modal isOpen={!!editingSession} onClose={() => setEditingSession(null)} title="Modifier la session">
        <SessionForm session={editingSession} campaigns={campaigns} currentUser={currentUser} onSubmit={handleUpdateSession} onClose={() => setEditingSession(null)} loading={loading} />
      </Modal>

      <Modal isOpen={showCreateCampaign} onClose={() => setShowCreateCampaign(false)} title="Créer une campagne">
        <CampaignForm currentUser={currentUser} onSubmit={handleCreateCampaign} onClose={() => setShowCreateCampaign(false)} loading={loading} />
      </Modal>
    </div>
  );
};

export default JDRTablesApp;
