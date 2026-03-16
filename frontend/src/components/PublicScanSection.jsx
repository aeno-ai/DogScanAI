import { ScanWorkspace } from "../pages/ScanPage";

const PublicScanSection = () => {
  return (
    <section
      id="predict"
      className="relative py-24 bg-slate-950 overflow-hidden"
    >
      {/* Background orbs */}
      <div className="absolute -top-32 right-0 w-[480px] h-[480px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 left-0 w-[400px] h-[400px] bg-blue-500/8 blur-[100px] rounded-full pointer-events-none" />

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-semibold mb-5">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Guest Demo — No Account Required
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Try the Live{" "}
            <span className="text-blue-400">AI Scanner</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Upload any dog photo and our AI will identify the breed instantly.
            You get up to <span className="text-slate-200 font-medium">5 free scans</span> per device in demo mode.
          </p>
        </div>

        {/* Scanner panel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Glow ring */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-blue-500/30 via-transparent to-blue-600/20 pointer-events-none" />
          <div className="absolute -inset-4 rounded-[36px] bg-blue-500/5 blur-xl pointer-events-none" />

          <div className="relative rounded-3xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-blue-900/20 overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs text-slate-600 font-mono tracking-widest uppercase">
                DogScanAI — Demo Mode
              </span>
              <div className="flex items-center gap-1.5 text-xs text-blue-400/70">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live
              </div>
            </div>

            <div className="p-4 md:p-6">
              <ScanWorkspace inModal publicMode />
            </div>
          </div>
        </div>

        {/* Locked features hint */}
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-slate-500 text-sm">
            Want unlimited scans + advanced features?
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-5 py-2.5 rounded-xl transition-all"
          >
            Create a free account →
          </a>
        </div>
      </div>
    </section>
  );
};

export default PublicScanSection;