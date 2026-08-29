import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const insertFinding = mutation({
  args: {
    sessionId: v.id("analysisSessions"),
    category: v.string(),
    finding: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    confidence: v.number(),
    evidence: v.string(),
    technicalExplanation: v.string(),
    userExplanation: v.string(),
    region: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;

    return await ctx.db.insert("forensicFindings", {
      sessionId: args.sessionId,
      userId,
      category: args.category,
      finding: args.finding,
      severity: args.severity,
      confidence: args.confidence,
      evidence: args.evidence,
      technicalExplanation: args.technicalExplanation,
      userExplanation: args.userExplanation,
      region: args.region,
      createdAt: Date.now(),
    });
  },
});

export const bulkInsertFindings = mutation({
  args: {
    sessionId: v.id("analysisSessions"),
    findings: v.array(
      v.object({
        category: v.string(),
        finding: v.string(),
        severity: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        ),
        confidence: v.number(),
        evidence: v.string(),
        technicalExplanation: v.string(),
        userExplanation: v.string(),
        region: v.optional(
          v.object({
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject as any;
    const now = Date.now();

    for (const finding of args.findings) {
      await ctx.db.insert("forensicFindings", {
        sessionId: args.sessionId,
        userId,
        ...finding,
        createdAt: now,
      });
    }
  },
});
