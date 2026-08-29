import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <div style={{ color: "white", background: "#111", padding: 40, fontSize: 32, fontWeight: "bold", fontFamily: "monospace" }}>
    ProofChain test — if you can see this, React is working.
  </div>
);
