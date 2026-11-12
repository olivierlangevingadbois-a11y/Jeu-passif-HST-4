// Configuration lue au moment de la construction du site (variables VITE_*).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_CLE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

/** Sans Supabase configuré, le jeu tourne en mode local. On peut aussi forcer le mode local avec ?local dans l'adresse. */
export const MODE_LOCAL = !SUPABASE_URL || !SUPABASE_CLE || new URLSearchParams(location.search).has('local');
