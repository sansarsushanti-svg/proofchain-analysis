import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation, Link } from "react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Analyses", path: "/upload" },
  { label: "Reports", path: "/reports" },
];

export function AppNav() {
  const { user, isGuest, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/dashboard" && location.pathname === "/");

  return (
    <>
      {/* Top navigation bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left — Logo */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="font-display text-lg tracking-tight">ProofChain</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
                    isActive(item.path)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right — User + Logout */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {isGuest ? "Guest" : user?.email?.split("@")[0] || "User"}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {isGuest ? "Exit" : "Logout"}
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-1"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 top-14 z-40 bg-background/98 backdrop-blur-sm">
          <div className="px-6 py-4 space-y-1 border-b border-border">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 text-sm font-medium uppercase tracking-wider transition-colors",
                  isActive(item.path)
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-[1px] bg-border my-2" />
            <div className="px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {isGuest ? "Guest" : user?.email || "User"}
              </span>
            </div>
            <button
              onClick={() => {
                handleSignOut();
                setMobileOpen(false);
              }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isGuest ? "Exit Guest" : "Logout"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
