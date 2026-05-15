import { BACKEND_URL } from "./config";
import type { Session } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────
export interface Source {
  url: string;
  title?: string;
  content?: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  slug: string;
}

export interface ParsedResponse {
  answer: string;
  followUps: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getAuthHeaders(session: Session | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = session.access_token;
  }
  return headers;
}

/**
 * Parse the LLM response to extract the answer and follow-up questions.
 * Expected format:
 *   <ANSWER>
 *   ...answer text...
 *   <ANSWER>
 *   <FOLLOW_UPS>
 *        <question>Q1</question>
 *        ...
 *   </FOLLOW_UPS>
 */
export function parseAIResponse(raw: string): ParsedResponse {
  let answer = raw;
  const followUps: string[] = [];

  // Extract answer between <ANSWER> tags
  const answerMatch = raw.match(/<ANSWER>([\s\S]*?)<ANSWER>/i);
  if (answerMatch?.[1]) {
    answer = answerMatch[1].trim();
  } else {
    // Fallback: strip any tags
    answer = raw
      .replace(/<\/?ANSWER>/gi, "")
      .replace(/<FOLLOW_UPS>[\s\S]*?<\/FOLLOW_UPS>/gi, "")
      .trim();
  }

  // Extract follow-up questions
  const followUpBlock = raw.match(/<FOLLOW_UPS>([\s\S]*?)<\/FOLLOW_UPS>/i);
  if (followUpBlock?.[1]) {
    const questionRegex = /<question>([\s\S]*?)<\/question>/gi;
    let qMatch;
    while ((qMatch = questionRegex.exec(followUpBlock[1])) !== null) {
      const q = qMatch[1]?.trim();
      if (q) followUps.push(q);
    }
  }

  return { answer, followUps };
}

// ─── API Functions ───────────────────────────────────────────────────

const SOURCE_DELIMITER = "------SOURCES------";

/**
 * Stream a query to the backend /purplexity_ask endpoint.
 * 
 * The backend streams: <AI answer text>\n------SOURCES------\n<JSON sources>\n------SOURCES------\n
 * 
 * This parser collects the full streamed text, pushes answer chunks in real-time,
 * and parses sources after the stream finishes.
 */
export async function askPerplexity(
  query: string,
  session: Session | null,
  onChunk: (chunk: string) => void,
  onSources: (sources: Source[]) => void
): Promise<{ conversationSlug?: string }> {
  const response = await fetch(`${BACKEND_URL}/purplexity_ask`, {
    method: "POST",
    headers: getAuthHeaders(session),
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      response.status === 401
        ? "Please sign in to search."
        : response.status === 403
        ? "Your session has expired. Please sign in again."
        : `Search failed (${response.status}): ${errorBody || response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("No response body received from the server.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let fullText = "";
  let answerSentLength = 0; // Track how many chars of answer we've already sent

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;

    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      // Find how much of fullText is the "answer" (before the first SOURCES delimiter)
      const delimiterIndex = fullText.indexOf(`\n${SOURCE_DELIMITER}\n`);
      const answerPortion = delimiterIndex === -1 ? fullText : fullText.substring(0, delimiterIndex);

      // Stream only the new part of the answer that we haven't sent yet
      if (answerPortion.length > answerSentLength) {
        const newContent = answerPortion.substring(answerSentLength);
        onChunk(newContent);
        answerSentLength = answerPortion.length;
      }
    }
  }

  // ─── Parse sources and conversation slug after stream completes ────
  const parts = fullText.split(`\n${SOURCE_DELIMITER}\n`);
  let conversationSlug: string | undefined;

  if (parts.length >= 3) {
    // parts[0] = answer, parts[1] = sources JSON, parts[2] = possible trailing or metadata
    const sourcesRaw = parts[1]?.trim();
    if (sourcesRaw) {
      try {
        const parsedSources = JSON.parse(sourcesRaw);
        if (Array.isArray(parsedSources)) {
          onSources(parsedSources.filter((s: any) => s && s.url));
        }
      } catch (e) {
        console.error("Failed to parse sources JSON:", e, sourcesRaw);
      }
    }

    // Check if there's metadata (conversation slug) after the second delimiter
    const metaRaw = parts[2]?.trim();
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        conversationSlug = meta.slug;
      } catch {
        // Not JSON metadata, ignore
      }
    }
  }

  return { conversationSlug };
}

/**
 * Fetch all conversations for the current user.
 */
export async function fetchConversations(
  session: Session | null
): Promise<ConversationSummary[]> {
  if (!session) return [];

  const response = await fetch(`${BACKEND_URL}/conversations`, {
    method: "GET",
    headers: getAuthHeaders(session),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }

  const data = await response.json();
  return data.conversations ?? [];
}

/**
 * Delete a conversation by its ID.
 */
export async function deleteConversation(
  session: Session | null,
  conversationId: string
): Promise<void> {
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`${BACKEND_URL}/conversation/${conversationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(session),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.status}`);
  }
}
