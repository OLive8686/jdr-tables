import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TriggerWarningSelector } from './TriggerWarningDisplay';
import { Calendar, Clock, Users, Swords, BookOpen } from 'lucide-react';

const SessionForm = ({ session, campaigns, onSubmit, onClose, loading }) => {
  const { currentUser } = useAuth();
  const isEditing = !!session;
  const userCampaigns = campaigns.filter(c => c.gm === currentUser);

  // Calculer les valeurs initiales pour les dates/heures
  const getInitialDateTime = () => {
    if (session?.starts_at) {
      const d = new Date(session.starts_at);
      return {
        date: d.toISOString().split('T')[0],
        startTime: d.toTimeString().substring(0, 5)
      };
    }
    return {
      date: session?.date || '',
      startTime: session?.time || '20:00'
    };
  };

  const getInitialEndTime = () => {
    if (session?.ends_at) {
      return new Date(session.ends_at).toTimeString().substring(0, 5);
    }
    return '23:00';
  };

  const initialDateTime = getInitialDateTime();

  const [formData, setFormData] = useState({
    game_type: session?.game_type || 'campaign',
    title: session?.title || '',
    description: session?.description || '',
    system: session?.system || '',
    campaign_id: session?.campaign_id || '',
    session_number: session?.session_number || 0,
    date: initialDateTime.date,
    startTime: initialDateTime.startTime,
    endTime: getInitialEndTime(),
    max_players: session?.max_players || session?.maxPlayers || 6,
    trigger_warnings: session?.trigger_warnings || [],
    // Legacy compatibility
    campaign: session?.campaign || '',
    episode: session?.episode || '1'
  });

  const [scheduleError, setScheduleError] = useState('');

  // Mettre a jour le titre automatiquement pour les campagnes
  useEffect(() => {
    if (formData.game_type === 'campaign' && formData.campaign_id) {
      const selectedCampaign = campaigns.find(c => c.id === formData.campaign_id);
      if (selectedCampaign && !formData.title) {
        setFormData(prev => ({
          ...prev,
          title: `Episode ${formData.session_number || 1} - ${selectedCampaign.name}`,
          campaign: selectedCampaign.name,
          system: selectedCampaign.system || prev.system
        }));
      }
    }
  }, [formData.campaign_id, formData.session_number]);

  // Validation du conflit horaire MJ
  const checkScheduleConflict = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) return;

    const starts_at = `${formData.date}T${formData.startTime}:00`;
    const ends_at = `${formData.date}T${formData.endTime}:00`;

    try {
      const res = await fetch('/api/validate/dm-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dm_id: currentUser,
          starts_at,
          ends_at,
          exclude_session_id: session?.id
        })
      });
      const data = await res.json();
      if (data.hasConflict) {
        setScheduleError('Vous avez deja une session en tant que MJ a cette periode');
      } else {
        setScheduleError('');
      }
    } catch (e) {
      console.error('Schedule check failed:', e);
    }
  };

  useEffect(() => {
    checkScheduleConflict();
  }, [formData.date, formData.startTime, formData.endTime]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (scheduleError) {
      alert(scheduleError);
      return;
    }

    // Construire les timestamps
    const starts_at = `${formData.date}T${formData.startTime}:00`;
    const ends_at = `${formData.date}T${formData.endTime}:00`;

    // Valider que end > start
    if (new Date(ends_at) <= new Date(starts_at)) {
      alert('L\'heure de fin doit etre apres l\'heure de debut');
      return;
    }

    // Valider session_number
    if (formData.session_number < 0) {
      alert('Le numero d\'episode ne peut pas etre negatif');
      return;
    }

    const submitData = {
      id: session?.id,
      game_type: formData.game_type,
      title: formData.title,
      description: formData.description,
      system: formData.system,
      campaign_id: formData.game_type === 'campaign' ? formData.campaign_id : null,
      session_number: parseInt(formData.session_number) || 0,
      dm_id: currentUser,
      starts_at,
      ends_at,
      max_players: parseInt(formData.max_players) || 6,
      trigger_warnings: formData.trigger_warnings,
      // Legacy fields
      gm: currentUser,
      date: formData.date,
      time: formData.startTime,
      campaign: formData.campaign,
      episode: String(formData.session_number || 1),
      minPlayers: 1,
      maxPlayers: parseInt(formData.max_players) || 6
    };

    onSubmit(submitData);
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = '2026-12-31';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Type de jeu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de session *
        </label>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
            formData.game_type === 'campaign'
              ? 'border-purple-500 bg-purple-50 text-purple-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="game_type"
              value="campaign"
              checked={formData.game_type === 'campaign'}
              onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
              className="sr-only"
            />
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Campagne</span>
          </label>
          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
            formData.game_type === 'oneshot'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="game_type"
              value="oneshot"
              checked={formData.game_type === 'oneshot'}
              onChange={(e) => setFormData({ ...formData, game_type: e.target.value })}
              className="sr-only"
            />
            <Swords className="w-5 h-5" />
            <span className="font-medium">One-shot</span>
          </label>
        </div>
      </div>

      {/* Campagne (si type campaign) */}
      {formData.game_type === 'campaign' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campagne *
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.campaign || campaigns.find(c => c.id === formData.campaign_id)?.name || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          ) : (
            <select
              value={formData.campaign_id}
              onChange={(e) => {
                const camp = campaigns.find(c => c.id === e.target.value);
                setFormData({
                  ...formData,
                  campaign_id: e.target.value,
                  campaign: camp?.name || '',
                  system: camp?.system || formData.system,
                  trigger_warnings: camp?.trigger_warnings || formData.trigger_warnings
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required={formData.game_type === 'campaign'}
            >
              <option value="">Selectionner une campagne</option>
              {userCampaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {userCampaigns.length === 0 && !isEditing && (
            <p className="text-sm text-red-500 mt-1">
              Vous devez d'abord creer une campagne
            </p>
          )}
        </div>
      )}

      {/* Titre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titre de la session *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={formData.game_type === 'campaign' ? 'Ex: Episode 5 - Le Chateau' : 'Ex: One-shot Halloween'}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          required
        />
      </div>

      {/* Description (optionnel) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description de la session..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
        />
      </div>

      {/* Systeme de jeu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Systeme de jeu
        </label>
        <input
          type="text"
          value={formData.system}
          onChange={(e) => setFormData({ ...formData, system: e.target.value })}
          placeholder="Ex: D&D 5e, Call of Cthulhu..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Numero d'episode (si campagne) */}
      {formData.game_type === 'campaign' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numero d'episode
          </label>
          <input
            type="number"
            value={formData.session_number}
            min="0"
            onChange={(e) => setFormData({ ...formData, session_number: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          {formData.session_number < 0 && (
            <p className="text-sm text-red-500 mt-1">Le numero d'episode ne peut pas etre negatif</p>
          )}
        </div>
      )}

      {/* Date et heures */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline w-4 h-4 mr-1" />
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline w-4 h-4 mr-1" />
              Debut *
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline w-4 h-4 mr-1" />
              Fin *
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
            />
          </div>
        </div>
        {scheduleError && (
          <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg">
            {scheduleError}
          </p>
        )}
      </div>

      {/* Nombre de joueurs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Users className="inline w-4 h-4 mr-1" />
          Nombre max de joueurs
        </label>
        <input
          type="number"
          value={formData.max_players}
          min="1"
          max="20"
          onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Trigger Warnings */}
      <TriggerWarningSelector
        selected={formData.trigger_warnings}
        onChange={(warnings) => setFormData({ ...formData, trigger_warnings: warnings })}
      />

      {/* Boutons */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || scheduleError || (formData.game_type === 'campaign' && !isEditing && userCampaigns.length === 0)}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Chargement...' : (isEditing ? 'Modifier' : 'Creer')}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;
