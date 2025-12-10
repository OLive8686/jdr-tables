import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TriggerWarningSelector } from './TriggerWarningDisplay';
import { Calendar, Clock, Users, Swords, BookOpen, UserPlus, X } from 'lucide-react';
import { profiles } from '../lib/supabase';

const SessionForm = ({ session, campaigns, onSubmit, onClose, loading }) => {
  const { currentUser, displayName } = useAuth();
  const isEditing = !!session;
  // Filtrer les campagnes de l'utilisateur (Supabase: gm_id, Legacy: gm)
  const userCampaigns = campaigns.filter(c =>
    c.gm_id === currentUser?.id || c.gm === displayName
  );

  // Liste des joueurs disponibles pour preinscription
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Charger la liste des joueurs
  useEffect(() => {
    const loadPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const playersList = await profiles.getAll();
        // Exclure le MJ actuel de la liste
        setAllPlayers(playersList.filter(p => p.id !== currentUser?.id));
      } catch (err) {
        console.error('Error loading players:', err);
      }
      setLoadingPlayers(false);
    };
    loadPlayers();
  }, [currentUser?.id]);

  // Charger les joueurs preinscrits si edition
  useEffect(() => {
    if (session?.registrations) {
      const preregistered = session.registrations
        .filter(r => r.status === 'confirmed')
        .map(r => r.player?.id || r.player_id)
        .filter(Boolean);
      setSelectedPlayers(preregistered);
    }
  }, [session]);

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

  // Detecter si la session finit le lendemain
  const detectEndsNextDay = () => {
    if (session?.starts_at && session?.ends_at) {
      const startDate = new Date(session.starts_at).toDateString();
      const endDate = new Date(session.ends_at).toDateString();
      return startDate !== endDate;
    }
    return false;
  };

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
    endsNextDay: detectEndsNextDay(),
    min_players: session?.min_players || 3,
    max_players: session?.max_players || session?.maxPlayers || 6,
    trigger_warnings: session?.trigger_warnings || [],
    // Legacy compatibility
    campaign: session?.campaign || '',
    episode: session?.episode || '1'
  });


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

  // Note: La validation du conflit horaire est geree par les triggers Supabase
  // Le trigger check_dm_schedule_conflict() verifiera au moment de l'insert/update

  const handleSubmit = (e) => {
    e.preventDefault();

    // Construire les timestamps
    const starts_at = `${formData.date}T${formData.startTime}:00`;

    // Si la session finit le lendemain, ajouter un jour a la date de fin
    let endDate = formData.date;
    if (formData.endsNextDay) {
      const nextDay = new Date(formData.date);
      nextDay.setDate(nextDay.getDate() + 1);
      endDate = nextDay.toISOString().split('T')[0];
    }
    const ends_at = `${endDate}T${formData.endTime}:00`;

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

    // Valider min <= max
    if (formData.min_players > formData.max_players) {
      alert('Le nombre minimum de joueurs ne peut pas depasser le maximum');
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
      starts_at,
      ends_at,
      min_players: parseInt(formData.min_players) || 3,
      max_players: parseInt(formData.max_players) || 6,
      trigger_warnings: formData.trigger_warnings,
      preregistered_players: selectedPlayers
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
        {/* Option fin le lendemain */}
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.endsNextDay}
            onChange={(e) => setFormData({ ...formData, endsNextDay: e.target.checked })}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-600">
            Se termine le lendemain (ex: 21h - 2h du matin)
          </span>
        </label>
      </div>

      {/* Nombre de joueurs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="inline w-4 h-4 mr-1" />
          Nombre de joueurs
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <input
              type="number"
              value={formData.min_players}
              min="1"
              max="20"
              onChange={(e) => setFormData({ ...formData, min_players: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Maximum</label>
            <input
              type="number"
              value={formData.max_players}
              min="1"
              max="20"
              onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) || 6 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Preinscription des joueurs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <UserPlus className="inline w-4 h-4 mr-1" />
          Preinscrire des joueurs (optionnel)
        </label>
        {loadingPlayers ? (
          <p className="text-sm text-gray-500">Chargement des joueurs...</p>
        ) : allPlayers.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun joueur disponible</p>
        ) : (
          <>
            {/* Joueurs selectionnes */}
            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedPlayers.map(playerId => {
                  const player = allPlayers.find(p => p.id === playerId);
                  return player ? (
                    <span
                      key={playerId}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {player.avatar_url && (
                        <img src={player.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                      )}
                      {player.display_name}
                      <button
                        type="button"
                        onClick={() => setSelectedPlayers(prev => prev.filter(id => id !== playerId))}
                        className="ml-1 hover:text-purple-900"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {/* Liste deroulante */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedPlayers.includes(e.target.value)) {
                  if (selectedPlayers.length < formData.max_players) {
                    setSelectedPlayers(prev => [...prev, e.target.value]);
                  } else {
                    alert(`Maximum ${formData.max_players} joueurs`);
                  }
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Ajouter un joueur...</option>
              {allPlayers
                .filter(p => !selectedPlayers.includes(p.id))
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.display_name}
                  </option>
                ))}
            </select>
          </>
        )}
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
          disabled={loading || (formData.game_type === 'campaign' && !isEditing && userCampaigns.length === 0)}
          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Chargement...' : (isEditing ? 'Modifier' : 'Creer')}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;
