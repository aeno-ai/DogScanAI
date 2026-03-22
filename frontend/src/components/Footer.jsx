import { useUI } from "../context/UIContext";

const EMAIL = "roes.rabaya.up@phinmaed.com";
const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=Hello%20DogScanAI&body=Hi%20DogScanAI%20team%2C%0A%0A`;

const Footer = () => {
  const { resolvedTheme } = useUI();
  const isDark = resolvedTheme === "dark";

  return (
    <footer
      className={`relative overflow-hidden border-t ${
        isDark
          ? "bg-slate-950 border-slate-800/60"
          : "bg-white border-slate-200/80"
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
          isDark ? "via-blue-500/30" : "via-blue-500/20"
        } to-transparent`}
      />

      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] rounded-full pointer-events-none blur-[80px] ${
          isDark ? "bg-blue-600/5" : "bg-blue-600/10"
        }`}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 relative z-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-10">
          <div className="sm:col-span-2">
            <a href="/" className="inline-flex items-center gap-2 mb-4 group">
              <span className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                DogScan<span className="text-blue-400">AI</span>
              </span>
            </a>
            <p
              className={`text-sm leading-relaxed max-w-xs ${
                isDark ? "text-slate-500" : "text-slate-600"
              }`}
            >
              Smarter ways to understand your dog: breed, health, and everything
              in between. Made with love for pet parents.
            </p>

            <a
              href={GMAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 mt-5 px-3.5 py-2 rounded-full border transition-all group text-sm ${
                isDark
                  ? "border-slate-700/60 bg-slate-900 hover:border-blue-500/50 hover:bg-slate-800"
                  : "border-slate-200 bg-slate-50 hover:border-blue-500/40 hover:bg-blue-50/70"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 shrink-0"
              >
                <rect
                  x="2"
                  y="4"
                  width="16"
                  height="12"
                  rx="2"
                  stroke="#4285F4"
                  strokeWidth="1.3"
                  fill="none"
                />
                <path d="M2 4L10 10L18 4" fill="#EA4335" fillOpacity="0.15" />
                <path
                  d="M2 5.5L10 11.5L18 5.5"
                  stroke="#EA4335"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span
                className={`transition-colors ${
                  isDark
                    ? "text-slate-400 group-hover:text-slate-200"
                    : "text-slate-600 group-hover:text-slate-900"
                }`}
              >
                {EMAIL}
              </span>
              <span
                className={`transition-colors text-xs ${
                  isDark
                    ? "text-slate-600 group-hover:text-blue-400"
                    : "text-slate-400 group-hover:text-blue-500"
                }`}
              >
                ↗
              </span>
            </a>
          </div>

          <div>
            <h4
              className={`text-xs uppercase tracking-widest font-semibold mb-4 ${
                isDark ? "text-slate-600" : "text-slate-500"
              }`}
            >
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="#features"
                  className={`text-sm transition-colors ${
                    isDark
                      ? "text-slate-500 hover:text-blue-400"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className={`text-sm transition-colors ${
                    isDark
                      ? "text-slate-500 hover:text-blue-400"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  className={`text-sm transition-colors ${
                    isDark
                      ? "text-slate-500 hover:text-blue-400"
                      : "text-slate-600 hover:text-blue-600"
                  }`}
                >
                  Sign in
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className={`mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDark ? "border-slate-800/60" : "border-slate-200"
          }`}
        >
          <p className={`text-xs ${isDark ? "text-slate-600" : "text-slate-500"}`}>
            © {new Date().getFullYear()} DogScanAI. All rights reserved.
          </p>
          <div
            className={`flex items-center gap-1.5 text-xs ${
              isDark ? "text-slate-700" : "text-slate-500"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-pulse" />
            AI Systems Online
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
