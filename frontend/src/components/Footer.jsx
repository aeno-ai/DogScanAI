import { Mail } from "lucide-react";

const EMAIL = "roes.rabaya.up@phinmaed.com";
const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=Hello%20DogScanAI&body=Hi%20DogScanAI%20team%2C%0A%0A`;

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
              Smarter ways to understand your dog — breed, health, and
              everything in between. Made with love for pet parents.
            </p>

            {/* Gmail contact pill */}
            <a
              href={GMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-3.5 py-2 rounded-full border border-slate-700/60 bg-slate-900 hover:border-blue-500/50 hover:bg-slate-800 transition-all group text-sm"
            >
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="#4285F4" strokeWidth="1.3" fill="none"/>
                <path d="M2 4L10 10L18 4" fill="#EA4335" fillOpacity="0.15"/>
                <path d="M2 5.5L10 11.5L18 5.5" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
                {EMAIL}
              </span>
              <span className="text-slate-600 group-hover:text-blue-400 transition-colors text-xs">
                ↗
              </span>
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#features" className="text-slate-500 hover:text-blue-400 text-sm transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-slate-500 hover:text-blue-400 text-sm transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/login" className="text-slate-500 hover:text-blue-400 text-sm transition-colors">
                  Sign in
                </a>
              </li>
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