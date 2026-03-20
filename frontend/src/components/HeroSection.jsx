import { useEffect, useRef, useState } from "react";
import { Camera, Smartphone, ChevronDown } from "lucide-react";
import heroImage from "../assets/hero-dog.jpg";

/* ---------- Floating particle canvas ---------- */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 55;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });

      // Draw faint connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(96,165,250,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

/* ---------- Parallax wrapper ---------- */
const useParallax = (speed = 0.3) => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY * speed);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);
  return offset;
};

/* ---------- Hero ---------- */
const Hero = () => {
  const bgOffset = useParallax(0.25);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const fadeUp = (delay = 0) =>
    `transition-all duration-700 ease-out ${
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
    }`;

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-slate-950">
      {/* Deep gradient orbs — parallax */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translateY(${bgOffset}px)` }}
      >
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-blue-700/8 blur-[140px]" />
      </div>

      {/* Particle network */}
      <ParticleCanvas />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20 relative z-10 w-full">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">

          {/* ── Left column ── */}
          <div className="text-center lg:text-left">

            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold text-sm mb-6 ${fadeUp()}`}
              style={{ transitionDelay: "0ms" }}
            >
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Powered by AI &nbsp;·&nbsp; 98.5% Accuracy
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl md:text-5xl lg:text-[3.6rem] font-bold text-white leading-[1.1] tracking-tight mb-6 ${fadeUp()}`}
              style={{ transitionDelay: "100ms" }}
            >
              Discover Your Dog&apos;s{" "}
              <span className="relative inline-block">
                <span className="text-blue-400">True Breed</span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-400/80 to-blue-500/0" />
              </span>{" "}
              in Seconds
            </h1>

            {/* Sub */}
            <p
              className={`text-lg md:text-xl text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed ${fadeUp()}`}
              style={{ transitionDelay: "200ms" }}
            >
              Upload a photo or snap a picture — our AI instantly identifies breeds, compares
              traits, and gives you tailored care tips.
            </p>

            {/* CTAs */}
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 ${fadeUp()}`}
              style={{ transitionDelay: "300ms" }}
            >
              <a
                href="#predict"
                className="group relative inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-base overflow-hidden transition-all hover:bg-blue-500 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Camera className="w-5 h-5" />
                Try Live Scan
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-700 bg-white/5 text-slate-300 font-semibold text-base hover:border-blue-500/50 hover:text-white hover:bg-white/8 transition-all"
              >
                See How It Works
              </a>
            </div>

            {/* App badge */}
            <div
              className={`flex flex-col items-center lg:items-start gap-3 ${fadeUp()}`}
              style={{ transitionDelay: "380ms" }}
            >
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Smartphone className="w-4 h-4 text-blue-500" />
                Also available on Android
              </div>
              <button className="h-10 px-5 bg-slate-800 border border-slate-700 text-white rounded-xl flex items-center gap-2 hover:bg-slate-700 hover:border-slate-600 transition-all text-sm font-semibold shadow-sm">
                Download
              </button>
            </div>

           
          </div>

          {/* ── Right column: floating image card ── */}
          <div
            className={`relative ${fadeUp()}`}
            style={{ transitionDelay: "200ms" }}
          >
            {/* Glow behind image */}
            <div className="absolute inset-0 bg-blue-500/20 rounded-[32px] blur-3xl scale-90 pointer-events-none" />

            {/* Scan ring animation */}
            <div className="absolute -inset-4 rounded-[40px] border border-blue-500/20 animate-ping-slow pointer-events-none" />
            <div className="absolute -inset-8 rounded-[48px] border border-blue-500/10 animate-ping-slow pointer-events-none" style={{ animationDelay: "0.8s" }} />

            <div className="relative rounded-[32px] overflow-hidden border border-slate-700/60 shadow-2xl shadow-blue-900/30 animate-float">
              <img
                src={heroImage}
                alt="Happy golden retriever ready for breed scanning"
                className="w-full h-auto object-cover"
                style={{ aspectRatio: "4 / 3" }}
              />

              {/* Scan sweep overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent animate-scanline absolute" />
              </div>

              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-400/70 rounded-tl-sm" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-400/70 rounded-tr-sm" />
              <div className="absolute bottom-20 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-400/70 rounded-bl-sm" />
              <div className="absolute bottom-20 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-400/70 rounded-br-sm" />

              {/* Result card */}
              <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-60 bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 shadow-xl">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">
                  Top Prediction
                </div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-bold text-base text-white">Golden Retriever</span>
                  <span className="text-blue-400 font-bold text-sm">94%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                    style={{ width: "94%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600 animate-bounce z-10">
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-4 h-4" />
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

      <style>{`
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.06); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 2.5s ease-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        @keyframes scanline {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scanline {
          animation: scanline 2.4s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default Hero;