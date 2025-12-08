import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ============ BASE DE DONNÉES SQLite ============
const db = new Database(path.join(__dirname, 'jdr-tables.db'));

// Créer les tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT DEFAULT '20:00',
    gm TEXT NOT NULL,
    campaign TEXT NOT NULL,
    episode TEXT DEFAULT '1',
    minPlayers INTEGER DEFAULT 3,
    maxPlayers INTEGER DEFAULT 5,
    players TEXT DEFAULT '',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gm TEXT NOT NULL,
    description TEXT DEFAULT '',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS archives (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT DEFAULT '20:00',
    gm TEXT NOT NULL,
    campaign TEXT NOT NULL,
    episode TEXT DEFAULT '1',
    minPlayers INTEGER DEFAULT 3,
    maxPlayers INTEGER DEFAULT 5,
    players TEXT DEFAULT '',
    createdAt TEXT
  );
`);

// Helper pour parser les joueurs
const parsePlayers = (playersStr) => {
  if (!playersStr) return [];
  return playersStr.split(',').filter(p => p.trim());
};

// Helper pour formater une session
const formatSession = (row) => ({
  ...row,
  players: parsePlayers(row.players),
  minPlayers: row.minPlayers || 3,
  maxPlayers: row.maxPlayers || 5
});

// ============ ROUTES SESSIONS ============

// GET /api/sessions - Récupérer toutes les sessions
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY date ASC').all();
    res.json(sessions.map(formatSession));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions - Créer une session
app.post('/api/sessions', (req, res) => {
  try {
    const { date, time, gm, campaign, episode, minPlayers, maxPlayers } = req.body;

    if (!date || !campaign) {
      return res.status(400).json({ error: 'Date et campagne obligatoires' });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, date, time, gm, campaign, episode, minPlayers, maxPlayers, players, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', datetime('now'))
    `);

    stmt.run(id, date, time || '20:00', gm, campaign, episode || '1', minPlayers || 3, maxPlayers || 5);

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    res.status(201).json(formatSession(session));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/sessions/:id - Modifier une session
app.put('/api/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, episode, minPlayers, maxPlayers } = req.body;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const stmt = db.prepare(`
      UPDATE sessions
      SET date = ?, time = ?, episode = ?, minPlayers = ?, maxPlayers = ?
      WHERE id = ?
    `);

    stmt.run(
      date || session.date,
      time || session.time,
      episode || session.episode,
      minPlayers ?? session.minPlayers,
      maxPlayers ?? session.maxPlayers,
      id
    );

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    res.json(formatSession(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sessions/:id - Supprimer une session
app.delete('/api/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/join - Rejoindre une session
app.post('/api/sessions/:id/join', (req, res) => {
  try {
    const { id } = req.params;
    const { playerName } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: 'Nom du joueur requis' });
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const players = parsePlayers(session.players);

    // Vérifier si déjà inscrit
    if (players.includes(playerName)) {
      return res.status(400).json({ error: 'Vous êtes déjà inscrit sur cette session' });
    }

    // Vérifier si table complète
    if (players.length >= session.maxPlayers) {
      return res.status(400).json({ error: 'Table complète' });
    }

    // Vérifier si déjà inscrit sur une autre table ce jour-là
    const sameDaySessions = db.prepare('SELECT * FROM sessions WHERE date = ? AND id != ?').all(session.date, id);
    for (const s of sameDaySessions) {
      const otherPlayers = parsePlayers(s.players);
      if (otherPlayers.includes(playerName)) {
        return res.status(400).json({ error: 'Vous êtes déjà inscrit sur une autre table ce jour-là' });
      }
    }

    // Ajouter le joueur
    players.push(playerName);
    db.prepare('UPDATE sessions SET players = ? WHERE id = ?').run(players.join(','), id);

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    res.json(formatSession(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/leave - Quitter une session
app.post('/api/sessions/:id/leave', (req, res) => {
  try {
    const { id } = req.params;
    const { playerName } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: 'Nom du joueur requis' });
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    let players = parsePlayers(session.players);
    players = players.filter(p => p !== playerName);

    db.prepare('UPDATE sessions SET players = ? WHERE id = ?').run(players.join(','), id);

    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    res.json(formatSession(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ROUTES CAMPAGNES ============

// GET /api/campaigns - Récupérer toutes les campagnes
app.get('/api/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY name ASC').all();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/campaigns - Créer une campagne
app.post('/api/campaigns', (req, res) => {
  try {
    const { name, gm, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom de campagne obligatoire' });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO campaigns (id, name, gm, description, createdAt)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(id, name, gm || '', description || '');

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/campaigns/:id - Supprimer une campagne
app.delete('/api/campaigns/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Campagne non trouvée' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ROUTES ARCHIVES ============

// GET /api/archives - Récupérer toutes les archives
app.get('/api/archives', (req, res) => {
  try {
    const archives = db.prepare('SELECT * FROM archives ORDER BY date DESC').all();
    res.json(archives.map(formatSession));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/archives/archive-old - Archiver les sessions passées
app.post('/api/archives/archive-old', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Récupérer les sessions passées
    const oldSessions = db.prepare('SELECT * FROM sessions WHERE date < ?').all(today);

    // Copier vers archives
    const insertArchive = db.prepare(`
      INSERT INTO archives (id, date, time, gm, campaign, episode, minPlayers, maxPlayers, players, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const session of oldSessions) {
      insertArchive.run(
        session.id,
        session.date,
        session.time,
        session.gm,
        session.campaign,
        session.episode,
        session.minPlayers,
        session.maxPlayers,
        session.players,
        session.createdAt
      );
    }

    // Supprimer de sessions
    db.prepare('DELETE FROM sessions WHERE date < ?').run(today);

    res.json({ success: true, archivedCount: oldSessions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DONNÉES DE DÉMO ============

// POST /api/demo - Créer des données de démo
app.post('/api/demo', (req, res) => {
  try {
    // Créer des campagnes
    const campaigns = [
      { name: 'La Malédiction de Strahd', gm: 'Alice', description: 'Campagne D&D 5e dans Ravenloft' },
      { name: "L'Appel de Cthulhu", gm: 'Bob', description: 'Horreur cosmique années 20' },
      { name: 'Chroniques Oubliées', gm: 'Alice', description: 'Fantasy médiévale' }
    ];

    for (const c of campaigns) {
      const exists = db.prepare('SELECT id FROM campaigns WHERE name = ?').get(c.name);
      if (!exists) {
        db.prepare('INSERT INTO campaigns (id, name, gm, description, createdAt) VALUES (?, ?, ?, ?, datetime("now"))').run(
          uuidv4(), c.name, c.gm, c.description
        );
      }
    }

    // Créer des sessions
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sessions = [
      { date: nextWeek.toISOString().split('T')[0], time: '20:00', gm: 'Alice', campaign: 'La Malédiction de Strahd', episode: '5' },
      { date: nextWeek.toISOString().split('T')[0], time: '14:00', gm: 'Bob', campaign: "L'Appel de Cthulhu", episode: '1' },
      { date: nextMonth.toISOString().split('T')[0], time: '19:00', gm: 'Alice', campaign: 'Chroniques Oubliées', episode: '12' }
    ];

    for (const s of sessions) {
      db.prepare(`
        INSERT INTO sessions (id, date, time, gm, campaign, episode, minPlayers, maxPlayers, players, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 3, 5, '', datetime('now'))
      `).run(uuidv4(), s.date, s.time, s.gm, s.campaign, s.episode);
    }

    res.json({ success: true, message: 'Données de démo créées' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
