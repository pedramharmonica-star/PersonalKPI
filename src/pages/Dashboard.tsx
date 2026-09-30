import { useMemo } from 'react';
import { ClipboardPen, CalendarPlus, Trophy } from 'lucide-react';
import { useStore } from '../lib/store';
import { useResults, useSortedPeriods } from '../lib/hooks';
import { computePeriod } from '../lib/engine';
import { KIND_LABEL, daysBetween } from '../lib/jalali';
import { Button, Empty, Panel, n } from '../components/ui';
import { Heatmap, RankingStrip } from '../components/Viz';
import type { Page } from '../App';

export default function Dashboard({ go }: { go: (p: Page, emp?: string) => void }) {
  const db = useStore(s => s.db)!;
  const periodId = useStore(s => s.periodId);
  const periods = useSortedPeriods();
  const period = db.periods.find(p => p.id === periodId);
  const results = useResults(periodId);

  const prevRanks = useMemo(() => {
    if (!period) return undefined;
    const same = periods.filter(p => p.kind === period.kind);
    const i = same.findIndex(p => p.id === period.id);
    if (i <= 0) return undefined;
    const prev = computePeriod(db, same[i - 1].id);
    return new Map(prev.map(r => [r.evaluation.employeeId, r.rank]));
  }, [db, period, periods]);

  if (!period) {
    return <Empty icon={<CalendarPlus size={40} />} title="اول یک بازه ارزیابی بسازید" text="بازه می‌تواند ماهانه، سه‌ماهه، شش‌ماهه، سالانه یا یک بازه تاریخ دلخواه باشد." action={<Button tone="primary" onClick={() => go('periods')}>ساخت بازه ارزیابی</Button>} />;
  }

  const active = db.employees.filter(e => e.active);
  const avg = results.length ? results.reduce((a, r) => a + r.total, 0) / results.length : 0;
  const top = [...results].sort((a, b) => a.rank - b.rank)[0];
  const topEmp = top && db.employees.find(e => e.id === top.evaluation.employeeId);
  const completion = results.length ? results.reduce((a, r) => a + r.completion, 0) / results.length : 0;
  const missingCount = results.reduce((a, r) => a + r.kpis.filter(k => k.missing).length, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="ارزیابی‌شده" value={`${results.length} از ${active.length}`} sub={`${period.name} (${KIND_LABEL[period.kind]}، ${daysBetween(period.start, period.end)} روز)`} />
        <Stat label="میانگین نمره نهایی" value={n(avg)} sub="با احتساب Bonus" />
        <Stat label="بهترین عملکرد" value={topEmp?.name ?? '—'} sub={top ? `نمره ${n(top.total)}` : 'هنوز ارزیابی ثبت نشده'} accent />
        <Stat label="تکمیل داده‌ها" value={`${n(completion, 0)}٪`} sub={missingCount ? `${missingCount} مقدار شاخص هنوز ثبت نشده` : 'همه مقادیر ثبت شده'} warn={missingCount > 0} />
      </section>

      {!results.length ? (
        <Empty icon={<ClipboardPen size={40} />} title="برای این بازه هنوز ارزیابی ثبت نشده" text="از صفحه ثبت ارزیابی، برای هر کارشناس مقدار فعلی شاخص‌ها را وارد کنید تا نمره‌ها و رتبه‌بندی اینجا ساخته شود."
          action={<Button tone="primary" onClick={() => go('evaluate')}>ثبت ارزیابی</Button>} />
      ) : (
        <>
          <Panel title={<span className="inline-flex items-center gap-2"><Trophy size={17} className="text-saffron" />رتبه‌بندی {period.name}</span>}
            action={<Button size="sm" tone="ghost" onClick={() => go('analytics')}>تحلیل بیشتر</Button>}>
            <RankingStrip results={results} db={db} prevRanks={prevRanks} onPick={id => go('evaluate', id)} />
          </Panel>
          <Panel title="نقشه تحقق شاخص‌ها" action={<span className="text-xs text-mute">درصد تحقق و نمره کسب‌شده هر شاخص</span>}>
            <Heatmap results={results} db={db} onPick={id => go('evaluate', id)} />
          </Panel>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="text-xs text-mute">{label}</div>
      <div className={`mt-1 truncate text-2xl font-black ${accent ? 'text-saffron-700' : 'text-ink'}`}>{value}</div>
      {sub && <div className={`mt-0.5 truncate text-xs ${warn ? 'text-anar' : 'text-mute'}`}>{sub}</div>}
    </div>
  );
}
