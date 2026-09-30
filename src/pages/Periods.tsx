import { useMemo, useState } from 'react';
import { CalendarPlus, Pencil, Trash2, ClipboardPen } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAllResults, useSortedPeriods } from '../lib/hooks';
import { HALVES, KIND_LABEL, MONTHS, QUARTERS, daysBetween, rangeFor, todayJ, toTime } from '../lib/jalali';
import { uid } from '../lib/seed';
import type { Period, PeriodKind } from '../lib/types';
import { Button, Confirm, Field, JDate, Modal, Panel, Segmented, Select, TextInput, Toggle, n } from '../components/ui';
import type { Page } from '../App';

export default function Periods({ go }: { go: (p: Page) => void }) {
  const db = useStore(s => s.db)!;
  const { upsertPeriod, deletePeriod, setPeriod, mutate, notify } = useStore();
  const periods = useSortedPeriods();
  const all = useAllResults();
  const t = todayJ();

  const [kind, setKind] = useState<PeriodKind>('quarter');
  const [year, setYear] = useState(t.y);
  const [idx, setIdx] = useState(Math.ceil(t.m / 3));
  const [start, setStart] = useState(`${t.y}/01/01`);
  const [end, setEnd] = useState(`${t.y}/03/31`);
  const [customName, setCustomName] = useState('');
  const [autoEval, setAutoEval] = useState(true);
  const [copyFrom, setCopyFrom] = useState('');
  const [editing, setEditing] = useState<Period | null>(null);
  const [del, setDel] = useState<Period | null>(null);

  const preview = useMemo(() => {
    if (kind === 'custom') return { start, end, name: customName || `${start} تا ${end}` };
    return rangeFor(kind, year, idx);
  }, [kind, year, idx, start, end, customName]);

  const invalid = toTime(preview.end) < toTime(preview.start);
  const duplicate = db.periods.some(p => p.start === preview.start && p.end === preview.end);

  const create = () => {
    const p: Period = { id: uid('p'), name: kind === 'custom' ? (customName.trim() || preview.name) : preview.name, kind, start: preview.start, end: preview.end, note: '', createdAt: Date.now() };
    mutate(d => {
      d.periods.push(p);
      if (autoEval) {
        const src = copyFrom ? d.evaluations.filter(e => e.periodId === copyFrom) : [];
        for (const e of d.employees.filter(x => x.active)) {
          const prev = src.find(x => x.employeeId === e.id);
          const tpl = d.templates.find(x => x.id === e.templateId);
          const kpis = prev ? structuredClone(prev.kpis) : tpl ? structuredClone(tpl.kpis) : null;
          if (!kpis) continue;
          d.evaluations.push({ id: uid('ev'), periodId: p.id, employeeId: e.id, templateId: prev?.templateId ?? tpl!.id, kpis, values: Object.fromEntries(kpis.map(k => [k.id, null])), note: '', updatedAt: Date.now() });
        }
      }
    });
    setPeriod(p.id);
    notify(`بازه «${p.name}» ساخته شد.`);
  };

  const years = Array.from({ length: 13 }, (_, i) => 1400 + i);
  const idxOptions = kind === 'month' ? MONTHS : kind === 'quarter' ? QUARTERS : kind === 'half' ? HALVES : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <Panel title="ساخت بازه جدید">
        <div className="space-y-4">
          <Segmented value={kind} onChange={v => { setKind(v); setIdx(1); }}
            options={(Object.keys(KIND_LABEL) as PeriodKind[]).map(k => ({ value: k, label: KIND_LABEL[k] }))} />
          {kind !== 'custom' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="سال"><Select value={year} onChange={e => setYear(+e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</Select></Field>
              {kind !== 'year' && <Field label={kind === 'month' ? 'ماه' : kind === 'quarter' ? 'فصل' : 'نیمه'}>
                <Select value={idx} onChange={e => setIdx(+e.target.value)}>{idxOptions.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
              </Field>}
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="از تاریخ"><JDate value={start} onChange={setStart} /></Field>
              <Field label="تا تاریخ"><JDate value={end} onChange={setEnd} /></Field>
              <Field label="نام بازه (اختیاری)"><TextInput value={customName} onChange={e => setCustomName(e.target.value)} placeholder="مثلاً کمپین پاییز" /></Field>
            </div>
          )}
          <div className="rounded-lg bg-paper px-4 py-3 text-sm leading-7">
            <div className="font-bold text-ink">{preview.name}</div>
            <div className="text-mute">{preview.start} تا {preview.end} {!invalid && `(${daysBetween(preview.start, preview.end)} روز)`}</div>
            {invalid && <div className="text-anar">تاریخ پایان قبل از تاریخ شروع است.</div>}
            {duplicate && <div className="text-saffron-700">بازه‌ای با همین تاریخ‌ها قبلاً ساخته شده است.</div>}
          </div>
          <Toggle checked={autoEval} onChange={setAutoEval} label="برای همه پرسنل فعال فرم ارزیابی خالی بساز" />
          {autoEval && periods.length > 0 && (
            <Field label="شاخص‌ها از کجا کپی شوند؟" hint="اگر پارامترهای یک بازه را برای افراد شخصی‌سازی کرده‌اید، از همان بازه کپی کنید.">
              <Select value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
                <option value="">از روش ارزیابی فعلی هر نفر</option>
                {[...periods].reverse().map(p => <option key={p.id} value={p.id}>از ارزیابی‌های {p.name}</option>)}
              </Select>
            </Field>
          )}
          <Button tone="primary" className="w-full" icon={<CalendarPlus size={16} />} disabled={invalid} onClick={create}>ساخت بازه</Button>
        </div>
      </Panel>

      <Panel title={`بازه‌های ذخیره‌شده (${periods.length})`} pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-line text-right text-xs text-mute">
              <th className="px-5 py-2.5 font-medium">نام</th><th className="px-3 font-medium">نوع</th><th className="px-3 font-medium">از</th><th className="px-3 font-medium">تا</th>
              <th className="px-3 font-medium">ارزیابی‌ها</th><th className="px-3 font-medium">میانگین نمره</th><th />
            </tr></thead>
            <tbody>
              {[...periods].reverse().map(p => {
                const rs = all.get(p.id) ?? [];
                const avg = rs.length ? rs.reduce((a, r) => a + r.total, 0) / rs.length : null;
                return (
                  <tr key={p.id} className="border-t border-line/70 hover:bg-paper/50">
                    <td className="px-5 py-3 font-bold text-ink">{p.name}{p.note && <div className="text-[11px] font-normal text-mute">{p.note}</div>}</td>
                    <td className="px-3 text-mute">{KIND_LABEL[p.kind]}</td>
                    <td className="px-3 tabular-nums">{p.start}</td>
                    <td className="px-3 tabular-nums">{p.end}</td>
                    <td className="px-3 tabular-nums">{rs.length}</td>
                    <td className="px-3 font-bold tabular-nums">{avg == null ? '—' : n(avg)}</td>
                    <td className="px-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" tone="ghost" icon={<ClipboardPen size={14} />} onClick={() => { setPeriod(p.id); go('evaluate'); }}>ثبت</Button>
                        <Button size="sm" tone="ghost" aria-label="ویرایش" icon={<Pencil size={14} />} onClick={() => setEditing({ ...p })} />
                        <Button size="sm" tone="danger" aria-label="حذف" icon={<Trash2 size={14} />} onClick={() => setDel(p)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!periods.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-mute">هنوز بازه‌ای ساخته نشده است.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="ویرایش بازه"
        footer={<><Button tone="primary" onClick={() => { if (editing) upsertPeriod(editing); setEditing(null); }}>ذخیره تغییرات</Button><Button onClick={() => setEditing(null)}>انصراف</Button></>}>
        {editing && (
          <div className="space-y-3">
            <Field label="نام"><TextInput value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="نوع"><Select value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value as PeriodKind })}>{(Object.keys(KIND_LABEL) as PeriodKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select></Field>
            <Field label="از تاریخ"><JDate value={editing.start} onChange={v => setEditing({ ...editing, start: v })} /></Field>
            <Field label="تا تاریخ"><JDate value={editing.end} onChange={v => setEditing({ ...editing, end: v })} /></Field>
            <Field label="توضیح"><TextInput value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onNo={() => setDel(null)} onYes={() => { if (del) deletePeriod(del.id); setDel(null); }}
        text={<>بازه <b>{del?.name}</b> و همه ارزیابی‌های ثبت‌شده در آن ({(del && all.get(del.id)?.length) || 0} ارزیابی) حذف شود؟ این کار برگشت‌پذیر نیست؛ قبلش از تنظیمات نسخه پشتیبان بگیرید.</>} />
    </div>
  );
}

