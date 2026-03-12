import React, { useRef, useEffect } from "react";

/**
 * DogEyesCoverBlink
 *
 * Props:
 *  - size        : rendered pixel size
 *  - showPassword: when true → pupils hidden, lids solid with a crease line
 *  - showDebug   : red dot showing pointer mapping
 */
export default function DogEyesCoverBlink({ size = 240, showPassword = false, showDebug = false }) {
  const svgRef      = useRef(null);
  const leftG       = useRef(null);   // left pupil group
  const rightG      = useRef(null);   // right pupil group
  const leftCover   = useRef(null);   // left lid cover
  const rightCover  = useRef(null);   // right lid cover
  const leftLine    = useRef(null);   // left eyelid crease line
  const rightLine   = useRef(null);   // right eyelid crease line
  const tongueG     = useRef(null);
  const debugDot    = useRef(null);
  const rafRef      = useRef(null);
  const blinkRef    = useRef(null);
  const tongueRaf   = useRef(null);

  const target = useRef({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const cur    = useRef({ lx: 0, ly: 0, rx: 0, ry: 0 });

  // ── showPassword: hide/show pupils + open/close lids + show crease lines ──
  useEffect(() => {
    const lCover = leftCover.current;
    const rCover = rightCover.current;
    const lPupil = leftG.current;
    const rPupil = rightG.current;
    const lLine  = leftLine.current;
    const rLine  = rightLine.current;
    if (!lCover || !rCover || !lPupil || !rPupil || !lLine || !rLine) return;

    if (showPassword) {
      // 1. instantly hide pupils so they can't poke through
      lPupil.style.transition = "none";
      rPupil.style.transition = "none";
      lPupil.style.opacity    = "0";
      rPupil.style.opacity    = "0";
      // 2. snap lids shut
      lCover.style.transition = "none";
      rCover.style.transition = "none";
      lCover.style.opacity    = "1";
      rCover.style.opacity    = "1";
      // 3. show crease lines
      lLine.style.transition  = "none";
      rLine.style.transition  = "none";
      lLine.style.opacity     = "1";
      rLine.style.opacity     = "1";
    } else {
      // open everything simultaneously — no transitions on pupils so they
      // snap in at the exact same moment the white circle appears
      const t = "opacity 140ms ease-out";
      lCover.style.transition = t; rCover.style.transition = t;
      lLine.style.transition  = t; rLine.style.transition  = t;
      lCover.style.opacity    = "0"; rCover.style.opacity   = "0";
      lLine.style.opacity     = "0"; rLine.style.opacity    = "0";
      // snap — no fade, same frame as lid starts opening
      lPupil.style.transition = "none"; rPupil.style.transition = "none";
      lPupil.style.opacity    = "1";    rPupil.style.opacity    = "1";
    }
  }, [showPassword]);

  // ── Main setup: tracking, blinking, tongue ────────────────────────────────
  useEffect(() => {
    const svg    = svgRef.current;
    const left   = leftG.current;
    const right  = rightG.current;
    const lCover = leftCover.current;
    const rCover = rightCover.current;
    const tongue = tongueG.current;
    const dbg    = debugDot.current;

    if (!svg || !left || !right || !lCover || !rCover || !tongue) return;

    const LEFT_EYE     = { x: 17.7, y: 30.7 };
    const RIGHT_EYE    = { x: 46.3, y: 30.7 };
    const WHITE_R      = 6;
    const PUPIL_R      = 4.5;
    const SAFETY       = 0.35;
    const MAX_PUPIL    = Math.max(0, WHITE_R - PUPIL_R - SAFETY);
    const SMOOTH       = 0.16;
    const TRAVEL_SCALE = 0.08;

    // ── Pointer tracking ──────────────────────────────────────────────────
    function clientToSvg(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const vb   = svg.viewBox?.baseVal ?? { width: 64, height: 64 };
      return {
        x: ((clientX - rect.left) / rect.width)  * vb.width,
        y: ((clientY - rect.top)  / rect.height) * vb.height,
      };
    }

    function calcOffsets(p, eye) {
      const dx = p.x - eye.x;
      const dy = p.y - eye.y;
      const d  = Math.hypot(dx, dy);
      if (d === 0) return { tx: 0, ty: 0 };
      const travel = Math.min(MAX_PUPIL, d * TRAVEL_SCALE);
      return { tx: (dx / d) * travel, ty: (dy / d) * travel };
    }

    function onPointer(e) {
      const p = clientToSvg(e.clientX, e.clientY);
      if (showDebug && dbg) {
        dbg.setAttribute("cx", String(p.x));
        dbg.setAttribute("cy", String(p.y));
        dbg.style.display = "block";
      }
      const l = calcOffsets(p, LEFT_EYE);
      const r = calcOffsets(p, RIGHT_EYE);
      target.current = { lx: l.tx, ly: l.ty, rx: r.tx, ry: r.ty };
    }

    function onLeave() {
      target.current = { lx: 0, ly: 0, rx: 0, ry: 0 };
      if (showDebug && dbg) dbg.style.display = "none";
    }

    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("touchend", onLeave);

    // ── Pupil RAF loop ────────────────────────────────────────────────────
    function animate() {
      cur.current.lx += (target.current.lx - cur.current.lx) * SMOOTH;
      cur.current.ly += (target.current.ly - cur.current.ly) * SMOOTH;
      cur.current.rx += (target.current.rx - cur.current.rx) * SMOOTH;
      cur.current.ry += (target.current.ry - cur.current.ry) * SMOOTH;
      left.setAttribute("transform",  `translate(${cur.current.lx.toFixed(3)} ${cur.current.ly.toFixed(3)})`);
      right.setAttribute("transform", `translate(${cur.current.rx.toFixed(3)} ${cur.current.ry.toFixed(3)})`);
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    // ── Blink loop ────────────────────────────────────────────────────────
    const lLine = leftLine.current;
    const rLine = rightLine.current;

    function scheduleBlink() {
      blinkRef.current = setTimeout(doBlink, 1500 + Math.random() * 3500);
    }
    function doBlink() {
      // skip if showPassword is holding lids shut
      if (lCover.style.transition === "none" && lCover.style.opacity === "1") {
        scheduleBlink();
        return;
      }
      // close — lid + crease line together
      lCover.style.transition = "opacity 90ms linear";
      rCover.style.transition = "opacity 90ms linear";
      lCover.style.opacity    = "1";
      rCover.style.opacity    = "1";
      if (lLine && rLine) {
        lLine.style.transition = "opacity 90ms linear";
        rLine.style.transition = "opacity 90ms linear";
        lLine.style.opacity    = "1";
        rLine.style.opacity    = "1";
      }
      setTimeout(() => {
        if (lCover.style.transition !== "none") {
          // open — lid + crease line together
          lCover.style.opacity = "0";
          rCover.style.opacity = "0";
          if (lLine && rLine) {
            lLine.style.opacity = "0";
            rLine.style.opacity = "0";
          }
        }
        scheduleBlink();
      }, 90 + Math.random() * 170);
    }
    scheduleBlink();

    // ── Tongue: continuous sine-wave bob ──────────────────────────────────
    tongue.style.transformBox    = "fill-box";
    tongue.style.transformOrigin = "top center";
    tongue.style.transform       = "translateY(0px)";

    const TONGUE_AMP   = 2.8;
    const TONGUE_SPEED = 0.003;

    let tongueStart = null;
    function animateTongue(ts) {
      if (!tongueStart) tongueStart = ts;
      const y = TONGUE_AMP * Math.abs(Math.sin((ts - tongueStart) * TONGUE_SPEED * Math.PI));
      tongue.style.transform = `translateY(${y.toFixed(3)}px)`;
      tongueRaf.current = requestAnimationFrame(animateTongue);
    }
    tongueRaf.current = requestAnimationFrame(animateTongue);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("touchend", onLeave);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(tongueRaf.current);
      clearTimeout(blinkRef.current);
    };
  }, [showDebug, size]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", userSelect: "none", touchAction: "none" }}
    >
      <g>
        {/* Body */}
        <path
          d="M15.8 52.1C9 47.7 6.3 30.6 8.5 22.9c1.6-5.8 7.8-14.3 13.4-16.5c4.7-1.9 15.5-1.9 20.1 0c5.6 2.2 11.8 10.7 13.4 16.5c2.2 7.8.5 24.8-6.2 29.2c-14.2 9.2-19.2 9.2-33.4 0"
          fill="#f5d1ac"
        />

        {/* Ears */}
        <path d="M5.1 24.7c3.6 7.9 4.5 8.2 7.9-1.2c1.8-5 .5-8 2.7-11.2c1.2-1.8 3.9-4.8 3.9-4.8S-1.7 9.7 5.1 24.7" fill="#423223" />
        <path
          id="left-ear"
          d="M14.2 7.2c-5.4 3.5-16.9 2.1-10.1 17c3.6 7.9 4.5 8.2 7.9-1.2c1.8-5 .5-8 2.7-11.2c1.2-1.8 4.9-4.3 4.9-4.3s-1.7-2.7-5.4-.3"
          fill="#947151"
        />
        <use href="#left-ear" transform="translate(64 0) scale(-1 1)" />

        {/* Eye whites */}
        <circle cx="17.7" cy="30.7" r="6" fill="#ffffff" />
        <circle cx="46.3" cy="30.7" r="6" fill="#ffffff" />

        {/* Left pupil — hidden when showPassword */}
        <g ref={leftG} transform="translate(0 0)">
          <circle cx="16.2" cy="30.7" r="4.5" fill="#3e4347" />
          <circle cx="14.6" cy="28.7" r="1.2" fill="#ffffff" opacity="0.95" />
        </g>

        {/* Right pupil — hidden when showPassword */}
        <g ref={rightG} transform="translate(0 0)">
          <circle cx="47.8" cy="30.7" r="4.5" fill="#3e4347" />
          <circle cx="46.2" cy="28.7" r="1.2" fill="#ffffff" opacity="0.95" />
        </g>

        {/* Muzzle base */}
        <path d="M21.7 48.8l4.6 4.9c2.8 2.9 8.5 2.9 11.3 0l4.7-4.9l-4.8-5h-11l-4.8 5" fill="#7d644b" />

        {/* Tongue */}
        <g ref={tongueG}>
          <path d="M32 39.6s-4.9 7-4.3 10.3c.8 4.8 7.7 4.8 8.6 0c.6-3.3-4.3-10.3-4.3-10.3" fill="#f15a61" />
          <path d="M32 51.7l1.1-6.7h-2.2l1.1 6.7" fill="#ba454b" />
        </g>

        {/* Mouth bar */}
        <path fill="#423223" d="M27 41.5h10v4.6H27z" />

        {/* Muzzle overlay */}
        <path
          d="M47.8 42.6l-7.1-7.5c-4.3-4.5-13.1-4.5-17.4 0l-7.1 7.5c-2 2.1-2 5.6 0 7.7c2 2.1 5.3 2.1 7.3 0l7.1-7.5c.7-.7 2-.7 2.7 0l7.1 7.5c2 2.1 5.3 2.1 7.3 0c2.2-2.1 2.2-5.6.1-7.7"
          fill="#947151"
        />

        {/* Whisker dots */}
        <g fill="#3e4347">
          <path d="M26.1 35.7c0-2.6 2.6-3.1 5.9-3.1c3.3 0 5.9.5 5.9 3.1c0 2.1-4.7 3.9-5.9 3.9c-1.2 0-5.9-1.9-5.9-3.9" />
          <path d="M23.31 39.012l.989-.992l.991.989l-.989.991z" />
          <path d="M20.947 41.811l.989-.991l.99.989l-.988.99z" />
          <path d="M24.125 42.763l.989-.991l.991.988l-.988.992z" />
          <path d="M38.703 38.988l.992-.988l.988.991l-.991.989z" />
          <path d="M41.128 41.762l.992-.989l.988.991l-.991.989z" />
          <path d="M37.947 42.811l.991-.988l.989.99l-.991.99z" />
        </g>

        {/* ── Lid covers (skin color, hide pupils) ── */}
        <circle ref={leftCover}  cx="17.7" cy="30.7" r="6" fill="#f5d1ac" opacity="0" />
        <circle ref={rightCover} cx="46.3" cy="30.7" r="6" fill="#f5d1ac" opacity="0" />

        {/* ── Eyelid crease lines — visible only when eyes are shut ── */}
        {/* Drawn as a gentle arc across the middle of each eye */}
        <path
          ref={leftLine}
          d="M11.9 30.7 Q17.7 27.5 23.5 30.7"
          fill="none"
          stroke="#c4956a"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0"
        />
        <path
          ref={rightLine}
          d="M40.5 30.7 Q46.3 27.5 52.1 30.7"
          fill="none"
          stroke="#c4956a"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0"
        />

        {showDebug && (
          <circle ref={debugDot} cx="0" cy="0" r="0.9" fill="red"
            style={{ display: "none", pointerEvents: "none" }} />
        )}
      </g>
    </svg>
  );
}
