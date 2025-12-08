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

// Créer le dossier data si nécessaire
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers pour lire/écrire les fichiers JSON
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
    console.error(`Erreur écriture ${filePath}:`, error);
    throw error;
  }
};

// ============ SESSIONS ============

export const getSessions = () => {
  return readJSON(SESSIONS_FILE);
};

export const createSession = ({ date, time, gm, campaign, episode, minPlayers, maxPlayers }) => {
  const sessions = readJSON(SESSIONS_FILE);

  const newSession = {
    id: uuidv4(),
    date,
    time: time || '20:00',
    gm,
    campaign,
    episode: episode || '1',
    minPlayers: minPlayers || 3,
    maxPlayers: maxPlayers || 5,
    players: [],
    createdAt: new Date().toISOString()
  };

  sessions.push(newSession);
  writeJSON(SESSIONS_FILE, sessions);

  return newSession;
};

export const updateSession = (id, updates) => {
  const sessions = readJSON(SESSIONS_FILE);
  const index = sessions.findIndex(s => s.id === id);

  if (index === -1) {
    throw new Error('Session non trouvée');
  }

  sessions[index] = { ...sessions[index], ...updates };
  writeJSON(SESSIONS_FILE, sessions);

  return sessions[index];
};

export const deleteSession = (id) => {
  const sessions = readJSON(SESSIONS_FILE);
  const filtered = sessions.filter(s => s.id !== id);

  if (filtered.length === sessions.length) {
    throw new Error('Session non trouvée');
  }

  writeJSON(SESSIONS_FILE, filtered);
  return { success: true };
};

export const joinSession = (sessionId, playerName) => {
  const sessions = readJSON(SESSIONS_FILE);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    throw new Error('Session non trouvée');
  }

  if (session.players.includes(playerName)) {
    throw new Error('Vous êtes déjà inscrit sur cette session');
  }

  if (session.players.length >= session.maxPlayers) {
    throw new Error('Table complète');
  }

  // Vérifier inscription sur une autre table le même jour
  const sameDaySessions = sessions.filter(s => s.date === session.date && s.id !== sessionId);
  for (const s of sameDaySessions) {
    if (s.players.includes(playerName)) {
      throw new Error('Vous êtes déjà inscrit sur une autre table ce jour-là');
    }
  }

  session.players.push(playerName);
  writeJSON(SESSIONS_FILE, sessions);

  return session;
};

export const leaveSession = (sessionId, playerName) => {
  const sessions = readJSON(SESSIONS_FILE);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    throw new Error('Session non trouvée');
  }

  session.players = session.players.filter(p => p !== playerName);
  writeJSON(SESSIONS_FILE, sessions);

  return session;
};

// ============ CAMPAGNES ============

export const getCampaigns = () => {
  return readJSON(CAMPAIGNS_FILE);
};

export const createCampaign = ({ name, gm, description }) => {
  const campaigns = readJSON(CAMPAIGNS_FILE);

  const newCampaign = {
    id: uuidv4(),
    name,
    gm: gm || '',
    description: description || '',
    createdAt: new Date().toISOString()
  };

  campaigns.push(newCampaign);
  writeJSON(CAMPAIGNS_FILE, campaigns);

  return newCampaign;
};

export const deleteCampaign = (id) => {
  const campaigns = readJSON(CAMPAIGNS_FILE);
  const filtered = campaigns.filter(c => c.id !== id);

  if (filtered.length === campaigns.length) {
    throw new Error('Campagne non trouvée');
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

  const today = new Date().toISOString().split('T')[0];
  const oldSessions = sessions.filter(s => s.date < today);
  const activeSessions = sessions.filter(s => s.date >= today);

  // Ajouter aux archives
  archives.push(...oldSessions);
  writeJSON(ARCHIVES_FILE, archives);

  // Garder seulement les sessions actives
  writeJSON(SESSIONS_FILE, activeSessions);

  return { success: true, archivedCount: oldSessions.length };
};

// ============ DÉMO ============

export const createDemoData = () => {
  // Campagnes
  const campaigns = [
    { name: 'La Malédiction de Strahd', gm: 'Alice', description: 'Campagne D&D 5e dans Ravenloft' },
    { name: "L'Appel de Cthulhu", gm: 'Bob', description: 'Horreur cosmique années 20' },
    { name: 'Chroniques Oubliées', gm: 'Alice', description: 'Fantasy médiévale' }
  ];

  const existingCampaigns = getCampaigns();
  for (const c of campaigns) {
    if (!existingCampaigns.find(ec => ec.name === c.name)) {
      createCampaign(c);
    }
  }

  // Sessions
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sessionsData = [
    { date: nextWeek.toISOString().split('T')[0], time: '20:00', gm: 'Alice', campaign: 'La Malédiction de Strahd', episode: '5' },
    { date: nextWeek.toISOString().split('T')[0], time: '14:00', gm: 'Bob', campaign: "L'Appel de Cthulhu", episode: '1' },
    { date: nextMonth.toISOString().split('T')[0], time: '19:00', gm: 'Alice', campaign: 'Chroniques Oubliées', episode: '12' }
  ];

  for (const s of sessionsData) {
    createSession(s);
  }

  return { success: true };
};

export default {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  joinSession,
  leaveSession,
  getCampaigns,
  createCampaign,
  deleteCampaign,
  getArchives,
  archiveOldSessions,
  createDemoData
};
