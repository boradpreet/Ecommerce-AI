// Compact AI-assistant hero loop for the auth page (portrait panel) — Voqly orange theme.
const { Stage, Sprite, useTime, Easing, clamp } = window;

const CY  = 'oklch(80% 0.17 55)';    // warm orange (primary accent)
const BL  = 'oklch(72% 0.17 40)';    // deep amber-orange
const VIO = 'oklch(75% 0.15 25)';    // rose-orange
const ICE = 'oklch(98% 0.015 70)';   // warm white
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";
const TAU = Math.PI * 2;
const wave = (t, p, ph = 0) => Math.sin(TAU * (t / p) + ph);

const DUR = 8;
const speak = (t) => (t % DUR) < 5.2; // mostly talking, brief pause

function Defs() {
  return (
    <defs>
      <filter id="ag" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <radialGradient id="aaura" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stopColor={CY} stopOpacity="0.26" />
        <stop offset="55%" stopColor={BL} stopOpacity="0.08" />
        <stop offset="100%" stopColor={BL} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="abody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CY} stopOpacity="0.16" />
        <stop offset="100%" stopColor={BL} stopOpacity="0.02" />
      </linearGradient>
    </defs>
  );
}

const PARTS = Array.from({ length: 28 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: 60 + r(1) * 640, y0: r(2) * 1080, k: 1 + Math.floor(r(3) * 2),
    sway: 12 + r(4) * 22, size: 1.4 + r(6) * 2.4,
    hue: r(7) < 0.5 ? CY : (r(7) < 0.8 ? VIO : BL), ph: r(8) * TAU };
});
function Particles({ t }) {
  return (
    <g filter="url(#ag)">
      {PARTS.map((p, i) => {
        const y = ((p.y0 - 60 * p.k * t) % 1080 + 1080) % 1080;
        const x = p.x + p.sway * wave(t, DUR, p.ph);
        const tw = 0.25 + 0.4 * (0.5 + 0.5 * wave(t, 4, p.ph));
        return <circle key={i} cx={x} cy={y} r={p.size} fill={p.hue} opacity={tw} />;
      })}
    </g>
  );
}

function Robot({ t }) {
  const cx = 380, headY = 420, r = 132;
  const spk = speak(t);
  const breathe = 7 * wave(t, 4);
  const sway = 5 * wave(t, DUR, 0.6);
  const nod = spk ? 3 * wave(t, 0.7) : 1.5 * wave(t, 4, 1);
  const bp = t % DUR % 3.2;
  const blink = bp < 0.14 ? Math.abs(Math.cos((bp / 0.14) * Math.PI)) : 1;
  const eyeRy = 5 * (0.25 + 0.75 * blink);
  const bars = [-34, -17, 0, 17, 34].map((dx) => ({
    dx, h: spk ? 5 + 18 * (0.5 + 0.5 * Math.sin(t * 14 + dx * 0.09)) : 3 }));
  return (
    <g transform={`translate(${sway}, ${breathe})`}>
      <ellipse cx={cx} cy={500} rx={330} ry={400} fill="url(#aaura)" />
      <g transform={`translate(0, ${nod})`} filter="url(#ag)">
        <path d={`M ${cx-270},980 C ${cx-276},760 ${cx-170},648 ${cx-68},624
            L ${cx-68},566 L ${cx+68},566 L ${cx+68},624
            C ${cx+170},648 ${cx+276},760 ${cx+270},980 Z`}
          fill="url(#abody)" stroke={CY} strokeWidth="2.4" strokeOpacity="0.9" strokeLinejoin="round" />
        <path d={`M ${cx-160},820 C ${cx-64},778 ${cx+64},778 ${cx+160},820`}
          fill="none" stroke={CY} strokeWidth="1.2" strokeOpacity="0.4" />
        <circle cx={cx} cy={headY} r={r} fill="url(#abody)" stroke={CY} strokeWidth="2.6" strokeOpacity="0.95" />
        <ellipse cx={cx} cy={headY} rx={r} ry={46} fill="none" stroke={CY} strokeWidth="1" strokeOpacity="0.28" />
        <ellipse cx={cx} cy={headY} rx={r} ry={94} fill="none" stroke={CY} strokeWidth="1" strokeOpacity="0.2" />
        <ellipse cx={cx} cy={headY} rx={50} ry={r} fill="none" stroke={CY} strokeWidth="1" strokeOpacity="0.22" />
        <ellipse cx={cx} cy={headY} rx={100} ry={r} fill="none" stroke={CY} strokeWidth="1" strokeOpacity="0.16" />
        <rect x={cx-86} y={headY-20} width={172} height={44} rx={22}
          fill={CY} fillOpacity="0.10" stroke={CY} strokeWidth="1.6" strokeOpacity="0.7" />
        <ellipse cx={cx-42} cy={headY} rx={10} ry={eyeRy} fill={ICE} />
        <ellipse cx={cx+42} cy={headY} rx={10} ry={eyeRy} fill={ICE} />
        <line x1={cx} y1={headY-r} x2={cx} y2={headY-r-28} stroke={CY} strokeWidth="2" strokeOpacity="0.7" />
        <circle cx={cx} cy={headY-r-32} r={6} fill={CY} />
        {bars.map((m, i) => (
          <rect key={i} x={cx + m.dx - 3} y={headY + 64 - m.h / 2} width={6} height={m.h} rx={3} fill={CY} opacity={0.85} />
        ))}
        <circle cx={cx} cy={800} r={16 + (spk ? 4 * (0.5 + 0.5 * Math.sin(t * 8)) : 0)} fill={CY} opacity="0.9" />
        <circle cx={cx} cy={800} r={28} fill="none" stroke={CY} strokeWidth="1.4" strokeOpacity="0.5" />
        <rect x={cx-140} y={headY - 132 + ((t * 120) % 660)} width={280} height={2} fill={CY} opacity={0.16} />
      </g>
    </g>
  );
}

function Waveform({ t }) {
  const spk = speak(t);
  const x0 = 150, x1 = 610, y = 600, N = 27;
  const bars = Array.from({ length: N }, (_, i) => {
    const c = 1 - Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);
    const amp = spk ? (6 + 30 * c) : (5 + 8 * c);
    const h = amp * (0.45 + 0.55 * Math.abs(Math.sin(t * (spk ? 9 : 3) + i * 0.5)));
    return { x: x0 + (i * (x1 - x0)) / (N - 1), h };
  });
  return (
    <g filter="url(#ag)">
      {bars.map((b, i) => (
        <rect key={i} x={b.x - 2.2} y={y - b.h / 2} width={4.4} height={b.h} rx={2.2}
          fill={CY} opacity={spk ? 0.9 : 0.5} />
      ))}
    </g>
  );
}

function Fx() {
  const t = useTime();
  return (
    <svg viewBox="0 0 760 1080" width="760" height="1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <Defs />
      <Particles t={t} />
      <g transform="translate(0,-46)">
        <Robot t={t} />
        <Waveform t={t} />
      </g>
    </svg>
  );
}

function Chip({ top, left, right, children, accent }) {
  const t = useTime();
  const float = 7 * wave(t, 5, left ? 0 : 2);
  return (
    <div style={{ position: 'absolute', top, left, right,
      transform: `translateY(${float}px)`,
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '11px 18px', borderRadius: 100,
      border: `1px solid ${accent ? 'rgba(255,180,120,0.4)' : 'rgba(255,210,180,0.22)'}`,
      background: 'rgba(28,18,10,0.55)', backdropFilter: 'blur(6px)',
      font: `600 12px ${MONO}`, letterSpacing: '0.16em', color: accent ? CY : 'rgba(255,225,200,0.8)',
      whiteSpace: 'nowrap' }}>
      {children}
    </div>
  );
}

function Pulse() {
  const t = useTime();
  return <span style={{ width: 8, height: 8, borderRadius: 9, background: CY,
    boxShadow: `0 0 10px ${CY}`, opacity: 0.5 + 0.5 * (0.5 + 0.5 * wave(t, 1.5)) }} />;
}

function TranscriptChip() {
  const t = useTime();
  const float = 6 * wave(t, 5, 1.2);
  return (
    <div style={{ position: 'absolute', bottom: 150, left: 40, right: 40,
      transform: `translateY(${float}px)`,
      padding: '16px 20px', borderRadius: 16,
      border: '1px solid rgba(255,190,140,0.25)', background: 'rgba(28,18,10,0.5)',
      backdropFilter: 'blur(6px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Pulse />
        <span style={{ font: `600 11px ${MONO}`, letterSpacing: '0.2em', color: CY, opacity: 0.85 }}>LIVE TRANSCRIPT</span>
      </div>
      <div style={{ font: `500 17px/1.4 ${SANS}`, color: ICE, opacity: 0.92 }}>
        "I can help you get set up in seconds — just sign in to begin."
      </div>
    </div>
  );
}

function Scene() {
  return (
    <Stage width={760} height={1080} duration={DUR} background="transparent" persistKey="aiauth">
      <Fx />
      <TranscriptChip />
    </Stage>
  );
}

window.SceneAuth = Scene;
