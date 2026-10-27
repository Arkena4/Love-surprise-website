import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  canClaimAdmin: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  claimAdmin: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    canClaimAdmin: false,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session) {
        checkAdmin(session.user.id).then(async (isAdmin) => {
          const canClaimAdmin = !isAdmin && await checkCanClaimAdmin();
          setState({ user: session.user, session, isAdmin, canClaimAdmin, loading: false });
        });
      } else {
        setState({ user: null, session: null, isAdmin: false, canClaimAdmin: false, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session) {
          const isAdmin = await checkAdmin(session.user.id);
          const canClaimAdmin = !isAdmin && await checkCanClaimAdmin();
          setState({ user: session.user, session, isAdmin, canClaimAdmin, loading: false });
        } else {
          setState({ user: null, session: null, isAdmin: false, canClaimAdmin: false, loading: false });
        }
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: mapAuthError(error.message) };
    // create profile row
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await supabase.from('profiles').upsert({
        id: sessionData.session.user.id,
        email,
        role: 'customer',
      });
    }
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mapAuthError(error.message) };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const claimAdmin = useCallback(async () => {
    const { data, error } = await supabase.rpc('claim_initial_admin');
    if (error || !data) return false;
    setState((s) => ({ ...s, isAdmin: true, canClaimAdmin: false }));
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, claimAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

async function checkAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

async function checkCanClaimAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('can_claim_initial_admin');
  return data === true;
}

function mapAuthError(msg: string): string {
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'That email is already registered. Try signing in instead.';
  }
  if (msg.includes('Invalid login')) {
    return 'Incorrect email or password.';
  }
  return 'Something went wrong. Please try again.';
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
