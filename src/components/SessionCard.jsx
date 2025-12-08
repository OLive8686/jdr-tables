import React from 'react';
import { Calendar, Clock, Crown, User, UserPlus, UserMinus, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const isSessionGM = session.gm === currentUser;
  const isFull = (session.players?.length || 0) >= session.maxPlayers;
  const needsMorePlayers = (session.players?.length || 0) < session.minPlayers;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
      {/* En-tête avec campagne */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg truncate">{session.campaign}</h3>
          <span className="bg-white bg-opacity-20 text-white text-sm px-3 py-1 rounded-full">
            Épisode {session.episode}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 space-y-4">
        {/* Date et heure */}
        <div className="flex items-center text-gray-600">
          <Calendar className="mr-2 text-purple-600" size={18} />
          <span>{formatDate(session.date)}</span>
          <span className="mx-2">•</span>
          <Clock className="mr-2 text-purple-600" size={18} />
          <span>{session.time}</span>
        </div>

        {/* MJ */}
        <div className="flex items-center text-gray-600">
          <Crown className="mr-2 text-yellow-500" size={18} />
          <span className="font-medium">{session.gm}</span>
          <span className="ml-2 text-sm text-gray-400">(MJ)</span>
        </div>

        {/* Joueurs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Joueurs ({session.players?.length || 0}/{session.maxPlayers})
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

export default SessionCard;
