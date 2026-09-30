import { useState } from 'react';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, Copy, Plus, Trash2, RefreshCw, FilePlus2 } from 'lucide-react';
import { newKpi, useStore } from '../lib/store';
import { useSortedPeriods, useUnit } from '../lib/hooks';
import { engineOf } from '../lib/engine';
import { uid } from '../lib/seed';
import type { KPI, Template } from '../lib/types';
import { BehaviorCell, KpiCells, KpiDetails } from '../components/KpiEditor';
import { Button, Confirm, Field, Modal, Panel, Select, TextInput, n } from '../components/ui';

export default function Templates() {
  const db = useStore(s => s.db)!;
  const unit = useUnit()!;
  const { upsertTemplate: upT, deleteTemplate: delT, mutate, notify } = useStore();
  const upsertTemplate = (t: Template) => upT(unit.id, t);
  const deleteTemplate = (id: string) => delT(unit.id, id);
  const periods = useSortedPeriods();
  const [sel, setSel] = useState(unit.templates[0]?.id ?? '');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [del, setDel] = useState<Template | null>(null);
  const [delKpi, setDelKpi] = useState<KPI | null>(null);
  const [apply, setApply] = useState(false);
  const [applyPeriod, setApplyPeriod] = useState('');

  const t = unit.templates.find(x => x.id === sel) ?? unit.templates[0];
  const s = unit.settings;
  const save = (next: Template) => upsertTemplate(next);
  const setKpi = (k: KPI) => t && save({ ...t, kpis: t.kpis.map(x => x.id === k.id ? k : x) });
  const move = (id: string, dir: -1 | 1) => {
    if (!t) return;
    const arr = [...t.kpis];
    const i = arr.findIndex(k => k.id === id);
    const same = arr.map((k, j) => ({ k, j })).filter(x => x.k.groupId === arr[i].groupId);
    const pos = same.findIndex(x => x.j === i);
    const other = same[pos + dir];
    if (!other) return;
    [arr[i], arr[other.j]] = [arr[other.j], arr[i]];
    save({ ...t, kpis: arr });
  };

  const addTemplate = (copy?: Template) => {
    const nt: Template = copy
      ? { ...structuredClone(copy), id: uid('tpl'), name: copy.name + ' (کپی)', kpis: copy.kpis.map(k => ({ ...structuredClone(k), id: uid('k') })) }
      : { id: uid('tpl'), name: 'روش جدید', description: '', kpis: [] };
    save(nt); setSel(nt.id);
  };

  const usedBy = (id: string) => db.employees.filter(e => e.unitId === unit.id && e.templateId === id);

  return (
    <div className="grid gap-6 2xl:grid-cols-[240px_1fr]">
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs text-mute">روش‌های ارزیابی</span>
          <Button size="sm" tone="ghost" icon={<FilePlus2 size={14} />} onClick={() => addTemplate()}>روش جدید</Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 2xl:block 2xl:space-y-1">
        {unit.templates.map(x => (
          <button key={x.id} onClick={() => setSel(x.id)} className={clsx('min-w-[190px] shrink-0 rounded-lg border px-3 py-2.5 text-right 2xl:w-full', t?.id === x.id ? 'border-brand/60 bg-white/[.04]' : 'border-white/[.06] bg-white/[.03] hover:bg-white/[.07] 2xl:border-transparent 2xl:bg-transparent')}>
            <div className="text-sm font-bold text-ink">{x.name}</div>
            <div className="text-[11px] text-mute">{x.kpis.length} شاخص، {usedBy(x.id).length} نفر</div>
          </button>
        ))}
        </div>
      </div>

      {!t ? <div className="text-mute">روشی تعریف نشده است.</div> : (
        <div className="min-w-0 space-y-5">
          <Panel>
            <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <Field label="نام روش"><TextInput value={t.name} onChange={e => save({ ...t, name: e.target.value })} /></Field>
              <Field label="توضیح"><TextInput value={t.description} onChange={e => save({ ...t, description: e.target.value })} /></Field>
              <div className="flex gap-1">
                <Button size="sm" icon={<Copy size={14} />} onClick={() => addTemplate(t)}>کپی</Button>
                <Button size="sm" icon={<RefreshCw size={14} />} onClick={() => { setApplyPeriod(periods[periods.length - 1]?.id ?? ''); setApply(true); }}>اعمال به ارزیابی‌ها</Button>
                <Button size="sm" tone="danger" icon={<Trash2 size={14} />} onClick={() => setDel(t)}>حذف</Button>
              </div>
            </div>
            <p className="mt-3 text-xs leading-6 text-mute">
              تغییر شاخص‌ها روی ارزیابی‌های قبلی اثر نمی‌گذارد؛ هر ارزیابی نسخه خودش را نگه می‌دارد. برای به‌روزرسانی ارزیابی‌های یک بازه از «اعمال به ارزیابی‌ها» استفاده کنید.
            </p>
          </Panel>

          {s.groups.map(g => {
            const rows = t.kpis.filter(k => k.groupId === g.id);
            const sum = rows.reduce((a, k) => a + (engineOf(s, k.typeId) === 'case' ? 0 : Number(k.weight) || 0), 0);
            return (
              <Panel key={g.id} pad={false}
                title={<span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: g.color }} />شاخص‌های {g.name}<span className="text-xs font-medium text-mute">(وزن گروه در نمره نهایی: {n(g.weight, 0)}٪)</span></span>}
                action={<>
                  <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums', Math.abs(sum - 100) < 0.01 ? 'bg-firouzeh-50 text-firouzeh-700' : 'bg-anar-50 text-anar')}>جمع وزن: {n(sum, 1)} از ۱۰۰</span>
                  <Button size="sm" tone="primary" icon={<Plus size={14} />} onClick={() => save({ ...t, kpis: [...t.kpis, newKpi(g.id, s.measureTypes[0]?.id ?? '', s.behaviors[0]?.id ?? '')] })}>شاخص</Button>
                </>}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-[13px]">
                    <thead><tr className="border-b border-white/10 text-right text-[12px] text-mute">
                      <th className="w-8" /><th className="px-2 py-2 font-medium">نام شاخص</th><th className="px-2 font-medium">نوع سنجش</th><th className="px-2 font-medium">دوره سنجش</th>
                      <th className="px-2 font-medium">Min</th><th className="px-2 font-medium">Max</th><th className="px-2 font-medium">واحد</th><th className="px-2 font-medium">وزن نهایی</th>
                      <th className="px-2 font-medium">نوع رفتار</th><th className="w-32" />
                    </tr></thead>
                    <tbody>
                      {rows.map(k => (
                        <KRow key={k.id} k={k} open={!!open[k.id]} toggle={() => setOpen(o => ({ ...o, [k.id]: !o[k.id] }))} onChange={setKpi}
                          onUp={() => move(k.id, -1)} onDown={() => move(k.id, 1)}
                          onDup={() => { const i = t.kpis.findIndex(x => x.id === k.id); const arr = [...t.kpis]; arr.splice(i + 1, 0, { ...structuredClone(k), id: uid('k'), name: k.name + ' (کپی)' }); save({ ...t, kpis: arr }); }}
                          onDel={() => setDelKpi(k)} />
                      ))}
                      {!rows.length && <tr><td colSpan={10} className="px-5 py-6 text-center text-mute">در این گروه شاخصی نیست.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}
          {t.kpis.some(k => !s.groups.some(g => g.id === k.groupId)) && (
            <div className="rounded-lg bg-anar-50 px-4 py-3 text-sm text-anar">بعضی شاخص‌ها به گروهی تعلق دارند که حذف شده است. از جزئیات هر شاخص گروه آن را اصلاح کنید.
              <div className="mt-2 flex flex-wrap gap-2">{t.kpis.filter(k => !s.groups.some(g => g.id === k.groupId)).map(k => <Button key={k.id} size="sm" onClick={() => setKpi({ ...k, groupId: s.groups[0].id })}>{k.name} ← {s.groups[0]?.name}</Button>)}</div>
            </div>
          )}
        </div>
      )}

      <Confirm open={!!del} onNo={() => setDel(null)} onYes={() => { if (del) { deleteTemplate(del.id); setSel(unit.templates.find(x => x.id !== del.id)?.id ?? ''); } setDel(null); }}
        text={<>روش <b>{del?.name}</b> حذف شود؟ {del && usedBy(del.id).length > 0 && <>این روش برای {usedBy(del.id).map(e => e.name).join('، ')} تعیین شده و باید برایشان روش دیگری انتخاب کنید. </>}ارزیابی‌های قبلی دست نمی‌خورند.</>} />
      <Confirm open={!!delKpi} onNo={() => setDelKpi(null)} onYes={() => { if (t && delKpi) save({ ...t, kpis: t.kpis.filter(x => x.id !== delKpi.id) }); setDelKpi(null); }}
        text={<>شاخص <b>{delKpi?.name}</b> از این روش حذف شود؟</>} />
      <Modal open={apply} onClose={() => setApply(false)} title="اعمال روش به ارزیابی‌های یک بازه"
        footer={<><Button tone="primary" disabled={!applyPeriod} onClick={() => {
          let count = 0;
          mutate(d => {
            const tp = d.units.find(u => u.id === unit.id)?.templates.find(x => x.id === t?.id);
            if (!tp) return;
            for (const e of d.evaluations.filter(v => v.periodId === applyPeriod)) {
              const emp = d.employees.find(p => p.id === e.employeeId);
              if (emp?.templateId !== tp.id) continue;
              const values: Record<string, number | null> = {};
              for (const k of tp.kpis) {
                const m = e.kpis.find(o => o.id === k.id) ?? e.kpis.find(o => o.name.trim() === k.name.trim());
                values[k.id] = m ? e.values[m.id] ?? null : null;
              }
              e.kpis = structuredClone(tp.kpis); e.values = values; e.templateId = tp.id; e.updatedAt = Date.now(); count++;
            }
          });
          setApply(false); notify(`${count} ارزیابی به‌روز شد.`);
        }}>اعمال</Button><Button onClick={() => setApply(false)}>انصراف</Button></>}>
        <div className="space-y-3 text-sm leading-7">
          <p>شاخص‌ها و پارامترهای روش «{t?.name}» روی ارزیابی افرادی که این روش را دارند در بازه انتخابی کپی می‌شود. مقادیر فعلی ثبت‌شده (بر اساس نام شاخص) حفظ می‌شوند.</p>
          <Field label="بازه"><Select value={applyPeriod} onChange={e => setApplyPeriod(e.target.value)}>{[...periods].reverse().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        </div>
      </Modal>
    </div>
  );
}

function KRow({ k, open, toggle, onChange, onUp, onDown, onDup, onDel }: { k: KPI; open: boolean; toggle: () => void; onChange: (k: KPI) => void; onUp: () => void; onDown: () => void; onDup: () => void; onDel: () => void }) {
  const s = useUnit()!.settings;
  return (
    <>
      <tr className="border-t border-white/[.06] hover:bg-white/[.03]">
        <td className="px-1 text-center"><button onClick={toggle} className="rounded p-1 text-mute hover:bg-white/[.05]" aria-label="جزئیات">{open ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}</button></td>
        <KpiCells k={k} s={s} onChange={onChange} />
        <td className="px-1"><BehaviorCell k={k} s={s} onChange={onChange} /></td>
        <td className="px-2">
          <div className="flex justify-end gap-0.5 text-mute">
            <button className="rounded p-1 hover:bg-white/[.05] hover:text-ink" onClick={onUp} aria-label="بالا"><ArrowUp size={15} /></button>
            <button className="rounded p-1 hover:bg-white/[.05] hover:text-ink" onClick={onDown} aria-label="پایین"><ArrowDown size={15} /></button>
            <button className="rounded p-1 hover:bg-white/[.05] hover:text-ink" onClick={onDup} aria-label="کپی"><Copy size={15} /></button>
            <button className="rounded p-1 hover:bg-anar-50 hover:text-anar" onClick={onDel} aria-label="حذف"><Trash2 size={15} /></button>
          </div>
        </td>
      </tr>
      {open && <tr className="bg-white/[.03]"><td /><td colSpan={9} className="px-3 py-4"><KpiDetails k={k} s={s} onChange={onChange} /></td></tr>}
    </>
  );
}
