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

const App = () => {
  const { user, loading: authLoading, isAuthenticated, displayName } = useAuth();

  // Check if we're on the callback route
  const isCallback = window.location.pathname === '/auth/callback';

  console.log('[App] pathname:', window.location.pathname, 'isCallback:', isCallback);
  console.log('[App] authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'user:', !!user);

  // UI State
  const [viewMode, setViewMode] = useState('list');
  const [showArchive, setShowArchive] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  // Data
  const {
    sessions,
    campaigns,
    archives,
    deletedSessions,
    loading,
    error,
    setError,
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
  } = useData();

  // OAuth callback
  if (isCallback) {
    return <AuthCallback />;
  }

  // Loading auth
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

  // Not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
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

  const handleDuplicate = async (session) => {
    await duplicateSession(session);
  };

  const handleRestore = async (sessionId) => {
    await restoreSession(sessionId);
  };

  const handlePermanentDelete = async (sessionId) => {
    if (!confirm('Supprimer definitivement cette session ? Cette action est irreversible.')) return;
    await permanentlyDeleteSession(sessionId);
  };

  // Data to display
  const displayedSessions = showDeleted ? deletedSessions : (showArchive ? archives : sessions);
  const ViewComponent = viewMode === 'calendar' ? CalendarView : ListView;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        showArchive={showArchive}
        setShowArchive={(val) => { setShowArchive(val); setShowDeleted(false); }}
        showDeleted={showDeleted}
        setShowDeleted={(val) => { setShowDeleted(val); setShowArchive(false); }}
        deletedCount={deletedSessions.length}
        onRefresh={loadData}
        onCreateSession={() => setShowCreateSession(true)}
        onCreateCampaign={() => setShowCreateCampaign(true)}
        onArchive={handleArchive}
        loading={loading}
      />

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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {displayedSessions.length === 0 ? (
          <EmptyState showArchive={showArchive} isGM={true} />
        ) : (
          <ViewComponent
            sessions={displayedSessions}
            isArchive={showArchive}
            isDeleted={showDeleted}
            onJoin={handleJoin}
            onLeave={handleLeave}
            onEdit={setEditingSession}
            onDelete={handleDeleteSession}
            onDuplicate={handleDuplicate}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onRemovePlayer={handleRemovePlayer}
            loading={loading}
          />
        )}
      </main>

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
