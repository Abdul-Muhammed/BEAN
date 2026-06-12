import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True once the initial session has been resolved. */
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Resolve the persisted session on startup. A stale/revoked refresh token
    // left in storage (e.g. from before the Supabase Auth cutover) makes the
    // client fail to refresh — clear it so we boot cleanly to the signed-out
    // state instead of surfacing an unhandled AuthApiError.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          supabase.auth.signOut().catch(() => {});
          setSession(null);
        } else {
          setSession(data.session);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setSession(null);
        setIsLoaded(true);
      });

    // Keep state in sync with sign-in / sign-out / token refresh events.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoaded(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoaded,
        isSignedIn: !!session?.user,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
