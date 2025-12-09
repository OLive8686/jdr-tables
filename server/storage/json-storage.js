/**
 * Stockage JSON - Alternative simple sans base de données
 * Utilise des fichiers JSON pour persister les données
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const ARCHIVES_FILE = path.join(DATA_DIR, 'archives.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const INVITATIONS_FILE = path.join(DATA_DIR, 'invitations.json');

// Types de jeu
export const GAME_TYPES = ['campaign', 'oneshot'];

// Statuts de session
export const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

// Trigger Warnings disponibles
export const TRIGGER_WARNINGS = [
  { id: 'violence', label: 'Violence', description: 'Scenes de combat, blessures' },
  { id: 'graphic_violence', label: 'Violence graphique', description: 'Descriptions detaillees de violence' },
  { id: 'sexual_content', label: 'Contenu sexuel', description: 'References ou scenes sexuelles' },
  { id: 'nudity', label: 'Nudite', description: 'Descriptions de nudite' },
  { id: 'racism', label: 'Racisme', description: 'Themes de discrimination raciale' },
  { id: 'sexism', label: 'Sexisme', description: 'Themes de discrimination sexiste' },
  { id: 'homophobia', label: 'Homophobie', description: 'Themes de discrimination LGBT+' },
  { id: 'transphobia', label: 'Transphobie', description: 'Themes de discrimination trans' },
  { id: 'substance_abuse', label: 'Drogues/Alcool', description: 'Usage de substances' },
  { id: 'mental_health', label: 'Sante mentale', description: 'Themes de maladie mentale' },
  { id: 'child_harm', label: 'Violence sur enfants', description: 'Enfants en danger' },
  { id: 'animal_harm', label: 'Violence sur animaux', description: 'Animaux en danger' },
  { id: 'body_horror', label: 'Body horror', description: 'Modifications corporelles, mutilations' },
  { id: 'torture', label: 'Torture', description: 'Scenes de torture' },
  { id: 'suicide', label: 'Suicide', description: 'Themes suicidaires' },
  { id: 'domestic_abuse', label: 'Violence domestique', description: 'Abus familiaux' }
];

// Creer le dossier data si necessaire
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers pour lire/ecrire les fichiers JSON
const readJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Erreur lecture ${filePath}:`, error);
    return [];
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Erreur ecriture ${filePath}:`, error);
    throw error;
  }
};

// ============ HELPERS VALIDATION ============

// Verifier si deux periodes se chevauchent
const periodsOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1;
};

// Verifier conflit horaire MJ
export const checkDMScheduleConflict = (dmId, startsAt, endsAt, excludeSessionId = null) => {
  const sessions = readJSON(SESSIONS_FILE);
  const conflictSession = sessions.find(s => {
    if (excludeSessionId && s.id === excludeSessionId) return false;
    if (s.dm_id !== dmId) return false;
    if (s.status === 'cancelled') return false;
    return periodsOverlap(startsAt, endsAt, s.starts_at, s.ends_at);
  });
  return conflictSession;
};

// Verifier conflit horaire joueur
export const checkPlayerScheduleConflict = (playerId, startsAt, endsAt, excludeSessionId = null) => {
  const sessions = readJSON(SESSIONS_FILE);
  const registrations = readJSON(REGISTRATIONS_FILE);

  // Trouver les sessions ou le joueur est inscrit
  const playerRegistrations = registrations.filter(r =>
    r.player_id === playerId && r.status === 'confirmed'
  );

  for (const reg of playerRegistrations) {
    if (excludeSessionId && reg.session_id === excludeSessionId) continue;
    const session = sessions.find(s => s.id === reg.session_id);
    if (!session || session.status === 'cancelled') continue;
    if (periodsOverlap(startsAt, endsAt, session.starts_at, session.ends_at)) {
      return session;
    }
  }
  return null;
};

// Compter les joueurs inscrits a une session
export const getSessionPlayerCount = (sessionId) => {
  const registrations = readJSON(REGISTRATIONS_FILE);
  return registrations.filter(r =>
    r.session_id === sessionId && r.status === 'confirmed'
  ).length;
};

// ============ SESSIONS ============

export const getSessions = () => {
  const sessions = readJSON(SESSIONS_FILE);
  // Enrichir avec le nombre de joueurs
  return sessions.map(s => ({
    ...s,
    current_players: getSessionPlayerCount(s.id),
    available_slots: s.max_players - getSessionPlayerCount(s.id)
  }));
};

export const getSession = (id) => {
  const sessions = readJSON(SESSIONS_FILE);
  const session = sessions.find(s => s.id === id);
  if (!session) return null;
  return {
    ...session,
    current_players: getSessionPlayerCount(session.id),
    available_slots: session.max_players - getSessionPlayerCount(session.id)
  };
};

export const createSession = ({
  game_type,
  title,
  description,
  system,
  campaign_id,
  session_number,
  dm_id,
  starts_at,
  ends_at,
  max_players,
  trigger_warnings,
  status
}) => {
  const sessions = readJSON(SESSIONS_FILE);

  // Validations
  if (!GAME_TYPES.includes(game_type)) {
    throw new Error('Type de jeu invalide');
  }

  if (game_type === 'campaign' && !campaign_id) {
    throw new Error('Une session de campagne doit avoir un campaign_id');
  }

  if (session_number !== undefined && session_number < 0) {
    throw new Error('Le numero d\'episode ne peut pas etre negatif');
  }

  const startDate = new Date(starts_at);
  const endDate = new Date(ends_at);
  if (endDate <= startDate) {
    throw new Error('La fin doit etre apres le debut');
  }

  // Verifier conflit MJ
  const dmConflict = checkDMScheduleConflict(dm_id, starts_at, ends_at);
  if (dmConflict) {
    throw new Error('Vous avez deja une session en tant que MJ a cette periode');
  }

  const newSession = {
    id: uuidv4(),
    game_type,
    title: title || '',
    description: description || '',
    system: system || '',
    campaign_id: game_type === 'campaign' ? campaign_id : null,
    session_number: session_number || 0,
    dm_id,
    starts_at,
    ends_at,
    max_players: max_players || 6,
    trigger_warnings: trigger_warnings || [],
    status: status || 'scheduled',
    // Legacy fields for compatibility
    date: starts_at.split('T')[0],
    time: starts_at.split('T')[1]?.substring(0, 5) || '20:00',
    gm: dm_id,
    campaign: '', // sera rempli par le frontend si besoin
    episode: String(session_number || 1),
    players: [], // legacy - utiliser registrations maintenant
    createdAt: new Date().toISOString()
  };

  sessions.push(newSession);
  writeJSON(SESSIONS_FILE, sessions);

  return {
    ...newSession,
    current_players: 0,
    available_slots: newSession.max_players
  };
};

export const updateSession = (id, updates) => {
  const sessions = readJSON(SESSIONS_FILE);
  const index = sessions.findIndex(s => s.id === id);

  if (index === -1) {
    throw new Error('Session non trouvee');
  }

  const session = sessions[index];

  // Si mise a jour des horaires, verifier conflit MJ
  if (updates.starts_at && updates.ends_at) {
    const dmConflict = checkDMScheduleConflict(
      updates.dm_id || session.dm_id,
      updates.starts_at,
      updates.ends_at,
      id
    );
    if (dmConflict) {
      throw new Error('Vous avez deja une session en tant que MJ a cette periode');
    }
  }

  // Validation session_number
  if (updates.session_number !== undefined && updates.session_number < 0) {
    throw new Error('Le numero d\'episode ne peut pas etre negatif');
  }

  sessions[index] = { ...session, ...updates };

  // Mettre a jour les champs legacy
  if (updates.starts_at) {
    sessions[index].date = updates.starts_at.split('T')[0];
    sessions[index].time = updates.starts_at.split('T')[1]?.substring(0, 5) || '20:00';
  }
  if (updates.dm_id) {
    sessions[index].gm = updates.dm_id;
  }

  writeJSON(SESSIONS_FILE, sessions);

  return {
    ...sessions[index],
    current_players: getSessionPlayerCount(id),
    available_slots: sessions[index].max_players - getSessionPlayerCount(id)
  };
};

export const deleteSession = (id) => {
  const sessions = readJSON(SESSIONS_FILE);
  const filtered = sessions.filter(s => s.id !== id);

  if (filtered.length === sessions.length) {
    throw new Error('Session non trouvee');
  }

  writeJSON(SESSIONS_FILE, filtered);

  // Supprimer les inscriptions associees
  const registrations = readJSON(REGISTRATIONS_FILE);
  const filteredRegs = registrations.filter(r => r.session_id !== id);
  writeJSON(REGISTRATIONS_FILE, filteredRegs);

  return { success: true };
};

// ============ INSCRIPTIONS ============

export const getRegistrations = (sessionId = null) => {
  const registrations = readJSON(REGISTRATIONS_FILE);
  if (sessionId) {
    return registrations.filter(r => r.session_id === sessionId);
  }
  return registrations;
};

export const getPlayerRegistrations = (playerId) => {
  const registrations = readJSON(REGISTRATIONS_FILE);
  return registrations.filter(r => r.player_id === playerId);
};

export const registerToSession = (sessionId, playerId, characterId = null) => {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Session non trouvee');
  }

  if (session.status === 'cancelled') {
    throw new Error('Cette session est annulee');
  }

  // Verifier si deja inscrit
  const registrations = readJSON(REGISTRATIONS_FILE);
  const existing = registrations.find(r =>
    r.session_id === sessionId && r.player_id === playerId
  );
  if (existing) {
    throw new Error('Vous etes deja inscrit sur cette session');
  }

  // Verifier places disponibles
  const currentPlayers = getSessionPlayerCount(sessionId);
  if (currentPlayers >= session.max_players) {
    throw new Error('Cette session est complete');
  }

  // Verifier conflit horaire joueur
  const conflict = checkPlayerScheduleConflict(playerId, session.starts_at, session.ends_at);
  if (conflict) {
    throw new Error('Vous avez deja une session prevue a cette periode');
  }

  const newRegistration = {
    id: uuidv4(),
    session_id: sessionId,
    player_id: playerId,
    character_id: characterId,
    status: 'confirmed',
    registered_at: new Date().toISOString()
  };

  registrations.push(newRegistration);
  writeJSON(REGISTRATIONS_FILE, registrations);

  // Mettre a jour le champ legacy players
  const sessions = readJSON(SESSIONS_FILE);
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1 && !sessions[sessionIndex].players.includes(playerId)) {
    sessions[sessionIndex].players.push(playerId);
    writeJSON(SESSIONS_FILE, sessions);
  }

  return newRegistration;
};

export const unregisterFromSession = (sessionId, playerId) => {
  const registrations = readJSON(REGISTRATIONS_FILE);
  const index = registrations.findIndex(r =>
    r.session_id === sessionId && r.player_id === playerId
  );

  if (index === -1) {
    throw new Error('Inscription non trouvee');
  }

  registrations.splice(index, 1);
  writeJSON(REGISTRATIONS_FILE, registrations);

  // Mettre a jour le champ legacy players
  const sessions = readJSON(SESSIONS_FILE);
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    sessions[sessionIndex].players = sessions[sessionIndex].players.filter(p => p !== playerId);
    writeJSON(SESSIONS_FILE, sessions);
  }

  return { success: true };
};

// Legacy compatibility
export const joinSession = (sessionId, playerName) => {
  return registerToSession(sessionId, playerName);
};

export const leaveSession = (sessionId, playerName) => {
  return unregisterFromSession(sessionId, playerName);
};

// ============ INVITATIONS ============

export const getInvitations = (filters = {}) => {
  const invitations = readJSON(INVITATIONS_FILE);
  let result = invitations;

  if (filters.campaign_id) {
    result = result.filter(i => i.campaign_id === filters.campaign_id);
  }
  if (filters.session_id) {
    result = result.filter(i => i.session_id === filters.session_id);
  }
  if (filters.invited_player) {
    result = result.filter(i => i.invited_player === filters.invited_player);
  }
  if (filters.status) {
    result = result.filter(i => i.status === filters.status);
  }

  return result;
};

export const createInvitation = ({ campaign_id, session_id, invited_by, invited_player, message }) => {
  // Validation: un seul des deux IDs
  if ((campaign_id && session_id) || (!campaign_id && !session_id)) {
    throw new Error('Une invitation doit etre pour une campagne OU une session (pas les deux)');
  }

  const invitations = readJSON(INVITATIONS_FILE);

  // Verifier si invitation existante
  const existing = invitations.find(i =>
    i.invited_player === invited_player &&
    i.status === 'pending' &&
    ((campaign_id && i.campaign_id === campaign_id) || (session_id && i.session_id === session_id))
  );
  if (existing) {
    throw new Error('Une invitation est deja en attente pour ce joueur');
  }

  const newInvitation = {
    id: uuidv4(),
    campaign_id: campaign_id || null,
    session_id: session_id || null,
    invited_by,
    invited_player,
    message: message || '',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  invitations.push(newInvitation);
  writeJSON(INVITATIONS_FILE, invitations);

  return newInvitation;
};

export const updateInvitationStatus = (invitationId, status) => {
  if (!['pending', 'accepted', 'declined'].includes(status)) {
    throw new Error('Statut invalide');
  }

  const invitations = readJSON(INVITATIONS_FILE);
  const index = invitations.findIndex(i => i.id === invitationId);

  if (index === -1) {
    throw new Error('Invitation non trouvee');
  }

  invitations[index].status = status;
  invitations[index].responded_at = new Date().toISOString();
  writeJSON(INVITATIONS_FILE, invitations);

  // Si acceptee et c'est une session, inscrire le joueur
  if (status === 'accepted' && invitations[index].session_id) {
    try {
      registerToSession(invitations[index].session_id, invitations[index].invited_player);
    } catch (e) {
      // Ignorer si deja inscrit ou autre erreur
      console.log('Auto-registration failed:', e.message);
    }
  }

  return invitations[index];
};

// ============ CAMPAGNES ============

export const getCampaigns = () => {
  return readJSON(CAMPAIGNS_FILE);
};

export const getCampaign = (id) => {
  const campaigns = readJSON(CAMPAIGNS_FILE);
  return campaigns.find(c => c.id === id);
};

export const createCampaign = ({ name, gm, description, system, trigger_warnings }) => {
  const campaigns = readJSON(CAMPAIGNS_FILE);

  const newCampaign = {
    id: uuidv4(),
    name,
    gm: gm || '',
    description: description || '',
    system: system || '',
    trigger_warnings: trigger_warnings || [],
    createdAt: new Date().toISOString()
  };

  campaigns.push(newCampaign);
  writeJSON(CAMPAIGNS_FILE, campaigns);

  return newCampaign;
};

export const updateCampaign = (id, updates) => {
  const campaigns = readJSON(CAMPAIGNS_FILE);
  const index = campaigns.findIndex(c => c.id === id);

  if (index === -1) {
    throw new Error('Campagne non trouvee');
  }

  campaigns[index] = { ...campaigns[index], ...updates };
  writeJSON(CAMPAIGNS_FILE, campaigns);

  return campaigns[index];
};

export const deleteCampaign = (id) => {
  const campaigns = readJSON(CAMPAIGNS_FILE);
  const filtered = campaigns.filter(c => c.id !== id);

  if (filtered.length === campaigns.length) {
    throw new Error('Campagne non trouvee');
  }

  writeJSON(CAMPAIGNS_FILE, filtered);
  return { success: true };
};

// ============ ARCHIVES ============

export const getArchives = () => {
  return readJSON(ARCHIVES_FILE);
};

export const archiveOldSessions = () => {
  const sessions = readJSON(SESSIONS_FILE);
  const archives = readJSON(ARCHIVES_FILE);

  const now = new Date().toISOString();
  const oldSessions = sessions.filter(s => s.ends_at ? s.ends_at < now : s.date < now.split('T')[0]);
  const activeSessions = sessions.filter(s => s.ends_at ? s.ends_at >= now : s.date >= now.split('T')[0]);

  // Ajouter aux archives
  archives.push(...oldSessions);
  writeJSON(ARCHIVES_FILE, archives);

  // Garder seulement les sessions actives
  writeJSON(SESSIONS_FILE, activeSessions);

  return { success: true, archivedCount: oldSessions.length };
};

// ============ CONFIG ============

export const getTriggerWarnings = () => {
  return TRIGGER_WARNINGS;
};

export const getGameTypes = () => {
  return GAME_TYPES;
};

export const getSessionStatuses = () => {
  return SESSION_STATUSES;
};

// ============ DEMO ============

export const createDemoData = () => {
  // Campagnes
  const campaigns = [
    {
      name: 'La Malediction de Strahd',
      gm: 'Alice',
      description: 'Campagne D&D 5e dans Ravenloft',
      system: 'D&D 5e',
      trigger_warnings: ['violence', 'body_horror', 'mental_health']
    },
    {
      name: "L'Appel de Cthulhu",
      gm: 'Bob',
      description: 'Horreur cosmique annees 20',
      system: 'Call of Cthulhu 7e',
      trigger_warnings: ['violence', 'mental_health', 'body_horror', 'suicide']
    },
    {
      name: 'Chroniques Oubliees',
      gm: 'Alice',
      description: 'Fantasy medievale',
      system: 'Chroniques Oubliees',
      trigger_warnings: ['violence']
    }
  ];

  const existingCampaigns = getCampaigns();
  const createdCampaigns = [];
  for (const c of campaigns) {
    if (!existingCampaigns.find(ec => ec.name === c.name)) {
      createdCampaigns.push(createCampaign(c));
    }
  }

  // Sessions
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const formatDateTime = (date, hour) => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const sessionsData = [
    {
      game_type: 'campaign',
      title: 'Episode 5 - Le Chateau',
      dm_id: 'Alice',
      campaign_id: createdCampaigns[0]?.id || existingCampaigns[0]?.id,
      session_number: 5,
      starts_at: formatDateTime(nextWeek, 20),
      ends_at: formatDateTime(nextWeek, 23),
      max_players: 5,
      trigger_warnings: ['violence', 'body_horror']
    },
    {
      game_type: 'oneshot',
      title: 'One-shot Halloween',
      description: 'Seance speciale horreur',
      dm_id: 'Bob',
      starts_at: formatDateTime(nextWeek, 14),
      ends_at: formatDateTime(nextWeek, 18),
      max_players: 4,
      trigger_warnings: ['violence', 'graphic_violence', 'body_horror']
    },
    {
      game_type: 'campaign',
      title: 'Episode 12 - Le Dragon',
      dm_id: 'Alice',
      campaign_id: createdCampaigns[2]?.id || existingCampaigns[2]?.id,
      session_number: 12,
      starts_at: formatDateTime(nextMonth, 19),
      ends_at: formatDateTime(nextMonth, 22),
      max_players: 6,
      trigger_warnings: ['violence']
    }
  ];

  for (const s of sessionsData) {
    try {
      createSession(s);
    } catch (e) {
      console.log('Demo session creation skipped:', e.message);
    }
  }

  return { success: true };
};

export default {
  // Sessions
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  // Registrations
  getRegistrations,
  getPlayerRegistrations,
  registerToSession,
  unregisterFromSession,
  joinSession,
  leaveSession,
  // Invitations
  getInvitations,
  createInvitation,
  updateInvitationStatus,
  // Campaigns
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  // Archives
  getArchives,
  archiveOldSessions,
  // Config
  getTriggerWarnings,
  getGameTypes,
  getSessionStatuses,
  // Validation
  checkDMScheduleConflict,
  checkPlayerScheduleConflict,
  // Demo
  createDemoData
};
