-- ProofChain Database Migration
-- Run this in the Supabase SQL Editor to create the required tables.

-- ============================================================
-- 1. analysis_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  integrity_score INTEGER,
  risk_level    TEXT,
  ai_explanation TEXT,
  is_demo       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);

-- ============================================================
-- 2. analysis_files
-- ============================================================
CREATE TABLE IF NOT EXISTS analysis_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_files_analysis_id ON analysis_files(analysis_id);

-- ============================================================
-- 3. forensic_findings
-- ============================================================
CREATE TABLE IF NOT EXISTS forensic_findings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id           UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  category              TEXT NOT NULL,
  finding               TEXT NOT NULL,
  severity              TEXT NOT NULL,
  confidence            NUMERIC NOT NULL,
  evidence              TEXT NOT NULL,
  technical_explanation TEXT NOT NULL,
  user_explanation      TEXT NOT NULL,
  region                JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forensic_findings_analysis_id ON forensic_findings(analysis_id);

-- ============================================================
-- 4. reports
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  report_path   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_analysis_id ON reports(analysis_id);

-- ============================================================
-- 5. Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ── analysis_sessions policies ──

-- Users can read their own sessions
CREATE POLICY "Users can read their own sessions"
  ON analysis_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
  ON analysis_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
  ON analysis_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own sessions"
  ON analysis_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ── analysis_files policies ──

-- Users can read files belonging to their sessions
CREATE POLICY "Users can read their own files"
  ON analysis_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = analysis_files.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Users can insert files for their sessions
CREATE POLICY "Users can insert their own files"
  ON analysis_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = analysis_files.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Users can delete files belonging to their sessions
CREATE POLICY "Users can delete their own files"
  ON analysis_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = analysis_files.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- ── forensic_findings policies ──

-- Users can read findings belonging to their sessions
CREATE POLICY "Users can read their own findings"
  ON forensic_findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = forensic_findings.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Users can insert findings for their sessions
CREATE POLICY "Users can insert their own findings"
  ON forensic_findings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = forensic_findings.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Users can delete findings belonging to their sessions
CREATE POLICY "Users can delete their own findings"
  ON forensic_findings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = forensic_findings.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- ── reports policies ──

-- Users can read reports belonging to their sessions
CREATE POLICY "Users can read their own reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = reports.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Users can insert reports for their sessions
CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = reports.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Users can delete reports belonging to their sessions
CREATE POLICY "Users can delete their own reports"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions
      WHERE analysis_sessions.id = reports.analysis_id
      AND analysis_sessions.user_id = auth.uid()
    )
  );
