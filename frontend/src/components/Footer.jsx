import { } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative bg-slate-950 border-t border-slate-800/60 overflow-hidden">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {/* Background orb */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-blue-600/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 relative z-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="sm:col-span-2">
            <a href="/" className="inline-flex items-center gap-2 mb-4 group">                
        
              <span className="text-lg font-bold text-white">
                DogScan<span className="text-blue-400">AI</span>
              </span>
            </a>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Smarter ways to understand your dog — breed, health, and everything in between. Made with love for pet parents.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {["Features", "How It Works", "Contact"].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(" ", "-")}`}
                    className="text-slate-500 hover:text-blue-400 text-sm transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} DogScanAI. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-pulse" />
            AI Systems Online
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;