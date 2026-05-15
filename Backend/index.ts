import "dotenv/config";
import { tavily }  from '@tavily/core';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import express from "express";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from './promt';
import { middleware } from './middleware';
import cors from 'cors';
import { prisma } from './db';
import crypto from 'crypto';

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const app = express();

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:8000"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
}));

// ─── Helper: generate a URL-friendly slug from a query ───────────────
function generateSlug(query: string): string {
  const base = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 60);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

// ─── GET /conversations ──────────────────────────────────────────────
app.get("/conversations", middleware, async (req, res) => {
  try {
    const userId = req.userId!;
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { id: "desc" },
      select: { id: true, title: true, slug: true },
    });
    res.json({ userId, conversations });
  } catch (e) {
    console.error("[GET /conversations] Error:", e);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

//Simple health check endpoint to make sure our server is up and running
app.get("/health", (req, res) => {
    res.send({"messege":"I am healthy and ready to serve your requests!"});
});

// ─── GET /conversation/:slug ─────────────────────────────────────────
app.get("/conversation/:slug", middleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.userId!;

    const conversation = await prisma.conversation.findFirst({
      where: { slug, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.json(conversation);
  } catch (e) {
    console.error("[GET /conversation/:slug] Error:", e);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// ─── DELETE /conversation/:id ────────────────────────────────────────
app.delete("/conversation/:id", middleware, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId!;

    console.log(`[DELETE] Looking up conversation: id="${conversationId}", userId="${userId}"`);

    // Try to find by ID first, then by slug as fallback
    let conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      // Fallback: maybe the frontend sent a slug instead of an id
      conversation = await prisma.conversation.findFirst({
        where: { slug: conversationId, userId },
      });
      if (conversation) {
        console.log(`[DELETE] Found conversation by slug fallback. slug="${conversationId}", actual id="${conversation.id}"`);
      }
    }

    if (!conversation) {
      console.log(`[DELETE] Conversation not found for id/slug="${conversationId}" and userId="${userId}"`);
      // Debug: check if conversation exists with different userId
      const anyConv = await prisma.conversation.findFirst({
        where: { OR: [{ id: conversationId }, { slug: conversationId }] },
      });
      if (anyConv) {
        console.log(`[DELETE] Conversation exists but belongs to userId="${anyConv.userId}" (not "${userId}")`);
      }
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    // Delete messages first, then the conversation
    await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
    await prisma.conversation.delete({ where: { id: conversation.id } });

    console.log(`[DELETE /conversation/${conversation.id}] Deleted by user ${userId}`);
    res.json({ message: "Conversation deleted" });
  } catch (e) {
    console.error("[DELETE /conversation/:id] Error:", e);
    res.status(500).json({ message: "Failed to delete conversation" });
  }
});

// ─── POST /purplexity_ask ────────────────────────────────────────────
app.post("/purplexity_ask", middleware, async (req, res) => {
    // step 1 - get the query from the user 
    const query = req.body.query;
    const userId = req.userId!;

    if (!query || !query.trim()) {
      res.status(400).json({ message: "Query is required" });
      return;
    }

    console.log(`[purplexity_ask] User ${userId} asked: "${query}"`);

    // step 4 - web search to gather recources
    let webSearchResult: any[] = [];
    try {
      const webSearchResponse = await client.search(query, {
          searchDepth: "advanced"
      });
      webSearchResult = webSearchResponse.results;
      console.log(`[purplexity_ask] Got ${webSearchResult.length} web results`);
    } catch (searchError: any) {
      console.error("[purplexity_ask] Web search failed:", searchError.message);
    }

    // step 5 - context engineering: format search results with proper indexing for citations
    const formattedResults = webSearchResult.map((r: any, i: number) => {
      return `[${i + 1}] Title: ${r.title || "Untitled"}\n    URL: ${r.url}\n    Content: ${r.content || "No content available"}`;
    }).join("\n\n");

    // step 6 - hit the LLM and stream back the response to the user
    const prompt = PROMPT_TEMPLATE
    .replace("{{WEB_SEARCH_RESULTS}}", formattedResults || "No web search results available. Answer from your own knowledge.")
    .replace("{{USER_QUERY}}", query);

    let fullAnswer = "";
    let aiSucceeded = false;

    // ─── Try Google Gemini (free tier, no credit card needed) ─────────
    try {
      console.log("[purplexity_ask] Calling Google Gemini...");
      const result = streamText({
        model: google("gemini-2.0-flash"),
        prompt: prompt,
        system: SYSTEM_PROMPT,
      });

      for await (const textPart of result.textStream) {
        res.write(textPart);
        fullAnswer += textPart;
      }

      if (fullAnswer.length > 0) {
        aiSucceeded = true;
        console.log(`[purplexity_ask] Gemini response: ${fullAnswer.length} chars`);
      }
    } catch (geminiError: any) {
      console.error("[purplexity_ask] Gemini failed:", geminiError.message || geminiError);
    }

    // ─── Fallback: try Vercel AI Gateway if Gemini failed ────────────
    if (!aiSucceeded && process.env.AI_GATEWAY_API_KEY) {
      try {
        console.log("[purplexity_ask] Trying Vercel AI Gateway fallback...");
        const result = streamText({
          model: "openai/gpt-4.1-mini",
          prompt: prompt,
          system: SYSTEM_PROMPT,
        });

        for await (const textPart of result.textStream) {
          res.write(textPart);
          fullAnswer += textPart;
        }

        if (fullAnswer.length > 0) {
          aiSucceeded = true;
          console.log(`[purplexity_ask] Gateway response: ${fullAnswer.length} chars`);
        }
      } catch (gwError: any) {
        console.error("[purplexity_ask] Gateway also failed:", gwError.message?.substring(0, 200));
      }
    }

    // ─── Last resort: synthesize answer from web search results ──────
    if (!aiSucceeded) {
      console.log("[purplexity_ask] Using web search fallback");
      if (webSearchResult.length > 0) {
        const synthesized = `Based on web search results, here's what I found about "${query}":\n\n` +
          webSearchResult.slice(0, 5).map((r: any, i: number) => {
            const content = r.content ? r.content.substring(0, 300) : "";
            return `### ${i + 1}. ${r.title || "Source"}\n${content}${content.length >= 300 ? "..." : ""}\n`;
          }).join("\n") +
          `\n---\n*This answer was generated from web search results because the AI model is temporarily unavailable. For a more detailed, synthesized answer, please try again later.*`;
        res.write(synthesized);
        fullAnswer = synthesized;
      } else {
        const noResults = `I wasn't able to find specific information about "${query}" at this time. Please try:\n\n- Rephrasing your question\n- Being more specific\n- Trying again in a moment\n\n*The AI model is temporarily unavailable.*`;
        res.write(noResults);
        fullAnswer = noResults;
      }
    }

    // step 7 - write sources delimiter and sources JSON
    res.write("\n------SOURCES------\n");
    const sourcesPayload = webSearchResult.map((result: any) => ({
      url: result.url,
      title: result.title || "",
    }));
    res.write(JSON.stringify(sourcesPayload));
    res.write("\n------SOURCES------\n");

    // step 8 - save conversation to database
    try {
      const slug = generateSlug(query);
      const title = query.length > 80 ? query.substring(0, 80) + "..." : query;

      const conversation = await prisma.conversation.create({
        data: {
          title,
          slug,
          userId,
          messages: {
            create: [
              {
                content: query,
                role: "USER",
              },
              {
                content: fullAnswer,
                role: "ASSISTANT",
              },
            ],
          },
        },
      });

      console.log(`[purplexity_ask] Saved conversation: ${conversation.slug}`);

      // Send the conversation slug as metadata after the second sources delimiter
      res.write(JSON.stringify({ slug: conversation.slug, id: conversation.id }));
    } catch (dbError: any) {
      console.error("[purplexity_ask] Failed to save conversation:", dbError.message);
      // Don't fail the request — the user still got their answer
    }

    // step 9 - close the event stream and end the response
    res.end();
});

app.post("/Purplexity_ask/followup", middleware, async (req, res) => {
// STEP1 get the exixtiong chat from db 
// STEP2 Forward the full history to the LLM
// STEP2.5 Todo: Do context engineering here.
// STEP3 Stream back the response to the user
});

app.listen(8000, () => {
  console.log("[Backend] Server running on http://localhost:8000");
});
