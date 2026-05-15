import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { ArrowRight, BookOpen, Sparkles, MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Markdown } from "@/lib/markdown";
import { BACKEND_URL } from "@/lib/config";

interface Message {
  id: number;
  content: string;
  role: "USER" | "ASSISTANT";
  createdAt: string;
}

interface ConversationData {
  id: string;
  title: string | null;
  slug: string;
  messages: Message[];
}

/**
 * Conversation page — displays a single conversation at /c/:slug
 * Loads messages from the backend and displays the full Q&A thread.
 */
export default function Conversation() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !slug) return;

    setLoading(true);
    setError(null);

    fetch(`${BACKEND_URL}/conversation/${slug}`, {
      headers: {
        Authorization: session.access_token,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Conversation not found");
          throw new Error(`Failed to load conversation (${res.status})`);
        }
        return res.json();
      })
      .then((data) => setConversation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, slug]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            New search
          </button>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-[#161616] border border-zinc-800/50 rounded-2xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-zinc-300 mb-2">
                {error}
              </h2>
              <p className="text-sm text-zinc-500">
                This conversation may have been deleted or you may not have access.
              </p>
            </div>
          )}

          {/* Conversation messages */}
          {!loading && !error && conversation && (
            <>
              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 mb-8 leading-tight">
                {conversation.title || "Untitled Conversation"}
              </h1>

              {/* Messages */}
              <div className="flex flex-col gap-6">
                {conversation.messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === "USER" ? (
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-zinc-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-zinc-400 font-medium">U</span>
                        </div>
                        <div className="text-zinc-200 text-[15px] leading-relaxed pt-0.5">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="ml-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-zinc-400" />
                          <span className="text-sm font-medium text-zinc-400">Answer</span>
                        </div>
                        <Markdown
                          content={msg.content
                            .replace(/<\/?ANSWER>/gi, "")
                            .replace(/<FOLLOW_UPS>[\s\S]*?<\/FOLLOW_UPS>/gi, "")
                            .trim()
                          }
                          className="text-[15px] leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom follow-up input */}
      <div className="border-t border-zinc-800/50 bg-[#0a0a0a] px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Will be connected to follow-up endpoint when backend is ready
            }}
            className="flex items-center bg-[#1a1a1a] border border-zinc-800/60 rounded-full px-4 py-2.5 focus-within:border-zinc-700 transition-colors"
          >
            <input
              type="text"
              placeholder="Ask a follow up..."
              className="flex-1 bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-600 ml-1"
            />
            <button
              type="submit"
              disabled
              className="ml-2 p-2 rounded-full bg-zinc-800 text-zinc-600 cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
