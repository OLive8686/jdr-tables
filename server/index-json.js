/**
 * Serveur Express avec stockage JSON
 * Alternative legere sans base de donnees
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import storage from './storage/json-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DIST_PATH = path.join(__dirname, '../dist');

app.use(cors());
app.use(express.json());

// Servir le frontend en production (si le dossier dist existe)
if (fs.existsSync(DIST_PATH)) {
  console.log('Serving static files from:', DIST_PATH);
  app.use(express.static(DIST_PATH));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ ROUTES CONFIG ============

app.get('/api/config/trigger-warnings', (req, res) => {
  try {
    res.json(storage.getTriggerWarnings());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config/game-types', (req, res) => {
  try {
    res.json(storage.getGameTypes());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config/session-statuses', (req, res) => {
  try {
    res.json(storage.getSessionStatuses());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ROUTES SESSIONS ============

app.get('/api/sessions', (req, res) => {
  try {
    res.json(storage.getSessions());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = storage.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvee' });
    }
    res.json(session);
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

// Legacy join/leave routes (compatibility)
app.post('/api/sessions/:id/join', (req, res) => {
  try {
    const result = storage.joinSession(req.params.id, req.body.playerName);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/sessions/:id/leave', (req, res) => {
  try {
    const result = storage.leaveSession(req.params.id, req.body.playerName);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ROUTES REGISTRATIONS ============

app.get('/api/registrations', (req, res) => {
  try {
    const { session_id, player_id } = req.query;
    if (session_id) {
      res.json(storage.getRegistrations(session_id));
    } else if (player_id) {
      res.json(storage.getPlayerRegistrations(player_id));
    } else {
      res.json(storage.getRegistrations());
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/registrations', (req, res) => {
  try {
    const { session_id, player_id, character_id } = req.body;
    const registration = storage.registerToSession(session_id, player_id, character_id);
    res.status(201).json(registration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/registrations', (req, res) => {
  try {
    const { session_id, player_id } = req.body;
    storage.unregisterFromSession(session_id, player_id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ROUTES INVITATIONS ============

app.get('/api/invitations', (req, res) => {
  try {
    const filters = {};
    if (req.query.campaign_id) filters.campaign_id = req.query.campaign_id;
    if (req.query.session_id) filters.session_id = req.query.session_id;
    if (req.query.invited_player) filters.invited_player = req.query.invited_player;
    if (req.query.status) filters.status = req.query.status;
    res.json(storage.getInvitations(filters));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invitations', (req, res) => {
  try {
    const invitation = storage.createInvitation(req.body);
    res.status(201).json(invitation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/invitations/:id/status', (req, res) => {
  try {
    const invitation = storage.updateInvitationStatus(req.params.id, req.body.status);
    res.json(invitation);
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

app.get('/api/campaigns/:id', (req, res) => {
  try {
    const campaign = storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne non trouvee' });
    }
    res.json(campaign);
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

app.put('/api/campaigns/:id', (req, res) => {
  try {
    const campaign = storage.updateCampaign(req.params.id, req.body);
    res.json(campaign);
  } catch (error) {
    res.status(404).json({ error: error.message });
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

// ============ VALIDATION ============

app.post('/api/validate/dm-schedule', (req, res) => {
  try {
    const { dm_id, starts_at, ends_at, exclude_session_id } = req.body;
    const conflict = storage.checkDMScheduleConflict(dm_id, starts_at, ends_at, exclude_session_id);
    res.json({ hasConflict: !!conflict, conflictSession: conflict });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/validate/player-schedule', (req, res) => {
  try {
    const { player_id, starts_at, ends_at, exclude_session_id } = req.body;
    const conflict = storage.checkPlayerScheduleConflict(player_id, starts_at, ends_at, exclude_session_id);
    res.json({ hasConflict: !!conflict, conflictSession: conflict });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DEMO ============

app.post('/api/demo', (req, res) => {
  try {
    storage.createDemoData();
    res.json({ success: true, message: 'Donnees de demo creees' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all pour le SPA (renvoie index.html pour toutes les routes non-API)
if (fs.existsSync(DIST_PATH)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
