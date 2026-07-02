import { useEffect, useState } from 'react';

// Loading indicator: a line of fast-flickering "gibberish" glyphs above a slim
// indeterminate bar. Reads as a system decoding/booting rather than a dull
// spinner. Honors prefers-reduced-motion (glyphs + bar go still).
const GLYPHS = '!<>-_\\/[]{}=+*^?#~|:;0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const gib = (n) => {
  let s = '';
  for (let i = 0; i < n; i += 1) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  return s;
};

export default function GlitchLoader({ label = 'Loading', width = 24, compact = false }) {
  const [reduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
  const len = compact ? 14 : width;
  const [text, setText] = useState(() => gib(len));

  useEffect(() => {
    if (reduced) return undefined;
    let raf = 0;
    let last = 0;
    const tick = (t) => {
      // Re-roll the glyphs ~25×/sec — fast enough to read as a flicker.
      if (t - last >= 40) { setText(gib(len)); last = t; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, len]);

  return (
    <div className={compact ? 'vr-loader vr-loader--compact' : 'vr-loader'} role="status">
      <div className="vr-loader-inner">
        <div className="vr-loader-glyphs" aria-hidden="true">{text}</div>
        <div className="vr-loader-track"><span className="vr-loader-fill" /></div>
        <div className="vr-loader-label">{label}</div>
      </div>
    </div>
  );
}
