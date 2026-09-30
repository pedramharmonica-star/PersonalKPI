import { useRef, useState } from 'react';
import { Download, Upload, Plus, Trash2, FileJson, Link2, Unlink, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../lib/store';
import { useResults } from '../lib/hooks';
import { uid } from '../lib/seed';
import { exportPeriodExcel } from '../lib/excel';
import type { Engine, Direction } from '../lib/types';
import { ENGINE_LABEL } from '../components/KpiEditor';
import { Button, Confirm, Field, NumInput, Panel, Select, TextInput, Toggle, n } from '../components/ui';

export default function SettingsPage() {
  const db = useStore(s => s.db)!;
  const st = useStore();
  const s = db.settings;
  const up = st.updateSettings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [reset, setReset] = useState(false);
  const [wipe, setWipe] = useState(false);
  const results = useResults(st.periodId);
  const period = db.periods.find(p => p.id === st.periodId);
  const inUse = (field: 'typeId' | 'behaviorId' | 'groupId', id: string) =>
    db.templates.some(t => t.kpis.some(k => k[field] === id)) || db.evaluations.some(e => e.kpis.some(k => k[field] === id));
  const gw = s.groups.reduce((a, g) => a + (Number(g.weight) || 0), 0);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `arzyabi-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!data?.settings || !data?.templates) throw new Error('bad');
      st.replaceDB(data);
      st.notify('نسخه پشتیبان بازیابی شد.');
    } catch { st.notify('فایل انتخاب‌شده پشتیبان معتبر سامانه ارزیابی نیست.', 'err'); }
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <Panel title="پارامترهای محاسبه">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام واحد / سازمان"><TextInput value={s.orgName} onChange={e => up(x => { x.orgName = e.target.value; })} /></Field>
          <Field label="سقف درصد تحقق (٪)" hint="در فرمول اکسل: 120 (یعنی 1.2 × وزن)"><NumInput value={s.overCap} onChange={v => up(x => { x.overCap = v ?? 100; })} /></Field>
          <Field label="درصد پیش‌فرض Bonus از وزن" hint="در فرمول اکسل: 0.2 × وزن"><NumInput value={s.bonusPct} onChange={v => up(x => { x.bonusPct = v ?? 0; })} /></Field>
          <Field label="مبنای رتبه‌بندی و سطح">
            <Select value={s.rankBy} onChange={e => up(x => { x.rankBy = e.target.value as any; })}>
              <option value="total">نمره نهایی با Bonus</option><option value="score">نمره بدون Bonus</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Toggle checked={s.excludeMissing} onChange={v => up(x => { x.excludeMissing = v; })} label="شاخص‌های ثبت‌نشده از محاسبه حذف شوند (نمره روی شاخص‌های ثبت‌شده نرمال شود)" />
            <p className="mt-1 text-xs leading-6 text-mute">خاموش = مثل اکسل: خانه خالی «مقدار فعلی» صفر حساب می‌شود.</p>
          </div>
        </div>
      </Panel>

      <Panel title="گروه‌های شاخص و وزن در نمره نهایی" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => up(x => { x.groups.push({ id: uid('g'), name: 'گروه جدید', weight: 0, color: '#6B4E9B' }); })}>گروه</Button>}>
        <p className="mb-3 text-xs leading-6 text-mute">در اکسل شاخص‌ها در دو گروه «وظیفه‌ای» و «تیمی» آمده‌اند و جمع وزن هر گروه ۱۰۰ است، اما وزن گروه‌ها در نمره نهایی مشخص نشده بود. پیش‌فرض ۵۰/۵۰ است؛ اینجا تنظیمش کنید.</p>
        <div className="space-y-2">
          {s.groups.map((g, i) => (
            <div key={g.id} className="flex items-center gap-2">
              <input type="color" value={g.color} onChange={e => up(x => { x.groups[i].color = e.target.value; })} className="h-9 w-10 cursor-pointer rounded border border-line" aria-label="رنگ" />
              <TextInput value={g.name} onChange={e => up(x => { x.groups[i].name = e.target.value; })} />
              <div className="w-28"><NumInput value={g.weight} onChange={v => up(x => { x.groups[i].weight = v ?? 0; })} /></div>
              <span className="text-xs text-mute">٪</span>
              <Button size="sm" tone="danger" aria-label="حذف" disabled={s.groups.length <= 1} title={inUse('groupId', g.id) ? 'این گروه در شاخص‌ها استفاده شده' : ''}
                icon={<Trash2 size={14} />} onClick={() => up(x => { x.groups = x.groups.filter(y => y.id !== g.id); })} />
            </div>
          ))}
        </div>
        <div className={`mt-2 text-xs ${Math.abs(gw - 100) < 0.01 ? 'text-firouzeh' : 'text-saffron-700'}`}>جمع وزن گروه‌ها: {n(gw)} {Math.abs(gw - 100) >= 0.01 && '(نمره نهایی میانگین وزنی است، ولی بهتر است جمع ۱۰۰ باشد)'}</div>
      </Panel>

      <Panel title="انواع سنجش" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => up(x => { x.measureTypes.push({ id: uid('t'), name: 'نوع جدید', engine: 'spectrum' }); })}>نوع سنجش</Button>}>
        <p className="mb-3 text-xs leading-6 text-mute">هر نوع سنجش به یکی از چهار روش محاسبه‌ای که در فرمول‌های اکسل هست وصل می‌شود.</p>
        <div className="space-y-2">
          {s.measureTypes.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <TextInput value={t.name} onChange={e => up(x => { x.measureTypes[i].name = e.target.value; })} className="!w-40" />
              <Select value={t.engine} onChange={e => up(x => { x.measureTypes[i].engine = e.target.value as Engine; })}>
                {(Object.keys(ENGINE_LABEL) as Engine[]).map(k => <option key={k} value={k}>{ENGINE_LABEL[k]}</option>)}
              </Select>
              <Button size="sm" tone="danger" aria-label="حذف" icon={<Trash2 size={14} />} disabled={inUse('typeId', t.id)} title={inUse('typeId', t.id) ? 'در شاخص‌ها استفاده شده' : ''}
                onClick={() => up(x => { x.measureTypes = x.measureTypes.filter(y => y.id !== t.id); })} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="انواع رفتار" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => up(x => { x.behaviors.push({ id: uid('b'), name: 'رفتار جدید', direction: 'up' }); })}>نوع رفتار</Button>}>
        <p className="mb-3 text-xs leading-6 text-mute">افزایشی: هرچه مقدار بیشتر، بهتر (Min بدترین، Max بهترین). کاهشی: هرچه کمتر، بهتر (Min بهترین، Max بدترین).</p>
        <div className="space-y-2">
          {s.behaviors.map((b, i) => (
            <div key={b.id} className="flex items-center gap-2">
              <TextInput value={b.name} onChange={e => up(x => { x.behaviors[i].name = e.target.value; })} className="!w-40" />
              <Select value={b.direction} onChange={e => up(x => { x.behaviors[i].direction = e.target.value as Direction; })}>
                <option value="up">بیشتر بهتر است</option><option value="down">کمتر بهتر است</option>
              </Select>
              <Button size="sm" tone="danger" aria-label="حذف" icon={<Trash2 size={14} />} disabled={inUse('behaviorId', b.id)} onClick={() => up(x => { x.behaviors = x.behaviors.filter(y => y.id !== b.id); })} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="دوره‌های سنجش و واحدها">
        <ListEditor label="دوره سنجش" items={s.periodLabels} onChange={v => up(x => { x.periodLabels = v; })} />
        <div className="h-5" />
        <ListEditor label="واحد" items={s.units} onChange={v => up(x => { x.units = v; })} />
      </Panel>

      <Panel title="سطح‌بندی عملکرد" action={<Button size="sm" icon={<Plus size={14} />} onClick={() => up(x => { x.bands.push({ id: uid('bd'), name: 'سطح جدید', min: 50, color: '#5C6F7B' }); })}>سطح</Button>}>
        <div className="space-y-2">
          {[...s.bands].sort((a, b) => b.min - a.min).map(b => {
            const i = s.bands.findIndex(x => x.id === b.id);
            return (
              <div key={b.id} className="flex items-center gap-2">
                <input type="color" value={b.color} onChange={e => up(x => { x.bands[i].color = e.target.value; })} className="h-9 w-10 cursor-pointer rounded border border-line" aria-label="رنگ" />
                <TextInput value={b.name} onChange={e => up(x => { x.bands[i].name = e.target.value; })} />
                <span className="whitespace-nowrap text-xs text-mute">از نمره</span>
                <div className="w-24"><NumInput value={b.min} onChange={v => up(x => { x.bands[i].min = v ?? 0; })} /></div>
                <Button size="sm" tone="danger" aria-label="حذف" icon={<Trash2 size={14} />} onClick={() => up(x => { x.bands = x.bands.filter(y => y.id !== b.id); })} />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="داده‌ها و نسخه پشتیبان" className="2xl:col-span-2">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="text-sm font-bold text-ink">پشتیبان‌گیری دستی</div>
            <p className="text-xs leading-6 text-mute">اطلاعات در پایگاه داده داخلی همین مرورگر (IndexedDB) ذخیره می‌شود. اگر حافظه مرورگر پاک شود یا فایل را روی مرورگر یا کامپیوتر دیگری باز کنید، داده‌ها آنجا نیستند؛ مرتب پشتیبان بگیرید.</p>
            <div className="flex flex-wrap gap-2">
              <Button tone="primary" icon={<Download size={15} />} onClick={exportJson}>دریافت پشتیبان (JSON)</Button>
              <Button icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>بازیابی از پشتیبان</Button>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-bold text-ink">فایل پایگاه داده روی دیسک</div>
            <p className="text-xs leading-6 text-mute">در Chrome و Edge می‌توانید یک فایل JSON کنار برنامه بسازید تا هر تغییر خودکار در آن هم ذخیره شود؛ این فایل را می‌شود کپی کرد یا روی سیستم دیگر باز کرد.</p>
            {st.fileName ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm"><FileJson size={16} className="text-firouzeh" />{st.fileName}{st.fileNeedsPermission && <span className="text-xs text-saffron-700">(نیاز به اجازه دسترسی)</span>}</div>
                <div className="flex gap-2">
                  {st.fileNeedsPermission && <Button tone="saffron" icon={<Link2 size={15} />} onClick={st.reconnectFile}>اتصال دوباره</Button>}
                  <Button tone="danger" icon={<Unlink size={15} />} onClick={st.unlinkFile}>قطع اتصال</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button tone="primary" icon={<Link2 size={15} />} onClick={() => st.linkFile(true)}>ساخت فایل پایگاه داده</Button>
                <Button icon={<FileJson size={15} />} onClick={() => st.linkFile(false)}>باز کردن فایل موجود</Button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="text-sm font-bold text-ink">خروجی و بازنشانی</div>
            <div className="flex flex-wrap gap-2">
              <Button icon={<FileSpreadsheet size={15} />} disabled={!period || !results.length} onClick={() => period && exportPeriodExcel(db, period, results)}>اکسل بازه {period?.name ?? ''}</Button>
              <Button tone="danger" icon={<RotateCcw size={15} />} onClick={() => setReset(true)}>بازگشت به داده‌های اکسل اولیه</Button>
              <Button tone="danger" icon={<Trash2 size={15} />} onClick={() => setWipe(true)}>پاک کردن ارزیابی‌ها</Button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="منطق محاسبه (برگرفته از فرمول‌های Sales_KPI.xlsx)" className="2xl:col-span-2">
        <div className="grid gap-5 text-[13px] leading-7 text-ink lg:grid-cols-2">
          <Formula t="نسبت تحقق (همه انواع طیفی و پله‌ای)" f="r = 1 − (Max − مقدار) ÷ (Max − Min)  =  (مقدار − Min) ÷ (Max − Min)" d="برای رفتار کاهشی: r = (Max − مقدار) ÷ (Max − Min). درصد تحقق = r × 100 محدود به ۰ تا سقف تحقق." />
          <Formula t="نمره طیفی" f="نمره = min(max(r, 0), سقف تحقق) × وزن" d="در اکسل: IFS(r<0 → 0 ، r>1.2 → 1.2 ، else r) × H" />
          <Formula t="نمره پله‌ای" f="اگر مقدار < Min ← صفر؛ وگرنه نمره پله متناظر (VLOOKUP تقریبی) تا سقف نمره" d="Bonus پله: اگر مقدار > Max ← (INT(مقدار − Max) ÷ اندازه پله) × امتیاز پله" />
          <Formula t="موردی و رتبه" f="موردی: نمره = وزن × مقدار (مثبت/منفی)  —  رتبه: نمره = وزن × مقدار ÷ بهترین مقدار همکاران" d="در اکسل برای این دو نوع فقط برچسب «شاخص مثبت/منفی» و «بهترین عملکرد» تعریف شده بود؛ فرمول رتبه اینجا تکمیل شده است." />
          <Formula t="Bonus" f="ردیف‌های عادی: اگر نمره = وزن ← ۲۰٪ وزن   |   ردیف AOV: نمره = min(وزن، خام) و Bonus = خام − وزن" d="نحوه Bonus برای هر شاخص جداگانه قابل انتخاب است." />
          <Formula t="نمره نهایی" f="درصد گروه = Σ نمره ÷ Σ وزن × 100   ←   نهایی = میانگین وزنی درصد گروه‌ها با وزن گروه" d="نمره نهایی با Bonus = نمره نهایی + Bonus (به همان روش وزن‌دهی)." />
        </div>
      </Panel>

      <Confirm open={reset} yes="بازگشت" onNo={() => setReset(false)} onYes={() => { st.resetToSeed(); setReset(false); st.notify('داده‌ها به وضعیت فایل اکسل برگشت.'); }}
        text="همه روش‌ها، پرسنل، بازه‌ها، ارزیابی‌ها و تنظیمات فعلی پاک و با داده‌های فایل اکسل اولیه جایگزین شود؟ اگر لازم است اول پشتیبان بگیرید." />
      <Confirm open={wipe} onNo={() => setWipe(false)} onYes={() => { st.mutate(d => { d.evaluations = []; d.periods = []; }); st.setPeriod(null); setWipe(false); }}
        text="همه بازه‌ها و ارزیابی‌ها پاک شوند؟ روش‌ها، پرسنل و تنظیمات باقی می‌مانند." />
    </div>
  );
}

function Formula({ t, f, d }: { t: string; f: string; d: string }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="font-bold">{t}</div>
      <div className="my-2 rounded-md bg-paper px-3 py-2 font-medium text-ink-600">{f}</div>
      <div className="text-xs text-mute">{d}</div>
    </div>
  );
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState('');
  const add = () => { const t = v.trim(); if (t && !items.includes(t)) onChange([...items, t]); setV(''); };
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-mute">{label}ها</div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map(x => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-paper py-1 pl-1.5 pr-3 text-[13px]">
            {x}<button onClick={() => onChange(items.filter(y => y !== x))} className="rounded-full p-0.5 text-mute hover:bg-anar-50 hover:text-anar" aria-label={`حذف ${x}`}><Trash2 size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder={`${label} جدید`} />
        <Button onClick={add} icon={<Plus size={14} />}>افزودن</Button>
      </div>
    </div>
  );
}
