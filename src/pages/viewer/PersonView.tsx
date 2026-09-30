import { Fragment, useRef } from 'react';
import clsx from 'clsx';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Award, GraduationCap, HeartHandshake, ClipboardList, Crown } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { useStore } from '../../lib/store';
import { useAllPeople, usePeople, useSortedPeriods } from '../../lib/hooks';
import { achColor, engineOf } from '../../lib/engine';
import { Chip, CountUp, Empty, Panel, n } from '../../components/ui';
import { Avatar, Petal, petalOf, DIM_COLOR } from '../../components/People';
import { BRAND } from '../../components/Space';
import { chartTip } from './OrgView';
import type { ViewRoute } from '../../App';

export default function PersonView({ id, go }: { id: string; go: (r: ViewRoute) => void }) {
  const db = useStore(s => s.db)!;
  const periodId = useStore(s => s.periodId);
  const emp = db.employees.find(e => e.id === id);
  const all = usePeople(periodId);
  const unitPeople = all.filter(p => p.unit.id === emp?.unitId);
  const me = all.find(p => p.emp.id === id);
  const periods = useSortedPeriods();
  const hist = useAllPeople(emp?.unitId);
  const unit = db.units.find(u => u.id === emp?.unitId);

  // 3D tilt for the portrait
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-.5, .5], [14, -14]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-.5, .5], [-16, 16]), { stiffness: 120, damping: 14 });

  if (!emp || !unit) return <Empty title="این فرد پیدا نشد" />;

  const trend = periods.map(p => {
    const r = hist.get(p.id)?.find(x => x.emp.id === id);
    return r ? { name: p.name, 'نمره کلی': +r.overall.toFixed(1), 'وظیفه‌ای + تیمی': r.kpi.kpis.some(k => !k.missing) ? +r.kpiPct.toFixed(1) : null, 'فردی': r.individual.pct == null ? null : +r.individual.pct.toFixed(1), 'سازمانی': r.org.pct == null ? null : +r.org.pct.toFixed(1) } : null;
  }).filter(Boolean) as any[];

  return (
    <div className="space-y-6">
      <button onClick={() => history.length && go({ page: 'unit' })} className="flex items-center gap-1.5 text-sm text-mute transition hover:text-white"><ArrowRight size={16} />بازگشت به رتبه‌بندی</button>

      <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl" style={{ background: unit.color }} />
        <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
          <motion.div ref={ref} className="mx-auto" style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
            onPointerMove={e => { const r = ref.current!.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - .5); my.set((e.clientY - r.top) / r.height - .5); }}
            onPointerLeave={() => { mx.set(0); my.set(0); }}>
            <div className="relative">
              {[0, 1].map(i => <div key={i} className={clsx('absolute rounded-full border border-brand/30', i ? 'spin-rev border-dashed' : 'spin-slow')} style={{ inset: -18 - i * 20, animationDuration: `${30 + i * 20}s` }} />)}
              {me && me.orgRank === 1 && <Crown className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 text-saffron drop-shadow-[0_0_14px_rgba(233,169,46,.9)]" size={34} />}
              <Avatar emp={emp} size={176} />
            </div>
          </motion.div>
          <div className="text-center lg:text-right">
            <div className="text-sm" style={{ color: unit.color }}>{unit.name}</div>
            <h2 className="mt-1 text-4xl font-black text-white">{emp.name}</h2>
            <div className="mt-1 text-mute">{emp.title}{emp.team ? `، تیم ${emp.team}` : ''}</div>
            {me ? (
              <div className="mt-5 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Badge label="نمره کلی" value={<CountUp value={me.overall} />} color={BRAND.orange} big />
                <Badge label="رتبه در سازمان" value={`${me.orgRank} از ${all.length}`} color="#fff" />
                <Badge label={`رتبه در ${unit.name}`} value={`${me.unitRank} از ${unitPeople.length}`} color="#fff" />
                {me.band && <Badge label="سطح" value={me.band.name} color={me.band.color} />}
              </div>
            ) : <p className="mt-4 text-sm text-mute">در این بازه ارزیابی برای این فرد ثبت نشده است.</p>}
          </div>
          {me && <div className="mx-auto"><Petal {...petalOf(me)} size={270} label="نمره کلی" /></div>}
        </div>
      </section>

      {me && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <DimCard icon={ClipboardList} title="وظیفه‌ای + تیمی" color={DIM_COLOR.kpi} value={me.kpi.kpis.some(k => !k.missing) ? me.kpiPct : null} weight={unit.dims.weights.kpi}
              sub={me.kpi.groups.map(g => `${g.group.name}: ${n(g.pct)}٪`).join('  ') + (me.kpi.bonus ? `  Bonus: +${n(me.kpi.bonus)}` : '')} />
            <DimCard icon={GraduationCap} title="فردی" color={DIM_COLOR.individual} value={me.individual.pct} weight={unit.dims.weights.individual}
              sub={`${me.individual.examCount} آزمون، ${me.individual.passed} قبولی، میانگین ${n(me.individual.examAvg)}${me.individual.competency != null ? `، صلاحیت ${n(me.individual.competency)}` : ''}`} />
            <DimCard icon={HeartHandshake} title="سازمانی" color={DIM_COLOR.org} value={me.org.pct} weight={unit.dims.weights.org}
              sub={me.org.items.map(i => `${i.name}: ${i.value == null ? '—' : n(i.value)}`).join('  ')} />
          </div>

          <Panel lift="sm" title="شاخص‌های وظیفه‌ای و تیمی" pad={false}>
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead><tr className="text-right text-[11px] text-mute">
                  <th className="px-3 py-2 font-medium">شاخص</th><th className="px-3 font-medium">هدف (Min تا Max)</th><th className="px-3 font-medium">مقدار فعلی</th>
                  <th className="px-3 font-medium">درصد تحقق</th><th className="px-3 font-medium">نمره / وزن</th><th className="px-3 font-medium">Bonus</th>
                </tr></thead>
                <tbody>
                  {me.kpi.groups.map(g => (
                    <Fragment key={g.group.id}>
                      <tr><td colSpan={6} className="px-3 pb-1 pt-3 text-xs font-bold" style={{ color: g.group.color }}>{g.group.name} ({n(g.pct)}٪)</td></tr>
                      {me.kpi.kpis.filter(k => k.kpi.groupId === g.group.id).map(k => (
                        <tr key={k.kpi.id} className="border-t border-white/[.06] transition hover:bg-white/[.04]">
                          <td className="px-3 py-2.5 font-medium text-white">{k.kpi.name}<div className="text-[10px] text-mute">{unit.settings.measureTypes.find(t => t.id === k.kpi.typeId)?.name}، {k.kpi.period}</div></td>
                          <td className="px-3 tabular-nums text-mute">{engineOf(unit.settings, k.kpi.typeId) === 'case' ? 'به ازای هر مورد' : `${n(k.kpi.min, 2)} تا ${n(k.kpi.max, 2)}`} <span className="text-[10px]">{k.kpi.unit}</span></td>
                          <td className="px-3 font-bold tabular-nums text-white">{k.missing ? <span className="text-mute">ثبت نشده</span> : n(k.value, 2)}</td>
                          <td className="px-3">{k.missing ? '—' : k.achievement == null ? <span className="text-[11px] text-mute">{k.achievementLabel}</span> :
                            <span className="inline-block min-w-[60px] rounded-lg px-2 py-0.5 text-center font-bold tabular-nums text-white" style={{ background: achColor(k.achievement, unit.settings.overCap) }}>{n(k.achievement)}٪</span>}</td>
                          <td className="px-3 tabular-nums">{k.missing ? '—' : <><b className="text-white">{n(k.score, 2)}</b><span className="text-mute"> / {n(k.kpi.weight, 0)}</span></>}</td>
                          <td className="px-3 tabular-nums text-saffron-700">{k.bonus ? `+${n(k.bonus, 2)}` : '—'}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel lift="sm" title={<span className="flex items-center gap-2"><GraduationCap size={17} className="text-anar" />آزمون‌های پیام‌گستر</span>}>
              {me.ev.exams.length ? (
                <ul className="space-y-2">
                  {me.ev.exams.map(x => {
                    const pct = x.score != null && x.max > 0 ? (x.score / x.max) * 100 : null;
                    const pass = pct != null && pct >= unit.dims.passPct;
                    return (
                      <li key={x.id} className="lift lift-sm flex items-center gap-3 rounded-xl bg-white/[.04] px-3 py-2.5">
                        <Award size={18} className={pass ? 'text-firouzeh' : 'text-mute'} />
                        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{x.topic}</div><div className="text-[11px] text-mute">{x.date || '—'}</div></div>
                        <div className="text-left"><div className="font-black tabular-nums text-white">{n(x.score)} <span className="text-xs font-normal text-mute">از {n(x.max)}</span></div>
                          <Chip color={pass ? '#1DB5A8' : '#E35D5D'}>{pct == null ? 'ثبت نشده' : pass ? 'قبول' : 'مردود'}</Chip></div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-mute">در این بازه آزمونی ثبت نشده است.</p>}
            </Panel>
            <Panel lift="sm" title="روند عملکرد در بازه‌ها">
              {trend.length < 2 ? <p className="py-10 text-center text-sm text-mute">برای نمایش روند، دست‌کم دو بازه ارزیابی لازم است.</p> : (
                <div dir="ltr" style={{ height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={trend}>
                      <CartesianGrid stroke="rgba(255,255,255,.07)" />
                      <XAxis dataKey="name" reversed tickLine={false} axisLine={false} />
                      <YAxis orientation="right" domain={[0, 'auto']} tickLine={false} axisLine={false} />
                      <Tooltip {...chartTip} formatter={(v: any) => n(+v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={100} stroke="rgba(255,255,255,.3)" strokeDasharray="4 4" />
                      <Line dataKey="نمره کلی" stroke={BRAND.orange} strokeWidth={3} dot={{ r: 4 }} connectNulls />
                      <Line dataKey="وظیفه‌ای + تیمی" stroke={BRAND.task} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line dataKey="فردی" stroke={BRAND.ind} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line dataKey="سازمانی" stroke={BRAND.org} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ label, value, color, big }: { label: string; value: React.ReactNode; color: string; big?: boolean }) {
  return (
    <div className="glass pop rounded-2xl px-4 py-2.5 text-right">
      <div className="text-[11px] text-mute">{label}</div>
      <div className={clsx('font-black tabular-nums', big ? 'text-3xl' : 'text-lg')} style={{ color }}>{value}</div>
    </div>
  );
}

function DimCard({ icon: Icon, title, color, value, weight, sub }: { icon: any; title: string; color: string; value: number | null; weight: number; sub: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass lift lift-lg floaty relative overflow-hidden rounded-2xl p-5">
      <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-2xl" style={{ background: color }} />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-white"><Icon size={17} style={{ color }} />{title}</span>
        <span className="text-[11px] text-mute">وزن {n(weight, 0)}٪</span>
      </div>
      <div className="relative mt-3 text-4xl font-black" style={{ color }}>{value == null ? <span className="text-xl text-mute">ثبت نشده</span> : <CountUp value={value} />}</div>
      <div className="relative mt-2 text-[11px] leading-5 text-mute">{sub}</div>
    </motion.div>
  );
}
