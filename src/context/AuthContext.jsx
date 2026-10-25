import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

// The app JWT is held in memory only (not localStorage), so it is cleared on page refresh.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const signIn = useCallback((token, user) => setSession({ token, user }), []);
  const signOut = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      signIn,
      signOut,
    }),
    [session, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
