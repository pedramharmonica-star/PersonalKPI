import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie } from 'recharts';
import { useStore } from '../lib/store';
import { useAllResults, useResults, useSortedPeriods, useUnit } from '../lib/hooks';
import { chartTip } from './viewer/OrgView';
import { KIND_LABEL } from '../lib/jalali';
import { exportPeriodExcel } from '../lib/excel';
import type { PeriodKind } from '../lib/types';
import { Button, Empty, Panel, Segmented, Select, n } from '../components/ui';

const PALETTE = ['#F26122', '#1DB5A8', '#EEC56A', '#7FA3C0', '#E35D5D', '#9B7FD1', '#4FB477', '#E07BB0', '#C9A36B', '#5AB0E0'];
const tip = chartTip;

export default function Analytics({ viewer }: { viewer?: boolean }) {
  const db = useStore(s => s.db)!;
  const unit = useUnit()!;
  const periodId = useStore(s => s.periodId);
  const periods = useSortedPeriods();
  const all = useAllResults();
  const results = useResults(periodId);
  const period = db.periods.find(p => p.id === periodId);
  const nameOf = (id: string) => db.employees.find(e => e.id === id)?.name ?? '—';
  const colorOf = (id: string) => PALETTE[Math.max(0, db.employees.findIndex(e => e.id === id)) % PALETTE.length];

  const [trendKind, setTrendKind] = useState<'all' | PeriodKind>('all');
  const [trendMetric, setTrendMetric] = useState<'total' | 'rank'>('total');
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [radarEmp, setRadarEmp] = useState<string>('');
  const kpiNames = useMemo(() => { const s: string[] = []; results.forEach(r => r.kpis.forEach(k => { if (!s.includes(k.kpi.name.trim())) s.push(k.kpi.name.trim()); })); return s; }, [results]);
  const [kpiSel, setKpiSel] = useState('');
  const kpiName = kpiNames.includes(kpiSel) ? kpiSel : kpiNames[0] ?? '';

  const sorted = [...results].sort((a, b) => a.rank - b.rank);

  // previous period of same kind for rank delta
  const prevMap = useMemo(() => {
    if (!period) return new Map<string, { rank: number; total: number }>();
    const same = periods.filter(p => p.kind === period.kind);
    const i = same.findIndex(p => p.id === period.id);
    const prev = i > 0 ? all.get(same[i - 1].id) ?? [] : [];
    return new Map(prev.map(r => [r.evaluation.employeeId, { rank: r.rank, total: r.total }]));
  }, [period, periods, all]);

  const compareData = sorted.map(r => ({ name: nameOf(r.evaluation.employeeId), نمره: +r.score.toFixed(2), Bonus: +r.bonus.toFixed(2), ...Object.fromEntries(r.groups.map(g => [g.group.name, +(g.pct).toFixed(1)])) }));

  const trendPeriods = periods.filter(p => trendKind === 'all' || p.kind === trendKind);
  const trendEmps = db.employees.filter(e => e.unitId === unit.id).filter(e => trendPeriods.some(p => (all.get(p.id) ?? []).some(r => r.evaluation.employeeId === e.id)));
  const trendData = trendPeriods.map(p => {
    const row: Record<string, any> = { name: p.name };
    for (const r of all.get(p.id) ?? []) row[r.evaluation.employeeId] = trendMetric === 'total' ? +r.total.toFixed(2) : r.rank;
    return row;
  });

  const radarId = results.some(r => r.evaluation.employeeId === radarEmp) ? radarEmp : sorted[0]?.evaluation.employeeId ?? '';
  const radarRes = results.find(r => r.evaluation.employeeId === radarId);
  const radarData = (radarRes?.kpis ?? []).map(k => {
    const peers = results.flatMap(r => r.kpis.filter(x => x.kpi.name.trim() === k.kpi.name.trim() && !x.missing));
    const avg = peers.length ? peers.reduce((a, x) => a + (x.kpi.weight ? (x.score / x.kpi.weight) * 100 : 0), 0) / peers.length : 0;
    return { kpi: k.kpi.name.length > 22 ? k.kpi.name.slice(0, 21) + '…' : k.kpi.name, فرد: k.missing ? 0 : +(k.kpi.weight ? (k.score / k.kpi.weight) * 100 : 0).toFixed(1), 'میانگین تیم': +avg.toFixed(1) };
  });

  const kpiData = sorted.map(r => {
    const k = r.kpis.find(x => x.kpi.name.trim() === kpiName);
    return k ? { name: nameOf(r.evaluation.employeeId), id: r.evaluation.employeeId, 'درصد تحقق': k.missing ? 0 : +(k.achievement ?? (k.kpi.weight ? k.score / k.kpi.weight * 100 : 0)).toFixed(1), مقدار: k.value, نمره: +k.score.toFixed(2), missing: k.missing, unit: k.kpi.unit, min: k.kpi.min, max: k.kpi.max } : null;
  }).filter(Boolean) as any[];

  const bandData = unit.settings.bands.map(b => ({ name: b.name, value: results.filter(r => r.band?.id === b.id).length, color: b.color })).filter(x => x.value > 0);

  if (!period) return <Empty title="بازه‌ای انتخاب نشده" text="از بالای صفحه یک بازه ارزیابی انتخاب کنید." />;

  return (
    <div className="space-y-6">
      <Panel title={`جدول KPI ${unit.name}، ${period.name}`} pad={false} action={results.length > 0 && !viewer && <Button size="sm" icon={<Download size={14} />} onClick={() => exportPeriodExcel(db, unit, period, results)}>خروجی اکسل</Button>}>
        {!results.length ? <div className="px-5 pb-6 text-sm text-mute">در این بازه ارزیابی ثبت نشده است.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-white/10 text-right text-xs text-mute">
                <th className="px-5 py-2.5 font-medium">رتبه</th><th className="px-3 font-medium">نام</th>
                {unit.settings.groups.map(g => <th key={g.id} className="px-3 font-medium">{g.name}</th>)}
                <th className="px-3 font-medium">نمره</th><th className="px-3 font-medium">Bonus</th><th className="px-3 font-medium">نهایی</th><th className="px-3 font-medium">سطح</th><th className="px-3 font-medium">تغییر نسبت به بازه قبل</th>
              </tr></thead>
              <tbody>
                {sorted.map(r => {
                  const pv = prevMap.get(r.evaluation.employeeId);
                  const d = pv ? pv.rank - r.rank : null;
                  return (
                    <tr key={r.evaluation.id} className="border-t border-white/[.06]">
                      <td className="px-5 py-2.5"><span className={clsx('inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black', r.rank === 1 ? 'bg-saffron text-white' : 'bg-white/[.05] text-ink')}>{r.rank}</span></td>
                      <td className="px-3 font-bold text-ink">{nameOf(r.evaluation.employeeId)}</td>
                      {unit.settings.groups.map(g => { const gr = r.groups.find(x => x.group.id === g.id); return <td key={g.id} className="px-3 tabular-nums">{gr ? `${n(gr.pct)}٪` : '—'}</td>; })}
                      <td className="px-3 tabular-nums">{n(r.score)}</td>
                      <td className="px-3 tabular-nums text-saffron-700">{r.bonus ? `+${n(r.bonus)}` : '—'}</td>
                      <td className="px-3 text-base font-black tabular-nums text-ink">{n(r.total)}</td>
                      <td className="px-3"><span className="text-xs font-bold" style={{ color: r.band?.color }}>{r.band?.name}</span></td>
                      <td className="px-3 text-xs">
                        {pv == null ? <span className="text-mute">—</span> : (
                          <span className={clsx('tabular-nums', d! > 0 ? 'text-firouzeh' : d! < 0 ? 'text-anar' : 'text-mute')}>
                            {d! > 0 ? `▲ ${d} رتبه` : d! < 0 ? `▼ ${-d!} رتبه` : 'بدون تغییر'} ({r.total - pv.total >= 0 ? '+' : ''}{n(r.total - pv.total)} نمره)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {results.length > 0 && (
        <div className="grid gap-6 2xl:grid-cols-2">
          <Panel title="مقایسه نمره نهایی پرسنل">
            <Chart h={Math.max(240, compareData.length * 46)}>
              <BarChart data={compareData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,.07)" />
                <XAxis type="number" reversed domain={[0, (max: number) => Math.max(120, Math.ceil(max / 10) * 10)]} />
                <YAxis type="category" dataKey="name" orientation="right" width={110} tick={{ fontSize: 12, fill: '#D5D8DD' }} />
                <Tooltip {...tip} formatter={(v: any) => n(+v, 2)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine x={100} stroke="rgba(255,255,255,.55)" strokeDasharray="4 3" />
                <Bar dataKey="نمره" stackId="a" fill="#1DB5A8" radius={[0, 0, 0, 0]} barSize={22} />
                <Bar dataKey="Bonus" stackId="a" fill="#E9A92E" radius={[4, 0, 0, 4]} barSize={22} />
              </BarChart>
            </Chart>
          </Panel>

          <Panel title="درصد تحقق هر گروه شاخص">
            <Chart h={Math.max(240, compareData.length * 46)}>
              <BarChart data={compareData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="name" reversed tick={{ fontSize: 12, fill: '#D5D8DD' }} />
                <YAxis orientation="right" domain={[0, 120]} />
                <Tooltip {...tip} formatter={(v: any) => `${n(+v)}٪`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={100} stroke="rgba(255,255,255,.55)" strokeDasharray="4 3" />
                {unit.settings.groups.map(g => <Bar key={g.id} dataKey={g.name} fill={g.color} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            </Chart>
          </Panel>

          <Panel title="مقایسه یک شاخص بین پرسنل" action={<Select className="!h-8 !w-64 text-[13px]" value={kpiName} onChange={e => setKpiSel(e.target.value)}>{kpiNames.map(k => <option key={k}>{k}</option>)}</Select>}>
            <Chart h={280}>
              <BarChart data={kpiData}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="name" reversed tick={{ fontSize: 12, fill: '#D5D8DD' }} />
                <YAxis orientation="right" domain={[0, unit.settings.overCap]} />
                <Tooltip {...tip} content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return <div className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs leading-6 shadow" dir="rtl">
                    <div className="font-bold">{d.name}</div>
                    {d.missing ? <div className="text-mute">ثبت نشده</div> : <>
                      <div>مقدار فعلی: {n(d['مقدار'], 2)} {d.unit}</div>
                      <div>بازه هدف: {n(d.min, 2)} تا {n(d.max, 2)}</div>
                      <div>درصد تحقق: {n(d['درصد تحقق'])}٪</div>
                      <div>نمره: {n(d['نمره'], 2)}</div></>}
                  </div>;
                }} />
                <ReferenceLine y={100} stroke="rgba(255,255,255,.55)" strokeDasharray="4 3" />
                <Bar dataKey="درصد تحقق" radius={[4, 4, 0, 0]} barSize={36}>
                  {kpiData.map((d: any) => <Cell key={d.id} fill={d.missing ? 'rgba(255,255,255,.15)' : colorOf(d.id)} />)}
                </Bar>
              </BarChart>
            </Chart>
          </Panel>

          <Panel title="نقاط قوت و ضعف فرد در برابر میانگین تیم" action={<Select className="!h-8 !w-48 text-[13px]" value={radarId} onChange={e => setRadarEmp(e.target.value)}>{sorted.map(r => <option key={r.evaluation.id} value={r.evaluation.employeeId}>{nameOf(r.evaluation.employeeId)}</option>)}</Select>}>
            <Chart h={320}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,.15)" />
                <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 11, fill: '#D5D8DD' }} />
                <PolarRadiusAxis domain={[0, 120]} tick={{ fontSize: 10 }} angle={90} />
                <Radar name="میانگین همکاران با همین شاخص" dataKey="میانگین تیم" stroke="#9AA1AB" fill="#9AA1AB" fillOpacity={0.12} />
                <Radar name={nameOf(radarId)} dataKey="فرد" stroke="#178C8C" fill="#1DB5A8" fillOpacity={0.35} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip {...tip} formatter={(v: any) => `${n(+v)}٪ وزن`} />
              </RadarChart>
            </Chart>
            <p className="text-[11px] text-mute">مقیاس: نمره کسب‌شده به‌صورت درصد از وزن شاخص.</p>
          </Panel>
        </div>
      )}

      <Panel title="روند در طول بازه‌ها" action={<>
        <Segmented value={trendMetric} onChange={setTrendMetric} options={[{ value: 'total', label: 'نمره نهایی' }, { value: 'rank', label: 'رتبه' }]} />
        <Select className="!h-9 !w-36 text-[13px]" value={trendKind} onChange={e => setTrendKind(e.target.value as any)}>
          <option value="all">همه بازه‌ها</option>
          {(Object.keys(KIND_LABEL) as PeriodKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </Select>
      </>}>
        {trendPeriods.length < 2 ? (
          <div className="rounded-lg bg-white/[.05] px-4 py-6 text-center text-sm leading-7 text-mute">
            برای دیدن روند، دست‌کم دو بازه با ارزیابی ثبت‌شده لازم است. الان {trendPeriods.length} بازه از این نوع وجود دارد؛ بازه بعدی را از صفحه «بازه‌های ارزیابی» بسازید.
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {trendEmps.map(e => (
                <button key={e.id} onClick={() => setHidden(h => ({ ...h, [e.id]: !h[e.id] }))}
                  className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', hidden[e.id] ? 'border-white/10 text-mute' : 'border-transparent bg-white/[.05] text-ink')}>
                  <i className="h-2 w-2 rounded-full" style={{ background: hidden[e.id] ? 'rgba(255,255,255,.15)' : colorOf(e.id) }} />{e.name}
                </button>
              ))}
            </div>
            <Chart h={320}>
              <LineChart data={trendData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="name" reversed tick={{ fontSize: 12 }} />
                <YAxis orientation="right" reversed={trendMetric === 'rank'} allowDecimals={trendMetric !== 'rank'} domain={trendMetric === 'rank' ? [1, 'dataMax'] : [0, 'auto']} />
                <Tooltip {...tip} formatter={(v: any, k: any) => [trendMetric === 'rank' ? `رتبه ${v}` : n(+v), nameOf(k)]} />
                {trendMetric === 'total' && <ReferenceLine y={100} stroke="rgba(255,255,255,.55)" strokeDasharray="4 3" />}
                {trendEmps.filter(e => !hidden[e.id]).map(e => <Line key={e.id} dataKey={e.id} name={e.name} stroke={colorOf(e.id)} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />)}
              </LineChart>
            </Chart>
          </>
        )}
      </Panel>

      {bandData.length > 0 && (
        <Panel title="توزیع سطح عملکرد">
          <div className="flex flex-wrap items-center gap-8">
            <div className="h-52 w-52" dir="ltr">
              <ResponsiveContainer><PieChart><Pie data={bandData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{bandData.map(b => <Cell key={b.name} fill={b.color} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm">
              {unit.settings.bands.map(b => <li key={b.id} className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: b.color }} /><span className="w-28 font-medium">{b.name}</span><span className="text-mute">از {b.min}</span><span className="mr-3 font-bold tabular-nums">{results.filter(r => r.band?.id === b.id).length} نفر</span></li>)}
            </ul>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Chart({ h, children }: { h: number; children: React.ReactElement }) {
  return <div dir="ltr" style={{ height: h }} className="w-full"><ResponsiveContainer>{children}</ResponsiveContainer></div>;
}
