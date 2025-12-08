import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SessionForm = ({ session, campaigns, onSubmit, onClose, loading }) => {
  const { currentUser } = useAuth();
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
    onSubmit({
      ...formData,
      id: session?.id,
      gm: currentUser
    });
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = '2026-12-31';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Campagne *
        </label>
        {isEditing ? (
          <input
            type="text"
            value={formData.campaign}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          />
        ) : (
          <select
            value={formData.campaign}
            onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            required
          >
            <option value="">Sélectionner une campagne</option>
            {userCampaigns.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        )}
        {userCampaigns.length === 0 && !isEditing && (
          <p className="text-sm text-red-500 mt-1">
            Vous devez d'abord créer une campagne
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            value={formData.date}
            min={today}
            max={maxDate}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Numéro d'épisode
        </label>
        <input
          type="text"
          value={formData.episode}
          onChange={(e) => setFormData({ ...formData, episode: e.target.value })}
          placeholder="Ex: 1, 2, 3..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Joueurs min
          </label>
          <input
            type="number"
            value={formData.minPlayers}
            min="1"
            max="10"
            onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Joueurs max
          </label>
          <input
            type="number"
            value={formData.maxPlayers}
            min="1"
            max="10"
            onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || (!isEditing && userCampaigns.length === 0)}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Chargement...' : (isEditing ? 'Modifier' : 'Créer')}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;
