import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2, GraduationCap, HeartHandshake, CalendarPlus, UserPlus } from 'lucide-react';
import { useStore } from '../../lib/store';
import { usePeople, useUnit } from '../../lib/hooks';
import { uid } from '../../lib/seed';
import type { Evaluation, ExamRecord } from '../../lib/types';
import { Button, Empty, NumInput, Panel, TextInput, n } from '../../components/ui';
import { Avatar } from '../../components/People';
import type { AdminPage } from '../../App';

export default function DimEntry({ kind, go }: { kind: 'individual' | 'org'; go: (p: AdminPage) => void }) {
  const db = useStore(s => s.db)!;
  const { periodId, startEvaluation, updateEval } = useStore();
  const unit = useUnit();
  const period = db.periods.find(p => p.id === periodId);
  const people = usePeople(periodId, unit?.id);
  const [sel, setSel] = useState<string | null>(null);
  if (!unit) return null;
  if (!period) return <Empty icon={<CalendarPlus size={40} />} title="بازه ارزیابی انتخاب نشده" action={<Button tone="primary" onClick={() => go('periods')}>ساخت بازه</Button>} />;
  const emps = db.employees.filter(e => e.unitId === unit.id && (e.active || db.evaluations.some(v => v.employeeId === e.id && v.periodId === period.id)));
  if (!emps.length) return <Empty icon={<UserPlus size={40} />} title={`هنوز در واحد ${unit.name} کسی تعریف نشده`} action={<Button tone="primary" onClick={() => go('employees')}>افزودن پرسنل</Button>} />;

  const evOf = (empId: string) => db.evaluations.find(e => e.periodId === period.id && e.employeeId === empId);
  /** make sure an evaluation exists, then edit it */
  const edit = (empId: string, fn: (e: Evaluation) => void) => {
    const id = evOf(empId)?.id ?? startEvaluation(period.id, empId);
    if (!id) { useStore.getState().notify('برای این نفر روش ارزیابی تعیین نشده است؛ از صفحه پرسنل یک روش انتخاب کنید.', 'err'); return; }
    updateEval(id, fn);
  };
  const d = unit.dims;
  const selEmp = emps.find(e => e.id === sel) ?? emps[0];
  const selEv = evOf(selEmp.id);

  return (
    <div className="space-y-5">
      <Panel lift="none" title={<span className="flex items-center gap-2">{kind === 'individual' ? <GraduationCap size={18} className="text-anar" /> : <HeartHandshake size={18} className="text-firouzeh" />}
        {kind === 'individual' ? `نمرات آزمون و صلاحیت فردی، ${period.name}` : `رفتار شهروندی سازمانی، ${period.name}`}</span>}
        action={<span className="text-xs text-mute">{kind === 'individual' ? `حد قبولی: ${d.passPct}٪ نمره، ترکیب: آزمون ${d.individualMix.exam}٪ و صلاحیت ${d.individualMix.competency}٪` : 'نمره هر مورد از ۱۰۰'}</span>} pad={false}>
        <div className="overflow-x-auto px-3 pb-4">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="text-right text-[11px] text-mute">
                <th className="px-3 py-2 font-medium">نام</th>
                {kind === 'individual' ? <>
                  {d.examTopics.map(t => <th key={t} className="px-2 font-medium">{t}<div className="text-[10px] font-normal">نمره از ۱۰۰</div></th>)}
                  <th className="px-2 font-medium">صلاحیت فردی<div className="text-[10px] font-normal">از ۱۰۰</div></th>
                  <th className="px-2 font-medium">آزمون‌ها</th><th className="px-2 font-medium">نمره فردی</th>
                </> : <>
                  {d.orgItems.map(t => <th key={t.id} className="px-2 font-medium">{t.name}</th>)}
                  <th className="px-2 font-medium">نمره سازمانی</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {emps.map(e => {
                const ev = evOf(e.id);
                const r = people.find(p => p.emp.id === e.id);
                return (
                  <tr key={e.id} className={clsx('border-t border-white/[.06] transition hover:bg-white/[.03]', selEmp.id === e.id && kind === 'individual' && 'bg-brand/[.06]')}>
                    <td className="px-3 py-2">
                      <button onClick={() => setSel(e.id)} className="flex items-center gap-2.5 text-right"><Avatar emp={e} size={34} /><span><b className="block text-white">{e.name}</b><span className="text-[10px] text-mute">{e.title}</span></span></button>
                    </td>
                    {kind === 'individual' ? <>
                      {d.examTopics.map(t => {
                        const x = ev?.exams.find(z => z.topic === t);
                        return (
                          <td key={t} className="w-28 px-1.5">
                            <NumInput cell data-nav="actual" value={x?.score ?? null} placeholder="—" className="!bg-white/[.04] text-center font-bold"
                              onChange={v => edit(e.id, ev2 => {
                                const i = ev2.exams.findIndex(z => z.topic === t);
                                if (v == null) { if (i >= 0) ev2.exams.splice(i, 1); return; }
                                if (i >= 0) ev2.exams[i].score = v; else ev2.exams.push({ id: uid('x'), topic: t, score: v, max: 100, date: '', note: '' });
                              })} />
                          </td>
                        );
                      })}
                      <td className="w-28 px-1.5"><NumInput cell value={ev?.competency ?? null} placeholder="—" className="!bg-white/[.04] text-center font-bold" onChange={v => edit(e.id, ev2 => { ev2.competency = v; })} /></td>
                      <td className="px-2 text-[11px] text-mute">{r?.individual.examCount ?? 0} آزمون، <span className="text-firouzeh-700">{r?.individual.passed ?? 0} قبول</span><div>میانگین {n(r?.individual.examAvg)}</div></td>
                      <td className="px-2 text-lg font-black tabular-nums text-anar">{n(r?.individual.pct)}</td>
                    </> : <>
                      {d.orgItems.map(t => (
                        <td key={t.id} className="w-32 px-1.5"><NumInput cell data-nav="actual" value={ev?.org?.[t.id] ?? null} placeholder="—" className="!bg-white/[.04] text-center font-bold"
                          onChange={v => edit(e.id, ev2 => { ev2.org = { ...(ev2.org ?? {}), [t.id]: v }; })} /></td>
                      ))}
                      <td className="px-2 text-lg font-black tabular-nums text-firouzeh-700">{n(r?.org.pct)}</td>
                    </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {kind === 'individual' && (
        <Panel lift="none" title={`همه آزمون‌های ${selEmp.name} در این بازه`} action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => edit(selEmp.id, ev => { ev.exams.push({ id: uid('x'), topic: d.examTopics[0] ?? 'آزمون', score: null, max: 100, date: '', note: '' }); })}>آزمون دیگر</Button>}>
          <p className="mb-3 text-xs leading-6 text-mute">برای ثبت چند آزمون در یک سرفصل، آزمون با سقف نمره غیر از ۱۰۰، یا سرفصلی که در فهرست تنظیمات نیست، از اینجا استفاده کنید. نمره فردی میانگین درصد همه آزمون‌هاست.</p>
          {!selEv?.exams.length ? <p className="text-sm text-mute">آزمونی ثبت نشده است.</p> : (
            <div className="space-y-2">
              {selEv.exams.map((x, i) => (
                <ExamRow key={x.id} x={x} topics={d.examTopics} pass={d.passPct}
                  onChange={nx => edit(selEmp.id, ev => { ev.exams[i] = nx; })} onDel={() => edit(selEmp.id, ev => { ev.exams.splice(i, 1); })} />
              ))}
            </div>
          )}
        </Panel>
      )}
      <p className="text-xs text-mute">سرفصل‌های آزمون، موارد رفتار سازمانی، حد قبولی و وزن هر بُعد از «تنظیمات واحد» قابل تغییر است.</p>
    </div>
  );
}

function ExamRow({ x, topics, pass, onChange, onDel }: { x: ExamRecord; topics: string[]; pass: number; onChange: (x: ExamRecord) => void; onDel: () => void }) {
  const pct = x.score != null && x.max > 0 ? (x.score / x.max) * 100 : null;
  return (
    <div className="grid items-center gap-2 rounded-xl bg-white/[.04] p-2 sm:grid-cols-[1.6fr_.7fr_.7fr_1fr_auto_auto]">
      <div className="flex gap-1">
        <TextInput list="exam-topics" value={x.topic} onChange={e => onChange({ ...x, topic: e.target.value })} className="!h-9" placeholder="سرفصل" />
        <datalist id="exam-topics">{topics.map(t => <option key={t} value={t} />)}</datalist>
      </div>
      <NumInput value={x.score} onChange={v => onChange({ ...x, score: v })} placeholder="نمره" className="!h-9" />
      <NumInput value={x.max} onChange={v => onChange({ ...x, max: v ?? 100 })} placeholder="از" className="!h-9" />
      <TextInput value={x.date} onChange={e => onChange({ ...x, date: e.target.value })} placeholder="تاریخ مثل 1404/09/15" className="!h-9" dir="ltr" />
      <span className={clsx('w-16 text-center text-xs font-bold', pct == null ? 'text-mute' : pct >= pass ? 'text-firouzeh-700' : 'text-anar')}>{pct == null ? '—' : `${n(pct, 0)}٪`}</span>
      <button onClick={onDel} className="rounded-lg p-2 text-mute hover:bg-anar-50 hover:text-anar" aria-label="حذف آزمون"><Trash2 size={15} /></button>
    </div>
  );
}
