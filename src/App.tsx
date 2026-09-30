import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { LayoutDashboard, ClipboardPen, CalendarRange, Users, ListChecks, ChartColumnBig, Settings2, CheckCircle2, Loader2, AlertTriangle, FileJson, Menu } from 'lucide-react';
import { useStore } from './lib/store';
import { useSortedPeriods } from './lib/hooks';
import { KIND_LABEL } from './lib/jalali';
import Dashboard from './pages/Dashboard';
import Evaluate from './pages/Evaluate';
import Periods from './pages/Periods';
import Employees from './pages/Employees';
import Templates from './pages/Templates';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/Settings';

export type Page = 'dashboard' | 'evaluate' | 'periods' | 'employees' | 'templates' | 'analytics' | 'settings';

const NAV: { id: Page; label: string; icon: any; hint: string; period?: boolean }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, hint: 'نمای کلی و رتبه‌بندی بازه', period: true },
  { id: 'evaluate', label: 'ثبت ارزیابی', icon: ClipboardPen, hint: 'ورود مقادیر فعلی شاخص‌ها', period: true },
  { id: 'analytics', label: 'تحلیل و مقایسه', icon: ChartColumnBig, hint: 'نمودارها، روند و رنکینگ', period: true },
  { id: 'periods', label: 'بازه‌های ارزیابی', icon: CalendarRange, hint: 'ماهانه، فصلی، شش‌ماهه، سالانه یا دلخواه' },
  { id: 'employees', label: 'پرسنل', icon: Users, hint: 'کارشناسان و روش ارزیابی هر نفر' },
  { id: 'templates', label: 'روش‌ها و شاخص‌ها', icon: ListChecks, hint: 'شاخص‌ها، وزن‌ها، Min/Max و پله‌ها' },
  { id: 'settings', label: 'تنظیمات', icon: Settings2, hint: 'پارامترهای محاسبه، فهرست‌ها و پشتیبان' },
];

export default function App() {
  const { ready, init, save, fileName, fileNeedsPermission, reconnectFile, toast, periodId, setPeriod, db } = useStore();
  const periods = useSortedPeriods();
  const [page, setPageState] = useState<Page>(() => (location.hash.slice(1) as Page) || 'dashboard');
  const [focusEmp, setFocusEmp] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [toastVis, setToastVis] = useState(false);

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (!toast) return;
    setToastVis(true);
    const t = setTimeout(() => setToastVis(false), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const go = (p: Page, emp?: string) => { setPageState(p); location.hash = p; setNavOpen(false); if (emp !== undefined) setFocusEmp(emp); window.scrollTo(0, 0); };

  if (!ready || !db) {
    return <div className="flex h-full items-center justify-center gap-2 text-mute"><Loader2 className="animate-spin" size={18} />در حال بارگذاری پایگاه داده…</div>;
  }
  const cur = NAV.find(n => n.id === page) ?? NAV[0];

  return (
    <div className="min-h-full">
      <aside className={clsx('fixed inset-y-0 right-0 z-40 flex w-64 flex-col bg-ink text-white transition-transform lg:translate-x-0', navOpen ? 'translate-x-0' : 'translate-x-full')}>
        <div className="px-6 pb-6 pt-7">
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#1C3E50" /><path d="M7 22 L13 14 L18 18 L25 8" stroke="#D99A1E" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="25" cy="8" r="2.2" fill="#fff" /></svg>
            <div>
              <div className="text-lg font-black tracking-tight">سامانه ارزیابی</div>
              <div className="text-xs text-ink-300">{db.settings.orgName}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(n => (
            <button key={n.id} onClick={() => go(n.id)}
              className={clsx('group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm transition-colors', page === n.id ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
              <n.icon size={18} className={page === n.id ? 'text-firouzeh' : 'text-ink-300 group-hover:text-white'} />
              <span className="font-medium">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-lg bg-white/5 p-3 text-xs leading-6 text-ink-300">
          <div className="flex items-center gap-1.5">
            {save === 'saving' ? <Loader2 size={13} className="animate-spin" /> : save === 'error' ? <AlertTriangle size={13} className="text-anar" /> : <CheckCircle2 size={13} className="text-firouzeh" />}
            {save === 'saving' ? 'در حال ذخیره…' : save === 'error' ? 'خطا در ذخیره‌سازی' : 'ذخیره شد در پایگاه داده مرورگر'}
          </div>
          {fileName && (
            <div className="mt-1 flex items-center gap-1.5">
              <FileJson size={13} className={fileNeedsPermission ? 'text-saffron' : 'text-firouzeh'} />
              <span className="truncate">{fileName}</span>
              {fileNeedsPermission && <button onClick={reconnectFile} className="mr-auto rounded bg-saffron px-1.5 text-[11px] text-white">اتصال</button>}
            </div>
          )}
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <main className="lg:mr-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur no-print">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 lg:px-8">
            <button className="rounded-md p-1.5 text-ink lg:hidden" onClick={() => setNavOpen(true)} aria-label="منو"><Menu size={20} /></button>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-ink">{cur.label}</h1>
              <p className="text-xs text-mute">{cur.hint}</p>
            </div>
            {cur.period && (
              <div className="mr-auto flex items-center gap-2">
                <span className="text-xs text-mute">بازه ارزیابی</span>
                <select value={periodId ?? ''} onChange={e => setPeriod(e.target.value || null)}
                  className="h-9 min-w-[220px] cursor-pointer rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-firouzeh">
                  {!periods.length && <option value="">— هنوز بازه‌ای ساخته نشده —</option>}
                  {[...periods].reverse().map(p => <option key={p.id} value={p.id}>{p.name} ({KIND_LABEL[p.kind]})</option>)}
                </select>
              </div>
            )}
          </div>
        </header>
        <div className="px-5 py-6 lg:px-8">
          {page === 'dashboard' && <Dashboard go={go} />}
          {page === 'evaluate' && <Evaluate focusEmp={focusEmp} setFocusEmp={setFocusEmp} go={go} />}
          {page === 'periods' && <Periods go={go} />}
          {page === 'employees' && <Employees />}
          {page === 'templates' && <Templates />}
          {page === 'analytics' && <Analytics />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>

      {toast && (
        <div className={clsx('fixed bottom-5 left-5 z-[60] max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-xl transition-all', toast.tone === 'err' ? 'bg-anar' : 'bg-ink', toastVis ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0')}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
