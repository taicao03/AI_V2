import { FormEvent, useState } from "react";
import { Loader2, LogIn, UserPlus, X, Shield, Lock, UserCircle } from "lucide-react";

type AuthPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (accountName: string, password: string) => Promise<boolean>;
  onSignUp: (
    displayName: string,
    accountName: string,
    password: string,
  ) => Promise<boolean>;
  loading: boolean;
  error: string | null;
};

export function AuthPanel({
  isOpen,
  onClose,
  onSignIn,
  onSignUp,
  loading,
  error,
}: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const success =
      mode === "login"
        ? await onSignIn(accountName.trim(), password)
        : await onSignUp(displayName.trim(), accountName.trim(), password);

    if (success) {
      if (mode === "register") {
        setNotice("Access granted. Initializing session...");
        setTimeout(() => setMode("login"), 1500);
      }
      // On success, the HomePage will likely re-render and remove the modal
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0f172a]/40 shadow-[0_0_80px_rgba(34,211,238,0.1)]">
        {/* Background Decorations */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-purple-500/10 blur-[80px]" />

        {/* Header */}
        <div className="relative border-b border-white/5 bg-white/5 px-8 py-8">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all"
          >
             <X size={20} />
          </button>
          
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                <Shield size={14} />
                Security Gateway
             </div>
             <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white italic">
                {mode === "login" ? "Authentication" : "Node Creation"}
             </h2>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/40 border border-white/5 p-1">
            <button
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                mode === "login" ? "bg-white text-black" : "text-slate-500 hover:text-white"
              }`}
              onClick={() => setMode("login")}
              type="button"
            >
              <LogIn size={14} />
              Login
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                mode === "register" ? "bg-white text-black" : "text-slate-500 hover:text-white"
              }`}
              onClick={() => setMode("register")}
              type="button"
            >
              <UserPlus size={14} />
              Register
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Public Alias</label>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 transition-all focus-within:border-cyan-400/50">
                    <UserCircle className="text-slate-500 shrink-0" size={18} />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="e.g. NeonGhost"
                      required
                      type="text"
                      value={displayName}
                    />
                  </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access Key ID</label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 transition-all focus-within:border-cyan-400/50">
                  <Shield className="text-slate-500 shrink-0" size={18} />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
                    autoComplete="username"
                    onChange={(event) => setAccountName(event.target.value)}
                    pattern="[a-zA-Z0-9_]{3,24}"
                    placeholder="Unique ID..."
                    required
                    type="text"
                    value={accountName}
                  />
                </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Phrase</label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 transition-all focus-within:border-cyan-400/50">
                  <Lock className="text-slate-500 shrink-0" size={18} />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                  />
                </div>
            </div>

            {(error || notice) && (
              <div className={`rounded-2xl border p-4 text-[10px] font-black uppercase tracking-tight ${
                error ? "border-rose-500/20 bg-rose-500/10 text-rose-400" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              }`}>
                <div className="flex items-center gap-2">
                   {error ? <X size={14} /> : <Shield size={14} />}
                   {error ?? notice}
                </div>
              </div>
            )}

            <button
              className="group relative flex w-full h-16 items-center justify-center gap-3 overflow-hidden rounded-[1.25rem] bg-cyan-500 text-black text-sm font-black uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(34,211,238,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-3">
                   {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
                   <span>{mode === "login" ? "Authorize" : "Initialize"}</span>
                </div>
              )}
            </button>
          </form>

          <p className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">
            By entering the arena, you agree to comply with <br /> the simulation protocols and security mandates.
          </p>
        </div>
      </div>
    </div>
  );
}
