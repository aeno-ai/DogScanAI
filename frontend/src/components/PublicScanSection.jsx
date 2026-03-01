import { ScanWorkspace } from "../pages/ScanPage";

const PublicScanSection = () => {
  return (
    <section id="predict" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Try Public Demo Scan
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            No account required. You get up to 5 scans per device in demo mode.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 shadow-xl">
          <ScanWorkspace inModal publicMode />
        </div>
      </div>
    </section>
  );
};

export default PublicScanSection;
