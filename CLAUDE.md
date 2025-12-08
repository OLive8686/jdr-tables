# Tables de JDR - Application de gestion de sessions

## Overview
Application web React + Node.js pour gérer des tables de jeux de rôle partageable en ligne.

## Stack technique
- **Frontend** : React 18 + Vite + Tailwind CSS + Lucide React
- **Backend** : Node.js + Express
- **Base de données** : SQLite (défaut), JSON, ou Firebase
- **Déploiement** : Render, Railway, Vercel, Netlify

## Structure du projet
```
/
├── src/                      # Frontend React
│   ├── components/           # Composants UI
│   ├── context/             # AuthContext
│   ├── hooks/               # useData hook
│   ├── services/            # API client
│   ├── App.jsx
│   └── main.jsx
├── server/                   # Backend Express
│   ├── index.js             # Serveur SQLite
│   ├── index-json.js        # Serveur JSON
│   └── storage/             # Modules de stockage
├── package.json
├── vite.config.js
└── GUIDE-INSTALLATION.md
```

## Scripts
```bash
npm install      # Installer les dépendances
npm start        # Frontend + Backend
npm run dev      # Frontend seul
npm run server   # Backend seul
npm run build    # Build production
```

## Conventions de code

### React
- Utiliser les hooks (useState, useEffect)
- État principal dans le composant App
- Composants : SessionCard, Modal, Header
- localStorage pour mémoriser le nom utilisateur (`rpg_username`)

### Tailwind CSS - Palette
- Primary (violet) : `bg-purple-600` (#9333EA)
- Secondary (bleu) : `bg-blue-600` (#2563EB)
- Success (vert) : `bg-green-600` (#16A34A)
- Danger (rouge) : `bg-red-600` (#DC2626)
- Gradients login : `from-purple-900 via-blue-900 to-indigo-900`
- Gradients app : `from-purple-50 via-blue-50 to-indigo-50`

### Base de données - Structure
**sessions** : id, date, time, gm, campaign, episode, minPlayers, maxPlayers, players, createdAt
**campaigns** : id, name, gm, description, createdAt
**archives** : même structure que sessions

### API REST (Express)
**Sessions** :
- `GET /api/sessions` - Liste des sessions
- `POST /api/sessions` - Créer une session
- `PUT /api/sessions/:id` - Modifier une session
- `DELETE /api/sessions/:id` - Supprimer une session
- `POST /api/sessions/:id/join` - Rejoindre une session
- `POST /api/sessions/:id/leave` - Quitter une session

**Campagnes** :
- `GET /api/campaigns` - Liste des campagnes
- `POST /api/campaigns` - Créer une campagne

**Archives** :
- `GET /api/archives` - Liste des archives
- `POST /api/archives/archive-old` - Archiver les sessions passées

## Règles métier importantes
1. **Un joueur = une seule table par date** (contrainte principale)
2. Sessions limitées par min/max joueurs (défaut 3-5)
3. Archivage automatique des sessions passées
4. Deux rôles : Joueurs (inscription) et MJ (création/gestion)
5. Actualisation auto toutes les 30 secondes

## Contraintes
- Mobile-first, responsive
- Code lisible et commenté
- Validation côté serveur (Express)
- Pas d'authentification forte (groupe de confiance)

## Options de stockage
1. **SQLite** (défaut) - Simple, fichier unique
2. **JSON** - Ultra-simple, fichiers lisibles
3. **Firebase** - Cloud, temps réel, scalable
4. **Supabase** - PostgreSQL gratuit

## Options d'hébergement
- **Gratuit** : Render, Fly.io, Netlify + Firebase
- **Payant (~$5/mois)** : Railway, DigitalOcean, VPS
