import { ScanWorkspace } from "../pages/ScanPage";

const PublicScanSection = () => {
  return (
    <section
      id="predict"
      className="relative section-pad bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_60%)]" />
      <div className="absolute -top-20 right-0 h-64 w-64 bg-blue-500/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 left-10 h-72 w-72 bg-blue-400/15 blur-3xl rounded-full" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-500/10 to-transparent animate-scanline" />

      <div className="page-container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 animate-fade-up">
            Try Public Demo Scan
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto animate-fade-up-delayed">
            No account required. You get up to 5 scans per device in demo mode.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/70 shadow-2xl backdrop-blur-sm animate-fade-up-delayed-2">
          <ScanWorkspace inModal publicMode />
        </div>
      </div>
    </section>
  );
};

export default PublicScanSection;
