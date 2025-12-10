import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// AUTH FUNCTIONS
// =============================================

export const auth = {
  // Get current user
  getUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign in with OAuth (Google or Discord)
  signInWithOAuth: async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// =============================================
// PROFILES FUNCTIONS
// =============================================

export const profiles = {
  // Get current user profile
  getCurrentProfile: async () => {
    const user = await auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get profile by ID
  getById: async (id) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get all profiles
  getAll: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('display_name');

    if (error) throw error;
    return data;
  },

  // Update profile
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete profile (admin only)
  delete: async (id) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Set user role (admin only)
  setRole: async (id, role) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =============================================
// CAMPAIGNS FUNCTIONS
// =============================================

export const campaigns = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        gm:profiles!gm_id(id, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        gm:profiles!gm_id(id, display_name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (campaign) => {
    const user = await auth.getUser();
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ ...campaign, gm_id: user.id })
      .select()
      .single();

    if (error) throw error;

    // Log event
    await logEvent('campaign_created', 'campaign', data.id, { name: data.name });

    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logEvent('campaign_updated', 'campaign', id, updates);

    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logEvent('campaign_deleted', 'campaign', id);
  }
};

// =============================================
// SESSIONS FUNCTIONS
// =============================================

export const sessions = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        dm:profiles!dm_id(id, display_name, avatar_url),
        campaign:campaigns(id, name),
        registrations:session_registrations(
          id,
          status,
          player:profiles!player_id(id, display_name, avatar_url)
        )
      `)
      .is('deleted_at', null)
      .order('starts_at', { ascending: true });

    if (error) throw error;

    // Add computed fields
    return data.map(s => ({
      ...s,
      current_players: s.registrations?.filter(r => r.status === 'confirmed').length || 0,
      available_slots: s.max_players - (s.registrations?.filter(r => r.status === 'confirmed').length || 0),
      players: s.registrations?.filter(r => r.status === 'confirmed').map(r => r.player.display_name) || []
    }));
  },

  getDeleted: async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        dm:profiles!dm_id(id, display_name, avatar_url),
        campaign:campaigns(id, name)
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  getAvailable: async () => {
    const { data, error } = await supabase
      .from('available_sessions')
      .select('*');

    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        dm:profiles!dm_id(id, display_name, avatar_url),
        campaign:campaigns(id, name),
        registrations:session_registrations(
          id,
          status,
          player:profiles!player_id(id, display_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  create: async (session) => {
    const user = await auth.getUser();
    const { data, error } = await supabase
      .from('sessions')
      .insert({ ...session, dm_id: user.id })
      .select()
      .single();

    if (error) throw error;

    await logEvent('session_created', 'session', data.id, { title: data.title, game_type: data.game_type });

    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logEvent('session_updated', 'session', id, updates);

    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logEvent('session_deleted', 'session', id);
  },

  softDelete: async (id) => {
    const { data, error } = await supabase
      .from('sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logEvent('session_soft_deleted', 'session', id);
    return data;
  },

  restore: async (id) => {
    const { data, error } = await supabase
      .from('sessions')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logEvent('session_restored', 'session', id);
    return data;
  },

  permanentDelete: async (id) => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logEvent('session_permanently_deleted', 'session', id);
  }
};

// =============================================
// REGISTRATIONS FUNCTIONS
// =============================================

export const registrations = {
  register: async (sessionId) => {
    const user = await auth.getUser();
    const { data, error } = await supabase
      .from('session_registrations')
      .insert({ session_id: sessionId, player_id: user.id })
      .select()
      .single();

    if (error) throw error;

    await logEvent('registration_created', 'registration', data.id, { session_id: sessionId });

    return data;
  },

  // MJ peut inscrire un autre joueur
  registerPlayer: async (sessionId, playerId) => {
    const { data, error } = await supabase
      .from('session_registrations')
      .insert({ session_id: sessionId, player_id: playerId, status: 'confirmed' })
      .select()
      .single();

    if (error) throw error;

    await logEvent('player_preregistered', 'registration', data.id, { session_id: sessionId, player_id: playerId });

    return data;
  },

  unregister: async (sessionId) => {
    const user = await auth.getUser();
    const { error } = await supabase
      .from('session_registrations')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', user.id);

    if (error) throw error;

    await logEvent('registration_cancelled', 'session', sessionId);
  },

  getBySession: async (sessionId) => {
    const { data, error } = await supabase
      .from('session_registrations')
      .select(`
        *,
        player:profiles!player_id(id, display_name, avatar_url)
      `)
      .eq('session_id', sessionId);

    if (error) throw error;
    return data;
  },

  getByPlayer: async (playerId) => {
    const { data, error } = await supabase
      .from('session_registrations')
      .select(`
        *,
        session:sessions(*)
      `)
      .eq('player_id', playerId);

    if (error) throw error;
    return data;
  }
};

// =============================================
// INVITATIONS FUNCTIONS
// =============================================

export const invitations = {
  create: async (invitation) => {
    const user = await auth.getUser();
    const { data, error } = await supabase
      .from('player_invitations')
      .insert({ ...invitation, invited_by: user.id })
      .select()
      .single();

    if (error) throw error;

    await logEvent('invitation_sent', 'invitation', data.id, { invited_player: invitation.invited_player });

    return data;
  },

  respond: async (id, status) => {
    const { data, error } = await supabase
      .from('player_invitations')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logEvent('invitation_responded', 'invitation', id, { status });

    // If accepted and it's a session invitation, auto-register
    if (status === 'accepted' && data.session_id) {
      try {
        await registrations.register(data.session_id);
      } catch (e) {
        console.warn('Auto-registration failed:', e.message);
      }
    }

    return data;
  },

  getMyInvitations: async () => {
    const user = await auth.getUser();
    const { data, error } = await supabase
      .from('player_invitations')
      .select(`
        *,
        inviter:profiles!invited_by(id, display_name, avatar_url),
        campaign:campaigns(id, name),
        session:sessions(id, title, starts_at)
      `)
      .eq('invited_player', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// =============================================
// EVENT LOGS FUNCTIONS
// =============================================

export const logEvent = async (eventType, entityType = null, entityId = null, details = {}) => {
  try {
    const user = await auth.getUser();
    await supabase
      .from('event_logs')
      .insert({
        user_id: user?.id,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        details
      });
  } catch (e) {
    console.warn('Failed to log event:', e.message);
  }
};

export const eventLogs = {
  getAll: async (filters = {}) => {
    let query = supabase
      .from('event_logs')
      .select(`
        *,
        user:profiles!user_id(id, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

export default supabase;
