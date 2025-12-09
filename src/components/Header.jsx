import React from 'react';
import {
  Dice6,
  RefreshCw,
  Archive,
  CalendarDays,
  List,
  LogOut,
  Plus,
  BookPlus,
  Shield,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({
  viewMode,
  setViewMode,
  showArchive,
  setShowArchive,
  onRefresh,
  onCreateSession,
  onCreateCampaign,
  onArchive,
  onAdminClick,
  loading
}) => {
  const { displayName, profile, isAdmin, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo et titre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Dice6 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Tables de JDR</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <User size={14} />
                )}
                <span className="font-medium">{displayName}</span>
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Admin */}
            {isAdmin && onAdminClick && (
              <button
                onClick={onAdminClick}
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition"
                title="Administration"
              >
                <Shield size={18} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Actualiser */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Actualiser"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
            </button>

            {/* Basculer Archives */}
            <button
              onClick={() => setShowArchive(!showArchive)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                showArchive ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              <Archive size={18} />
              <span className="hidden sm:inline">{showArchive ? 'Sessions' : 'Archives'}</span>
            </button>

            {/* Basculer Vue */}
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition"
            >
              {viewMode === 'list' ? <CalendarDays size={18} /> : <List size={18} />}
              <span className="hidden sm:inline">{viewMode === 'list' ? 'Calendrier' : 'Liste'}</span>
            </button>

            {/* Deconnexion */}
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg transition"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Deconnexion</span>
            </button>
          </div>
        </div>

        {/* Actions creation */}
        {!showArchive && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <button
              onClick={onCreateSession}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Plus size={18} />
              Creer une session
            </button>
            <button
              onClick={onCreateCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <BookPlus size={18} />
              Creer une campagne
            </button>
            <button
              onClick={onArchive}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <Archive size={18} />
              Archiver l'ancien
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
