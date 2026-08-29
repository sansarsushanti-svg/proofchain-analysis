import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-black mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Page Not Found</p>
        <button
          onClick={() => navigate("/")}
          className="nb-btn-primary px-6 py-3 bg-foreground text-background"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
