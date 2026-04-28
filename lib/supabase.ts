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
          location_address: string | null;
          location_latitude: number | null;
          location_longitude: number | null;
          preferences: string[] | null;
          profile_image_url: string | null;
          onboarding_completed: boolean;
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
          location_address?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          preferences?: string[] | null;
          profile_image_url?: string | null;
          onboarding_completed?: boolean;
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
          location_address?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          preferences?: string[] | null;
          profile_image_url?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          clerk_user_id: string;
          cafe_id: string;
          cafe_place_id: string | null;
          cafe_name: string;
          cafe_image: string | null;
          rating: number;
          text: string | null;
          ordered_item: string | null;
          attributes: string[] | null;
          photos: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          cafe_id: string;
          cafe_place_id?: string | null;
          cafe_name: string;
          cafe_image?: string | null;
          rating: number;
          text?: string | null;
          ordered_item?: string | null;
          attributes?: string[] | null;
          photos?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          cafe_id?: string;
          cafe_place_id?: string | null;
          cafe_name?: string;
          cafe_image?: string | null;
          rating?: number;
          text?: string | null;
          ordered_item?: string | null;
          attributes?: string[] | null;
          photos?: string[] | null;
          created_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          clerk_user_id: string;
          cafe_id: string;
          cafe_place_id: string | null;
          cafe_name: string;
          cafe_image: string | null;
          cafe_location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          cafe_id: string;
          cafe_place_id?: string | null;
          cafe_name: string;
          cafe_image?: string | null;
          cafe_location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          cafe_id?: string;
          cafe_place_id?: string | null;
          cafe_name?: string;
          cafe_image?: string | null;
          cafe_location?: string | null;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          clerk_user_id: string;
          cafe_id: string;
          cafe_place_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          cafe_id: string;
          cafe_place_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          cafe_id?: string;
          cafe_place_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
