import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Trophy, Orbit, ListOrdered, CalendarPlus, Users2, Gauge, Building2, Target } from 'lucide-react';
import { useStore } from '../../lib/store';
import { usePeople } from '../../lib/hooks';
import { dimValue } from '../../lib/engine';
import type { PersonResult } from '../../lib/types';
import { CountUp, Empty, Panel, Segmented, n } from '../../components/ui';
import { DimChampions, OrbitRank, Petal, Podium, RankList, SortBar, sortPeople, type SortKey } from '../../components/People';
import { BRAND } from '../../components/Space';
import type { ViewRoute } from '../../App';

export const chartTip = { contentStyle: { fontFamily: 'YekanBakh', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(28,31,37,.95)', direction: 'rtl' as const, fontSize: 12, color: '#ECEEF1' }, labelStyle: { fontWeight: 700, color: '#fff' }, itemStyle: { color: '#ECEEF1' }, cursor: { fill: 'rgba(255,255,255,.05)' } };

export function avgDims(people: PersonResult[]) {
  const avg = (f: (p: PersonResult) => number | null) => { const v = people.map(f).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return {
    task: avg(p => p.kpi.kpis.some(k => !k.missing) ? p.kpi.groups[0]?.pct ?? null : null),
    team: avg(p => p.kpi.kpis.some(k => !k.missing) ? p.kpi.groups[1]?.pct ?? null : null),
    ind: avg(p => p.individual.pct), org: avg(p => p.org.pct), center: avg(p => p.overall) ?? 0,
  };
}

export default function OrgView({ go }: { go: (r: ViewRoute) => void }) {
  const db = useStore(s => s.db)!;
  const periodId = useStore(s => s.periodId);
  const period = db.periods.find(p => p.id === periodId);
  const people = usePeople(periodId);
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [view, setView] = useState<'list' | 'orbit'>('list');
  const sorted = useMemo(() => sortPeople(people, sortKey), [people, sortKey]);
  const pick = (p: PersonResult) => go({ page: 'person', id: p.emp.id });
  const org = avgDims(people);

  const unitData = db.units.map(u => {
    const ps = people.filter(p => p.unit.id === u.id);
    const a = (k: SortKey) => { const v = ps.map(p => dimValue(p, k)).filter((x): x is number => x != null); return v.length ? +(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1) : 0; };
    return { name: u.name, 'نمره کلی': a('overall'), 'وظیفه‌ای + تیمی': a('kpi'), 'فردی': a('individual'), 'سازمانی': a('org'), count: ps.length };
  }).filter(d => d.count > 0);

  if (!period) return <Empty icon={<CalendarPlus size={40} />} title="هنوز بازه ارزیابی تعریف نشده" text="مدیر سامانه باید از پنل مدیریت یک بازه بسازد." />;

  const top = sorted[0];
  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="grid items-center gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-brand-300">ارزیابی کل سازمان، {period.name}</motion.div>
          <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="mt-2 text-3xl font-black leading-snug text-white sm:text-4xl">
            تصویر عملکرد پیام‌گستر<br /><span className="text-mute">در چهار بُعد وظیفه‌ای، تیمی، فردی و سازمانی</span>
          </motion.h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users2, label: 'ارزیابی‌شده', v: people.length, d: 0 },
              { icon: Gauge, label: 'میانگین نمره کلی', v: org.center, d: 1 },
              { icon: Building2, label: 'واحد فعال', v: unitData.length, d: 0 },
              { icon: Target, label: 'بهترین نمره', v: top?.overall ?? 0, d: 1 },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 + i * .07 }}
                className="glass lift lift-lg floaty rounded-2xl p-4" style={{ animationDelay: `${-i * 1.3}s` }}>
                <s.icon size={18} className="text-brand" />
                <div className="mt-2 text-2xl font-black text-white"><CountUp value={s.v} digits={s.d} /></div>
                <div className="text-[11px] text-mute">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <Panel lift="lg" className="flex justify-center" float={2}>
          <div className="flex flex-col items-center py-2">
            <Petal {...org} size={320} label="میانگین سازمان" />
            <p className="mt-1 text-center text-[11px] text-mute">مدل ارزیابی عملکرد پیام‌گستر؛ هر گلبرگ به اندازه میانگین آن بُعد پر شده است.</p>
          </div>
        </Panel>
      </section>

      {!people.length ? (
        <Empty title="در این بازه هنوز ارزیابی ثبت نشده" text="پس از ثبت نتایج در پنل مدیریت، رتبه‌بندی اینجا نمایش داده می‌شود." />
      ) : (
        <>
          <Panel lift="none" title={<span className="flex items-center gap-2"><Trophy size={18} className="text-saffron" />سکوی برترین‌های سازمان</span>}
            action={<SortBar value={sortKey} onChange={setSortKey} />}>
            <Podium people={sorted} sortKey={sortKey} onPick={pick} />
          </Panel>

          <DimChampions people={people} onPick={pick} />

          <Panel lift="none" title="رتبه‌بندی همه پرسنل" action={<>
            <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'فهرست' }, { value: 'orbit', label: 'مدار عملکرد' }]} />
            {view === 'list' ? <ListOrdered size={16} className="text-mute" /> : <Orbit size={16} className="text-mute" />}
          </>}>
            <p className="mb-4 text-xs leading-6 text-mute">مرتب‌سازی بر اساس: <b className="text-white">{SORT_TEXT[sortKey]}</b>. «وظیفه‌ای + تیمی» یک بُعد حساب می‌شود چون شاخص‌های این دو گروه به هم وابسته‌اند.</p>
            {view === 'list' ? <RankList people={sorted} sortKey={sortKey} onPick={pick} rankOf={sortKey === 'overall' ? p => p.orgRank : undefined} /> : <OrbitRank people={sorted} sortKey={sortKey} onPick={pick} />}
          </Panel>

          {unitData.length > 0 && (
            <Panel lift="sm" title="مقایسه واحدها در هر بُعد">
              <div dir="ltr" style={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={unitData} margin={{ top: 10, right: 10, left: 10 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,.07)" />
                    <XAxis dataKey="name" reversed tickLine={false} axisLine={false} />
                    <YAxis orientation="right" domain={[0, 120]} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTip} formatter={(v: any) => n(+v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={100} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />
                    <Bar dataKey="نمره کلی" fill={BRAND.orange} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="وظیفه‌ای + تیمی" fill={BRAND.task} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="فردی" fill={BRAND.ind} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="سازمانی" fill={BRAND.org} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}
        </>
      )}

      <ModelCards />
    </div>
  );
}

const SORT_TEXT: Record<SortKey, string> = { overall: 'نمره کلی (ترکیب وزنی سه بُعد)', kpi: 'شاخص‌های وظیفه‌ای و تیمی (KPI)', individual: 'بُعد فردی (آزمون پیام‌گستر و صلاحیت فردی)', org: 'بُعد سازمانی (رفتار شهروندی سازمانی)' };

function ModelCards() {
  const items = [
    { t: 'وظیفه‌ای', c: BRAND.task, d: 'جوهره اصلی شغل؛ با شاخص‌های عملکردی (KPI) سنجیده می‌شود.' },
    { t: 'تیمی', c: BRAND.team, d: 'فرد در قبال نتایج کسب‌شده واحد خود مسئول است؛ شاخص‌های تیمی و کیفیت خدمات.' },
    { t: 'فردی', c: BRAND.ind, d: 'بهبود و تعالی فردی؛ آزمون پیام‌گستر و پرسشنامه صلاحیت فردی.' },
    { t: 'سازمانی', c: BRAND.org, d: 'ضامن موفقیت بلندمدت؛ رفتار شهروندی سازمانی (OCB) برگرفته از ارزش‌ها.' },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((x, i) => (
        <motion.div key={x.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .08 }}
          className="glass lift lift-lg floaty rounded-2xl p-5" style={{ animationDelay: `${-i * 1.1}s` }}>
          <div className="mb-3 h-1.5 w-12 rounded-full" style={{ background: x.c, boxShadow: `0 0 14px ${x.c}` }} />
          <div className="text-lg font-black text-white">{x.t}</div>
          <p className="mt-1 text-xs leading-6 text-mute">{x.d}</p>
        </motion.div>
      ))}
    </section>
  );
}
