/**
 * Session store — uses Supabase PostgreSQL for authenticated users
 * and localStorage for guest mode.
 *
 * File data (base64) is always stored locally — never in PostgreSQL.
 */

import { supabase, isConfigured } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────

export interface SessionData {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  integrityScore?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  aiExplanation?: string;
  createdAt: number;
  completedAt?: number;
  isDemo?: boolean;
}

export interface FindingData {
  _id: string;
  sessionId: string;
  category: string;
  finding: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  evidence: string;
  technicalExplanation: string;
  userExplanation: string;
  region?: { x: number; y: number; width: number; height: number };
  createdAt: number;
}

// ── localStorage helpers (used by both paths) ─────────────

const STORAGE_KEY = "proofchain_sessions";
const FINDINGS_KEY = "proofchain_findings";
const FILE_DATA_KEY = "proofchain_file_data";

function generateId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateFindingId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// File data is always stored in localStorage (even for authenticated users)
// because Supabase PostgreSQL should not contain large base64 strings.
function saveFileData(id: string, data: string) {
  try {
    const raw = localStorage.getItem(FILE_DATA_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = data;
    localStorage.setItem(FILE_DATA_KEY, JSON.stringify(map));
  } catch {}
}

function getFileData(id: string): string | null {
  try {
    const raw = localStorage.getItem(FILE_DATA_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[id] ?? null;
  } catch {
    return null;
  }
}

function removeFileData(id: string) {
  try {
    const raw = localStorage.getItem(FILE_DATA_KEY);
    const map = raw ? JSON.parse(raw) : {};
    delete map[id];
    localStorage.setItem(FILE_DATA_KEY, JSON.stringify(map));
  } catch {}
}

// ── localStorage session helpers (guest mode) ─────────────

function loadLocalSessions(): Record<string, SessionData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalSessions(sessions: Record<string, SessionData>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

function loadLocalFindings(): Record<string, FindingData[]> {
  try {
    const raw = localStorage.getItem(FINDINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalFindings(findings: Record<string, FindingData[]>) {
  try {
    localStorage.setItem(FINDINGS_KEY, JSON.stringify(findings));
  } catch {}
}

// ── Auth detection ────────────────────────────────────────

/** Race a promise against a timeout. Returns fallback on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isConfigured) return null;
  try {
    const result = await withTimeout(
      supabase.auth.getUser() as Promise<{ data: { user: { id: string } | null }; error: unknown }>,
      5_000,
      { data: { user: null }, error: null },
    );
    return result.data.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Supabase row mappers ──────────────────────────────────

function rowToSession(
  row: Record<string, unknown>,
  fileDataFallback?: string | null,
): SessionData {
  return {
    _id: row.id as string,
    fileName: row.file_name as string,
    fileType: row.file_type as string,
    fileSize: row.file_size as number,
    fileData: fileDataFallback ?? "",
    status: row.status as SessionData["status"],
    integrityScore: row.integrity_score as number | undefined,
    riskLevel: row.risk_level as SessionData["riskLevel"],
    aiExplanation: row.ai_explanation as string | undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    completedAt: row.completed_at
      ? new Date(row.completed_at as string).getTime()
      : undefined,
    isDemo: row.is_demo as boolean | undefined,
  };
}

// ── Public API ────────────────────────────────────────────

/**
 * Create a new analysis session.
 * Returns the session ID.
 */
export async function createSession(data: {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
  isDemo?: boolean;
}): Promise<string> {
  const userId = await getCurrentUserId();

  if (userId) {
    // Authenticated: write to Supabase
    const { data: row, error } = await supabase
      .from("analysis_sessions")
      .insert({
        user_id: userId,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size: data.fileSize,
        status: "pending",
        is_demo: data.isDemo ?? false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create session in Supabase:", error);
      throw new Error("Failed to create analysis session.");
    }

    const id = row.id as string;
    // Store file data locally (not in PostgreSQL)
    saveFileData(id, data.fileData);
    return id;
  }

  // Guest: write to localStorage
  const sessions = loadLocalSessions();
  const id = generateId();
  sessions[id] = {
    _id: id,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    fileData: data.fileData,
    status: "pending",
    createdAt: Date.now(),
    isDemo: data.isDemo,
  };
  saveLocalSessions(sessions);
  return id;
}

/**
 * Get a single session by ID.
 */
export async function getSession(
  sessionId: string,
): Promise<SessionData | null> {
  const userId = await getCurrentUserId();

  if (userId) {
    const { data: row, error } = await supabase
      .from("analysis_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error || !row) return null;

    // File data is always in localStorage
    const fileData = getFileData(sessionId) ?? "";
    return rowToSession(row, fileData);
  }

  // Guest
  const sessions = loadLocalSessions();
  return sessions[sessionId] ?? null;
}

/**
 * Update a session with partial data.
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Omit<SessionData, "_id" | "createdAt">>,
): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    // Build Supabase update payload
    const dbUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.integrityScore !== undefined)
      dbUpdates.integrity_score = updates.integrityScore;
    if (updates.riskLevel !== undefined) dbUpdates.risk_level = updates.riskLevel;
    if (updates.aiExplanation !== undefined)
      dbUpdates.ai_explanation = updates.aiExplanation;
    if (updates.completedAt !== undefined)
      dbUpdates.completed_at = new Date(updates.completedAt).toISOString();
    if (updates.isDemo !== undefined) dbUpdates.is_demo = updates.isDemo;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from("analysis_sessions")
        .update(dbUpdates)
        .eq("id", sessionId);

      if (error) {
        console.error("Failed to update session in Supabase:", error);
      }
    }

    // If fileData is being updated, save locally
    if (updates.fileData !== undefined) {
      saveFileData(sessionId, updates.fileData);
    }
    return;
  }

  // Guest
  const sessions = loadLocalSessions();
  const existing = sessions[sessionId];
  if (!existing) return;
  sessions[sessionId] = { ...existing, ...updates };
  saveLocalSessions(sessions);
}

/**
 * Insert multiple findings for a session.
 */
export async function bulkInsertFindings(
  sessionId: string,
  findings: Omit<FindingData, "_id" | "sessionId" | "createdAt">[],
): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    const rows = findings.map((f) => ({
      analysis_id: sessionId,
      category: f.category,
      finding: f.finding,
      severity: f.severity,
      confidence: f.confidence,
      evidence: f.evidence,
      technical_explanation: f.technicalExplanation,
      user_explanation: f.userExplanation,
      region: f.region ?? null,
    }));

    const { error } = await supabase.from("forensic_findings").insert(rows);

    if (error) {
      console.error("Failed to insert findings in Supabase:", error);
    }
    return;
  }

  // Guest
  const allFindings = loadLocalFindings();
  if (!allFindings[sessionId]) allFindings[sessionId] = [];
  for (const f of findings) {
    allFindings[sessionId].push({
      ...f,
      _id: generateFindingId(),
      sessionId,
      createdAt: Date.now(),
    });
  }
  saveLocalFindings(allFindings);
}

/**
 * Get all findings for a session.
 */
export async function getSessionFindings(
  sessionId: string,
): Promise<FindingData[]> {
  const userId = await getCurrentUserId();

  if (userId) {
    const { data: rows, error } = await supabase
      .from("forensic_findings")
      .select("*")
      .eq("analysis_id", sessionId)
      .order("created_at", { ascending: true });

    if (error || !rows) return [];

    return rows.map((row) => ({
      _id: row.id as string,
      sessionId: row.analysis_id as string,
      category: row.category as string,
      finding: row.finding as string,
      severity: row.severity as FindingData["severity"],
      confidence: row.confidence as number,
      evidence: row.evidence as string,
      technicalExplanation: row.technical_explanation as string,
      userExplanation: row.user_explanation as string,
      region: (row.region as FindingData["region"]) ?? undefined,
      createdAt: new Date(row.created_at as string).getTime(),
    }));
  }

  // Guest
  const allFindings = loadLocalFindings();
  return allFindings[sessionId] ?? [];
}

/**
 * Get all sessions for the current user/guest.
 */
export async function getAllSessions(): Promise<SessionData[]> {
  const userId = await getCurrentUserId();

  if (userId) {
    const { data: rows, error } = await supabase
      .from("analysis_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !rows) return [];

    return rows.map((row) => {
      const fileData = getFileData(row.id as string) ?? "";
      return rowToSession(row, fileData);
    });
  }

  // Guest
  return Object.values(loadLocalSessions());
}
