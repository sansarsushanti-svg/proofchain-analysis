import { useAuth as useSupabaseAuth } from "@/contexts/AuthContext";

export function useAuth() {
  const { user, isLoading, isAuthenticated, signIn, signOut, signUp } =
    useSupabaseAuth();

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
    signUp,
  };
}
