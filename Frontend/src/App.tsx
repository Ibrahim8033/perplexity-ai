import { BrowserRouter, Routes, Route } from "react-router";
import Auth from "./pages/Auth";
import Conversation from "./pages/Conversation";
import Dashboard from "./lib/Dashboard";
import { AuthProvider } from "./lib/AuthContext";
import { ToastProvider } from "./lib/toast-context";
import { Layout } from "./components/Layout";
import { useAuth } from "./lib/AuthContext";

function AuthLoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen w-full bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <h1
          className="text-3xl text-zinc-300 tracking-tight animate-pulse"
          style={{ fontFamily: "ui-serif, Georgia, serif" }}
        >
          perplexity
        </h1>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse-dot" />
          <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse-dot" />
          <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse-dot" />
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/c/:slug" element={<Conversation />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
