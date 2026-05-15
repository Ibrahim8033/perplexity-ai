import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

const supabase = createClient();

export default function Auth() {
    const navigate = useNavigate();
    const { toastError } = useToast();
    const [loading, setLoading] = useState(false);

    // If the user is already logged in, send them to the dashboard
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate("/");
        });
    }, []);

    async function login(provider: "github" | "google") {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                // After Google/GitHub auth, redirect back to the dashboard
                redirectTo: `${window.location.origin}/`,
            },
        });

        if (error) {
            console.error("[Auth] OAuth error:", error.message);
            toastError(`Login failed: ${error.message}`);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <h1
                        className="text-4xl md:text-5xl text-zinc-100 tracking-tight mb-3"
                        style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
                    >
                        perplexity
                    </h1>
                    <p className="text-zinc-500 text-sm">Sign in to continue</p>
                </div>

                {/* Auth card */}
                <div className="bg-[#161616] border border-zinc-800/60 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                    <div className="flex flex-col gap-3">
                        {/* Google button */}
                        <button
                            onClick={() => login("google")}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-xl bg-white text-zinc-900 font-medium text-[15px] hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            {loading ? "Redirecting..." : "Continue with Google"}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-1">
                            <div className="flex-1 h-px bg-zinc-800"></div>
                            <span className="text-xs text-zinc-600 uppercase tracking-wider font-medium">or</span>
                            <div className="flex-1 h-px bg-zinc-800"></div>
                        </div>

                        {/* GitHub button */}
                        <button
                            onClick={() => login("github")}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-xl bg-[#1e1e1e] text-zinc-200 font-medium text-[15px] border border-zinc-700/50 hover:bg-[#282828] hover:border-zinc-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                            </svg>
                            {loading ? "Redirecting..." : "Continue with GitHub"}
                        </button>
                    </div>

                    {/* Terms */}
                    <p className="text-[11px] text-zinc-600 text-center mt-6 leading-relaxed">
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>

                {/* Back link */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => navigate("/")}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        ← Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
