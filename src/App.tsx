import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import {
  Building2, Users2, CalendarRange, ClipboardPen, GraduationCap, HeartHandshake, ListChecks, Settings2, ShieldCheck,
  LogOut, Eye, Orbit, Sparkles, Snowflake, Wind, Loader2, CheckCircle2, AlertTriangle, FileJson, Layers,
} from 'lucide-react';
import { useStore, type Scene } from './lib/store';
import { useSortedPeriods, useUnit } from './lib/hooks';
import { KIND_LABEL } from './lib/jalali';
import { SceneBg, Logo, Mark, useParallax } from './components/Space';
import Entry from './pages/Entry';
import OrgView from './pages/viewer/OrgView';
import UnitView from './pages/viewer/UnitView';
import PersonView from './pages/viewer/PersonView';
import AdminUnits from './pages/admin/AdminUnits';
import AdminSystem from './pages/admin/AdminSystem';
import DimEntry from './pages/admin/DimEntry';
import Evaluate from './pages/Evaluate';
import Periods from './pages/Periods';
import Employees from './pages/Employees';
import Templates from './pages/Templates';
import SettingsPage from './pages/Settings';

export type ViewRoute = { page: 'org' } | { page: 'unit' } | { page: 'person'; id: string };
export type AdminPage = 'units' | 'periods' | 'evaluate' | 'individual' | 'orgdim' | 'employees' | 'templates' | 'settings' | 'system';
export type Page = AdminPage;

export const pageAnim = { initial: { opacity: 0, y: 24, scale: .985, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }, transition: { duration: .45, ease: [.2, .8, .2, 1] } };

export default function App() {
  const { ready, init, session, calm, scene, toast } = useStore();
  const [toastVis, setToastVis] = useState(false);
  useEffect(() => { init(); }, [init]);
  useEffect(() => { document.documentElement.classList.toggle('calm', calm); }, [calm]);
  useParallax(!calm);
  useEffect(() => {
    if (!toast) return;
    setToastVis(true);
    const t = setTimeout(() => setToastVis(false), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="relative min-h-screen">
      <SceneBg scene={scene} />
      {!ready ? (
        <div className="flex h-screen items-center justify-center gap-2 text-mute"><Loader2 className="animate-spin" size={18} />در حال بارگذاری…</div>
      ) : (
        <>
          <motion.div key={session} {...pageAnim}>
            {session === 'entry' && <Entry />}
            {session === 'viewer' && <ViewerShell />}
            {session === 'admin' && <AdminShell />}
          </motion.div>
        </>
      )}
      {toast && (
        <div className={clsx('glass-strong fixed bottom-5 left-5 z-[70] max-w-sm rounded-2xl px-4 py-3 text-sm text-white transition-all', toast.tone === 'err' && '!border-anar/60', toastVis ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0')}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

function PeriodPicker({ compact }: { compact?: boolean }) {
  const periods = useSortedPeriods();
  const { periodId, setPeriod } = useStore();
  return (
    <select value={periodId ?? ''} onChange={e => setPeriod(e.target.value || null)} aria-label="بازه ارزیابی"
      className={clsx('h-10 cursor-pointer rounded-xl border border-white/10 bg-white/[.06] px-3 text-sm font-medium text-white outline-none backdrop-blur transition hover:border-brand/40 focus:border-brand', compact ? 'min-w-[170px]' : 'min-w-[220px]')}>
      {!periods.length && <option value="">— بازه‌ای وجود ندارد —</option>}
      {[...periods].reverse().map(p => <option key={p.id} value={p.id}>{p.name} ({KIND_LABEL[p.kind]})</option>)}
    </select>
  );
}

export function SceneSwitch() {
  const { scene, setScene, calm, setCalm } = useStore();
  const items: { v: Scene; icon: any; label: string }[] = [
    { v: 'orbit', icon: Orbit, label: 'مدار' }, { v: 'galaxy', icon: Sparkles, label: 'کهکشان نقطه‌ای' }, { v: 'frost', icon: Snowflake, label: 'شیشه مات' },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/20 p-0.5">
      {items.map(i => (
        <button key={i.v} onClick={() => setScene(i.v)} title={`فضای ${i.label}`} aria-label={`فضای ${i.label}`}
          className={clsx('flex h-9 w-9 items-center justify-center rounded-lg transition', scene === i.v ? 'bg-brand text-white shadow-[0_0_16px_rgba(242,97,34,.6)]' : 'text-mute hover:text-white')}>
          <i.icon size={16} />
        </button>
      ))}
      <button onClick={() => setCalm(!calm)} title={calm ? 'روشن کردن حرکت‌ها' : 'آرام کردن حرکت‌ها'} aria-label="حرکت‌ها"
        className={clsx('flex h-9 w-9 items-center justify-center rounded-lg transition', calm ? 'bg-white/15 text-white' : 'text-mute hover:text-white')}>
        <Wind size={16} />
      </button>
    </div>
  );
}

/* ------------------------------ viewer ------------------------------ */
function ViewerShell() {
  const { logout, readonly, db } = useStore();
  const [route, setRoute] = useState<ViewRoute>({ page: 'org' });
  const go = (r: ViewRoute) => { setRoute(r); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const nav: { r: ViewRoute; label: string; icon: any }[] = [
    { r: { page: 'org' }, label: 'ارزیابی کل سازمان', icon: Building2 },
    { r: { page: 'unit' }, label: 'واحدها', icon: Layers },
  ];
  return (
    <div className="min-h-screen pb-16">
      <header className="no-print sticky top-3 z-40 mx-3 mt-3 lg:mx-6">
        <div className="glass-strong flex flex-wrap items-center gap-3 rounded-2xl px-4 py-2.5">
          <button onClick={() => go({ page: 'org' })} className="flex items-center gap-3 pl-2">
            <Logo className="h-8 w-auto" />
            <span className="hidden border-r border-white/15 pr-3 text-sm font-bold text-white sm:block">سامانه ارزیابی عملکرد</span>
          </button>
          <nav className="flex items-center gap-1">
            {nav.map(n => (
              <button key={n.label} onClick={() => go(n.r)}
                className={clsx('relative flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition', route.page === n.r.page ? 'text-white' : 'text-mute hover:text-white')}>
                {route.page === n.r.page && <motion.span layoutId="vnav" className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-brand/40" />}
                <n.icon size={16} className="relative" /><span className="relative">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="mr-auto flex flex-wrap items-center gap-2">
            <PeriodPicker compact />
            <SceneSwitch />
            <button onClick={logout} className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-mute transition hover:bg-white/10 hover:text-white"><LogOut size={16} />خروج</button>
          </div>
        </div>
        {readonly && db?.publishedAt && <div className="mt-2 text-center text-[11px] text-mute">نسخه انتشار (فقط نمایش)، منتشرشده در {new Date(db.publishedAt).toLocaleDateString('fa-IR')}</div>}
      </header>
      <main className="mx-auto max-w-[1400px] px-3 pt-8 lg:px-6">
        <>
          <motion.div key={route.page + ('id' in route ? route.id : '')} {...pageAnim}>
            {route.page === 'org' && <OrgView go={go} />}
            {route.page === 'unit' && <UnitView go={go} />}
            {route.page === 'person' && <PersonView id={route.id} go={go} />}
          </motion.div>
        </>
      </main>
    </div>
  );
}

/* ------------------------------ admin ------------------------------ */
const ADMIN_NAV: { section: string; unit?: boolean; items: { id: AdminPage; label: string; icon: any; hint: string }[] }[] = [
  { section: 'ساختار سازمان', items: [
    { id: 'units', label: 'واحدها', icon: Building2, hint: 'افزودن واحد، کپی از الگوی واحدهای قبلی' },
    { id: 'periods', label: 'بازه‌های ارزیابی', icon: CalendarRange, hint: 'ماهانه، فصلی، شش‌ماهه، سالانه یا دلخواه (مشترک بین واحدها)' },
  ] },
  { section: 'واحد', unit: true, items: [
    { id: 'evaluate', label: 'وظیفه‌ای و تیمی', icon: ClipboardPen, hint: 'ورود مقدار فعلی شاخص‌های KPI' },
    { id: 'individual', label: 'فردی', icon: GraduationCap, hint: 'آزمون پیام‌گستر و پرسشنامه صلاحیت فردی' },
    { id: 'orgdim', label: 'سازمانی', icon: HeartHandshake, hint: 'رفتار شهروندی سازمانی (OCB)' },
    { id: 'employees', label: 'پرسنل', icon: Users2, hint: 'کارشناسان، تصویر و روش ارزیابی هر نفر' },
    { id: 'templates', label: 'روش‌ها و شاخص‌ها', icon: ListChecks, hint: 'شاخص‌ها، وزن‌ها، Min/Max و پله‌ها' },
    { id: 'settings', label: 'تنظیمات واحد', icon: Settings2, hint: 'پارامترهای محاسبه، وزن ابعاد و فهرست‌ها' },
  ] },
  { section: 'سیستم', items: [
    { id: 'system', label: 'امنیت، داده و انتشار', icon: ShieldCheck, hint: 'رمز عبور، پشتیبان و ساخت نسخه انتشار برای پرسنل' },
  ] },
];

function AdminShell() {
  const { db, logout, enterViewer, save, fileName, fileNeedsPermission, reconnectFile, unitId, setUnit } = useStore();
  const unit = useUnit();
  const [page, setPage] = useState<AdminPage>('evaluate');
  const [focusEmp, setFocusEmp] = useState<string | null>(null);
  const go = (p: AdminPage, emp?: string) => { setPage(p); if (emp !== undefined) setFocusEmp(emp); window.scrollTo(0, 0); };
  const cur = ADMIN_NAV.flatMap(s => s.items).find(i => i.id === page)!;
  const unitScoped = ADMIN_NAV.find(s => s.unit)!.items.some(i => i.id === page);
  const needsPeriod = ['evaluate', 'individual', 'orgdim'].includes(page);

  return (
    <div className="min-h-screen lg:pr-[292px]">
      <aside className="glass-strong no-print z-40 m-3 flex flex-col rounded-3xl lg:fixed lg:inset-y-0 lg:right-0 lg:w-[268px]">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <Mark className="h-10 w-10 drop-shadow-[0_0_18px_rgba(242,97,34,.55)]" />
          <div><div className="text-base font-black text-white">پنل مدیریت</div><div className="text-[11px] text-mute">سامانه ارزیابی عملکرد</div></div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {ADMIN_NAV.map(s => (
            <div key={s.section}>
              <div className="mb-1.5 px-2 text-[11px] font-medium text-mute">{s.section}</div>
              {s.unit && db && (
                <select value={unit?.id ?? unitId ?? ''} onChange={e => setUnit(e.target.value)} aria-label="انتخاب واحد"
                  className="mb-1.5 h-9 w-full cursor-pointer rounded-xl border border-white/10 bg-white/[.06] px-2 text-sm text-white outline-none focus:border-brand">
                  {db.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              {s.items.map(i => (
                <button key={i.id} onClick={() => go(i.id)}
                  className={clsx('group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition', page === i.id ? 'text-white' : 'text-ink-600 hover:bg-white/[.06] hover:text-white')}>
                  {page === i.id && <motion.span layoutId="anav" className="absolute inset-0 rounded-xl bg-gradient-to-l from-brand/30 to-brand/5 ring-1 ring-brand/40" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
                  <i.icon size={17} className={clsx('relative', page === i.id ? 'text-brand-300' : 'text-mute group-hover:text-white')} />
                  <span className="relative font-medium">{i.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <div className="flex items-center gap-1.5 px-1 text-[11px] text-mute">
            {save === 'saving' ? <Loader2 size={13} className="animate-spin" /> : save === 'error' ? <AlertTriangle size={13} className="text-anar" /> : <CheckCircle2 size={13} className="text-firouzeh" />}
            {save === 'saving' ? 'در حال ذخیره…' : save === 'error' ? 'خطا در ذخیره‌سازی' : 'ذخیره شد'}
            {fileName && <span className="mr-auto flex items-center gap-1"><FileJson size={12} className={fileNeedsPermission ? 'text-saffron' : 'text-firouzeh'} />{fileNeedsPermission ? <button onClick={reconnectFile} className="rounded bg-saffron px-1.5 text-[10px] text-canvas">اتصال فایل</button> : 'فایل متصل'}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={enterViewer} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[.07] text-sm text-white transition hover:bg-white/15"><Eye size={15} />نمای نتایج</button>
            <button onClick={logout} className="flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm text-mute transition hover:bg-anar-50 hover:text-anar" aria-label="خروج"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="px-3 pb-16 lg:px-6">
        <header className="no-print sticky top-0 z-30 -mx-3 mb-5 px-3 pt-3 lg:-mx-6 lg:px-6">
          <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-5 py-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-black text-white">
                <cur.icon size={20} className="text-brand" />{cur.label}
                {unitScoped && unit && <span className="rounded-lg px-2 py-0.5 text-xs font-bold" style={{ background: unit.color + '26', color: unit.color }}>{unit.name}</span>}
              </h1>
              <p className="text-xs text-mute">{cur.hint}</p>
            </div>
            <div className="mr-auto flex items-center gap-2">
              {needsPeriod && <PeriodPicker />}
              <SceneSwitch />
            </div>
          </div>
        </header>
        <>
          <motion.div key={page + (unitScoped ? unit?.id : '')} {...pageAnim}>
            {page === 'units' && <AdminUnits go={go} />}
            {page === 'periods' && <Periods go={go} />}
            {page === 'evaluate' && <Evaluate focusEmp={focusEmp} setFocusEmp={setFocusEmp} go={go} />}
            {page === 'individual' && <DimEntry kind="individual" go={go} />}
            {page === 'orgdim' && <DimEntry kind="org" go={go} />}
            {page === 'employees' && <Employees />}
            {page === 'templates' && <Templates />}
            {page === 'settings' && <SettingsPage />}
            {page === 'system' && <AdminSystem />}
          </motion.div>
        </>
      </main>
    </div>
  );
}
