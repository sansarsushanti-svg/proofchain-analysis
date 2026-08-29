import { useNavigate } from "react-router";
import { motion } from "framer-motion";

const CAPABILITIES = [
  {
    num: "01",
    title: "Multi-Module Forensic Pipeline",
    description:
      "Metadata extraction, image forensics, text analysis, and document structure inspection — each module independent and replaceable.",
  },
  {
    num: "02",
    title: "Weighted Evidence Scoring",
    description:
      "Integrity scores computed from categorized findings with configurable severity and confidence weights. No opaque ML predictions.",
  },
  {
    num: "03",
    title: "Region-Level Localization",
    description:
      "Identifies and overlays annotation boxes on statistically anomalous regions within documents and images.",
  },
  {
    num: "04",
    title: "Structured Findings",
    description:
      "Every finding includes category, severity, confidence, raw evidence, a technical explanation, and a user-facing summary.",
  },
];

const PIPELINE = [
  { num: "01", title: "Ingest", desc: "PDF, JPG, or PNG with type and size validation" },
  { num: "02", title: "Extract", desc: "Metadata, EXIF, structural properties" },
  { num: "03", title: "Inspect", desc: "Image forensics, compression, text layout" },
  { num: "04", title: "Correlate", desc: "Aggregate findings into integrity score" },
  { num: "05", title: "Report", desc: "Explain evidence, export forensic report" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl tracking-tight">ProofChain</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/auth")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="nb-btn-primary px-5 py-2 bg-foreground text-background"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Editorial label */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-[1.5px] bg-accent" />
              <span className="editorial-label">Digital Forensics Platform</span>
            </div>

            {/* Main heading */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight mb-6">
              ProofChain
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed mb-4">
              Know what happened to your file.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-lg leading-relaxed mb-10">
              Evidence-backed digital integrity analysis for documents and images.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="nb-btn-primary px-7 py-3 bg-foreground text-background"
              >
                Analyze a Document →
              </button>
              <a
                href="#how-it-works"
                className="nb-btn-outline px-7 py-3 bg-background text-foreground"
              >
                See How It Works
              </a>
            </div>
          </motion.div>

          {/* Forensic visual detail — document outline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-16 border border-border bg-card p-8 max-w-md"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="editorial-label">file</span>
                <span className="text-sm font-medium">invoice_march_2024.pdf</span>
              </div>
              <div className="h-[1px] bg-border" />
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="editorial-label block mb-1">type</span>
                  <span className="font-medium">PDF 1.7</span>
                </div>
                <div>
                  <span className="editorial-label block mb-1">pages</span>
                  <span className="font-medium">1</span>
                </div>
                <div>
                  <span className="editorial-label block mb-1">size</span>
                  <span className="font-medium">247 KB</span>
                </div>
              </div>
              <div className="h-[1px] bg-border" />
              <div className="flex items-center gap-2">
                <span className="editorial-label">integrity</span>
                <span className="text-sm font-bold text-accent">31 / 100</span>
                <span className="nb-badge px-2 py-0.5 bg-accent/10 text-accent">HIGH RISK</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <span className="editorial-label">Capabilities</span>
            <h2 className="font-display text-2xl sm:text-3xl mt-2">
              How it analyzes
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border">
            {CAPABILITIES.map((cap) => (
              <div key={cap.num} className="bg-card p-6">
                <span className="evidence-num text-2xl">{cap.num}</span>
                <h3 className="text-sm font-bold uppercase tracking-wide mt-3 mb-2">
                  {cap.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {cap.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="how-it-works" className="py-16 px-6 bg-secondary/50 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <span className="editorial-label">Pipeline</span>
            <h2 className="font-display text-2xl sm:text-3xl mt-2">
              Analysis pipeline
            </h2>
          </div>

          <div className="grid grid-cols-5 gap-px bg-border border border-border">
            {PIPELINE.map((step) => (
              <div key={step.num} className="bg-card p-5 text-center">
                <span className="evidence-num text-lg">{step.num}</span>
                <h3 className="text-xs font-bold uppercase tracking-wider mt-2 mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="editorial-label">Evidence over guesswork</span>
          <h2 className="font-display text-3xl sm:text-4xl mt-4 mb-4">
            Built for people who need<br />to know, not guess
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            ProofChain does not label files as fake. It surfaces anomalies,
            provides the evidence, and lets you assess the findings.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="nb-btn-primary px-8 py-3 bg-foreground text-background"
          >
            Analyze a Document →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-sm">ProofChain</span>
          <p className="text-xs text-muted-foreground">
            Internal tool — digital document integrity analysis
          </p>
        </div>
      </footer>
    </div>
  );
}
