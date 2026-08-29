import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <span className="editorial-label mb-4">Page Not Found</span>
      <h1 className="font-display text-5xl mb-4">404</h1>
      <p className="text-sm text-muted-foreground mb-6">
        The page you are looking for does not exist.
      </p>
      <button
        onClick={() => navigate("/")}
        className="nb-btn-primary px-5 py-2 bg-foreground text-background"
      >
        Return Home
      </button>
    </div>
  );
}
