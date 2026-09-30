import { useState } from 'react';
import { Pencil, Trash2, UserPlus, Camera, X } from 'lucide-react';
import { useUnit } from '../lib/hooks';
import { Avatar } from '../components/People';
import { resizeImage } from '../lib/image';
import { useStore } from '../lib/store';
import { uid } from '../lib/seed';
import type { Employee } from '../lib/types';
import { Button, Chip, Confirm, Field, Modal, Panel, Select, TextInput, Toggle } from '../components/ui';

const blank = (unitId: string, tplId: string): Employee => ({ id: uid('e'), unitId, name: '', title: '', templateId: tplId, team: 'فروش', active: true, note: '' });

export default function Employees() {
  const db = useStore(s => s.db)!;
  const unit = useUnit()!;
  const { upsertEmployee, deleteEmployee, notify } = useStore();
  const [form, setForm] = useState<Employee | null>(null);
  const [del, setDel] = useState<Employee | null>(null);
  const [q, setQ] = useState('');

  const list = db.employees.filter(e => e.unitId === unit.id).filter(e => !q.trim() || (e.name + e.title + e.team).includes(q.trim()));
  const isNew = form && !db.employees.some(e => e.id === form.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder="جست‌وجوی نام، سمت یا تیم" className="!w-72" />
        <Button tone="primary" icon={<UserPlus size={16} />} className="mr-auto" onClick={() => setForm(blank(unit.id, unit.templates[0]?.id ?? ''))}>افزودن کارشناس</Button>
      </div>
      <Panel pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-white/10 text-right text-xs text-mute">
              <th className="px-5 py-2.5 font-medium">نام</th><th className="px-3 font-medium">سمت</th><th className="px-3 font-medium">تیم</th>
              <th className="px-3 font-medium">روش ارزیابی</th><th className="px-3 font-medium">ارزیابی‌ها</th><th className="px-3 font-medium">وضعیت</th><th />
            </tr></thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id} className="border-t border-white/[.06] hover:bg-white/[.03]">
                  <td className="px-5 py-3 font-bold text-ink"><span className="flex items-center gap-3"><Avatar emp={e} size={40} /><span>{e.name}{e.note && <div className="text-[11px] font-normal text-mute">{e.note}</div>}</span></span></td>
                  <td className="px-3 text-mute">{e.title || '—'}</td>
                  <td className="px-3 text-mute">{e.team || '—'}</td>
                  <td className="px-3">{unit.templates.find(t => t.id === e.templateId)?.name ?? <span className="text-anar">تعیین نشده</span>}</td>
                  <td className="px-3 tabular-nums">{db.evaluations.filter(v => v.employeeId === e.id).length}</td>
                  <td className="px-3">{e.active ? <Chip color="#178C8C">فعال</Chip> : <Chip color="#9AA1AB">غیرفعال</Chip>}</td>
                  <td className="px-3"><div className="flex justify-end gap-1">
                    <Button size="sm" tone="ghost" icon={<Pencil size={14} />} onClick={() => setForm({ ...e })}>ویرایش</Button>
                    <Button size="sm" tone="danger" aria-label="حذف" icon={<Trash2 size={14} />} onClick={() => setDel(e)} />
                  </div></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-mute">کارشناسی پیدا نشد.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={!!form} onClose={() => setForm(null)} title={isNew ? 'افزودن کارشناس' : 'ویرایش کارشناس'}
        footer={<><Button tone="primary" disabled={!form?.name.trim()} onClick={() => { if (form) upsertEmployee({ ...form, name: form.name.trim() }); setForm(null); }}>{isNew ? 'افزودن' : 'ذخیره تغییرات'}</Button><Button onClick={() => setForm(null)}>انصراف</Button></>}>
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <Avatar emp={form} size={84} lit />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.06] px-3 text-sm text-white hover:border-brand/40">
                  <Camera size={15} />{form.photo ? 'تغییر تصویر' : 'بارگذاری تصویر'}
                  <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const photo = await resizeImage(f, 320); setForm(cur => cur && { ...cur, photo }); } catch { notify('تصویر قابل خواندن نیست.', 'err'); } }} />
                </label>
                {form.photo && <button onClick={() => setForm({ ...form, photo: undefined })} className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm text-mute hover:bg-anar-50 hover:text-anar"><X size={14} />حذف تصویر</button>}
                <p className="w-full text-[11px] text-mute">تصویر مربعی بهتر است؛ خودکار به ۳۲۰ پیکسل کوچک و داخل پایگاه داده ذخیره می‌شود.</p>
              </div>
            </div>
            <Field label="نام و نام خانوادگی" className="sm:col-span-2"><TextInput autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="سمت"><TextInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="کارشناس فروش" /></Field>
            <Field label="تیم"><TextInput value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} /></Field>
            <Field label="روش ارزیابی" className="sm:col-span-2" hint="مجموعه شاخص‌هایی که برای این نفر سنجیده می‌شود. ارزیابی‌های قبلی تغییر نمی‌کنند.">
              <Select value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}>
                {!unit.templates.length && <option value="">ابتدا در «روش‌ها و شاخص‌ها» یک روش بسازید</option>}
                {unit.templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.kpis.length} شاخص)</option>)}
              </Select>
            </Field>
            <Field label="توضیح" className="sm:col-span-2"><TextInput value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
            <Toggle checked={form.active} onChange={v => setForm({ ...form, active: v })} label="فعال (در ارزیابی بازه‌های جدید حضور دارد)" />
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onNo={() => setDel(null)} onYes={() => { if (del) deleteEmployee(del.id); setDel(null); }}
        text={<><b>{del?.name}</b> و همه ارزیابی‌هایش حذف شود؟ اگر فقط نمی‌خواهید در بازه‌های بعدی ارزیابی شود، او را غیرفعال کنید.</>} />
    </div>
  );
}
