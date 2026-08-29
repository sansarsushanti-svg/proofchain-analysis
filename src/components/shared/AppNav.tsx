import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation, Link } from "react-router";
import {
  Shield,
  LayoutDashboard,
  Upload,
  History,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "New Analysis", path: "/upload", icon: Upload },
  { label: "History", path: "/history", icon: History },
  { label: "Reports", path: "/reports", icon: FileText },
];

export function AppNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r-2 border-border bg-card z-40 flex-col">
        <div className="p-6 border-b-2 border-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground flex items-center justify-center">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <span className="text-xl font-black tracking-tight uppercase">
              Proof<span className="text-accent">Chain</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/dashboard" && location.pathname === "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors border-2",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "text-foreground border-transparent hover:border-border hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t-2 border-border">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Signed in as
            </p>
            <p className="text-sm font-semibold truncate mt-1">
              {user?.email || "User"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold uppercase tracking-wider text-foreground border-2 border-transparent hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b-2 border-border bg-card z-50 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-foreground flex items-center justify-center">
            <Shield className="w-4 h-4 text-background" />
          </div>
          <span className="text-lg font-black tracking-tight uppercase">
            Proof<span className="text-accent">Chain</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 border-2 border-border"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-40 bg-background/95 backdrop-blur-sm">
          <div className="p-4 space-y-2 border-b-2 border-border">
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/dashboard" && location.pathname === "/");
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wider border-2",
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : "text-foreground border-border hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => { handleSignOut(); setMobileOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold uppercase tracking-wider text-red-700 border-2 border-red-300 bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
