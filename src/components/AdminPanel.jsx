import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Activity,
  Shield,
  Trash2,
  Search,
  RefreshCw,
  Crown,
  User
} from 'lucide-react';
import { profiles, eventLogs } from '../lib/supabase';

const AdminPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, logsData] = await Promise.all([
        profiles.getAll(),
        eventLogs.getAll()
      ]);
      setUsers(usersData || []);
      setLogs(logsData || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetRole = async (userId, newRole) => {
    try {
      await profiles.setRole(userId, newRole);
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error setting role:', error);
      alert('Erreur lors du changement de role');
    }
  };

  const handleDeleteUser = async (userId, displayName) => {
    if (!confirm(`Supprimer definitivement ${displayName} ?`)) return;

    try {
      await profiles.delete(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes('signup') || eventType.includes('user')) return '👤';
    if (eventType.includes('session')) return '🎮';
    if (eventType.includes('campaign')) return '📚';
    if (eventType.includes('registration')) return '✅';
    if (eventType.includes('invitation')) return '📨';
    return '📝';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-2">
                <Shield size={28} />
                <h1 className="text-2xl font-bold">Administration</h1>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'users'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={18} className="inline mr-2" />
              Utilisateurs ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === 'logs'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Activity size={18} className="inline mr-2" />
              Logs ({logs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'users' && (
          <div>
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Users list */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Inscription</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <User size={20} className="text-purple-600" />
                            </div>
                          )}
                          <span className="font-medium">{user.display_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleSetRole(user.id, e.target.value)}
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <option value="user">Utilisateur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.display_name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {loading ? 'Chargement...' : 'Aucun utilisateur trouve'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getEventIcon(log.event_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {log.event_type.replace(/_/g, ' ')}
                        </span>
                        {log.entity_type && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {log.entity_type}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {log.user?.display_name || 'Systeme'} - {formatDate(log.created_at)}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1 text-xs text-gray-400 font-mono">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {loading ? 'Chargement...' : 'Aucun log'}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
