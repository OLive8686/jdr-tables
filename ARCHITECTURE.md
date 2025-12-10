# Architecture de l'Application Tables de JDR

## Vue d'ensemble

Application web de gestion de tables de jeux de role, permettant aux MJ (Maitres du Jeu) de creer des sessions et aux joueurs de s'y inscrire.

**Stack technique :**
- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + API REST automatique)
- **Hebergement** : Render (frontend statique)

---

## Structure des dossiers

```
jdr-tables/
├── src/                          # Code source React
│   ├── components/               # Composants UI
│   ├── context/                  # Contextes React (Auth)
│   ├── hooks/                    # Hooks personnalises
│   ├── lib/                      # Bibliotheques et API
│   ├── App.jsx                   # Composant principal
│   └── main.jsx                  # Point d'entree
├── public/                       # Assets statiques
├── dist/                         # Build de production (genere)
├── CLAUDE.md                     # Instructions pour Claude Code
├── ARCHITECTURE.md               # Ce fichier
└── package.json                  # Dependances npm
```

---

## Composants (`src/components/`)

### Composants principaux

| Fichier | Description |
|---------|-------------|
| `Header.jsx` | Barre de navigation avec boutons (Archives, Corbeille, Vue, Deconnexion) |
| `SessionCard.jsx` | Carte d'une session avec toutes ses infos et actions |
| `SessionForm.jsx` | Formulaire de creation/modification de session |
| `SessionList.jsx` | Contient `ListView`, `CalendarView`, et `EmptyState` |
| `CampaignForm.jsx` | Formulaire de creation de campagne |
| `LoginPage.jsx` | Page de connexion OAuth (Google/Discord) |
| `AuthCallback.jsx` | Gestion du callback OAuth apres connexion |
| `Modal.jsx` | Composant modal reutilisable |
| `TriggerWarningDisplay.jsx` | Affichage et selection des trigger warnings |
| `AdminPanel.jsx` | Panel d'administration (si implemente) |

### Export centralise (`index.js`)

Tous les composants sont re-exportes depuis `src/components/index.js` pour simplifier les imports :

```javascript
import { Header, SessionCard, Modal } from './components';
```

---

## Contexte d'authentification (`src/context/`)

### `AuthContext.jsx`

Gere l'etat d'authentification de l'utilisateur.

**Donnees exposees :**
- `user` / `currentUser` : Objet utilisateur Supabase
- `loading` : Etat de chargement
- `isAuthenticated` : Boolean
- `displayName` : Nom affiche
- `avatarUrl` : URL de l'avatar
- `email` : Email

**Fonctions exposees :**
- `signInWithDiscord()` : Connexion via Discord
- `signInWithGoogle()` : Connexion via Google
- `signOut()` : Deconnexion

**Usage :**
```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { currentUser, displayName, signOut } = useAuth();
  // ...
};
```

---

## Hook de donnees (`src/hooks/`)

### `useData.js`

Hook principal pour toutes les operations CRUD sur les sessions et campagnes.

**Donnees retournees :**
| Propriete | Description |
|-----------|-------------|
| `sessions` | Sessions actives (futures, non supprimees) |
| `archives` | Sessions passees ou terminees |
| `deletedSessions` | Sessions dans la corbeille (de l'utilisateur connecte) |
| `campaigns` | Liste des campagnes |
| `loading` | Etat de chargement |
| `error` | Message d'erreur |

**Fonctions retournees :**
| Fonction | Description |
|----------|-------------|
| `loadData()` | Recharge toutes les donnees |
| `createSession(data)` | Cree une nouvelle session |
| `updateSession(id, data)` | Modifie une session |
| `deleteSession(id)` | Supprime une session (soft delete -> corbeille) |
| `restoreSession(id)` | Restaure une session depuis la corbeille |
| `permanentlyDeleteSession(id)` | Supprime definitivement |
| `duplicateSession(session)` | Duplique une session (dans 7 jours) |
| `joinSession(id)` | S'inscrire a une session |
| `leaveSession(id)` | Se desinscrire |
| `createCampaign(data)` | Cree une campagne |
| `archiveOldSessions()` | Archive les sessions passees |

**Usage :**
```javascript
import { useData } from '../hooks/useData';

const MyComponent = () => {
  const { sessions, createSession, loading } = useData();
  // ...
};
```

---

## API Supabase (`src/lib/`)

### `supabase.js`

Contient toutes les fonctions d'acces a la base de donnees Supabase.

**Modules exportes :**

#### `auth`
- `getUser()` : Utilisateur courant
- `getSession()` : Session courante
- `signInWithOAuth(provider)` : Connexion OAuth
- `signOut()` : Deconnexion
- `onAuthStateChange(callback)` : Ecoute des changements d'auth

#### `profiles`
- `getCurrentProfile()` : Profil de l'utilisateur connecte
- `getById(id)` : Profil par ID
- `getAll()` : Tous les profils
- `update(id, data)` : Modifier un profil
- `delete(id)` : Supprimer un profil
- `setRole(id, role)` : Changer le role

#### `campaigns`
- `getAll()` : Toutes les campagnes
- `getById(id)` : Campagne par ID
- `create(data)` : Creer
- `update(id, data)` : Modifier
- `delete(id)` : Supprimer

#### `sessions`
- `getAll()` : Toutes les sessions (non supprimees)
- `getDeleted()` : Sessions supprimees de l'utilisateur
- `getAvailable()` : Sessions disponibles (vue)
- `getById(id)` : Session par ID
- `create(data)` : Creer
- `update(id, data)` : Modifier
- `delete(id)` : Supprimer (hard delete)
- `softDelete(id)` : Mettre a la corbeille
- `restore(id)` : Restaurer
- `permanentDelete(id)` : Supprimer definitivement

#### `registrations`
- `register(sessionId)` : S'inscrire
- `registerPlayer(sessionId, playerId)` : Inscrire un joueur (MJ)
- `unregister(sessionId)` : Se desinscrire
- `getBySession(sessionId)` : Inscriptions d'une session
- `getByPlayer(playerId)` : Inscriptions d'un joueur

#### `invitations`
- `create(data)` : Creer une invitation
- `respond(id, status)` : Repondre
- `getMyInvitations()` : Mes invitations

#### `logEvent(type, entityType, entityId, details)`
Fonction utilitaire pour logger les evenements.

---

## Composant principal (`src/App.jsx`)

### Etats geres

```javascript
const [viewMode, setViewMode] = useState('list');      // 'list' ou 'calendar'
const [showArchive, setShowArchive] = useState(false); // Afficher les archives
const [showDeleted, setShowDeleted] = useState(false); // Afficher la corbeille
const [showCreateSession, setShowCreateSession] = useState(false);
const [showCreateCampaign, setShowCreateCampaign] = useState(false);
const [editingSession, setEditingSession] = useState(null);
```

### Flux de donnees

```
App.jsx
  ├── useAuth() → Authentification
  ├── useData() → Donnees et actions
  │
  ├── Header
  │     └── Boutons de navigation et actions
  │
  ├── ListView / CalendarView
  │     └── SessionCard (pour chaque session)
  │           └── Actions: Join/Leave/Edit/Delete/Duplicate
  │
  └── Modals
        ├── SessionForm (creation/edition)
        └── CampaignForm (creation)
```

---

## Base de donnees Supabase

### Tables principales

#### `profiles`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID utilisateur (lie a auth.users) |
| display_name | TEXT | Nom affiche |
| avatar_url | TEXT | URL avatar |
| email | TEXT | Email |
| role | TEXT | Role (player/gm/admin) |
| created_at | TIMESTAMP | Date creation |
| updated_at | TIMESTAMP | Date modification |

#### `campaigns`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique |
| name | TEXT | Nom de la campagne |
| description | TEXT | Description |
| system | TEXT | Systeme de jeu |
| gm_id | UUID | ID du MJ (ref profiles) |
| trigger_warnings | TEXT[] | Avertissements |
| created_at | TIMESTAMP | Date creation |

#### `sessions`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique |
| title | TEXT | Titre |
| description | TEXT | Description |
| game_type | TEXT | 'oneshot' ou 'campaign' |
| system | TEXT | Systeme de jeu |
| campaign_id | UUID | Campagne (si type=campaign) |
| session_number | INT | Numero d'episode |
| dm_id | UUID | ID du MJ |
| starts_at | TIMESTAMP | Date/heure debut |
| min_players | INT | Minimum joueurs |
| max_players | INT | Maximum joueurs |
| status | ENUM | scheduled/completed/cancelled |
| external_url | TEXT | Lien externe (Discord, Roll20...) |
| trigger_warnings | TEXT[] | Avertissements |
| deleted_at | TIMESTAMP | Date suppression (soft delete) |
| created_at | TIMESTAMP | Date creation |
| updated_at | TIMESTAMP | Date modification |

#### `session_registrations`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique |
| session_id | UUID | Ref session |
| player_id | UUID | Ref joueur |
| status | TEXT | confirmed/pending/cancelled |
| created_at | TIMESTAMP | Date inscription |

### Vues

#### `available_sessions`
Vue des sessions disponibles avec joueurs comptes et places restantes.

### Triggers

#### `handle_new_user()`
Cree automatiquement un profil quand un utilisateur s'inscrit.

#### `check_dm_schedule_conflict()`
Empeche un MJ d'avoir deux sessions au meme moment.

### Politiques RLS (Row Level Security)

- **Sessions** : Lecture publique, modification/suppression par le MJ uniquement
- **Campaigns** : Lecture publique, modification/suppression par le GM uniquement
- **Registrations** : Lecture publique, inscription/desinscription par le joueur ou le MJ

---

## Variables d'environnement

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm install` | Installer les dependances |
| `npm run dev` | Lancer en developpement (port 5173) |
| `npm run build` | Build de production |
| `npm run preview` | Preview du build |
| `npm start` | Alias pour dev |

---

## Deploiement

### Render (actuel)

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Variables d'environnement a configurer dans Render

### Workflow

1. Modifier le code localement
2. `npm run build` pour verifier
3. `git add -A && git commit -m "message" && git push`
4. Render detecte le push et redeploi automatiquement

---

## Fonctionnalites principales

### Pour les joueurs
- S'inscrire/se desinscrire aux sessions
- Voir les sessions disponibles et archives
- Vue liste ou calendrier

### Pour les MJ
- Creer des sessions (one-shot ou campagne)
- Creer des campagnes
- Modifier/supprimer ses sessions
- Pre-inscrire des joueurs
- Dupliquer une session
- Corbeille avec restauration

### Systeme
- Authentification OAuth (Google, Discord)
- Soft delete avec corbeille
- Trigger warnings
- Liens externes (Discord, Roll20, Foundry...)
- Actualisation automatique toutes les 30 secondes
