import { useRef, useState } from 'react';
import { Download, Upload, FileJson, Link2, Unlink, RotateCcw, Send, KeyRound, Info } from 'lucide-react';
import { useStore } from '../../lib/store';
import type { DB } from '../../lib/types';
import { Button, Confirm, Field, Panel, TextInput } from '../../components/ui';

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };

/** Builds a self-contained, read-only copy of the app with the data baked in */
export function buildSnapshot(db: DB): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  clone.removeAttribute('style'); clone.classList.remove('calm');
  clone.querySelector('#root')!.innerHTML = '';
  clone.querySelectorAll('#embedded-db').forEach(x => x.remove());
  const data: DB = { ...structuredClone(db), security: { user: '', passHash: '!' }, publishedAt: Date.now() };
  const s = document.createElement('script');
  s.id = 'embedded-db'; s.type = 'application/json';
  s.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  clone.querySelector('head')!.appendChild(s);
  return '<!doctype html>\n' + clone.outerHTML;
}

export default function AdminSystem() {
  const db = useStore(s => s.db)!;
  const st = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState(db.security.user);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [reset, setReset] = useState(false);

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!data?.units && !data?.settings) throw new Error('bad');
      st.replaceDB(data); st.notify('نسخه پشتیبان بازیابی شد.');
    } catch { st.notify('فایل انتخاب‌شده پشتیبان معتبر سامانه ارزیابی نیست.', 'err'); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title={<span className="flex items-center gap-2"><Send size={17} className="text-brand" />انتشار نتایج برای پرسنل</span>} className="xl:col-span-2">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 text-sm leading-7 text-ink-600">
            <p>داده‌های سامانه فقط در مرورگر همین کامپیوتر ذخیره می‌شود. برای اینکه کارشناسان و مدیران نتایج را روی سیستم خودشان ببینند، یک <b className="text-white">نسخه انتشار</b> بسازید: یک فایل HTML که داده‌های فعلی داخلش است، فقط صفحه نمایش نتایج را دارد و پنل مدیریت در آن غیرفعال است.</p>
            <p className="flex items-start gap-2 text-xs text-mute"><Info size={14} className="mt-1 shrink-0 text-saffron" />نام کاربری و رمز عبور در نسخه انتشار قرار نمی‌گیرد. هر بار نتایج عوض شد، نسخه جدید بسازید و جایگزین کنید.</p>
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Button tone="primary" icon={<Send size={16} />} onClick={() => { download(`samane-arzyabi-enteshar-${stamp()}.html`, buildSnapshot(db), 'text/html'); st.notify('نسخه انتشار ساخته شد.'); }}>ساخت نسخه انتشار (HTML)</Button>
          </div>
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><KeyRound size={17} className="text-brand" />نام کاربری و رمز عبور مدیر</span>}>
        <div className="space-y-3">
          <Field label="نام کاربری"><TextInput dir="ltr" value={user} onChange={e => setUser(e.target.value)} /></Field>
          <Field label="رمز عبور جدید"><TextInput dir="ltr" type="password" value={p1} onChange={e => setP1(e.target.value)} /></Field>
          <Field label="تکرار رمز عبور"><TextInput dir="ltr" type="password" value={p2} onChange={e => setP2(e.target.value)} /></Field>
          {p2 && p1 !== p2 && <p className="text-xs text-anar">تکرار رمز با رمز جدید یکسان نیست.</p>}
          <Button tone="primary" disabled={!user.trim() || p1.length < 6 || p1 !== p2} onClick={() => { st.setCredentials(user, p1); setP1(''); setP2(''); st.notify('اطلاعات ورود تغییر کرد.'); }}>ذخیره</Button>
          <p className="text-xs leading-6 text-mute">رمز پیش‌فرض: admin / aA123456. این سامانه بدون سرور و کاملاً روی مرورگر اجرا می‌شود؛ رمز فقط مانع ورود اتفاقی به پنل است و جای امنیت سرور را نمی‌گیرد. فایل اصلی مدیریتی را فقط در اختیار مدیر سامانه بگذارید.</p>
        </div>
      </Panel>

      <Panel title="پشتیبان و فایل پایگاه داده">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-bold text-white">پشتیبان دستی</div>
            <div className="flex flex-wrap gap-2">
              <Button icon={<Download size={15} />} onClick={() => download(`arzyabi-backup-${stamp()}.json`, JSON.stringify(db), 'application/json')}>دریافت پشتیبان (JSON)</Button>
              <Button icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>بازیابی از پشتیبان</Button>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
            </div>
            <p className="text-xs text-mute">پشتیبان‌های نسخه قبلی (فقط واحد فروش) هم قابل بازیابی هستند و خودکار به ساختار چندواحدی تبدیل می‌شوند.</p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-bold text-white">فایل پایگاه داده روی دیسک (Chrome و Edge)</div>
            {st.fileName ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 rounded-xl bg-white/[.06] px-3 py-2 text-sm"><FileJson size={16} className="text-firouzeh" />{st.fileName}</span>
                {st.fileNeedsPermission && <Button tone="saffron" icon={<Link2 size={15} />} onClick={st.reconnectFile}>اتصال دوباره</Button>}
                <Button tone="danger" icon={<Unlink size={15} />} onClick={st.unlinkFile}>قطع اتصال</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button tone="primary" icon={<Link2 size={15} />} onClick={() => st.linkFile(true)}>ساخت فایل پایگاه داده</Button>
                <Button icon={<FileJson size={15} />} onClick={() => st.linkFile(false)}>باز کردن فایل موجود</Button>
              </div>
            )}
          </div>
          <div className="border-t border-white/10 pt-4">
            <Button tone="danger" icon={<RotateCcw size={15} />} onClick={() => setReset(true)}>بازگشت به داده‌های اولیه (اکسل‌ها)</Button>
          </div>
        </div>
      </Panel>
      <Confirm open={reset} yes="بازگشت" onNo={() => setReset(false)} onYes={() => { st.resetToSeed(); setReset(false); st.notify('داده‌ها به وضعیت اولیه برگشت.'); }}
        text="همه واحدها، پرسنل، بازه‌ها و ارزیابی‌ها پاک و با داده‌های اولیه (فروش و موفقیت مشتری) جایگزین شود؟ اگر لازم است اول پشتیبان بگیرید." />
    </div>
  );
}
