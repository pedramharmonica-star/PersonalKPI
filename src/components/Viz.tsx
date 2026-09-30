import clsx from 'clsx';
import type { DB, EvalResult } from '../lib/types';
import { achColor } from '../lib/engine';
import { n } from './ui';

export function RankingStrip({ results, db, onPick, prevRanks }: { results: EvalResult[]; db: DB; onPick?: (empId: string) => void; prevRanks?: Map<string, number> }) {
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const scaleMax = Math.max(120, ...sorted.map(r => r.total)) * 1.02;
  const gw = sorted[0]?.groups.reduce((a, g) => a + g.group.weight, 0) || 1;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-mute">
        {db.settings.groups.map(g => <span key={g.id} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />{g.name} ({n(g.weight, 0)}٪)</span>)}
        <span className="inline-flex items-center gap-1.5"><i className="bonus-hatch h-2.5 w-4 rounded-sm" />Bonus</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-px bg-ink" />تحقق ۱۰۰</span>
      </div>
      <ol className="divide-y divide-line">
        {sorted.map(r => {
          const emp = db.employees.find(e => e.id === r.evaluation.employeeId);
          const prev = prevRanks?.get(r.evaluation.employeeId);
          const delta = prev ? prev - r.rank : 0;
          return (
            <li key={r.evaluation.id}>
              <button onClick={() => onPick?.(r.evaluation.employeeId)} className="grid w-full grid-cols-[2.25rem_minmax(7rem,11rem)_1fr_5.5rem] items-center gap-3 py-2.5 text-right hover:bg-paper/70 sm:grid-cols-[2.5rem_12rem_1fr_7rem]">
                <span className={clsx('flex h-8 w-8 items-center justify-center rounded-full text-sm font-black', r.rank === 1 ? 'bg-saffron text-white' : r.rank <= 3 ? 'bg-ink text-white' : 'bg-paper text-ink')}>{r.rank}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{emp?.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-mute">
                    <span className="truncate">{emp?.title}</span>
                    {prev != null && delta !== 0 && <span className={delta > 0 ? 'text-firouzeh' : 'text-anar'}>{delta > 0 ? `▲${delta}` : `▼${-delta}`}</span>}
                  </span>
                </span>
                <span className="relative block h-6 w-full overflow-hidden rounded-md bg-paper" dir="rtl">
                  <span className="absolute inset-y-0 right-0 flex h-full" style={{ width: `${(r.total / scaleMax) * 100}%` }}>
                    {r.groups.map(g => {
                      const part = (g.pct * g.group.weight) / gw;
                      return <span key={g.group.id} title={`${g.group.name}: ${n(part)}`} style={{ width: `${r.total ? (part / r.total) * 100 : 0}%`, background: g.group.color }} className="h-full" />;
                    })}
                    {r.bonus > 0 && <span title={`Bonus: ${n(r.bonus)}`} className="bonus-hatch h-full" style={{ width: `${(r.bonus / r.total) * 100}%` }} />}
                  </span>
                  <span className="absolute inset-y-0 w-px bg-ink/70" style={{ right: `${(100 / scaleMax) * 100}%` }} />
                </span>
                <span className="text-left">
                  <span className="block text-lg font-black leading-5 text-ink tabular-nums">{n(r.total)}</span>
                  {r.band && <span className="text-[11px] font-medium" style={{ color: r.band.color }}>{r.band.name}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Heatmap({ results, db, onPick }: { results: EvalResult[]; db: DB; onPick?: (empId: string) => void }) {
  const cols: string[] = [];
  for (const r of results) for (const k of r.kpis) if (!cols.includes(k.kpi.name.trim())) cols.push(k.kpi.name.trim());
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-[13px]">
        <thead>
          <tr>
            <th className="sticky right-0 bg-white px-2 py-1 text-right font-medium text-mute">نام</th>
            {cols.map(c => <th key={c} className="min-w-[92px] px-1 pb-1 align-bottom text-[11px] font-medium leading-5 text-mute">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const emp = db.employees.find(e => e.id === r.evaluation.employeeId);
            return (
              <tr key={r.evaluation.id}>
                <td className="sticky right-0 whitespace-nowrap bg-white px-2 font-bold text-ink">
                  <button onClick={() => onPick?.(r.evaluation.employeeId)} className="hover:text-firouzeh">{emp?.name}</button>
                </td>
                {cols.map(c => {
                  const k = r.kpis.find(x => x.kpi.name.trim() === c);
                  if (!k) return <td key={c} className="rounded-md bg-paper/50" />;
                  if (k.missing) return <td key={c} className="hatch h-10 rounded-md text-center text-[11px] text-mute" title="ثبت نشده">ثبت نشده</td>;
                  const a = k.achievement;
                  return (
                    <td key={c} className="h-10 rounded-md text-center tabular-nums" style={{ background: achColor(a, db.settings.overCap) }}
                      title={`مقدار: ${n(k.value, 2)} | نمره: ${n(k.score, 2)} از ${n(k.kpi.weight, 0)}`}>
                      <div className="font-bold text-ink">{a == null ? (k.achievementLabel ?? '—') : `${n(a, 0)}٪`}</div>
                      <div className="text-[10px] text-ink/60">{n(k.score, 1)}/{n(k.kpi.weight, 0)}</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-mute">
        <span>۰٪</span>
        <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(to left, ${achColor(0)}, ${achColor(50)}, ${achColor(db.settings.overCap)})` }} />
        <span>{db.settings.overCap}٪</span>
        <span className="mr-2">رنگ‌بندی مطابق قالب شرطی فایل اکسل (قرمز ← سفید ← سبز)</span>
      </div>
    </div>
  );
}
