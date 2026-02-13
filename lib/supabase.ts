import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          username: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          location: string | null;
          preferences: string[] | null;
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          username: string;
          first_name?: string | null;
          last_name?: string | null;
          email: string;
          location?: string | null;
          preferences?: string[] | null;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          username?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
          location?: string | null;
          preferences?: string[] | null;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
