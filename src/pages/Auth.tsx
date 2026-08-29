import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { ArrowRight, Loader2, Mail, Lock, User } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const {
    isLoading: authLoading,
    isAuthenticated,
    isGuest,
    signIn,
    signUp,
    continueAsGuest,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only auto-redirect for real Supabase sessions, not guest mode.
    // Guest users should see the auth page and explicitly choose Continue as Guest.
    if (!authLoading && isAuthenticated && !isGuest) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, isGuest, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
          setIsLoading(false);
          return;
        }
        navigate(redirect);
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(
            error.message.includes("Invalid login credentials")
              ? "Invalid email or password. Please try again."
              : error.message,
          );
          setIsLoading(false);
          return;
        }
        navigate(redirect);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate(redirect);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col">
          <Card className="min-w-[350px] pb-0 border-2 border-border shadow-[4px_4px_0px_0px] shadow-foreground/10">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="ProofChain Logo"
                  width={64}
                  height={64}
                  className="rounded-lg mb-4 mt-4 cursor-pointer"
                  onClick={() => navigate("/")}
                />
              </div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">
                ProofChain
              </CardTitle>
              <CardDescription>
                {mode === "signin"
                  ? "Sign in to your account"
                  : "Create a new account"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-9 border-2 border-border"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9 border-2 border-border"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-red-500 font-medium">{error}</p>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "signin" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {mode === "signin" ? "Sign In" : "Create Account"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleMode}
                  disabled={isLoading}
                  className="w-full text-sm"
                >
                  {mode === "signin"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </Button>
                <div className="relative w-full my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-bold tracking-wider">
                      or
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGuest}
                  disabled={isLoading}
                  className="w-full border-2 border-border shadow-[3px_3px_0px_0px] shadow-foreground/10 hover:bg-muted"
                >
                  <User className="mr-2 h-4 w-4" />
                  Continue as Guest
                </Button>
              </CardFooter>
            </form>
            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t-2 border-border rounded-b-lg">
              Internal tool — digital document integrity analysis
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
