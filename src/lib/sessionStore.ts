/**
 * Local session store — replaces Convex for session management.
 * Stores sessions in memory with localStorage persistence for the MVP.
 */

export interface SessionData {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  integrityScore?: number;
  riskLevel?: "low" | "moderate" | "high" | "critical";
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

const STORAGE_KEY = "proofchain_sessions";
const FINDINGS_KEY = "proofchain_findings";

function generateId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadSessions(): Record<string, SessionData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, SessionData>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage full or unavailable — degrade gracefully
  }
}

function loadFindings(): Record<string, FindingData[]> {
  try {
    const raw = localStorage.getItem(FINDINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFindings(findings: Record<string, FindingData[]>) {
  try {
    localStorage.setItem(FINDINGS_KEY, JSON.stringify(findings));
  } catch {
    // degrade gracefully
  }
}

// ── Public API ────────────────────────────────────────────

export function createSession(data: {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
  isDemo?: boolean;
}): string {
  const sessions = loadSessions();
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
  saveSessions(sessions);
  return id;
}

export function getSession(sessionId: string): SessionData | null {
  const sessions = loadSessions();
  return sessions[sessionId] ?? null;
}

export function updateSession(
  sessionId: string,
  updates: Partial<Omit<SessionData, "_id" | "createdAt">>
): void {
  const sessions = loadSessions();
  const existing = sessions[sessionId];
  if (!existing) return;
  sessions[sessionId] = { ...existing, ...updates };
  saveSessions(sessions);
}

export function bulkInsertFindings(
  sessionId: string,
  findings: Omit<FindingData, "_id" | "sessionId" | "createdAt">[]
): void {
  const allFindings = loadFindings();
  if (!allFindings[sessionId]) allFindings[sessionId] = [];
  for (const f of findings) {
    allFindings[sessionId].push({
      ...f,
      _id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      createdAt: Date.now(),
    });
  }
  saveFindings(allFindings);
}

export function getSessionFindings(sessionId: string): FindingData[] {
  const allFindings = loadFindings();
  return allFindings[sessionId] ?? [];
}

export function getAllSessions(): SessionData[] {
  return Object.values(loadSessions());
}
