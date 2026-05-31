// Server-side interview brain. Resolves prompt tokens and asks Anthropic for a
// natural follow-up that chases the storyteller's thread while respecting the
// coverage backbone and the "avoid" topics. See TODO Phase 3.

export type RelationshipContext = {
  address: string;          // "Dad", "Grandma", "Uncle Joe"
  name: string;
  pronouns: "he_him" | "she_her" | "they_them";
  askerRelation?: string;   // "your son", "your niece"
  partner?: string;
  askerParent?: string;
  kind: "any" | "parent" | "grandparent" | "aunt_uncle" | "sibling" | "spouse" | "other";
  birthYear?: number;
  lang: "en" | "es";
};

export function resolveTokens(text: string, ctx: RelationshipContext): string {
  const pr = {
    he_him: { they: "he", them: "him", their: "his" },
    she_her: { they: "she", them: "her", their: "her" },
    they_them: { they: "they", them: "them", their: "their" },
  }[ctx.pronouns];
  return text
    .replaceAll("{address}", ctx.address)
    .replaceAll("{name}", ctx.name)
    .replaceAll("{partner}", ctx.partner ?? "")
    .replaceAll("{asker_relation}", ctx.askerRelation ?? "")
    .replaceAll("{asker_parent}", ctx.askerParent ?? "")
    .replaceAll("{they}", pr.they).replaceAll("{them}", pr.them).replaceAll("{their}", pr.their);
}

// TODO 3.2: call the Anthropic API server-side with the resolved context,
// the just-given answer, and remaining coverage; return one follow-up question
// in ctx.lang. Never expose ANTHROPIC_API_KEY to the client.
export async function generateFollowUp(_args: {
  ctx: RelationshipContext;
  questionAsked: string;
  answerTranscript: string;
  coverageRemaining: string[];
}): Promise<string> {
  throw new Error("Not implemented — TODO 3.2");
}
