import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import logoWhite from '../assets/logo-white.png';
import icon from '../assets/icon.png';
import type { Scene } from '../lib/store';

export const BRAND = { orange: '#F26122', dark: '#1C1F25', task: '#EEC56A', team: '#7FA3C0', ind: '#E35D5D', org: '#1DB5A8' };

/** Pointer position → CSS vars (--mx, --my in −1..1) for cheap parallax */
export function useParallax(enabled: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) { root.style.setProperty('--mx', '0'); root.style.setProperty('--my', '0'); return; }
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const move = (e: PointerEvent) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; };
    const tick = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      root.style.setProperty('--mx', cx.toFixed(4)); root.style.setProperty('--my', cy.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    addEventListener('pointermove', move); raf = requestAnimationFrame(tick);
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [enabled]);
}

const depth = (px: number) => ({ transform: `translate3d(calc(var(--mx) * ${px}px), calc(var(--my) * ${px}px), 0)` });

export function SceneBg({ scene }: { scene: Scene }) {
  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    x: (i * 137.5) % 100, y: (i * 61.8 * 1.7) % 100, s: 1 + ((i * 7) % 3), d: (i % 3) + 1, t: (i % 9) * 0.7,
  })), []);
  return (
    <div className="scene pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 700px at 70% -10%, #2A2E36 0%, #181A20 45%, #111317 100%)' }} />
      {/* brand dot grid (as in the PayamGostar brand card) — two depths */}
      <div className="absolute -inset-20 opacity-[.55]" style={{ ...depth(-10), backgroundImage: 'radial-gradient(rgba(255,255,255,.16) 1.1px, transparent 1.3px)', backgroundSize: '34px 34px' }} />
      <div className="absolute -inset-20 opacity-40" style={{ ...depth(-22), backgroundImage: 'radial-gradient(rgba(255,255,255,.10) 1.6px, transparent 1.8px)', backgroundSize: '86px 86px' }} />

      {scene === 'orbit' && (
        <>
          <div className="absolute left-1/2 top-[58%] h-[1500px] w-[1500px] -translate-x-1/2" style={depth(18)}>
            <svg viewBox="0 0 1500 1500" className="h-full w-full spin-slow" style={{ animationDuration: '240s' }}>
              <defs>
                <linearGradient id="arc" x1="0" x2="1"><stop offset="0" stopColor="#F26122" stopOpacity="0" /><stop offset=".5" stopColor="#F26122" stopOpacity=".75" /><stop offset="1" stopColor="#F26122" stopOpacity=".05" /></linearGradient>
              </defs>
              {[480, 560, 640, 720].map((r, i) => (
                <g key={r}>
                  <circle cx="750" cy="750" r={r} fill="none" stroke="url(#arc)" strokeWidth={i === 3 ? 1.2 : 1.6} opacity={0.55 - i * 0.1} />
                  <circle r={i % 2 ? 5 : 7} fill="#F26122">
                    <animateMotion dur={`${38 + i * 14}s`} repeatCount="indefinite" path={`M ${750 - r} 750 a ${r} ${r} 0 1 ${i % 2} ${r * 2} 0 a ${r} ${r} 0 1 ${i % 2} ${-r * 2} 0`} />
                  </circle>
                </g>
              ))}
            </svg>
          </div>
          <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full opacity-30 blur-[120px]" style={{ ...depth(30), background: '#F26122' }} />
        </>
      )}

      {scene === 'galaxy' && (
        <>
          {[1, 2, 3].map(layer => (
            <div key={layer} className="absolute -inset-24" style={depth(layer * 14)}>
              {stars.filter(s => s.d === layer).map((s, i) => (
                <span key={i} className="absolute rounded-full" style={{
                  left: `${s.x}%`, top: `${s.y}%`, width: s.s + layer, height: s.s + layer,
                  background: i % 7 === 0 ? '#F26122' : '#fff', boxShadow: i % 7 === 0 ? '0 0 12px #F26122' : '0 0 6px rgba(255,255,255,.6)',
                  animation: `twinkle ${3 + s.t}s ease-in-out ${s.t}s infinite`,
                }} />
              ))}
            </div>
          ))}
          <div className="absolute left-1/4 top-1/3 h-[600px] w-[600px] rounded-full opacity-20 blur-[140px]" style={{ ...depth(24), background: '#F26122' }} />
        </>
      )}

      {scene === 'frost' && (
        <>
          <div className="absolute -left-40 top-20 h-[620px] w-[620px] rounded-full opacity-45 blur-[110px] floaty" style={{ ...depth(26), background: '#F26122', animationDuration: '16s' }} />
          <div className="absolute right-0 top-1/3 h-[540px] w-[540px] rounded-full opacity-30 blur-[120px] floaty" style={{ ...depth(-20), background: '#1DB5A8', animationDuration: '19s' }} />
          <div className="absolute bottom-[-200px] left-1/3 h-[560px] w-[760px] rounded-full opacity-30 blur-[130px] floaty" style={{ ...depth(16), background: '#7FA3C0', animationDuration: '23s' }} />
        </>
      )}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 120%, transparent 30%, rgba(0,0,0,.35))' }} />
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return <img src={logoWhite} alt="پیام‌گستر" className={clsx('select-none', className)} draggable={false} />;
}
export function Mark({ className }: { className?: string }) {
  return <img src={icon} alt="" aria-hidden className={clsx('select-none', className)} draggable={false} />;
}
