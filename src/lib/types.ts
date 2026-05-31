export type MembershipRole = "owner" | "admin" | "viewer";
export type Pronouns = "he_him" | "she_her" | "they_them";
export type RelationshipKind =
  | "any" | "parent" | "grandparent" | "aunt_uncle" | "sibling" | "spouse" | "other";
export type EmotionalWeight = "light" | "medium" | "heavy";
export type SessionStatus =
  | "scheduled" | "sent" | "in_progress" | "completed" | "skipped" | "missed";
export type InsightType = "mic_failed" | "schedule_suggestion" | "engagement_drop";
