import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const createSession = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    fileData: v.string(),
    isDemo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;

    const sessionId = await ctx.db.insert("analysisSessions", {
      userId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      fileData: args.fileData,
      status: "pending",
      createdAt: Date.now(),
      isDemo: args.isDemo,
    });

    return sessionId;
  },
});

export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("analysisSessions"),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    integrityScore: v.optional(v.number()),
    riskLevel: v.optional(
      v.union(
        v.literal("low"),
        v.literal("moderate"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    aiExplanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.sessionId, {
      status: args.status,
      ...(args.integrityScore !== undefined && { integrityScore: args.integrityScore }),
      ...(args.riskLevel !== undefined && { riskLevel: args.riskLevel }),
      ...(args.aiExplanation !== undefined && { aiExplanation: args.aiExplanation }),
      ...(args.status === "completed" || args.status === "failed"
        ? { completedAt: Date.now() }
        : {}),
    });
  },
});

export const getSessionsByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.subject as any;
    const sessions = await ctx.db
      .query("analysisSessions")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return sessions;
  },
});

export const getSession = query({
  args: { sessionId: v.id("analysisSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const userId = identity.subject as any;
    if (session.userId !== userId) return null;

    return session;
  },
});

export const getSessionFindings = query({
  args: { sessionId: v.id("analysisSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];

    const userId = identity.subject as any;
    if (session.userId !== userId) return [];

    const findings = await ctx.db
      .query("forensicFindings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return findings;
  },
});
