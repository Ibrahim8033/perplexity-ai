import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { Search, Mic, ArrowRight, BookOpen, UserPlus, Briefcase, Zap, Monitor, ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "./AuthContext";
import { askPerplexity, parseAIResponse } from "./api";
import type { Source } from "./api";
import { Markdown } from "./markdown";
import { useToast } from "./toast-context";

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in space-y-4">
      {/* Sources skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-zinc-800 animate-shimmer" />
          <div className="w-20 h-4 rounded bg-zinc-800 animate-shimmer" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 rounded-lg bg-zinc-800/60 animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
      {/* Answer skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-zinc-800 animate-shimmer" />
          <div className="w-16 h-4 rounded bg-zinc-800 animate-shimmer" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 rounded bg-zinc-800/40 animate-shimmer" style={{
            width: `${85 - i * 10}%`,
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  if (!source || !source.url) return null;
  
  let hostname = "";
  try {
    hostname = new URL(source.url).hostname.replace("www.", "");
  } catch {
    hostname = source.url;
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 bg-[#1a1a1a] hover:bg-[#222] px-3 py-2.5 rounded-xl text-sm transition-all border border-zinc-800/40 hover:border-zinc-700/60"
    >
      <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] text-zinc-400 font-medium flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
        {index + 1}
      </div>
      <span className="truncate max-w-[160px] text-zinc-400 group-hover:text-zinc-200 transition-colors">
        {source.title || hostname}
      </span>
      <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" />
    </a>
  );
}

function FollowUpPill({ question, onClick }: { question: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left flex items-start gap-2 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-zinc-800/40 hover:bg-[#222] hover:border-zinc-700/60 text-sm text-zinc-400 hover:text-zinc-200 transition-all group"
    >
      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      <span>{question}</span>
    </button>
  );
}

export default function Dashboard() {
  const { session } = useAuth();
  const { toastError } = useToast();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [rawAnswer, setRawAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const answerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when "New Thread" is clicked (navigates to / with reset flag)
  useEffect(() => {
    if ((location.state as any)?.reset) {
      setQuery("");
      setIsSearching(false);
      setRawAnswer("");
      setSources([]);
      setHasSearched(false);
      setSearchQuery("");
      // Focus the input after reset
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [(location.state as any)?.reset]);

  // Auto-scroll as answer streams in
  useEffect(() => {
    if (answerRef.current && isSearching) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [rawAnswer, isSearching]);

  const handleSearch = async (searchText?: string) => {
    const q = searchText ?? query;
    if (!q.trim() || isSearching) return;

    if (!session) {
      toastError("Please sign in to ask questions.");
      return;
    }

    setIsSearching(true);
    setRawAnswer("");
    setSources([]);
    setHasSearched(true);
    setSearchQuery(q);
    if (!searchText) setQuery(""); // Clear input only for manual submissions

    try {
      const result = await askPerplexity(
        q,
        session,
        (chunk) => setRawAnswer((prev) => prev + chunk),
        (srcs) => setSources(srcs)
      );

      // Dispatch a custom event so the Sidebar can refresh conversation history
      window.dispatchEvent(new CustomEvent("conversation-created", {
        detail: { slug: result.conversationSlug },
      }));

    } catch (error: any) {
      console.error("Search failed", error);
      toastError(error.message || "An error occurred while searching.");
      // Use a callback form to check current rawAnswer state
      setRawAnswer((prev) => prev || "An error occurred while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const parsed = parseAIResponse(rawAnswer);

  // ─── Results View ────────────────────────────────────────────────
  if (hasSearched) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a]">
        <div ref={answerRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Query */}
            <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 mb-6 leading-tight">
              {searchQuery}
            </h1>

            {/* Loading state */}
            {isSearching && !rawAnswer && <LoadingSkeleton />}

            {/* Sources */}
            {sources.length > 0 && (
              <div className="mb-6 animate-fade-in">
                <h2 className="text-sm font-medium mb-3 flex items-center gap-2 text-zinc-400">
                  <BookOpen className="w-4 h-4" /> Sources
                </h2>
                <div className="flex flex-wrap gap-2">
                  {sources.map((src, i) => (
                    <SourceCard key={i} source={src} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Answer */}
            {rawAnswer && (
              <div className="mb-6 animate-fade-in">
                <h2 className="text-sm font-medium mb-4 flex items-center gap-2 text-zinc-400">
                  <Sparkles className="w-4 h-4" /> Answer
                  {isSearching && <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-cursor ml-1" />}
                </h2>
                <Markdown content={parsed.answer} className="text-[15px] leading-relaxed" sources={sources} />
              </div>
            )}

            {/* Follow-up questions */}
            {!isSearching && parsed.followUps.length > 0 && (
              <div className="mt-8 animate-fade-in">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-zinc-400">
                  <MessageSquare className="w-4 h-4" /> Related
                </h3>
                <div className="flex flex-col gap-2">
                  {parsed.followUps.map((q, i) => (
                    <FollowUpPill key={i} question={q} onClick={() => {
                      setQuery(q);
                      handleSearch(q);
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom follow-up input */}
        <div className="border-t border-zinc-800/50 bg-[#0a0a0a] px-4 md:px-8 py-4">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleFormSubmit}
              className="flex items-center bg-[#1a1a1a] border border-zinc-800/60 rounded-full px-4 py-2.5 focus-within:border-zinc-700 transition-colors"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a follow up..."
                className="flex-1 bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-600 ml-1"
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={!query.trim() || isSearching}
                className="ml-2 p-2 rounded-full bg-zinc-700 text-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-zinc-600 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Home View ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 bg-[#0a0a0a] min-h-screen">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Logo */}
        <h1 className="text-4xl md:text-5xl lg:text-[56px] tracking-tight mb-8 md:mb-12 text-zinc-100 font-serif text-center" style={{ fontFamily: "ui-serif, Georgia, Cambria, Times New Roman, Times, serif" }}>
          perplexity
        </h1>

        {/* Search Bar */}
        <div className="w-full bg-[#202020] border border-zinc-700/50 rounded-2xl p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-zinc-600 focus-within:border-zinc-600 transition-all mb-6 flex flex-col gap-2">
          <form onSubmit={handleFormSubmit} className="flex flex-col w-full min-h-[110px] justify-between">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="w-full bg-transparent px-3 py-3 outline-none text-lg text-zinc-200 placeholder:text-zinc-500 resize-none flex-1 font-sans"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="flex items-center gap-2">
                <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-zinc-800 text-sm font-medium text-zinc-400 transition-colors">
                  <Search className="w-4 h-4" /> Focus
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="p-2 rounded-full bg-zinc-600 text-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 hover:bg-zinc-500 transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Suggestions */}
        <div className="w-full bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-4 font-medium text-sm">
            <Monitor className="w-4 h-4" /> Try Computer
          </div>
          
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700/60 hover:bg-zinc-800 text-sm text-zinc-300 whitespace-nowrap transition-colors">
              <UserPlus className="w-4 h-4" /> Recruiting
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700/60 hover:bg-zinc-800 text-sm text-zinc-300 whitespace-nowrap transition-colors">
              <Briefcase className="w-4 h-4" /> Lead generation
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700/60 hover:bg-zinc-800 text-sm text-zinc-300 whitespace-nowrap transition-colors">
              <BookOpen className="w-4 h-4" /> Build a business
            </button>
          </div>

          <div className="flex flex-col gap-4 text-sm text-zinc-400">
            <button 
              onClick={() => setQuery("Find candidates for my open role")}
              className="text-left hover:text-zinc-200 transition-colors"
            >
              Find candidates for my open role
            </button>
            <button 
              onClick={() => setQuery("Research a candidate before interview")}
              className="text-left hover:text-zinc-200 transition-colors"
            >
              Research a candidate before interview
            </button>
            <button 
              onClick={() => setQuery("Benchmark salary for a role")}
              className="text-left hover:text-zinc-200 transition-colors"
            >
              Benchmark salary for a role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}