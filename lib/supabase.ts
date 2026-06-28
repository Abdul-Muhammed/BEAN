import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL-based session detection in a native app (handled via deep links).
    detectSessionInUrl: false,
  },
});

// Keep the session token fresh only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export type Database = {
  public: {
    Tables: {
      cafe_categories: {
        Row: {
          id: string;
          label: string;
          icon_svg_xml: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          label: string;
          icon_svg_xml: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          icon_svg_xml?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
          bio: string | null;
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
          id: string;
          username: string;
          first_name?: string | null;
          last_name?: string | null;
          email: string;
          bio?: string | null;
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
          username?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
          bio?: string | null;
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
          user_id: string;
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
          user_id: string;
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
          user_id?: string;
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
          user_id: string;
          cafe_id: string;
          cafe_place_id: string | null;
          cafe_name: string;
          cafe_image: string | null;
          cafe_location: string | null;
          cafe_rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cafe_id: string;
          cafe_place_id?: string | null;
          cafe_name: string;
          cafe_image?: string | null;
          cafe_location?: string | null;
          cafe_rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cafe_id?: string;
          cafe_place_id?: string | null;
          cafe_name?: string;
          cafe_image?: string | null;
          cafe_location?: string | null;
          cafe_rating?: number | null;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          cafe_id: string;
          cafe_place_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cafe_id: string;
          cafe_place_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cafe_id?: string;
          cafe_place_id?: string | null;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
    };
  };
};
