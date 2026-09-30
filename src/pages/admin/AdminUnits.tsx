import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Trash2, Pencil, ArrowLeft, Users2, ListChecks } from 'lucide-react';
import { useStore } from '../../lib/store';
import type { Unit } from '../../lib/types';
import { Button, Confirm, Field, Modal, Select, TextInput, Toggle } from '../../components/ui';
import type { AdminPage } from '../../App';

const COLORS = ['#F26122', '#1DB5A8', '#EEC56A', '#7FA3C0', '#E35D5D', '#9B7FD1', '#4FB477', '#E07BB0'];

export default function AdminUnits({ go }: { go: (p: AdminPage) => void }) {
  const db = useStore(s => s.db)!;
  const { addUnit, deleteUnit, updateUnit, setUnit, notify } = useStore();
  const [form, setForm] = useState<{ name: string; from: string; people: boolean } | null>(null);
  const [edit, setEdit] = useState<Unit | null>(null);
  const [del, setDel] = useState<Unit | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm leading-7 text-mute">هر واحد روش‌ها، شاخص‌ها، پرسنل و تنظیمات محاسبه خودش را دارد. برای ساخت سریع، واحد جدید را از الگوی یک واحد موجود کپی کنید و بعد شخصی‌سازی کنید.</p>
        <Button tone="primary" className="mr-auto" icon={<Plus size={16} />} onClick={() => setForm({ name: '', from: db.units[0]?.id ?? '', people: false })}>واحد جدید</Button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {db.units.map((u, i) => {
          const people = db.employees.filter(e => e.unitId === u.id);
          const kpis = u.templates.reduce((a, t) => a + t.kpis.length, 0);
          return (
            <motion.div key={u.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .07 }}
              className="glass lift lift-lg floaty relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${-i * 1.4}s` }}>
              <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full opacity-30 blur-3xl" style={{ background: u.color }} />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: u.color, boxShadow: `0 0 12px ${u.color}` }} /><h3 className="text-xl font-black text-white">{u.name}</h3></div>
                    <p className="mt-1 text-xs text-mute">{u.description || '—'}</p>
                  </div>
                  <div className="flex gap-0.5">
                    <button className="rounded-lg p-1.5 text-mute hover:bg-white/10 hover:text-white" aria-label="ویرایش" onClick={() => setEdit({ ...u })}><Pencil size={15} /></button>
                    <button className="rounded-lg p-1.5 text-mute hover:bg-white/10 hover:text-white" aria-label="کپی به‌عنوان الگو" onClick={() => setForm({ name: `${u.name} (کپی)`, from: u.id, people: false })}><Copy size={15} /></button>
                    <button className="rounded-lg p-1.5 text-mute hover:bg-anar-50 hover:text-anar" aria-label="حذف" onClick={() => setDel(u)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[{ l: 'نفر', v: people.length }, { l: 'روش', v: u.templates.length }, { l: 'شاخص', v: kpis }].map(x => (
                    <div key={x.l} className="rounded-xl bg-white/[.05] py-2"><div className="text-xl font-black text-white">{x.v}</div><div className="text-[11px] text-mute">{x.l}</div></div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-mute">وزن ابعاد: وظیفه‌ای+تیمی {u.dims.weights.kpi}٪، فردی {u.dims.weights.individual}٪، سازمانی {u.dims.weights.org}٪</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" icon={<Users2 size={14} />} onClick={() => { setUnit(u.id); go('employees'); }}>پرسنل</Button>
                  <Button size="sm" icon={<ListChecks size={14} />} onClick={() => { setUnit(u.id); go('templates'); }}>شاخص‌ها</Button>
                  <Button size="sm" tone="ghost" onClick={() => { setUnit(u.id); go('evaluate'); }}>ثبت ارزیابی <ArrowLeft size={14} /></Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="واحد جدید"
        footer={<><Button tone="primary" disabled={!form?.name.trim()} onClick={() => {
          if (!form) return;
          const id = addUnit(form.name.trim(), form.from || null, form.people);
          setUnit(id); setForm(null); notify(`واحد «${form.name.trim()}» ساخته شد.`);
        }}>ساخت واحد</Button><Button onClick={() => setForm(null)}>انصراف</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="نام واحد"><TextInput autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثلاً پشتیبانی فنی" /></Field>
            <Field label="الگو" hint="روش‌ها، شاخص‌ها، پله‌ها، وزن ابعاد و همه تنظیمات از این واحد کپی می‌شود.">
              <Select value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}>
                <option value="">بدون الگو (واحد خالی)</option>
                {db.units.map(u => <option key={u.id} value={u.id}>کپی از واحد {u.name}</option>)}
              </Select>
            </Field>
            {form.from && <Toggle checked={form.people} onChange={v => setForm({ ...form, people: v })} label="پرسنل واحد الگو هم کپی شود" />}
          </div>
        )}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="ویرایش واحد"
        footer={<><Button tone="primary" onClick={() => { if (edit) updateUnit(edit.id, u => { u.name = edit.name; u.description = edit.description; u.color = edit.color; }); setEdit(null); }}>ذخیره</Button><Button onClick={() => setEdit(null)}>انصراف</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="نام"><TextInput value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="توضیح"><TextInput value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="رنگ واحد">
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => <button key={c} onClick={() => setEdit({ ...edit, color: c })} aria-label={c} className="h-9 w-9 rounded-full transition hover:scale-110" style={{ background: c, boxShadow: edit.color === c ? `0 0 0 3px #14161B, 0 0 0 5px ${c}` : undefined }} />)}
              </div>
            </Field>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onNo={() => setDel(null)} onYes={() => { if (del) deleteUnit(del.id); setDel(null); }}
        text={<>واحد <b>{del?.name}</b> با همه روش‌ها، پرسنل و ارزیابی‌هایش حذف شود؟ این کار برگشت‌پذیر نیست.</>} />
    </div>
  );
}
