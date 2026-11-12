// Configuration lue au moment de la construction du site (variables VITE_*).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_CLE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
/** Adresse des edge functions (à changer seulement pour les essais locaux). */
export const FONCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${SUPABASE_URL}/functions/v1`;

/** Sans Supabase configuré, le jeu tourne en mode local. On peut aussi forcer le mode local avec ?local dans l'adresse. */
export const MODE_LOCAL = !SUPABASE_URL || !SUPABASE_CLE || new URLSearchParams(location.search).has('local');
