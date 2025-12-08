# Guide d'installation - Tables de JDR

Application React + Node.js pour gérer des tables de jeux de rôle.

---

## Installation rapide (Développement local)

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer l'application (frontend + backend)
npm start

# 3. Ouvrir http://localhost:3000
```

Pour créer des données de démo :
```bash
curl -X POST http://localhost:3001/api/demo
```

---

## Structure du projet

```
jdr-tables/
├── src/                    # Frontend React
│   ├── components/         # Composants UI
│   ├── context/           # Context React (Auth)
│   ├── hooks/             # Hooks personnalisés
│   ├── services/          # API client
│   ├── App.jsx
│   └── main.jsx
├── server/                 # Backend Node.js
│   ├── index.js           # Serveur SQLite (défaut)
│   ├── index-json.js      # Serveur JSON (alternative)
│   └── storage/           # Modules de stockage
│       ├── json-storage.js
│       └── firebase-storage.js
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Options de stockage

### Option 1 : SQLite (Défaut - Recommandé)

**Avantages** : Simple, performant, fichier unique, pas de configuration

```bash
# Utilise server/index.js par défaut
npm run server
```

Base de données créée automatiquement dans `server/jdr-tables.db`

### Option 2 : JSON Files (Ultra-simple)

**Avantages** : Pas de dépendance base de données, fichiers lisibles

```bash
# Modifier package.json pour utiliser index-json.js
node server/index-json.js
```

Données stockées dans `server/data/*.json`

### Option 3 : Firebase Firestore (Cloud)

**Avantages** : Temps réel, scalable, hébergé, gratuit jusqu'à 50k lectures/jour

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activer Firestore Database
3. Copier la configuration dans `.env` :
```env
FIREBASE_API_KEY=xxx
FIREBASE_PROJECT_ID=votre-projet
# etc.
```
4. Modifier le serveur pour utiliser `firebase-storage.js`

### Option 4 : Supabase (PostgreSQL)

**Avantages** : PostgreSQL gratuit, API REST auto-générée, dashboard admin

1. Créer un compte sur [Supabase](https://supabase.com)
2. Créer les tables via le dashboard
3. Utiliser l'API REST générée automatiquement

### Option 5 : MongoDB Atlas (Cloud)

**Avantages** : NoSQL flexible, gratuit 512MB

1. Créer un cluster sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Installer `mongoose` : `npm install mongoose`
3. Adapter le code serveur

---

## Comparatif des solutions de stockage

| Solution | Coût | Setup | Performance | Scalabilité | Offline |
|----------|------|-------|-------------|-------------|---------|
| **SQLite** | Gratuit | Aucun | Excellente | Faible | Oui |
| **JSON** | Gratuit | Aucun | Bonne | Faible | Oui |
| **Firebase** | Gratuit* | Moyen | Bonne | Haute | Non |
| **Supabase** | Gratuit* | Moyen | Excellente | Haute | Non |
| **MongoDB** | Gratuit* | Moyen | Bonne | Haute | Non |

*Gratuit avec limites

**Recommandation** :
- Groupe < 20 personnes : **SQLite** ou **JSON**
- Groupe > 20 personnes ou multi-serveur : **Firebase** ou **Supabase**

---

## Déploiement en production

### Frontend uniquement (Statique)

Si vous utilisez une base de données cloud (Firebase, Supabase), vous pouvez déployer seulement le frontend :

```bash
# Build le frontend
npm run build

# Le dossier dist/ contient les fichiers statiques
```

#### Netlify (Gratuit)

1. Créer un compte sur [Netlify](https://netlify.com)
2. Drag & drop le dossier `dist/`
3. Configurer les variables d'environnement si nécessaire

#### Vercel (Gratuit)

```bash
npm install -g vercel
vercel
```

#### GitHub Pages (Gratuit)

1. Push sur GitHub
2. Settings > Pages > Source: GitHub Actions
3. Utiliser le workflow Vite

### Frontend + Backend (Full-stack)

#### Railway (Simple, ~$5/mois)

1. Créer un compte sur [Railway](https://railway.app)
2. Connecter votre repo GitHub
3. Railway détecte automatiquement Node.js
4. Variables d'environnement : `PORT=3001`

#### Render (Gratuit avec limitations)

1. Créer un compte sur [Render](https://render.com)
2. New > Web Service
3. Connecter le repo GitHub
4. Build Command: `npm install`
5. Start Command: `npm run server`

#### DigitalOcean App Platform (~$5/mois)

1. Créer une App
2. Source: GitHub
3. Configurer le build et le run

#### Fly.io (Gratuit avec limitations)

```bash
# Installer flyctl
curl -L https://fly.io/install.sh | sh

# Déployer
fly launch
fly deploy
```

#### VPS (Scaleway, OVH, Hetzner) (~$3-5/mois)

```bash
# Sur le serveur
git clone <votre-repo>
cd jdr-tables
npm install
npm run build

# Avec PM2 pour la production
npm install -g pm2
pm2 start server/index.js --name jdr-tables
pm2 save
pm2 startup
```

Configurer Nginx comme reverse proxy :
```nginx
server {
    listen 80;
    server_name votredomaine.com;

    location / {
        root /var/www/jdr-tables/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Comparatif des hébergements

| Service | Frontend | Backend | BDD | Prix | Difficulté |
|---------|----------|---------|-----|------|------------|
| **Netlify + Firebase** | Oui | Non | Cloud | Gratuit | Facile |
| **Vercel + Supabase** | Oui | Non | Cloud | Gratuit | Facile |
| **Railway** | Oui | Oui | SQLite | ~$5/mois | Facile |
| **Render** | Oui | Oui | SQLite | Gratuit* | Facile |
| **Fly.io** | Oui | Oui | SQLite | Gratuit* | Moyen |
| **VPS** | Oui | Oui | SQLite | ~$3-5/mois | Avancé |

*Avec limitations (cold starts, etc.)

---

## Configuration pour la production

### Variables d'environnement

```env
# Frontend (.env.production)
VITE_API_URL=https://votre-api.com/api

# Backend
PORT=3001
NODE_ENV=production
```

### Build de production

```bash
# Frontend
npm run build

# Servir le build
npm run preview
```

### HTTPS

Pour la production, utilisez toujours HTTPS :
- Services cloud (Netlify, Vercel, Railway) : HTTPS automatique
- VPS : Utilisez Let's Encrypt avec Certbot

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le frontend (Vite) |
| `npm run server` | Démarre le backend (Express) |
| `npm start` | Démarre frontend + backend |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualise le build |

---

## Recommandation finale

**Pour commencer rapidement** :
1. SQLite (défaut) pour le stockage
2. Railway ou Render pour l'hébergement

**Pour le long terme avec un groupe actif** :
1. Firebase ou Supabase pour le stockage
2. Vercel ou Netlify pour le frontend

**Budget ~$0** :
1. JSON storage ou SQLite
2. Render (free tier) ou Fly.io
