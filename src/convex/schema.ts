import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // --- ProofChain tables ---

    analysisSessions: defineTable({
      userId: v.id("users"),
      fileName: v.string(),
      fileType: v.string(),
      fileSize: v.number(),
      fileData: v.string(), // base64 data URL (for MVP, stored inline)
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
      reportUrl: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      isDemo: v.optional(v.boolean()),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    forensicFindings: defineTable({
      sessionId: v.id("analysisSessions"),
      userId: v.id("users"),
      category: v.string(), // metadata, image_forensics, text_layout, pdf_structure
      finding: v.string(),
      severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      confidence: v.number(), // 0-100
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
      createdAt: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
