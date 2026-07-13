// AI Health-Call holographic scene — composed on the animations.jsx engine.
const { Stage, Sprite, useTime, Easing, interpolate, clamp } = window;

// ── Palette ──────────────────────────────────────────────────────────────
const CY   = 'oklch(82% 0.15 200)';   // cyan
const CY_D = 'oklch(70% 0.16 210)';
const BL   = 'oklch(70% 0.17 255)';   // blue
const VIO  = 'oklch(72% 0.15 300)';   // subtle violet
const GRN  = 'oklch(80% 0.16 162)';   // medical mint-green
const ICE  = 'oklch(97% 0.02 210)';
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Space Grotesk', system-ui, sans-serif";

const TAU = Math.PI * 2;
const wave = (t, period, phase = 0) => Math.sin(TAU * (t / period) + phase);

const aiSpeak    = (t) => (t > 1.9 && t < 4.4) || (t > 6.8 && t < 9.7) || (t > 12.0 && t < 13.4);
const humanSpeak = (t) => (t > 4.4 && t < 6.8) || (t > 9.7 && t < 11.9);

function Defs() {
  return (
    <defs>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <radialGradient id="aura" cx="50%" cy="42%" r="60%">
        <stop offset="0%"  stopColor={CY}  stopOpacity="0.22" />
        <stop offset="55%" stopColor={BL}  stopOpacity="0.07" />
        <stop offset="100%" stopColor={BL} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="auraG" cx="50%" cy="42%" r="60%">
        <stop offset="0%"  stopColor={GRN} stopOpacity="0.2" />
        <stop offset="55%" stopColor={GRN} stopOpacity="0.06" />
        <stop offset="100%" stopColor={GRN} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"  stopColor={CY}  stopOpacity="0" />
        <stop offset="50%" stopColor={CY}  stopOpacity="0.9" />
        <stop offset="100%" stopColor={BL} stopOpacity="0" />
      </linearGradient>
      <linearGradient id="bodyFillAI" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor={CY} stopOpacity="0.14" />
        <stop offset="100%" stopColor={BL} stopOpacity="0.02" />
      </linearGradient>
      <linearGradient id="bodyFillHU" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor={ICE} stopOpacity="0.12" />
        <stop offset="100%" stopColor={BL}  stopOpacity="0.02" />
      </linearGradient>
    </defs>
  );
}

// ── Drifting data particles ───────────────────────────────────────────────
const PARTS = Array.from({ length: 40 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    x: 120 + r(1) * 1680, y0: r(2) * 1080,
    k: 1 + Math.floor(r(3) * 3), sway: 14 + r(4) * 26,
    swayK: 1 + Math.floor(r(5) * 2), size: 1.5 + r(6) * 2.6,
    hue: r(7) < 0.5 ? CY : (r(7) < 0.8 ? GRN : BL), ph: r(8) * TAU,
  };
});
function Particles() {
  const t = useTime();
  return (
    <g filter="url(#glow)">
      {PARTS.map((p, i) => {
        const y = ((p.y0 - 72 * p.k * t) % 1080 + 1080) % 1080;
        const x = p.x + p.sway * wave(t, 15 / p.swayK, p.ph);
        const tw = 0.3 + 0.4 * (0.5 + 0.5 * wave(t, 5, p.ph));
        return <circle key={i} cx={x} cy={y} r={p.size} fill={p.hue} opacity={tw} />;
      })}
    </g>
  );
}

// ── Holographic bust (AI / patient) ───────────────────────────────────────
function Figure({ cx, variant, t }) {
  const ai = variant === 'ai';
  const speaking = ai ? aiSpeak(t) : humanSpeak(t);
  const stroke = ai ? CY : ICE;
  const accent = ai ? CY : BL;

  const breathe = 7 * wave(t, 5, ai ? 0 : Math.PI);
  const sway    = 5 * wave(t, 7.5, ai ? 0.6 : 2.1);
  const nod     = speaking ? 3 * wave(t, 0.7) : 1.5 * wave(t, 6, ai ? 1 : 3);

  const bp = ((t + (ai ? 0 : 1.8)) % 3.75);
  const blink = bp < 0.14 ? Math.abs(Math.cos((bp / 0.14) * Math.PI)) : 1;
  const eyeRy = (ai ? 4 : 5) * (0.25 + 0.75 * blink);

  const mouthBars = [-30, -15, 0, 15, 30].map((dx) => {
    const h = speaking ? 4 + 16 * (0.5 + 0.5 * Math.sin(t * 14 + dx * 0.09)) : 3;
    return { dx, h };
  });
  const humanMouthRy = speaking ? 4 + 7 * (0.5 + 0.5 * Math.sin(t * 13)) : 0;

  const headY = 460, r = 120;

  return (
    <g transform={`translate(${sway}, ${breathe})`}>
      <ellipse cx={cx} cy={520} rx={300} ry={360} fill={ai ? 'url(#auraG)' : 'url(#aura)'} />
      <g transform={`translate(0, ${nod})`} filter="url(#glow)">
        <path
          d={`M ${cx-250},905 C ${cx-256},715 ${cx-158},612 ${cx-64},590
              L ${cx-64},540 L ${cx+64},540 L ${cx+64},590
              C ${cx+158},612 ${cx+256},715 ${cx+250},905 Z`}
          fill={ai ? 'url(#bodyFillAI)' : 'url(#bodyFillHU)'}
          stroke={stroke} strokeWidth="2.2" strokeOpacity="0.9" strokeLinejoin="round" />
        <path d={`M ${cx-150},760 C ${cx-60},720 ${cx+60},720 ${cx+150},760`}
              fill="none" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.4" />
        <path d={`M ${cx-180},840 C ${cx-70},800 ${cx+70},800 ${cx+180},840`}
              fill="none" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.3" />

        <circle cx={cx} cy={headY} r={r} fill={ai ? 'url(#bodyFillAI)' : 'url(#bodyFillHU)'}
                stroke={stroke} strokeWidth="2.4" strokeOpacity="0.95" />
        <ellipse cx={cx} cy={headY} rx={r} ry={42}  fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.28" />
        <ellipse cx={cx} cy={headY} rx={r} ry={86}  fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.2" />
        <ellipse cx={cx} cy={headY} rx={46} ry={r}  fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.22" />
        <ellipse cx={cx} cy={headY} rx={92} ry={r}  fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.16" />

        {ai ? (
          <>
            <rect x={cx-78} y={headY-18} width={156} height={40} rx={20}
                  fill={CY} fillOpacity="0.10" stroke={CY} strokeWidth="1.6" strokeOpacity="0.7" />
            <ellipse cx={cx-38} cy={headY} rx={9} ry={eyeRy} fill={ICE} />
            <ellipse cx={cx+38} cy={headY} rx={9} ry={eyeRy} fill={ICE} />
            <line x1={cx} y1={headY-r} x2={cx} y2={headY-r-26} stroke={CY} strokeWidth="2" strokeOpacity="0.7" />
            <circle cx={cx} cy={headY-r-30} r={6} fill={CY} />
            {mouthBars.map((m, i) => (
              <rect key={i} x={cx + m.dx - 3} y={headY + 58 - m.h / 2} width={6} height={m.h} rx={3}
                    fill={CY} opacity={0.85} />
            ))}
            {/* chest core with medical cross */}
            <circle cx={cx} cy={715} r={20 + (speaking ? 4 * (0.5 + 0.5 * Math.sin(t * 8)) : 0)}
                    fill={GRN} opacity="0.16" stroke={GRN} strokeWidth="1.6" strokeOpacity="0.8" />
            <rect x={cx-3} y={705} width={6} height={20} rx={2} fill={GRN} />
            <rect x={cx-10} y={712} width={20} height={6} rx={2} fill={GRN} />
          </>
        ) : (
          <>
            <ellipse cx={cx-40} cy={headY-6} rx={11} ry={eyeRy} fill={ICE} opacity="0.95" />
            <ellipse cx={cx+40} cy={headY-6} rx={11} ry={eyeRy} fill={ICE} opacity="0.95" />
            {speaking
              ? <ellipse cx={cx} cy={headY+52} rx={20} ry={humanMouthRy} fill={ICE} opacity="0.75" />
              : <path d={`M ${cx-26},${headY+48} Q ${cx},${headY+64} ${cx+26},${headY+48}`}
                      fill="none" stroke={ICE} strokeWidth="3" strokeOpacity="0.7" strokeLinecap="round" />}
            <path d={`M ${cx-r-6},${headY-4} A ${r+8} ${r+8} 0 0 1 ${cx+r+6},${headY-4}`}
                  fill="none" stroke={BL} strokeWidth="3" strokeOpacity="0.75" />
            <circle cx={cx-r-6} cy={headY+8} r={12} fill="none" stroke={BL} strokeWidth="3" strokeOpacity="0.8" />
            <path d={`M ${cx-r-6},${headY+18} Q ${cx-r+18},${headY+90} ${cx-44},${headY+78}`}
                  fill="none" stroke={BL} strokeWidth="2.4" strokeOpacity="0.7" />
            <circle cx={cx-44} cy={headY+78} r={5} fill={BL} />
          </>
        )}
        <rect x={cx-130} y={headY - 120 + ((t * 120) % 600)} width={260} height={2}
              fill={accent} opacity={0.18} />
      </g>
    </g>
  );
}

// ── Central voice link + waveform ─────────────────────────────────────────
function VoiceLink({ t }) {
  const ai = aiSpeak(t), hu = humanSpeak(t);
  const active = ai || hu;
  const tint = ai ? CY : hu ? BL : CY_D;
  const x0 = 760, x1 = 1160, y = 470, cx = (x0 + x1) / 2;
  const dash = (t * (ai ? 160 : hu ? -160 : 40)) % 36;

  const N = 23;
  const bars = Array.from({ length: N }, (_, i) => {
    const center = 1 - Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);
    const amp = active ? (8 + 46 * center) : (6 + 10 * center);
    const h = amp * (0.45 + 0.55 * Math.abs(Math.sin(t * (active ? 9 : 3) + i * 0.55)));
    return { x: x0 + 26 + (i * (x1 - x0 - 52)) / (N - 1), h };
  });

  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="url(#beam)" strokeWidth="2.5"
            strokeDasharray="2 8" strokeDashoffset={dash} filter="url(#glow)" />
      <g filter="url(#glow)">
        {bars.map((b, i) => (
          <rect key={i} x={b.x - 2.4} y={y - b.h / 2} width={4.8} height={b.h} rx={2.4}
                fill={tint} opacity={active ? 0.92 : 0.5} />
        ))}
      </g>
    </g>
  );
}

// ── ECG vitals strip (appears during analysis, loop-safe) ─────────────────
function ECG({ t }) {
  if (t < 6.7 || t > 10.0) return null;
  const op = t < 7.1 ? clamp((t - 6.7) / 0.4, 0, 1) : t > 9.6 ? clamp((10.0 - t) / 0.4, 0, 1) : 1;
  const y = 525, x0 = 730, w = 460, PW = 130;
  const beat = (x) => {
    const p = ((x % PW) + PW) % PW;          // 0..PW within a beat
    // baseline with a QRS spike around p=70..95
    if (p < 60) return 0;
    if (p < 70) return -6;
    if (p < 78) return -46;
    if (p < 86) return 30;
    if (p < 94) return -10;
    if (p < 104) return 4;
    return 0;
  };
  const speed = PW * 4 / 15 * 15;            // ensures integer tiles over loop
  const off = (t * 88) % PW;
  const pts = [];
  for (let x = 0; x <= w; x += 2) pts.push(`${x0 + x},${y - beat(x + off)}`);
  // leading pulse dot
  const pulse = 0.5 + 0.5 * Math.sin(t * (TAU * 4 / 3));
  return (
    <g filter="url(#glow)" opacity={0.9 * op}>
      <polyline points={pts.join(' ')} fill="none" stroke={GRN} strokeWidth="2.4"
                strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x0 + w} cy={y} r={3 + 2 * pulse} fill={GRN} opacity={0.6 + 0.4 * pulse} />
    </g>
  );
}

function ConnectRings({ t }) {
  if (t > 2.0) return null;
  const op = clamp(1 - t / 1.8, 0, 1);
  const rings = [0, 0.5, 1].map((o) => {
    const p = ((t * 0.7 + o) % 1);
    return { r: 30 + p * 220, o: (1 - p) * op };
  });
  return (
    <g filter="url(#glow)">
      {rings.map((r, i) => (
        <circle key={i} cx={960} cy={470} r={r.r} fill="none" stroke={CY} strokeWidth="2" opacity={r.o * 0.7} />
      ))}
    </g>
  );
}

// ── HTML overlays ─────────────────────────────────────────────────────────
function fadeStyle(localTime, duration, inDur = 0.45, outDur = 0.5) {
  let o = 1, ty = 0, s = 1;
  if (localTime < inDur) { const k = Easing.easeOutCubic(clamp(localTime / inDur, 0, 1)); o = k; ty = (1 - k) * 14; s = 0.96 + 0.04 * k; }
  else if (localTime > duration - outDur) { const k = Easing.easeInCubic(clamp((localTime - (duration - outDur)) / outDur, 0, 1)); o = 1 - k; ty = -k * 8; }
  return { opacity: o, transform: `translateY(${ty}px) scale(${s})` };
}

function Transcript({ side, label, text }) {
  const { localTime, duration } = window.useSprite();
  const f = fadeStyle(localTime, duration);
  const ai = side === 'ai';
  return (
    <div style={{
      position: 'absolute', top: ai ? 196 : 250,
      left: ai ? 250 : 'auto', right: ai ? 'auto' : 250,
      width: 560, textAlign: ai ? 'left' : 'right',
      transformOrigin: ai ? 'left top' : 'right top', ...f,
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12,
        flexDirection: ai ? 'row' : 'row-reverse' }}>
        <span style={{ width: 7, height: 7, borderRadius: 9, background: ai ? CY : BL,
          boxShadow: `0 0 10px ${ai ? CY : BL}` }} />
        <span style={{ font: `600 15px ${MONO}`, letterSpacing: '0.22em', color: ai ? CY : ICE, opacity: 0.85 }}>
          {label}
        </span>
      </div>
      <div style={{ font: `500 35px/1.3 ${SANS}`, color: ICE, letterSpacing: '-0.01em',
        textShadow: '0 0 24px rgba(120,200,255,0.35)' }}>{text}</div>
    </div>
  );
}

function Header() {
  const t = useTime();
  const o = t < 0.8 ? 0 : t > 14.5 ? clamp((15 - t) / 0.5, 0, 1) : clamp((t - 0.8) / 0.5, 0, 1);
  const ss = String(Math.min(15, Math.floor(t))).padStart(2, '0');
  const live = t > 1.6;
  return (
    <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 18, opacity: o,
      padding: '12px 26px', borderRadius: 100,
      border: '1px solid rgba(120,210,255,0.25)', background: 'rgba(10,20,32,0.35)',
      backdropFilter: 'blur(4px)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, font: `600 14px ${MONO}`, letterSpacing: '0.18em', color: live ? GRN : 'rgba(200,230,255,0.6)' }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: live ? GRN : 'rgba(200,230,255,0.5)',
          boxShadow: live ? `0 0 12px ${GRN}` : 'none', opacity: 0.6 + 0.4 * (0.5 + 0.5 * wave(t, 1.5)) }} />
        {live ? 'LIVE' : 'CONNECTING'}
      </span>
      <span style={{ width: 1, height: 16, background: 'rgba(150,200,255,0.2)' }} />
      <span style={{ font: `500 14px ${MONO}`, letterSpacing: '0.16em', color: ICE, opacity: 0.85 }}>00:{ss}</span>
      <span style={{ width: 1, height: 16, background: 'rgba(150,200,255,0.2)' }} />
      <span style={{ font: `500 13px ${MONO}`, letterSpacing: '0.18em', color: 'rgba(190,225,255,0.7)' }}>
        AI&nbsp;HEALTH&nbsp;ASSISTANT
      </span>
    </div>
  );
}

function ProcessingChip({ text }) {
  const { localTime, duration } = window.useSprite();
  const f = fadeStyle(localTime, duration);
  const t = useTime();
  return (
    <div style={{ position: 'absolute', top: 360, left: '50%', marginLeft: -150, width: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: '9px 0', borderRadius: 100,
      border: '1px solid rgba(120,235,200,0.4)', background: 'rgba(10,28,26,0.45)',
      font: `600 13px ${MONO}`, letterSpacing: '0.16em', color: GRN, ...f }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: 9, background: GRN,
          opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 6 - i * 0.7)) }} />
      ))}
      {text}
    </div>
  );
}

function MiniECG({ color }) {
  const t = useTime();
  const w = 150, PW = 75, off = (t * 70) % PW, y = 20;
  const beat = (x) => { const p = ((x % PW) + PW) % PW;
    if (p < 30) return 0; if (p < 38) return -3; if (p < 44) return -18; if (p < 50) return 13; if (p < 56) return -4; return 0; };
  const pts = [];
  for (let x = 0; x <= w; x += 2) pts.push(`${x},${y - beat(x + off)}`);
  return (
    <svg width={w} height="40" viewBox={`0 0 ${w} 40`} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const VITALS = [
  { tag: 'HEART RATE', value: '72', unit: 'bpm', ecg: true },
  { tag: 'TEMPERATURE', value: '100.4', unit: '°F', warn: true },
  { tag: 'SpO₂', value: '98', unit: '%' },
];
function Vitals() {
  const { localTime, duration } = window.useSprite();
  const t = useTime();
  return (
    <div style={{ position: 'absolute', top: 588, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 26 }}>
      {VITALS.map((v, i) => {
        const st = i * 0.16;
        const lt = clamp(localTime - st, 0, duration);
        const f = fadeStyle(lt, duration - st);
        const float = 7 * wave(t, 4, i * 1.3);
        const tint = v.warn ? 'oklch(80% 0.14 70)' : GRN;
        return (
          <div key={i} style={{ width: 196, borderRadius: 16, padding: 18,
            border: `1px solid ${v.warn ? 'rgba(255,205,120,0.5)' : 'rgba(120,235,200,0.45)'}`,
            background: 'linear-gradient(180deg, rgba(16,42,40,0.55), rgba(12,24,32,0.35))',
            boxShadow: `0 0 28px ${v.warn ? 'rgba(255,190,90,0.18)' : 'rgba(80,230,190,0.2)'}`,
            ...f, transform: `${f.transform} translateY(${float}px)` }}>
            <div style={{ font: `600 11px ${MONO}`, letterSpacing: '0.16em', color: 'rgba(190,235,220,0.8)', marginBottom: 10 }}>{v.tag}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ font: `600 40px ${SANS}`, color: tint, lineHeight: 1,
                textShadow: `0 0 18px ${v.warn ? 'rgba(255,190,90,0.4)' : 'rgba(80,230,190,0.4)'}` }}>{v.value}</span>
              <span style={{ font: `500 15px ${MONO}`, color: 'rgba(200,235,225,0.7)' }}>{v.unit}</span>
            </div>
            <div style={{ marginTop: 12, height: 26 }}>
              {v.ecg
                ? <MiniECG color={GRN} />
                : <div style={{ height: 6, borderRadius: 4, background: 'rgba(120,235,200,0.18)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: v.warn ? '74%' : '92%', borderRadius: 4,
                      background: tint, boxShadow: `0 0 10px ${tint}` }} />
                  </div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SLOTS = ['Dr. MEHTA', 'TELE-CONSULT', 'TODAY 4:30 PM'];
function Slots() {
  const { localTime, duration } = window.useSprite();
  return (
    <div style={{ position: 'absolute', top: 636, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 16, justifyContent: 'center' }}>
      {SLOTS.map((p, i) => {
        const st = i * 0.12;
        const f = fadeStyle(clamp(localTime - st, 0, duration), duration - st);
        const feat = i === 2;
        return (
          <div key={i} style={{ padding: '14px 26px', borderRadius: 100,
            border: `1px solid ${feat ? 'rgba(120,235,200,0.7)' : 'rgba(120,210,255,0.4)'}`,
            background: feat ? 'rgba(14,34,30,0.6)' : 'rgba(12,26,40,0.5)',
            font: `600 16px ${MONO}`, letterSpacing: '0.08em', color: feat ? GRN : ICE, whiteSpace: 'nowrap',
            boxShadow: feat ? '0 0 22px rgba(80,230,190,0.28)' : '0 0 18px rgba(80,180,255,0.18)', ...f }}>{p}</div>
        );
      })}
    </div>
  );
}

function AppointmentConfirm() {
  const { localTime, duration } = window.useSprite();
  const pop = Easing.easeOutBack(clamp(localTime / 0.5, 0, 1));
  const out = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1);
  const ring = clamp(localTime / 0.4, 0, 1);
  const check = clamp((localTime - 0.25) / 0.35, 0, 1);
  return (
    <div style={{ position: 'absolute', top: 470, left: '50%',
      transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * pop})`, opacity: 1 - out,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="66" fill="none" stroke={GRN} strokeWidth="4"
          strokeDasharray={TAU * 66} strokeDashoffset={TAU * 66 * (1 - ring)}
          transform="rotate(-90 85 85)" filter="url(#glow)" opacity="0.95" />
        <circle cx="85" cy="85" r="66" fill={GRN} opacity="0.08" />
        <path d="M55 88 L76 108 L116 64" fill="none" stroke={GRN} strokeWidth="8"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
          strokeDasharray="120" strokeDashoffset={120 * (1 - check)} />
      </svg>
      <div style={{ font: `600 38px ${SANS}`, color: ICE, letterSpacing: '-0.01em',
        textShadow: '0 0 26px rgba(120,255,200,0.4)' }}>Appointment Booked</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, font: `500 16px ${MONO}`,
        letterSpacing: '0.12em', color: 'rgba(190,235,220,0.8)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GRN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
        VIDEO&nbsp;CONSULT&nbsp;·&nbsp;4:30&nbsp;PM
      </div>
    </div>
  );
}

function Camera({ children }) {
  const t = useTime();
  const scale = 1 + 0.035 * (1 - Math.cos(TAU * t / 15)) / 2;
  const ty = 7 * wave(t, 7.5);
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 46%',
      transform: `scale(${scale}) translateY(${ty}px)`, willChange: 'transform' }}>
      {children}
    </div>
  );
}

function Fx() {
  const t = useTime();
  return (
    <svg viewBox="0 0 1920 1080" width="1920" height="1080"
      style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <Defs />
      <Particles />
      <Figure cx={560} variant="ai" t={t} />
      <Figure cx={1360} variant="human" t={t} />
      <VoiceLink t={t} />
      <ECG t={t} />
      <ConnectRings t={t} />
    </svg>
  );
}

function Scene() {
  return (
    <Stage width={1920} height={1080} duration={15} background="transparent" persistKey="aihealth">
      <Camera>
        <Fx />
        <Header />

        <Sprite start={1.9} end={4.4}>
          <Transcript side="ai" label="AI HEALTH ASSISTANT" text={"Hello, I'm your AI Health\nAssistant. How are you feeling?"} />
        </Sprite>
        <Sprite start={4.4} end={6.8}>
          <Transcript side="human" label="PATIENT" text={"I've had a headache and\nmild fever since morning."} />
        </Sprite>
        <Sprite start={6.8} end={9.8}>
          <Transcript side="ai" label="AI HEALTH ASSISTANT" text={"Let me check your vitals\nand symptoms."} />
          <ProcessingChip text="ANALYZING&nbsp;VITALS" />
        </Sprite>
        <Sprite start={7.0} end={9.9}>
          <Vitals />
        </Sprite>
        <Sprite start={9.7} end={11.9}>
          <Transcript side="human" label="PATIENT" text={"Should I see a doctor?"} />
        </Sprite>
        <Sprite start={10.0} end={12.0}>
          <Slots />
        </Sprite>
        <Sprite start={12.0} end={13.4}>
          <Transcript side="ai" label="AI HEALTH ASSISTANT" text={"Booked a video consult with\nDr. Mehta at 4:30 PM."} />
        </Sprite>
        <Sprite start={12.7} end={14.6}>
          <AppointmentConfirm />
        </Sprite>
      </Camera>
    </Stage>
  );
}

window.SceneHealth = Scene;
