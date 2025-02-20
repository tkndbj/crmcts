"use client"; // Important for Next.js App Router

import React, { createContext, useEffect, useState, useContext } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseClient";

type AuthContextProps = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
});

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up onAuthStateChanged subscription...");
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Simple hook to access the AuthContext values
export function useAuth() {
  return useContext(AuthContext);
}
