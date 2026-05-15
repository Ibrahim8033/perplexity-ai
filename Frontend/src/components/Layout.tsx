import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden text-foreground">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 bg-[#0a0a0a] sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span
            className="text-lg text-zinc-200 tracking-tight"
            style={{ fontFamily: "ui-serif, Georgia, serif" }}
          >
            perplexity
          </span>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Top-right Links (desktop only) */}
        <div className="hidden md:flex absolute top-4 right-8 gap-6 text-sm font-medium text-zinc-500 z-10">
          <span className="hover:text-zinc-200 cursor-pointer transition-colors">Discover</span>
          <span className="hover:text-zinc-200 cursor-pointer transition-colors">Finance</span>
          <span className="hover:text-zinc-200 cursor-pointer transition-colors">Health</span>
          <span className="hover:text-zinc-200 cursor-pointer transition-colors">Academic</span>
          <span className="hover:text-zinc-200 cursor-pointer transition-colors">Patents</span>
        </div>
        
        <Outlet />
      </main>
    </div>
  );
}
