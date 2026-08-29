import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Shield,
  Scan,
  Layers,
  FileSearch,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Scan,
    title: "Multi-Layer Forensic Analysis",
    description: "Metadata, image forensics, text analysis, and structure inspection run independently on every file.",
  },
  {
    icon: BarChart3,
    title: "Evidence-Backed Scoring",
    description: "Every integrity score is derived from weighted forensic findings with transparent logic.",
  },
  {
    icon: Layers,
    title: "Suspicious Region Detection",
    description: "Locate modified regions with bounding overlays on analyzed documents and images.",
  },
  {
    icon: FileSearch,
    title: "Explainable Findings",
    description: "Technical evidence paired with plain-English explanations for every finding.",
  },
];

const STEPS = [
  { num: "01", title: "Upload", desc: "Drop a PDF, JPG, or PNG for analysis" },
  { num: "02", title: "Analyze", desc: "Multi-module forensic pipeline runs" },
  { num: "03", title: "Localize", desc: "Suspicious regions are identified and visualized" },
  { num: "04", title: "Explain", desc: "AI translates evidence into clear findings" },
  { num: "05", title: "Report", desc: "Download a complete forensic report" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b-2 border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground flex items-center justify-center">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <span className="text-xl font-black tracking-tight uppercase">
              Proof<span className="text-accent">Chain</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-border hover:bg-muted transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="nb-btn-primary px-4 py-2 text-sm bg-foreground text-background"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="nb-badge px-4 py-1.5 bg-accent text-foreground border-accent-foreground">
              DIGITAL FORENSICS PLATFORM
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-6xl sm:text-7xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9]"
          >
            Know what
            <br />
            happened to
            <br />
            your <span className="text-accent">file.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Evidence-backed digital integrity analysis for documents and images.
            Detect anomalies, localize suspicious regions, and generate forensic reports.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate("/auth")}
              className="nb-btn-primary px-8 py-4 text-base bg-foreground text-background w-full sm:w-auto"
            >
              Analyze a Document
              <ArrowRight className="w-5 h-5 ml-2 inline" />
            </button>
            <a
              href="#how-it-works"
              className="nb-btn-outline px-8 py-4 text-base w-full sm:w-center text-center"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y-2 border-border bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Modules", value: "4" },
            { label: "Finding Types", value: "12+" },
            { label: "Evidence Types", value: "50+" },
            { label: "Analysis Time", value: "<30s" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-black">{stat.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="nb-badge px-3 py-1 bg-muted">CAPABILITIES</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black uppercase tracking-tight">
              Not Just Detection.
              <br />Evidence & Explanation.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="nb-card p-6"
              >
                <div className="w-12 h-12 bg-foreground text-background flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black uppercase tracking-wider text-sm mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 bg-muted border-y-2 border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="nb-badge px-3 py-1 bg-background border-border">PROCESS</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black uppercase tracking-tight">
              Five-Step Forensic Pipeline
            </h2>
          </div>

          <div className="grid sm:grid-cols-5 gap-4">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="nb-card p-6 text-center"
              >
                <span className="text-4xl font-black text-muted-foreground/30">
                  {step.num}
                </span>
                <h3 className="font-black uppercase tracking-wider text-base mt-3 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="nb-card-lg p-12">
            <div className="w-16 h-16 bg-foreground flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-background" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">
              Detect. Localize. Explain. Report.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              ProofChain provides evidence-backed forensic analysis — not AI guesses.
              Every finding comes with technical evidence and a clear explanation.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="nb-btn-primary px-8 py-4 text-base bg-foreground text-background"
            >
              Start Analysis
              <ChevronRight className="w-5 h-5 ml-2 inline" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-black uppercase">ProofChain</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Evidence-backed digital integrity analysis platform.
            This is a demonstration product.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
