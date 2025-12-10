import React from 'react';
import { Calendar, Archive } from 'lucide-react';
import SessionCard from './SessionCard';

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

// Vue Liste
export const ListView = ({ sessions, isArchive, isDeleted, ...props }) => {
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date || a.starts_at) - new Date(b.date || b.starts_at));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedSessions.map(session => (
        <SessionCard
          key={session.id}
          session={session}
          isArchive={isArchive}
          isDeleted={isDeleted}
          {...props}
        />
      ))}
    </div>
  );
};

// Vue Calendrier
export const CalendarView = ({ sessions, isArchive, isDeleted, ...props }) => {
  // Grouper les sessions par date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = session.date || (session.starts_at ? session.starts_at.split('T')[0] : 'unknown');
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  // Trier les dates
  const sortedDates = Object.keys(sessionsByDate).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date}>
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Calendar className="text-purple-600" size={20} />
            {formatDate(date)}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {sessionsByDate[date].map(session => (
              <SessionCard
                key={session.id}
                session={session}
                isArchive={isArchive}
                isDeleted={isDeleted}
                {...props}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// État vide
export const EmptyState = ({ showArchive, isGM }) => (
  <div className="text-center py-12">
    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
      {showArchive ? (
        <Archive className="text-gray-400" size={40} />
      ) : (
        <Calendar className="text-gray-400" size={40} />
      )}
    </div>
    <h2 className="text-xl font-medium text-gray-600">
      {showArchive ? 'Aucune session archivée' : 'Aucune session prévue'}
    </h2>
    <p className="text-gray-400 mt-2">
      {showArchive
        ? 'Les sessions passées apparaîtront ici'
        : isGM
        ? 'Créez votre première session !'
        : 'Les sessions à venir apparaîtront ici'}
    </p>
  </div>
);
