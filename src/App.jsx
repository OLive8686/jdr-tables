import React, { useState } from 'react';
import { X } from 'lucide-react';
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

const App = () => {
  const { currentUser, isGM, isAuthenticated } = useAuth();

  // État UI
  const [viewMode, setViewMode] = useState('list');
  const [showArchive, setShowArchive] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  // Données
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

  // Non connecté -> page de connexion
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Handlers
  const handleJoin = async (sessionId) => {
    await joinSession(sessionId, currentUser);
  };

  const handleLeave = async (sessionId) => {
    await leaveSession(sessionId, currentUser);
  };

  const handleRemovePlayer = async (sessionId, playerName) => {
    if (!confirm(`Retirer ${playerName} de la session ?`)) return;
    await leaveSession(sessionId, playerName);
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

  // Données à afficher
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
          <EmptyState showArchive={showArchive} isGM={isGM} />
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
        title="Créer une session"
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
        title="Créer une campagne"
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
