
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SlideData } from '../types';

let supabaseClient: SupabaseClient | null = null;

export const configureSupabase = (url: string, key: string) => {
  if (url && key) {
    supabaseClient = createClient(url, key);
    localStorage.setItem('lumina_supabase_url', url);
    localStorage.setItem('lumina_supabase_key', key);
    return true;
  }
  return false;
};

// Auto-init from localStorage or env
const savedUrl = localStorage.getItem('lumina_supabase_url') || process.env.SUPABASE_URL;
const savedKey = localStorage.getItem('lumina_supabase_key') || process.env.SUPABASE_ANON_KEY;
if (savedUrl && savedKey) {
  supabaseClient = createClient(savedUrl, savedKey);
}

export const isSupabaseConfigured = () => !!supabaseClient;

export const uploadMedia = async (bucket: string, path: string, base64OrBlob: string | Blob): Promise<string | null> => {
  if (!supabaseClient) {
    console.warn('Supabase not configured. Skipping upload.');
    return null;
  }
  
  let body: Blob;
  if (typeof base64OrBlob === 'string') {
    const res = await fetch(base64OrBlob);
    body = await res.blob();
  } else {
    body = base64OrBlob;
  }

  try {
    const { data, error } = await supabaseClient.storage.from(bucket).upload(path, body, {
      upsert: true,
      contentType: body.type
    });

    if (error) {
      console.error('Supabase Upload Error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  } catch (e) {
    console.error('Supabase exception:', e);
    return null;
  }
};

export const logTask = async (taskId: string, status: string, payload: any) => {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('lumina_tasks').upsert({ 
            id: taskId, 
            status, 
            last_payload: payload, 
            updated_at: new Date().toISOString() 
        });
    } catch (e) {
        console.error('Logging failed:', e);
    }
};

export const persistDeck = async (slides: SlideData[]) => {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient.from('lumina_decks').upsert({ 
            id: 'current_project', 
            slides, 
            updated_at: new Date().toISOString() 
        });
        if (error) console.error('Persist Error:', error);
    } catch (e) {
        console.error('Persistence failed:', e);
    }
};
