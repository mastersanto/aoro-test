/**
 * Server-only Claude client. Constitution Article IV: the API key is read here
 * and nowhere else, and this module must never be imported by a client component.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const ASSIST_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export class MissingApiKeyError extends Error {}

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError("ANTHROPIC_API_KEY is not configured on the server.");
  }

  // Identity-linked keys (sk-ant-api03-... issued to a user rather than a
  // workspace) are rejected with a 400 unless the request names the workspace
  // it acts in. Workspace-scoped keys ignore the header, so sending it when
  // configured is safe either way.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

  return new Anthropic({
    apiKey,
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  });
}
