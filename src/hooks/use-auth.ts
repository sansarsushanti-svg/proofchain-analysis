import { useAuth as useSupabaseAuth } from "@/contexts/AuthContext";

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    isGuest,
    signIn,
    signOut,
    signUp,
    continueAsGuest,
  } = useSupabaseAuth();

  return {
    isLoading,
    isAuthenticated,
    isGuest,
    user,
    signIn,
    signOut,
    signUp,
    continueAsGuest,
  };
}
