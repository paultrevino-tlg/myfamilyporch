import { NextRequest, NextResponse } from "next/server";
import { generateFollowUp } from "@/lib/ai/interviewer";

// All Anthropic calls happen here, server-side. Never in the client.
export async function POST(req: NextRequest) {
  const body = await req.json();
  // TODO 3.2: validate caller (member session or internal), assemble context,
  // call generateFollowUp, return { question }.
  try {
    const question = await generateFollowUp(body);
    return NextResponse.json({ question });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 501 });
  }
}
