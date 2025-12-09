import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useData } from './hooks/useData';
import {
  LoginPage,
  Modal,
  Header,
  SessionForm,
  CampaignForm,
  ListView,
  CalendarView,
  EmptyState
} from './components';
import AuthCallback from './components/AuthCallback';
import AdminPanel from './components/AdminPanel';

const App = () => {
  const {
    currentUser,
    profile,
    displayName,
    isAdmin,
    isAuthenticated,
    loading: authLoading
  } = useAuth();

  // Check if we're on the callback route
  const [isCallback, setIsCallback] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // Check if current URL is auth callback
    if (window.location.pathname === '/auth/callback') {
      setIsCallback(true);
    }
  }, []);

  // Etat UI
  const [viewMode, setViewMode] = useState('list');
  const [showArchive, setShowArchive] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  // Donnees
  const {
    sessions,
    campaigns,
    archives,
    loading,
    error,
    setError,
    loadData,
    createSession,
    updateSession,
    deleteSession,
    joinSession,
    leaveSession,
    createCampaign,
    archiveOldSessions
  } = useData();

  // Callback OAuth -> afficher page de redirection
  if (isCallback) {
    return <AuthCallback />;
  }

  // Chargement auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  // Non connecte -> page de connexion
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Admin panel
  if (showAdmin && isAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  // Handlers
  const handleJoin = async (sessionId) => {
    await joinSession(sessionId);
  };

  const handleLeave = async (sessionId) => {
    await leaveSession(sessionId);
  };

  const handleRemovePlayer = async (sessionId, playerName) => {
    if (!confirm(`Retirer ${playerName} de la session ?`)) return;
    // TODO: Implement admin removal via Supabase
    await leaveSession(sessionId);
  };

  const handleCreateSession = async (data) => {
    const result = await createSession(data);
    if (result.success) {
      setShowCreateSession(false);
    }
  };

  const handleUpdateSession = async (data) => {
    const result = await updateSession(data.id, data);
    if (result.success) {
      setEditingSession(null);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette session ?')) return;
    await deleteSession(sessionId);
  };

  const handleCreateCampaign = async (data) => {
    const result = await createCampaign(data);
    if (result.success) {
      setShowCreateCampaign(false);
    }
  };

  const handleArchive = async () => {
    await archiveOldSessions();
  };

  // Donnees a afficher
  const displayedSessions = showArchive ? archives : sessions;
  const ViewComponent = viewMode === 'calendar' ? CalendarView : ListView;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        showArchive={showArchive}
        setShowArchive={setShowArchive}
        onRefresh={loadData}
        onCreateSession={() => setShowCreateSession(true)}
        onCreateCampaign={() => setShowCreateCampaign(true)}
        onArchive={handleArchive}
        onAdminClick={isAdmin ? () => setShowAdmin(true) : null}
        loading={loading}
      />

      {/* Message d'erreur */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="hover:text-red-900">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {displayedSessions.length === 0 ? (
          <EmptyState showArchive={showArchive} isGM={true} />
        ) : (
          <ViewComponent
            sessions={displayedSessions}
            isArchive={showArchive}
            onJoin={handleJoin}
            onLeave={handleLeave}
            onEdit={setEditingSession}
            onDelete={handleDeleteSession}
            onRemovePlayer={handleRemovePlayer}
            loading={loading}
          />
        )}
      </main>

      {/* Modales */}
      <Modal
        isOpen={showCreateSession}
        onClose={() => setShowCreateSession(false)}
        title="Creer une session"
      >
        <SessionForm
          campaigns={campaigns}
          onSubmit={handleCreateSession}
          onClose={() => setShowCreateSession(false)}
          loading={loading}
        />
      </Modal>

      <Modal
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        title="Modifier la session"
      >
        <SessionForm
          session={editingSession}
          campaigns={campaigns}
          onSubmit={handleUpdateSession}
          onClose={() => setEditingSession(null)}
          loading={loading}
        />
      </Modal>

      <Modal
        isOpen={showCreateCampaign}
        onClose={() => setShowCreateCampaign(false)}
        title="Creer une campagne"
      >
        <CampaignForm
          onSubmit={handleCreateCampaign}
          onClose={() => setShowCreateCampaign(false)}
          loading={loading}
        />
      </Modal>
    </div>
  );
};

export default App;
