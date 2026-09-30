import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronLeft, RefreshCw, Trash2, Pencil, Printer, UserPlus, CalendarPlus, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { useResults, useUnit } from '../lib/hooks';
import { achColor, engineOf } from '../lib/engine';
import { Button, Chip, Confirm, Empty, NumInput, Panel, Toggle, n } from '../components/ui';
import { BehaviorCell, KpiCells, KpiDetails } from '../components/KpiEditor';
import type { Page } from '../App';
import type { KpiResult } from '../lib/types';

export default function Evaluate({ focusEmp, setFocusEmp, go }: { focusEmp: string | null; setFocusEmp: (id: string | null) => void; go: (p: Page) => void }) {
  const db = useStore(s => s.db)!;
  const unit = useUnit()!;
  const periodId = useStore(s => s.periodId);
  const { startEvaluation, setValue, updateEvalKpi, syncEvalWithTemplate, deleteEvaluation, mutate } = useStore();
  const results = useResults(periodId);
  const period = db.periods.find(p => p.id === periodId);
  const emps = db.employees.filter(e => e.unitId === unit.id).filter(e => e.active || db.evaluations.some(v => v.employeeId === e.id && v.periodId === periodId));
  const [sel, setSel] = useState<string | null>(focusEmp ?? emps[0]?.id ?? null);
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => { if (focusEmp) { setSel(focusEmp); setFocusEmp(null); } }, [focusEmp, setFocusEmp]);
  useEffect(() => { if (!sel || !emps.some(e => e.id === sel)) setSel(emps[0]?.id ?? null); }, [emps, sel]);

  const res = results.find(r => r.evaluation.employeeId === sel);
  const emp = db.employees.find(e => e.id === sel);
  const tpl = unit.templates.find(t => t.id === emp?.templateId);

  const drift = useMemo(() => {
    if (!res || !tpl) return false;
    return JSON.stringify(res.evaluation.kpis) !== JSON.stringify(tpl.kpis);
  }, [res, tpl]);

  if (!period) return <Empty icon={<CalendarPlus size={40} />} title="بازه ارزیابی انتخاب نشده" text="برای ثبت ارزیابی ابتدا یک بازه بسازید." action={<Button tone="primary" onClick={() => go('periods')}>ساخت بازه</Button>} />;
  if (!emps.length) return <Empty icon={<UserPlus size={40} />} title="هنوز کارشناسی تعریف نشده" action={<Button tone="primary" onClick={() => go('employees')}>افزودن پرسنل</Button>} />;

  return (
    <div className="grid gap-6 2xl:grid-cols-[240px_1fr]">
      {/* people list */}
      <div className="no-print">
        <div className="mb-2 px-1 text-xs text-mute">پرسنل ({emps.length})</div>
        <div className="flex gap-2 overflow-x-auto pb-1 2xl:block 2xl:space-y-1 2xl:overflow-visible">
        {emps.map(e => {
          const r = results.find(x => x.evaluation.employeeId === e.id);
          return (
            <button key={e.id} onClick={() => { setSel(e.id); setEdit(false); }}
              className={clsx('flex min-w-[190px] shrink-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-right transition-colors 2xl:w-full', sel === e.id ? 'border-brand/60 bg-white/[.04]' : 'border-white/[.06] bg-white/[.03] hover:bg-white/[.07] 2xl:border-transparent 2xl:bg-transparent')}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{e.name}</span>
                <span className="block truncate text-[11px] text-mute">{unit.templates.find(t => t.id === e.templateId)?.name ?? 'بدون روش'}</span>
              </span>
              {r ? (
                <span className="text-left">
                  <span className="block text-sm font-black tabular-nums text-ink">{n(r.total)}</span>
                  <span className={clsx('text-[10px]', r.completion < 100 ? 'text-saffron-700' : 'text-firouzeh')}>{r.completion < 100 ? `${n(r.completion, 0)}٪ ثبت` : 'کامل'}</span>
                </span>
              ) : <span className="text-[11px] text-mute">ثبت نشده</span>}
            </button>
          );
        })}
        </div>
      </div>

      {/* sheet */}
      <div className="min-w-0 space-y-5">
        {!res ? (
          <Empty title={`ارزیابی ${emp?.name ?? ''} در ${period.name} هنوز شروع نشده`}
            text={tpl ? `شاخص‌ها از روش «${tpl.name}» کپی می‌شوند؛ بعداً می‌توانید پارامترهای همین ارزیابی را جداگانه تغییر دهید.` : 'برای این نفر روش ارزیابی تعیین نشده است. از صفحه پرسنل یک روش انتخاب کنید.'}
            action={tpl ? <Button tone="primary" onClick={() => sel && startEvaluation(period.id, sel)}>شروع ارزیابی</Button> : <Button onClick={() => go('employees')}>تعیین روش</Button>} />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-0">
                <div className="text-2xl font-black text-ink">{emp?.name}</div>
                <div className="text-sm text-mute">{emp?.title} در {period.name} ({period.start} تا {period.end})</div>
              </div>
              <div className="mr-auto flex flex-wrap items-center gap-2 no-print">
                <Toggle checked={edit} onChange={setEdit} label="ویرایش پارامترهای این ارزیابی" />
                {drift && <Button size="sm" icon={<RefreshCw size={14} />} onClick={() => syncEvalWithTemplate(res.evaluation.id)} title="شاخص‌ها را دوباره از روش کپی کن؛ مقادیر ثبت‌شده حفظ می‌شوند">همگام‌سازی با روش</Button>}
                <Button size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>چاپ</Button>
                <Button size="sm" tone="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmDel(true)}>حذف ارزیابی</Button>
              </div>
            </div>
            {drift && !edit && (
              <div className="flex items-start gap-2 rounded-lg bg-saffron-50 px-4 py-2.5 text-[13px] leading-6 text-saffron-700 no-print">
                <Info size={16} className="mt-1 shrink-0" />
                پارامترهای این ارزیابی با روش فعلی «{tpl?.name}» یکسان نیست (یا از اکسل آمده یا روش بعداً تغییر کرده). نمره‌ها بر اساس نسخه ذخیره‌شده در همین ارزیابی محاسبه می‌شوند.
              </div>
            )}

            <Summary res={res} count={results.length} />

            <Panel pad={false}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1020px] text-[13px]">
                  <thead>
                    <tr className="border-b border-white/10 text-right text-[12px] text-mute">
                      <th className="w-8" />
                      <th className="px-2 py-3 font-medium">نام شاخص</th>
                      <th className="px-2 font-medium">نوع سنجش</th>
                      <th className="px-2 font-medium">دوره سنجش</th>
                      <th className="px-2 font-medium">Min</th>
                      <th className="px-2 font-medium">Max</th>
                      <th className="px-2 font-medium">واحد</th>
                      <th className="px-2 font-medium">وزن نهایی</th>
                      <th className="bg-brand/[.10] px-2 font-bold text-brand-300">مقدار فعلی</th>
                      <th className="px-2 font-medium">درصد تحقق</th>
                      <th className="px-2 font-medium">نمره کسب‌شده</th>
                      <th className="px-2 font-medium">Bonus</th>
                      <th className="px-2 font-medium">نوع رفتار</th>
                    </tr>
                  </thead>
                  {res.groups.map(g => {
                    const rows = res.kpis.filter(k => (g.group.id === '_' ? !unit.settings.groups.some(x => x.id === k.kpi.groupId) : k.kpi.groupId === g.group.id));
                    return (
                      <tbody key={g.group.id}>
                        <tr><td colSpan={13} className="px-3 pb-1 pt-4"><span className="inline-flex items-center gap-2 text-[13px] font-bold" style={{ color: g.group.color }}><i className="h-2.5 w-2.5 rounded-sm" style={{ background: g.group.color }} />شاخص‌های {g.group.name}</span></td></tr>
                        {rows.map(r => (
                          <Row key={r.kpi.id} r={r} edit={edit} open={!!open[r.kpi.id]} toggle={() => setOpen(o => ({ ...o, [r.kpi.id]: !o[r.kpi.id] }))}
                            onValue={v => setValue(res.evaluation.id, r.kpi.id, v)} onKpi={k => updateEvalKpi(res.evaluation.id, k)} />
                        ))}
                        <tr className="border-t border-white/10 bg-white/[.03] text-[12px]">
                          <td /><td className="px-3 py-2 font-bold text-ink" colSpan={6}>جمع {g.group.name}</td>
                          <td className={clsx('px-3 font-bold tabular-nums', Math.abs(g.weight - 100) > 0.01 && !unit.settings.excludeMissing ? 'text-anar' : 'text-ink')}>{n(g.weight, 1)}</td>
                          <td /><td className="px-3 font-bold tabular-nums text-ink">{n(g.pct)}٪</td>
                          <td className="px-3 font-bold tabular-nums text-ink">{n(g.score, 2)}</td>
                          <td className="px-3 font-bold tabular-nums text-saffron-700">{g.bonus ? n(g.bonus, 2) : '—'}</td><td />
                        </tr>
                      </tbody>
                    );
                  })}
                </table>
              </div>
            </Panel>

            <Panel title="یادداشت ارزیاب">
              <textarea value={res.evaluation.note} placeholder="نکات، دلایل تغییر پارامترها، برنامه بهبود…"
                onChange={e => mutate(d => { const x = d.evaluations.find(v => v.id === res.evaluation.id); if (x) x.note = e.target.value; })}
                className="min-h-[90px] w-full rounded-lg border border-white/10 p-3 text-sm leading-7 outline-none focus:border-brand" />
            </Panel>

            <Confirm open={confirmDel} text={<>ارزیابی <b>{emp?.name}</b> در <b>{period.name}</b> با همه مقادیرش حذف شود؟</>}
              onNo={() => setConfirmDel(false)} onYes={() => { deleteEvaluation(res.evaluation.id); setConfirmDel(false); }} />
          </>
        )}
      </div>
    </div>
  );

}

function Row({ r, edit, open, toggle, onValue, onKpi }: { r: KpiResult; edit: boolean; open: boolean; toggle: () => void; onValue: (v: number | null) => void; onKpi: (k: KpiResult["kpi"]) => void }) {
    const s = useUnit()!.settings;
    const eng = engineOf(s, r.kpi.typeId);
    const typeName = s.measureTypes.find(t => t.id === r.kpi.typeId)?.name ?? '—';
    const behName = s.behaviors.find(b => b.id === r.kpi.behaviorId)?.name ?? '—';
    return (
      <>
        <tr className="border-t border-white/[.06] hover:bg-white/[.03]">
          <td className="px-1 text-center"><button onClick={toggle} className="rounded p-1 text-mute hover:bg-white/[.05]" aria-label="جزئیات">{open ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}</button></td>
          {edit ? <KpiCells k={r.kpi} s={s} onChange={onKpi} /> : (
            <>
              <td className="px-3 py-2.5 font-medium text-ink">{r.kpi.name}{r.kpi.tiersSample && eng === 'step' && <span className="mr-1.5 rounded bg-saffron-50 px-1.5 text-[10px] text-saffron-700" title="پله‌ها نمونه هستند">پله نمونه</span>}</td>
              <td className="px-3 text-mute">{typeName}</td>
              <td className="px-3 text-mute">{r.kpi.period}</td>
              <td className="px-3 tabular-nums">{n(r.kpi.min, 2)}</td>
              <td className="px-3 tabular-nums">{n(r.kpi.max, 2)}</td>
              <td className="px-3 text-[12px] text-mute">{r.kpi.unit}</td>
              <td className="px-3 font-bold tabular-nums">{n(r.kpi.weight, 2)}</td>
            </>
          )}
          <td className="w-28 bg-brand/[.06] px-1.5"><NumInput cell data-nav="actual" value={r.value} onChange={onValue} placeholder="ثبت نشده" className="!bg-white/[.05] font-bold" /></td>
          <td className="w-28 px-2">
            {r.missing ? <span className="text-[12px] text-mute">—</span>
              : r.achievement == null ? <span className="text-[12px] text-mute">{r.achievementLabel}</span>
              : <span className="inline-block min-w-[64px] rounded-md px-2 py-1 text-center font-bold tabular-nums" style={{ background: achColor(r.achievement, s.overCap) }}>{n(r.achievement, 1)}٪</span>}
            {!r.missing && r.achievementLabel && r.achievement != null && <div className="text-[10px] text-mute">{r.achievementLabel}</div>}
          </td>
          <td className="px-3 font-bold tabular-nums text-ink">{r.missing ? '—' : n(r.score, 2)}</td>
          <td className="px-3 tabular-nums text-saffron-700">{r.bonus ? n(r.bonus, 2) : '—'}</td>
          <td className="px-2">{edit ? <BehaviorCell k={r.kpi} s={s} onChange={onKpi} /> : <span className="text-mute">{behName}</span>}</td>
        </tr>
        {open && (
          <tr className="bg-white/[.03]"><td /><td colSpan={12} className="px-3 py-4"><KpiDetails k={r.kpi} s={s} onChange={onKpi} readOnly={!edit} /></td></tr>
        )}
      </>
    );
}

function Summary({ res, count }: { res: ReturnType<typeof useResults>[number]; count: number }) {
  const unit = useUnit()!;
  const gw = res.groups.reduce((a, g) => a + g.group.weight, 0) || 1;
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-line md:grid-cols-[1.2fr_2fr]">
      <div className="flex items-center gap-5 bg-gradient-to-br from-brand/30 to-transparent px-6 py-5 text-white">
        <ScoreRing value={res.total} color={res.band?.color ?? '#178C8C'} />
        <div>
          <div className="text-xs text-ink-300">نمره نهایی با Bonus</div>
          <div className="text-4xl font-black tabular-nums leading-tight">{n(res.total)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {res.band && <Chip color={res.band.color} className="!bg-white/10 !text-white">{res.band.name}</Chip>}
            <span className="text-ink-300">رتبه {res.rank} از {count}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-px bg-line">
        <Cell label="نمره (بدون Bonus)" v={n(res.score)} />
        <Cell label="Bonus" v={res.bonus ? `+${n(res.bonus)}` : '—'} tone="text-saffron-700" />
        {res.groups.map(g => <Cell key={g.group.id} label={`${g.group.name} (وزن ${n(g.group.weight, 0)}٪)`} v={`${n(g.pct)}٪`} sub={`سهم در نهایی: ${n(g.pct * g.group.weight / gw)}`} dot={g.group.color} />)}
        <Cell label="تکمیل داده‌ها" v={`${n(res.completion, 0)}٪`} tone={res.completion < 100 ? 'text-saffron-700' : 'text-firouzeh'} sub={unit.settings.excludeMissing ? 'ثبت‌نشده‌ها از محاسبه حذف' : 'ثبت‌نشده = صفر (مثل اکسل)'} />
      </div>
    </div>
  );
}

function Cell({ label, v, sub, tone, dot }: { label: string; v: string; sub?: string; tone?: string; dot?: string }) {
  return (
    <div className="min-w-[150px] flex-1 basis-[150px] bg-white/[.04] px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-mute">{dot && <i className="h-2 w-2 rounded-sm" style={{ background: dot }} />}{label}</div>
      <div className={clsx('mt-0.5 text-xl font-black tabular-nums', tone ?? 'text-ink')}>{v}</div>
      {sub && <div className="text-[10px] text-mute">{sub}</div>}
    </div>
  );
}

function ScoreRing({ value, color }: { value: number; color: string }) {
  const r = 30, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, value / 100));
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="38" cy="38" r={r} stroke="rgba(255,255,255,.12)" strokeWidth="8" fill="none" />
      <circle cx="38" cy="38" r={r} stroke={color} strokeWidth="8" fill="none" strokeDasharray={`${c * p} ${c}`} strokeLinecap="round" />
      {value > 100 && <circle cx="38" cy="38" r={r} stroke="#D99A1E" strokeWidth="8" fill="none" strokeDasharray={`${c * Math.min(1, (value - 100) / 100)} ${c}`} strokeLinecap="round" opacity=".9" />}
    </svg>
  );
}

