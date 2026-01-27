import React, { useRef, useEffect } from "react";

/**
 * DogEyesCoverBlink — adjusted so only the pupil moves and it never leaves the white
 * - size: rendered pixel size (keeps viewBox 0..64)
 * - showDebug: if true shows a tiny red dot where pointer maps in SVG coords
 *
 * Key change: compute the maximum allowed pupil translation from the white eye radius
 * and the pupil radius. We clamp travel so the pupil center never goes outside the
 * white circle.
 */
export default function DogEyesCoverBlink({ size = 240, showDebug = false }) {
  const svgRef = useRef(null);
  const leftG = useRef(null);
  const rightG = useRef(null);
  const leftCover = useRef(null);
  const rightCover = useRef(null);
  const debugDot = useRef(null);
  const rafRef = useRef(null);
  const blinkRef = useRef(null);

  // smoothing targets
  const target = useRef({ lx: 0, ly: 0, rx: 0, ry: 0 });
  const cur = useRef({ lx: 0, ly: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    const left = leftG.current;
    const right = rightG.current;
    const lCover = leftCover.current;
    const rCover = rightCover.current;
    const dbg = debugDot.current;

    if (!svg || !left || !right || !lCover || !rCover) {
      console.warn("DogEyesCoverBlink: missing refs");
      return;
    }

    // Eye centers in SVG user units (viewBox 0..64)
    const LEFT_EYE = { x: 17.7, y: 30.7 };
    const RIGHT_EYE = { x: 46.3, y: 30.7 };

    // white and pupil radii (must match the SVG circles below)
    const WHITE_R = 6; // white eye radius
    const PUPIL_R = 4.5; // pupil radius in the <g> children
    const SAFETY = 0.35; // small inward margin so pupil never touches the white edge

    // maximum translation so the pupil center stays inside the white circle
    const MAX_PUPIL = Math.max(0, WHITE_R - PUPIL_R - SAFETY);

    const SMOOTH = 0.16; // 0..1, higher is snappier
    const TRAVEL_SCALE = 0.08; // how strongly pointer distance maps to travel

    // initialize cover styles
    lCover.style.transition = "opacity 90ms linear";
    rCover.style.transition = "opacity 90ms linear";
    lCover.style.opacity = "0";
    rCover.style.opacity = "0";

    // map client coords -> svg user coords using bounding rect + viewBox scaling
    function clientToSvg(clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const vb =
        svg.viewBox && svg.viewBox.baseVal
          ? { w: svg.viewBox.baseVal.width, h: svg.viewBox.baseVal.height }
          : { w: 64, h: 64 };
      const x = ((clientX - rect.left) / rect.width) * vb.w;
      const y = ((clientY - rect.top) / rect.height) * vb.h;
      return { x, y };
    }

    function calcOffsets(p, eye) {
      const dx = p.x - eye.x;
      const dy = p.y - eye.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) return { tx: 0, ty: 0 };

      // desired travel scales with distance but is clamped to MAX_PUPIL.
      const desired = d * TRAVEL_SCALE;
      const travel = Math.min(MAX_PUPIL, desired);
      const tx = (dx / d) * travel;
      const ty = (dy / d) * travel;
      return { tx, ty };
    }

    function onPointer(e) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const p = clientToSvg(clientX, clientY);

      if (showDebug && dbg) {
        dbg.setAttribute("cx", String(p.x));
        dbg.setAttribute("cy", String(p.y));
        dbg.style.display = "block";
      }

      const l = calcOffsets(p, LEFT_EYE);
      const r = calcOffsets(p, RIGHT_EYE);
      target.current.lx = l.tx;
      target.current.ly = l.ty;
      target.current.rx = r.tx;
      target.current.ry = r.ty;
    }

    function onLeave() {
      target.current = { lx: 0, ly: 0, rx: 0, ry: 0 };
      if (showDebug && debugDot.current) debugDot.current.style.display = "none";
    }

    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("touchend", onLeave);

    // animation loop (lerp)
    function animate() {
      cur.current.lx += (target.current.lx - cur.current.lx) * SMOOTH;
      cur.current.ly += (target.current.ly - cur.current.ly) * SMOOTH;
      cur.current.rx += (target.current.rx - cur.current.rx) * SMOOTH;
      cur.current.ry += (target.current.ry - cur.current.ry) * SMOOTH;

      left.setAttribute(
        "transform",
        `translate(${cur.current.lx.toFixed(3)} ${cur.current.ly.toFixed(3)})`,
      );
      right.setAttribute(
        "transform",
        `translate(${cur.current.rx.toFixed(3)} ${cur.current.ry.toFixed(3)})`,
      );

      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    // blinking using cover shapes
    function scheduleBlink() {
      const t = 1500 + Math.random() * 3500; // 1.5 - 5s
      blinkRef.current = setTimeout(() => doBlink(), t);
    }
    function doBlink() {
      // show covers (appear in front because they are rendered later in the SVG)
      lCover.style.opacity = "1";
      rCover.style.opacity = "1";
      // short close, then open
      setTimeout(
        () => {
          lCover.style.opacity = "0";
          rCover.style.opacity = "0";
          scheduleBlink();
        },
        90 + Math.random() * 170,
      ); // 90 - 260ms blink
    }
    scheduleBlink();

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("touchend", onLeave);
      cancelAnimationFrame(rafRef.current);
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
        <path
          d="M15.8 52.1C9 47.7 6.3 30.6 8.5 22.9c1.6-5.8 7.8-14.3 13.4-16.5c4.7-1.9 15.5-1.9 20.1 0c5.6 2.2 11.8 10.7 13.4 16.5c2.2 7.8.5 24.8-6.2 29.2c-14.2 9.2-19.2 9.2-33.4 0"
          fill="#f5d1ac"
        />
        <path
          d="M5.1 24.7c3.6 7.9 4.5 8.2 7.9-1.2c1.8-5 .5-8 2.7-11.2c1.2-1.8 3.9-4.8 3.9-4.8S-1.7 9.7 5.1 24.7"
          fill="#423223"
        />
        <path
          d="M14.2 7.2c-5.4 3.5-16.9 2.1-10.1 17c3.6 7.9 4.5 8.2 7.9-1.2c1.8-5 .5-8 2.7-11.2c1.2-1.8 4.9-4.3 4.9-4.3s-1.7-2.7-5.4-.3"
          fill="#947151"
        />
        <path
          d="M58.9 24.6c-3.6 7.9-4.5 8.2-7.9-1.2c-1.8-5-.5-8-2.7-11.2c-1.2-1.8-3.9-4.8-3.9-4.8s21.3 2.3 14.5 17.2"
          fill="#423223"
        />
        <path
          id="left-ear"
          d="M14.2 7.2c-5.4 3.5-16.9 2.1-10.1 17c3.6 7.9 4.5 8.2 7.9-1.2c1.8-5 .5-8 2.7-11.2c1.2-1.8 4.9-4.3 4.9-4.3s-1.7-2.7-5.4-.3"
          fill="#947151"
        />
        <use href="#left-ear" transform="translate(64 0) scale(-1 1)" />
        {/* left eye white */}
        <circle cx="17.7" cy="30.7" r="6" fill="#ffffff" />
        {/* right eye white */}
        <circle cx="46.3" cy="30.7" r="6" fill="#ffffff" />

        {/* left pupil group (moves) */}
        <g ref={leftG} transform="translate(0 0)">
          <circle cx="16.2" cy="30.7" r="4.5" fill="#3e4347" />
          <circle cx="14.6" cy="28.7" r="1.2" fill="#ffffff" opacity="0.95" />
        </g>

        {/* right pupil group (moves) */}
        <g ref={rightG} transform="translate(0 0)">
          <circle cx="47.8" cy="30.7" r="4.5" fill="#3e4347" />
          <circle cx="46.2" cy="28.7" r="1.2" fill="#ffffff" opacity="0.95" />
        </g>

        {/* other facial parts */}
        <path
          d="M21.7 48.8l4.6 4.9c2.8 2.9 8.5 2.9 11.3 0l4.7-4.9l-4.8-5h-11l-4.8 5"
          fill="#7d644b"
        />
        <path
          d="M32 39.6s-4.9 7-4.3 10.3c.8 4.8 7.7 4.8 8.6 0c.6-3.3-4.3-10.3-4.3-10.3"
          fill="#f15a61"
        />
        <path d="M32 51.7l1.1-6.7h-2.2l1.1 6.7" fill="#ba454b" />
        <path fill="#423223" d="M27 41.5h10v4.6H27z" />
        <path
          d="M47.8 42.6l-7.1-7.5c-4.3-4.5-13.1-4.5-17.4 0l-7.1 7.5c-2 2.1-2 5.6 0 7.7c2 2.1 5.3 2.1 7.3 0l7.1-7.5c.7-.7 2-.7 2.7 0l7.1 7.5c2 2.1 5.3 2.1 7.3 0c2.2-2.1 2.2-5.6.1-7.7"
          fill="#947151"
        />
        <g fill="#3e4347">
          <path d="M26.1 35.7c0-2.6 2.6-3.1 5.9-3.1c3.3 0 5.9.5 5.9 3.1c0 2.1-4.7 3.9-5.9 3.9c-1.2 0-5.9-1.9-5.9-3.9" />
          <path d="M23.31 39.012l.989-.992l.991.989l-.989.991z" />
          <path d="M20.947 41.811l.989-.991l.99.989l-.988.99z" />
          <path d="M24.125 42.763l.989-.991l.991.988l-.988.992z" />
          <path d="M38.703 38.988l.992-.988l.988.991l-.991.989z" />
          <path d="M41.128 41.762l.992-.989l.988.991l-.991.989z" />
          <path d="M37.947 42.811l.991-.988l.989.99l-.991.99z" />
        </g>

        {/* DUPLICATED white shapes used as blink covers — placed after pupils so they render on top */}
        <circle
          ref={leftCover}
          cx="17.7"
          cy="30.7"
          r="6"
          fill="#f5d1ac"
          opacity="0"
        />
        <circle
          ref={rightCover}
          cx="46.3"
          cy="30.7"
          r="6"
          fill="#f5d1ac"
          opacity="0"
        />

        {/* debug dot (visible if showDebug true) */}
        {showDebug && (
          <circle
            ref={debugDot}
            cx="0"
            cy="0"
            r="0.9"
            fill="red"
            style={{ display: "none", pointerEvents: "none" }}
          />
        )}
      </g>
    </svg>
  );
}
