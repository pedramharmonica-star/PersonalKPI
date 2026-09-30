import clsx from 'clsx';
import type { DB, EvalResult, Settings } from '../lib/types';
import { achColor } from '../lib/engine';
import { n } from './ui';

export function Heatmap({ results, db, settings, onPick }: { results: EvalResult[]; db: DB; settings: Settings; onPick?: (empId: string) => void }) {
  const cols: string[] = [];
  for (const r of results) for (const k of r.kpis) if (!cols.includes(k.kpi.name.trim())) cols.push(k.kpi.name.trim());
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-[13px]">
        <thead>
          <tr>
            <th className="px-2 py-1 text-right font-medium text-mute">نام</th>
            {cols.map(c => <th key={c} className="min-w-[92px] px-1 pb-1 align-bottom text-[11px] font-medium leading-5 text-mute">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const emp = db.employees.find(e => e.id === r.evaluation.employeeId);
            return (
              <tr key={r.evaluation.id}>
                <td className="whitespace-nowrap px-2 font-bold text-ink">
                  <button onClick={() => onPick?.(r.evaluation.employeeId)} className="hover:text-firouzeh">{emp?.name}</button>
                </td>
                {cols.map(c => {
                  const k = r.kpis.find(x => x.kpi.name.trim() === c);
                  if (!k) return <td key={c} className="rounded-md bg-white/[.03]" />;
                  if (k.missing) return <td key={c} className="hatch h-10 rounded-md text-center text-[11px] text-mute" title="ثبت نشده">ثبت نشده</td>;
                  const a = k.achievement;
                  return (
                    <td key={c} className="h-10 rounded-lg text-center tabular-nums transition hover:scale-110 hover:shadow-lg hover:z-10 relative" style={{ background: achColor(a, settings.overCap) }}
                      title={`مقدار: ${n(k.value, 2)} | نمره: ${n(k.score, 2)} از ${n(k.kpi.weight, 0)}`}>
                      <div className="font-bold text-white">{a == null ? (k.achievementLabel ?? '—') : `${n(a, 0)}٪`}</div>
                      <div className="text-[10px] text-white/70">{n(k.score, 1)}/{n(k.kpi.weight, 0)}</div>
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
        <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(to left, ${achColor(0)}, ${achColor(50)}, ${achColor(settings.overCap)})` }} />
        <span>{settings.overCap}٪</span>
        <span className="mr-2">رنگ‌بندی مطابق قالب شرطی فایل اکسل (قرمز، خنثی، سبز)</span>
      </div>
    </div>
  );
}
