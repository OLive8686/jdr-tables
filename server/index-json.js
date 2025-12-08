/**
 * Serveur Express avec stockage JSON
 * Alternative légère sans base de données
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import storage from './storage/json-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir le frontend en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// ============ ROUTES SESSIONS ============

app.get('/api/sessions', (req, res) => {
  try {
    res.json(storage.getSessions());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions', (req, res) => {
  try {
    const session = storage.createSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/sessions/:id', (req, res) => {
  try {
    const session = storage.updateSession(req.params.id, req.body);
    res.json(session);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  try {
    storage.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/sessions/:id/join', (req, res) => {
  try {
    const session = storage.joinSession(req.params.id, req.body.playerName);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sessions/:id/leave', (req, res) => {
  try {
    const session = storage.leaveSession(req.params.id, req.body.playerName);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ROUTES CAMPAGNES ============

app.get('/api/campaigns', (req, res) => {
  try {
    res.json(storage.getCampaigns());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/campaigns', (req, res) => {
  try {
    const campaign = storage.createCampaign(req.body);
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/campaigns/:id', (req, res) => {
  try {
    storage.deleteCampaign(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ============ ROUTES ARCHIVES ============

app.get('/api/archives', (req, res) => {
  try {
    res.json(storage.getArchives());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/archives/archive-old', (req, res) => {
  try {
    const result = storage.archiveOldSessions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DÉMO ============

app.post('/api/demo', (req, res) => {
  try {
    storage.createDemoData();
    res.json({ success: true, message: 'Données de démo créées' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all pour le SPA en production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
