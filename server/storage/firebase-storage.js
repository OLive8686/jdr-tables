/**
 * Stockage Firebase Firestore
 * Alternative cloud scalable
 *
 * Configuration requise:
 * 1. Créer un projet Firebase sur https://console.firebase.google.com
 * 2. Activer Firestore Database
 * 3. Copier la configuration dans .env ou directement ici
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';

// Configuration Firebase - À remplacer par vos valeurs
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'VOTRE_API_KEY',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'votre-projet.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'votre-projet',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'votre-projet.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.FIREBASE_APP_ID || '1:123456789:web:abcdef'
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections
const SESSIONS_COLLECTION = 'sessions';
const CAMPAIGNS_COLLECTION = 'campaigns';
const ARCHIVES_COLLECTION = 'archives';

// ============ SESSIONS ============

export const getSessions = async () => {
  const q = query(collection(db, SESSIONS_COLLECTION), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    players: doc.data().players || []
  }));
};

export const createSession = async ({ date, time, gm, campaign, episode, minPlayers, maxPlayers }) => {
  const sessionData = {
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

  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), sessionData);
  return { id: docRef.id, ...sessionData };
};

export const updateSession = async (id, updates) => {
  const docRef = doc(db, SESSIONS_COLLECTION, id);
  await updateDoc(docRef, updates);

  const updated = await getDoc(docRef);
  return { id: updated.id, ...updated.data() };
};

export const deleteSession = async (id) => {
  await deleteDoc(doc(db, SESSIONS_COLLECTION, id));
  return { success: true };
};

export const joinSession = async (sessionId, playerName) => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sessionDoc = await getDoc(docRef);

  if (!sessionDoc.exists()) {
    throw new Error('Session non trouvée');
  }

  const session = sessionDoc.data();
  const players = session.players || [];

  if (players.includes(playerName)) {
    throw new Error('Vous êtes déjà inscrit sur cette session');
  }

  if (players.length >= session.maxPlayers) {
    throw new Error('Table complète');
  }

  // Vérifier inscription sur une autre table le même jour
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('date', '==', session.date)
  );
  const snapshot = await getDocs(q);

  for (const doc of snapshot.docs) {
    if (doc.id !== sessionId) {
      const otherPlayers = doc.data().players || [];
      if (otherPlayers.includes(playerName)) {
        throw new Error('Vous êtes déjà inscrit sur une autre table ce jour-là');
      }
    }
  }

  players.push(playerName);
  await updateDoc(docRef, { players });

  return { id: sessionId, ...session, players };
};

export const leaveSession = async (sessionId, playerName) => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sessionDoc = await getDoc(docRef);

  if (!sessionDoc.exists()) {
    throw new Error('Session non trouvée');
  }

  const session = sessionDoc.data();
  const players = (session.players || []).filter(p => p !== playerName);

  await updateDoc(docRef, { players });

  return { id: sessionId, ...session, players };
};

// ============ CAMPAGNES ============

export const getCampaigns = async () => {
  const q = query(collection(db, CAMPAIGNS_COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createCampaign = async ({ name, gm, description }) => {
  const campaignData = {
    name,
    gm: gm || '',
    description: description || '',
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, CAMPAIGNS_COLLECTION), campaignData);
  return { id: docRef.id, ...campaignData };
};

export const deleteCampaign = async (id) => {
  await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, id));
  return { success: true };
};

// ============ ARCHIVES ============

export const getArchives = async () => {
  const q = query(collection(db, ARCHIVES_COLLECTION), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    players: doc.data().players || []
  }));
};

export const archiveOldSessions = async () => {
  const today = new Date().toISOString().split('T')[0];

  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('date', '<', today)
  );
  const snapshot = await getDocs(q);

  let archivedCount = 0;

  for (const sessionDoc of snapshot.docs) {
    const data = sessionDoc.data();

    // Copier vers archives
    await addDoc(collection(db, ARCHIVES_COLLECTION), {
      ...data,
      originalId: sessionDoc.id
    });

    // Supprimer de sessions
    await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionDoc.id));

    archivedCount++;
  }

  return { success: true, archivedCount };
};

// ============ DÉMO ============

export const createDemoData = async () => {
  // Campagnes
  const campaigns = [
    { name: 'La Malédiction de Strahd', gm: 'Alice', description: 'Campagne D&D 5e dans Ravenloft' },
    { name: "L'Appel de Cthulhu", gm: 'Bob', description: 'Horreur cosmique années 20' },
    { name: 'Chroniques Oubliées', gm: 'Alice', description: 'Fantasy médiévale' }
  ];

  const existingCampaigns = await getCampaigns();
  for (const c of campaigns) {
    if (!existingCampaigns.find(ec => ec.name === c.name)) {
      await createCampaign(c);
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
    await createSession(s);
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
