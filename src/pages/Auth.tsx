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
import { ArrowRight, Loader2, Mail, Lock, User, ArrowLeft } from "lucide-react";
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
    resetPassword,
    continueAsGuest,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

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
      } else if (mode === "signin") {
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
      } else if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
          setIsLoading(false);
          return;
        }
        setResetSent(true);
        setIsLoading(false);
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
    setResetSent(false);
  };

  const handleGuest = () => {
    continueAsGuest();
    navigate(redirect);
  };

  // ── Forgot password sent confirmation ──
  if (mode === "forgot" && resetSent) {
    return (
      <div className="min-h-screen flex flex-col">
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
                    className="rounded-lg mb-4 mt-4"
                  />
                </div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">
                  Check Your Email
                </CardTitle>
                <CardDescription>
                  We sent a password reset link to:
                </CardDescription>
                <p className="text-sm font-bold text-foreground">{email}</p>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to set a new password.
                  If you don't see it, check your spam folder.
                </p>
              </CardContent>
              <CardFooter className="flex-col gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setMode("signin");
                    setResetSent(false);
                    setError(null);
                  }}
                  className="w-full text-sm"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </CardFooter>
              <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t-2 border-border rounded-b-lg">
                Internal tool — digital document integrity analysis
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isSignIn = mode === "signin";

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
                  : mode === "signup"
                    ? "Create a new account"
                    : "Reset your password"}
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

                {/* Password field: shown for sign-in and sign-up, hidden for forgot */}
                {mode !== "forgot" && (
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
                )}

                {/* Forgot password link — only on sign-in mode */}
                {isSignIn && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                      className="text-xs font-bold text-primary hover:text-primary/80 underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {mode === "forgot" && (
                  <p className="text-xs text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                )}

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
                      {mode === "signin"
                        ? "Signing in..."
                        : mode === "signup"
                          ? "Creating account..."
                          : "Sending reset link..."}
                    </>
                  ) : (
                    <>
                      {mode === "signin"
                        ? "Sign In"
                        : mode === "signup"
                          ? "Create Account"
                          : "Send Reset Link"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Toggle between sign-in/sign-up (not in forgot mode) */}
                {mode !== "forgot" && (
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
                )}

                {/* Back to sign-in when in forgot mode */}
                {mode === "forgot" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="w-full text-sm"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                )}

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
