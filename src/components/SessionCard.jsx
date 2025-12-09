import React from 'react';
import { Calendar, Clock, Crown, User, UserPlus, UserMinus, Edit, Trash2, X, BookOpen, Swords, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TriggerWarningDisplay from './TriggerWarningDisplay';

// Formater la date pour l'affichage
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Formater l'heure
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Si c'est un ISO string, extraire l'heure
  if (timeStr.includes('T')) {
    return new Date(timeStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return timeStr;
};

const SessionCard = ({
  session,
  isArchive = false,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onRemovePlayer,
  loading
}) => {
  const { currentUser } = useAuth();

  const isUserRegistered = session.players?.includes(currentUser);
  const isSessionGM = session.gm === currentUser || session.dm_id === currentUser;
  const maxPlayers = session.max_players || session.maxPlayers || 6;
  const currentPlayers = session.current_players ?? session.players?.length ?? 0;
  const availableSlots = session.available_slots ?? (maxPlayers - currentPlayers);
  const isFull = currentPlayers >= maxPlayers;
  const minPlayers = session.minPlayers || 1;
  const needsMorePlayers = currentPlayers < minPlayers;

  // Type de jeu
  const gameType = session.game_type || 'campaign';
  const isOneshot = gameType === 'oneshot';

  // Horaires
  const displayDate = session.starts_at ? formatDate(session.starts_at) : formatDate(session.date);
  const startTime = session.starts_at ? formatTime(session.starts_at) : session.time;
  const endTime = session.ends_at ? formatTime(session.ends_at) : null;

  // Titre a afficher
  const displayTitle = session.title || session.campaign || 'Session sans titre';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
      {/* En-tete avec titre et badge */}
      <div className={`p-4 ${isOneshot
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
        : 'bg-gradient-to-r from-purple-600 to-blue-600'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isOneshot ? (
              <Swords className="w-5 h-5 text-white flex-shrink-0" />
            ) : (
              <BookOpen className="w-5 h-5 text-white flex-shrink-0" />
            )}
            <h3 className="text-white font-bold text-lg truncate">{displayTitle}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Badge type */}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isOneshot
                ? 'bg-cyan-500 bg-opacity-30 text-white'
                : 'bg-purple-500 bg-opacity-30 text-white'
            }`}>
              {isOneshot ? 'One-shot' : 'Campagne'}
            </span>
            {/* Badge episode (si campagne) */}
            {!isOneshot && (session.session_number !== undefined || session.episode) && (
              <span className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-full">
                Ep. {session.session_number ?? session.episode}
              </span>
            )}
          </div>
        </div>
        {/* Description courte */}
        {session.description && (
          <p className="text-white text-opacity-80 text-sm mt-2 line-clamp-2">
            {session.description}
          </p>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4 space-y-4">
        {/* Systeme de jeu */}
        {session.system && (
          <div className="text-sm text-gray-500">
            <span className="font-medium">Systeme:</span> {session.system}
          </div>
        )}

        {/* Date et heure */}
        <div className="flex items-center text-gray-600">
          <Calendar className="mr-2 text-purple-600 flex-shrink-0" size={18} />
          <span>{displayDate}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Clock className="mr-2 text-purple-600 flex-shrink-0" size={18} />
          <span>{startTime}</span>
          {endTime && (
            <>
              <span className="mx-1">-</span>
              <span>{endTime}</span>
            </>
          )}
        </div>

        {/* MJ */}
        <div className="flex items-center text-gray-600">
          <Crown className="mr-2 text-yellow-500 flex-shrink-0" size={18} />
          <span className="font-medium">{session.dm_id || session.gm}</span>
          <span className="ml-2 text-sm text-gray-400">(MJ)</span>
        </div>

        {/* Trigger Warnings */}
        {session.trigger_warnings && session.trigger_warnings.length > 0 && (
          <TriggerWarningDisplay warnings={session.trigger_warnings} compact />
        )}

        {/* Joueurs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Joueurs ({currentPlayers}/{maxPlayers})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {needsMorePlayers && !isFull && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  Min {minPlayers} requis
                </span>
              )}
              {isFull ? (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  Complet
                </span>
              ) : (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {availableSlots} place{availableSlots > 1 ? 's' : ''} dispo
                </span>
              )}
            </div>
          </div>

          {session.players?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {session.players.map((player, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                    player === currentUser
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
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

        {/* Actions */}
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
                    Se desinscrire
                  </button>
                ) : (
                  <button
                    onClick={() => onJoin(session.id)}
                    disabled={loading || isFull}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition disabled:opacity-50 ${
                      isFull
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                    title={isFull ? 'Cette session est complete' : "S'inscrire a cette session"}
                  >
                    <UserPlus size={18} />
                    {isFull ? 'Complet' : "S'inscrire"}
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

export default SessionCard;
