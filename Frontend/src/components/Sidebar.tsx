import { Link, useLocation, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  Monitor,
  Library,
  Box,
  Settings,
  History,
  Plus,
  LogIn,
  LogOut,
  User as UserIcon,
  MessageCircle,
  X,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "./ui/button";
import { fetchConversations, deleteConversation } from "@/lib/api";
import type { ConversationSummary } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toastError } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch conversations when user is logged in
  const refreshConversations = () => {
    if (!session) return;
    fetchConversations(session)
      .then((convos) => setConversations(convos))
      .catch((err) => console.error("Failed to fetch conversations:", err))
      .finally(() => setLoadingConversations(false));
  };

  // Fetch conversations when user is logged in
  useEffect(() => {
    if (!session) {
      setConversations([]);
      return;
    }

    setLoadingConversations(true);
    refreshConversations();
  }, [session]);

  // Listen for new conversation created events from Dashboard
  useEffect(() => {
    const handler = () => refreshConversations();
    window.addEventListener("conversation-created", handler);
    return () => window.removeEventListener("conversation-created", handler);
  }, [session]);

  const handleNewThread = () => {
    onClose?.();
    // Navigate to home with a state flag to reset the Dashboard
    // Use a unique key to force re-render even if already on "/"
    navigate("/", { state: { reset: Date.now() } });
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conv: ConversationSummary) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(conv.id);

    // Optimistic removal
    setConversations((prev) => prev.filter((c) => c.id !== conv.id));

    // If the user is currently viewing this conversation, navigate home
    if (location.pathname === `/c/${conv.slug}`) {
      navigate("/", { state: { reset: Date.now() } });
    }

    try {
      await deleteConversation(session, conv.id);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      toastError("Failed to delete conversation");
      // Revert optimistic removal
      refreshConversations();
    } finally {
      setDeletingId(null);
    }
  };

  const handleNavClick = (label: string) => {
    onClose?.();
    // TODO: Implement these pages. For now, show a coming-soon toast.
    toastError(`${label} is coming soon!`);
  };

  const navItems = [
    { icon: Monitor, label: "Computer" },
    { icon: Library, label: "Spaces" },
    { icon: Box, label: "Artefacts" },
    { icon: Settings, label: "Customise" },
  ];

  const sidebarContent = (
    <>
      {/* Top Section */}
      <div className="px-4 flex flex-col gap-4">
        {/* Logo & mobile close */}
        <div className="flex items-center justify-between px-2">
          <button onClick={handleNewThread} className="flex items-center gap-2 text-foreground">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </button>
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* New Thread button */}
        <Button
          variant="secondary"
          className="w-full justify-start rounded-full font-medium bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 border-0"
          onClick={handleNewThread}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Thread
        </Button>

        {/* Nav links */}
        <div className="flex flex-col gap-0.5 text-sm font-medium text-zinc-500">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 hover:text-zinc-300 transition-colors text-left"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Conversation history */}
        <div className="mt-2">
          <span className="px-3 text-[11px] uppercase tracking-wider text-zinc-600 font-medium mb-2 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            History
          </span>

          {loadingConversations && (
            <div className="flex flex-col gap-2 px-3 mt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 rounded bg-zinc-800/40 animate-shimmer" style={{ width: `${70 + i * 8}%` }} />
              ))}
            </div>
          )}

          {!loadingConversations && conversations.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              {conversations.slice(0, 10).map((conv) => (
                <div
                  key={conv.id}
                  className="group relative flex items-center"
                >
                  <Link
                    to={`/c/${conv.slug}`}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm truncate transition-colors w-full pr-8 ${
                      location.pathname === `/c/${conv.slug}`
                        ? "bg-zinc-800/60 text-zinc-200"
                        : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{conv.title || "Untitled"}</span>
                  </Link>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv)}
                    disabled={deletingId === conv.id}
                    className="absolute right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all text-zinc-600 hover:text-red-400 hover:bg-red-400/10 focus:opacity-100 disabled:opacity-50"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loadingConversations && conversations.length === 0 && user && (
            <p className="px-3 text-xs text-zinc-600 mt-2">No recent threads</p>
          )}

          {!user && (
            <p className="px-3 text-xs text-zinc-600 mt-2">Sign in to see history</p>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-4 mt-auto">
        {user ? (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-800/40 text-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 border border-zinc-700/30">
                <UserIcon className="h-4 w-4 text-zinc-400" />
              </div>
              <span className="truncate font-medium text-zinc-300 text-[13px]">
                {user.user_metadata?.full_name ?? user.email}
              </span>
            </div>
            <button
              onClick={() => {
                signOut();
                onClose?.();
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            asChild
          >
            <Link to="/auth" onClick={onClose}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Link>
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] h-screen border-r border-zinc-800/50 bg-[#111] flex-col justify-between py-4 flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Slide-in sidebar */}
          <aside className="md:hidden fixed inset-y-0 left-0 w-[280px] bg-[#111] border-r border-zinc-800/50 z-50 flex flex-col justify-between py-4 animate-slide-in-left shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
