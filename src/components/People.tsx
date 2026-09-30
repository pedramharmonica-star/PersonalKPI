import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal } from 'lucide-react';
import type { DimKey, Employee, PersonResult } from '../lib/types';
import { dimValue } from '../lib/engine';
import { CountUp, Segmented, n } from './ui';
import { BRAND } from './Space';

export type SortKey = 'overall' | DimKey;
export const SORT_LABEL: Record<SortKey, string> = { overall: 'نمره کلی', kpi: 'وظیفه‌ای + تیمی', individual: 'فردی', org: 'سازمانی' };
export const DIM_COLOR: Record<SortKey, string> = { overall: BRAND.orange, kpi: BRAND.task, individual: BRAND.ind, org: BRAND.org };

export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + '‌' + p[p.length - 1][0] : p[0]?.slice(0, 2)) ?? '؟';
}

export function Avatar({ emp, size = 56, lit, className }: { emp: Pick<Employee, 'name' | 'photo'>; size?: number; lit?: boolean; className?: string }) {
  return (
    <span className={clsx('avatar inline-block shrink-0', lit && 'lit', className)} style={{ width: size, height: size }}>
      <span className="ring" />
      <span className="img flex h-full w-full items-center justify-center" style={{ width: size, height: size }}>
        {emp.photo
          ? <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" draggable={false} />
          : <span className="font-black text-white/85" style={{ fontSize: size * 0.34, background: 'linear-gradient(135deg,#3A3F49,#23262D)', width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>{initials(emp.name)}</span>}
      </span>
    </span>
  );
}

/**
 * The 4-dimension model from «مدل مدیریت عملکرد — دی ۱۴۰۴»:
 * وظیفه‌ای (top), سازمانی (right), فردی (bottom), تیمی (left).
 * Each petal fills from the centre in proportion to its score.
 */
export function Petal({ task, team, ind, org, center, size = 300, label = 'ارزیابی عملکرد' }: { task: number | null; team: number | null; ind: number | null; org: number | null; center: number; size?: number; label?: string }) {
  const petals: { key: string; name: string; v: number | null; color: string; rot: number; lx: number; ly: number }[] = [
    { key: 'task', name: 'وظیفه‌ای', v: task, color: BRAND.task, rot: 0, lx: 150, ly: -14 },
    { key: 'org', name: 'سازمانی', v: org, color: BRAND.org, rot: 90, lx: 322, ly: 146 },
    { key: 'ind', name: 'فردی', v: ind, color: BRAND.ind, rot: 180, lx: 150, ly: 312 },
    { key: 'team', name: 'تیمی', v: team, color: BRAND.team, rot: 270, lx: -22, ly: 146 },
  ];
  // one petal pointing up, from centre (150,150)
  const path = 'M150 150 C 108 118, 112 52, 150 14 C 188 52, 192 118, 150 150 Z';
  return (
    <svg viewBox="-55 -35 410 370" width={size} height={size * 370 / 410} className="overflow-visible">
      <defs>
        {petals.map(p => (
          <radialGradient key={p.key} id={`pg-${p.key}`} cx="150" cy="150" r="140" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={p.color} stopOpacity=".35" /><stop offset="1" stopColor={p.color} stopOpacity="1" />
          </radialGradient>
        ))}
        <filter id="pglow"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {petals.map((p, i) => {
        const s = p.v == null ? 0 : Math.max(0.06, Math.min(1.1, p.v / 100));
        return (
          <g key={p.key} transform={`rotate(${p.rot} 150 150)`}>
            <path d={path} fill={p.color} opacity=".10" stroke={p.color} strokeOpacity=".35" strokeDasharray="3 4" />
            <motion.path d={path} fill={`url(#pg-${p.key})`} style={{ transformOrigin: '150px 150px' }}
              initial={{ scale: 0 }} animate={{ scale: s }} transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 70, damping: 14 }} />
            <motion.path d={path} fill={p.color} filter="url(#pglow)" opacity=".35" style={{ transformOrigin: '150px 150px' }}
              initial={{ scale: 0 }} animate={{ scale: s }} transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 70, damping: 14 }} />
          </g>
        );
      })}
      <circle cx="150" cy="150" r="52" fill="#1C1F25" stroke="rgba(255,255,255,.12)" />
      <circle cx="150" cy="150" r="52" fill="none" stroke={BRAND.orange} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, center) / 100) * 326.7} 400`} transform="rotate(-90 150 150)" />
      <text x="150" y="145" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="900">{n(center)}</text>
      <text x="150" y="168" textAnchor="middle" fill="#9AA1AB" fontSize="10">{label}</text>
      {petals.map(p => (
        <g key={p.key + 'l'}>
          <text x={p.lx} y={p.ly} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#14161B', strokeWidth: 3 }}>{p.name}</text>
          <text x={p.lx} y={p.ly + 15} textAnchor="middle" fill={p.color} fontSize="12" fontWeight="900" style={{ paintOrder: 'stroke', stroke: '#14161B', strokeWidth: 3 }}>{p.v == null ? 'ثبت نشده' : `${n(p.v)}٪`}</text>
        </g>
      ))}
    </svg>
  );
}

export function petalOf(p: PersonResult) {
  const g = (idx: number) => p.kpi.kpis.some(k => !k.missing) ? p.kpi.groups[idx]?.pct ?? null : null;
  return { task: g(0), team: g(1), ind: p.individual.pct, org: p.org.pct, center: p.overall };
}

/** three floating pedestals for the top 3 */
export function Podium({ people, sortKey, onPick }: { people: PersonResult[]; sortKey: SortKey; onPick: (p: PersonResult) => void }) {
  const top = people.slice(0, 3);
  const order = [1, 0, 2].filter(i => top[i]);
  const h = [150, 115, 90];
  return (
    <div className="flex items-end justify-center gap-3 pt-16 sm:gap-6">
      {order.map((i, k) => {
        const p = top[i];
        const v = dimValue(p, sortKey);
        return (
          <motion.button key={p.emp.id} onClick={() => onPick(p)} className="group flex w-[118px] flex-col items-center sm:w-[160px]"
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + k * 0.15, type: 'spring', stiffness: 90, damping: 14 }}>
            <div className="floaty mb-3 flex flex-col items-center" style={{ animationDelay: `${-i * 1.7}s` }}>
              <div className="relative">
                {i === 0 && <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 text-saffron drop-shadow-[0_0_12px_rgba(233,169,46,.8)]" size={26} />}
                <Avatar emp={p.emp} size={i === 0 ? 96 : 76} lit={i === 0} />
              </div>
              <div className="mt-3 max-w-full truncate text-sm font-bold text-white">{p.emp.name}</div>
              <div className="truncate text-[11px] text-mute">{p.unit.name}</div>
            </div>
            <div className="glass lift relative flex w-full flex-col items-center justify-start rounded-t-2xl pt-4" style={{ height: h[i], borderColor: i === 0 ? 'rgba(242,97,34,.45)' : undefined }}>
              <span className={clsx('flex h-9 w-9 items-center justify-center rounded-full text-base font-black', i === 0 ? 'bg-gradient-to-br from-brand to-saffron text-white' : 'bg-white/10 text-white')}>{i + 1}</span>
              <span className="mt-2 text-2xl font-black text-white">{v == null ? '—' : <CountUp value={v} />}</span>
              <span className="text-[10px] text-mute">{SORT_LABEL[sortKey]}</span>
              <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-none bg-gradient-to-t from-brand/10 to-transparent" />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/** «مدار عملکرد»: people circle the organisation on orbits by performance band */
export function OrbitRank({ people, sortKey, onPick }: { people: PersonResult[]; sortKey: SortKey; onPick: (p: PersonResult) => void }) {
  const rings = [
    { min: 90, r: 95, label: '۹۰+' }, { min: 75, r: 160, label: '۷۵+' }, { min: 60, r: 225, label: '۶۰+' }, { min: -1e9, r: 290, label: 'زیر ۶۰' },
  ];
  const placed = useMemo(() => {
    const byRing = rings.map(() => [] as PersonResult[]);
    for (const p of people) {
      const v = dimValue(p, sortKey);
      if (v == null) continue;
      byRing[rings.findIndex(r => v >= r.min)].push(p);
    }
    return byRing.flatMap((arr, ri) => arr.map((p, j) => ({ p, r: rings[ri].r, a: (j / Math.max(1, arr.length)) * Math.PI * 2 + ri * 0.7, ri })));
  }, [people, sortKey]);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px]">
      <div className="absolute inset-0 flex items-center justify-center">
        {rings.map((r, i) => (
          <div key={i} className="absolute rounded-full border border-dashed" style={{ width: r.r * 2 * 100 / 640 + '%', height: r.r * 2 * 100 / 640 + '%', borderColor: `rgba(242,97,34,${0.45 - i * 0.08})` }}>
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-canvas px-2 text-[10px] text-brand-300">{r.label}</span>
          </div>
        ))}
        <div className="relative flex h-[22%] w-[22%] flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-600 text-center shadow-[0_0_60px_rgba(242,97,34,.55)]">
          <span className="text-[11px] text-white/80">مدار</span><span className="text-sm font-black text-white">{SORT_LABEL[sortKey]}</span>
        </div>
      </div>
      <div className="absolute inset-0 spin-slow" style={{ animationDuration: '120s', animationPlayState: hover ? 'paused' : 'running' }}>
        {placed.map(({ p, r, a }) => {
          const x = 50 + (Math.cos(a) * r * 100) / 640, y = 50 + (Math.sin(a) * r * 100) / 640;
          const v = dimValue(p, sortKey);
          return (
            <div key={p.emp.id} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', zIndex: hover === p.emp.id ? 20 : 1 }}>
              <div className="spin-rev" style={{ animationDuration: '120s', animationPlayState: hover ? 'paused' : 'running' }}>
                <button onMouseEnter={() => setHover(p.emp.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(p.emp.id)} onBlur={() => setHover(null)}
                  onClick={() => onPick(p)} className="pop relative flex flex-col items-center" aria-label={`${p.emp.name}: ${n(v)}`}>
                  <Avatar emp={p.emp} size={46} lit={hover === p.emp.id} />
                  <AnimatePresence>
                    {hover === p.emp.id && (
                      <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="glass-strong absolute top-full mt-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-center text-xs">
                        <b className="block text-white">{p.emp.name}</b><span className="text-brand-300">{n(v)}</span> <span className="text-mute">{p.unit.name}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DimBar({ v, color, label }: { v: number | null; color: string; label: string }) {
  return (
    <div className="min-w-0" title={`${label}: ${v == null ? 'ثبت نشده' : n(v)}`}>
      <div className="mb-1 flex justify-between text-[10px] text-mute"><span className="truncate">{label}</span><span className="tabular-nums text-ink-600">{v == null ? '—' : n(v, 0)}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[.07]">
        <motion.div className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, v ?? 0)}%` }} transition={{ duration: 1, ease: [.2, .8, .2, 1] }} />
      </div>
    </div>
  );
}

/** Sortable ranking with animated re-ordering */
export function RankList({ people, sortKey, onPick, showUnit = true, rankOf }: { people: PersonResult[]; sortKey: SortKey; onPick: (p: PersonResult) => void; showUnit?: boolean; rankOf?: (p: PersonResult) => number }) {
  return (
    <ol className="space-y-2">
      <AnimatePresence initial={false}>
        {people.map((p, i) => {
          const v = dimValue(p, sortKey);
          return (
            <motion.li key={p.emp.id} layout transition={{ type: 'spring', stiffness: 260, damping: 28 }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <button onClick={() => onPick(p)} className="glass lift group grid w-full grid-cols-[2.2rem_3.2rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-2xl px-3 py-2.5 text-right md:grid-cols-[2.4rem_3.4rem_minmax(8rem,12rem)_1fr_5rem]">
                <span className={clsx('flex h-8 w-8 items-center justify-center rounded-full text-sm font-black', i === 0 ? 'bg-gradient-to-br from-brand to-saffron text-white' : i < 3 ? 'bg-white/15 text-white' : 'bg-white/[.06] text-ink-600')}>{rankOf ? rankOf(p) : i + 1}</span>
                <Avatar emp={p.emp} size={46} />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-white">{p.emp.name}</span>
                  <span className="block truncate text-[11px] text-mute">{showUnit ? `${p.unit.name}، ` : ''}{p.emp.title}</span>
                </span>
                <span className="hidden grid-cols-3 gap-3 md:grid">
                  <DimBar v={dimValue(p, 'kpi')} color={BRAND.task} label="وظیفه‌ای + تیمی" />
                  <DimBar v={p.individual.pct} color={BRAND.ind} label="فردی" />
                  <DimBar v={p.org.pct} color={BRAND.org} label="سازمانی" />
                </span>
                <span className="text-left">
                  <span className="block text-xl font-black leading-6" style={{ color: DIM_COLOR[sortKey] === BRAND.orange ? '#fff' : DIM_COLOR[sortKey] }}>{v == null ? '—' : <CountUp value={v} />}</span>
                  {p.band && sortKey === 'overall' && <span className="text-[10px] font-medium" style={{ color: p.band.color }}>{p.band.name}</span>}
                </span>
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

/** «بهترین‌ها در هر بُعد» — champions of the three dimensions */
export function DimChampions({ people, onPick }: { people: PersonResult[]; onPick: (p: PersonResult) => void }) {
  const dims: SortKey[] = ['kpi', 'individual', 'org'];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {dims.map((d, i) => {
        const best = [...people].filter(p => dimValue(p, d) != null).sort((a, b) => (dimValue(b, d) ?? 0) - (dimValue(a, d) ?? 0))[0];
        return (
          <motion.button key={d} disabled={!best} onClick={() => best && onPick(best)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
            className="glass lift lift-lg relative overflow-hidden rounded-2xl p-5 text-right">
            <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full opacity-30 blur-2xl" style={{ background: DIM_COLOR[d] }} />
            <div className="relative flex items-center gap-4">
              {best ? <Avatar emp={best.emp} size={64} /> : <span className="h-16 w-16 rounded-full bg-white/5" />}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: DIM_COLOR[d] }}><Medal size={14} />برترین در بُعد {SORT_LABEL[d]}</div>
                <div className="truncate text-lg font-black text-white">{best?.emp.name ?? 'هنوز داده‌ای نیست'}</div>
                {best && <div className="text-xs text-mute">{best.unit.name}، امتیاز <b className="text-white">{n(dimValue(best, d))}</b></div>}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function SortBar({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return <Segmented value={value} onChange={onChange} options={(Object.keys(SORT_LABEL) as SortKey[]).map(k => ({ value: k, label: SORT_LABEL[k] }))} />;
}

export function sortPeople(people: PersonResult[], k: SortKey) {
  return [...people].sort((a, b) => (dimValue(b, k) ?? -1) - (dimValue(a, k) ?? -1));
}
