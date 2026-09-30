import { useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Eye, ShieldCheck, ArrowLeft, User, KeyRound, Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { Logo, Mark } from '../components/Space';
import { SceneSwitch } from '../App';

function TiltCard({ children, className, onClick, delay = 0 }: { children: React.ReactNode; className?: string; onClick?: () => void; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-.5, .5], [10, -10]), { stiffness: 150, damping: 15 });
  const ry = useSpring(useTransform(mx, [-.5, .5], [-12, 12]), { stiffness: 150, damping: 15 });
  return (
    <motion.div ref={ref} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      onPointerMove={e => { const r = ref.current!.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - .5); my.set((e.clientY - r.top) / r.height - .5); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
      initial={{ opacity: 0, y: 40, rotateX: 20 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay, type: 'spring', stiffness: 80, damping: 14 }}
      whileHover={{ scale: 1.045, z: 40 }} whileTap={{ scale: .98 }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformPerspective: 900 }}
      className={clsx('glass relative cursor-pointer rounded-3xl', className)}>
      {children}
    </motion.div>
  );
}

export default function Entry() {
  const { enterViewer, login, readonly, db, periodId } = useStore();
  const [mode, setMode] = useState<'choose' | 'admin'>('choose');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const period = db?.periods.find(p => p.id === periodId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    setTimeout(() => {
      if (!login(user, pass)) { setErr('نام کاربری یا رمز عبور درست نیست.'); setBusy(false); }
    }, 450);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute left-4 top-4"><SceneSwitch /></div>

      {/* hero mark with orbit rings */}
      <motion.div className="relative mb-8 flex h-44 w-44 items-center justify-center" initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 70, damping: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className={clsx('absolute rounded-full border', i % 2 ? 'spin-rev' : 'spin-slow')}
            style={{ inset: -i * 26, borderColor: `rgba(242,97,34,${0.45 - i * 0.12})`, borderStyle: i === 1 ? 'dashed' : 'solid', animationDuration: `${24 + i * 14}s` }}>
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_14px_#F26122]" />
          </div>
        ))}
        <div className="absolute inset-4 rounded-full bg-brand/20 blur-2xl" />
        <Mark className="floaty relative h-28 w-28 drop-shadow-[0_0_30px_rgba(242,97,34,.6)]" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 }} className="text-center">
        <Logo className="mx-auto mb-5 h-12 w-auto opacity-95" />
        <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
          به <span className="shimmer-text">سامانه ارزیابی عملکرد</span> خوش آمدید
        </h1>
        <p className="mt-3 text-sm text-mute">پیام‌گستر، فناوری در مدار مشتری{period ? `؛ آخرین بازه: ${period.name}` : ''}</p>
      </motion.div>

      <div className="mt-10 w-full max-w-3xl" style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          {mode === 'choose' ? (
            <motion.div key="choose" exit={{ opacity: 0, scale: .95 }} className={clsx('grid gap-5', readonly ? 'sm:grid-cols-1 max-w-md mx-auto' : 'sm:grid-cols-2')}>
              <TiltCard onClick={enterViewer} delay={.35} className="group p-7">
                <div style={{ transform: 'translateZ(40px)' }}>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-firouzeh to-nil shadow-[0_10px_30px_-8px_rgba(29,181,168,.7)]"><Eye className="text-white" size={26} /></div>
                  <div className="text-xl font-black text-white">مشاهده نتایج ارزیابی</div>
                  <p className="mt-2 text-sm leading-7 text-mute">برای کارشناسان و مدیران: رتبه‌بندی سازمان و واحدها، کارنامه هر نفر و نمودارها. بدون دسترسی به تنظیمات.</p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-bold text-firouzeh-700">ورود <ArrowLeft size={16} className="transition group-hover:-translate-x-1.5" /></div>
                </div>
              </TiltCard>
              {!readonly && (
                <TiltCard onClick={() => setMode('admin')} delay={.5} className="group p-7">
                  <div style={{ transform: 'translateZ(40px)' }}>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-saffron shadow-[0_10px_30px_-8px_rgba(242,97,34,.8)]"><ShieldCheck className="text-white" size={26} /></div>
                    <div className="text-xl font-black text-white">پنل مدیریت سامانه</div>
                    <p className="mt-2 text-sm leading-7 text-mute">تعریف واحدها، شاخص‌ها و پرسنل، ثبت ارزیابی‌ها در چهار بُعد و تنظیمات هر واحد.</p>
                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-brand-300">ورود با نام کاربری <ArrowLeft size={16} className="transition group-hover:-translate-x-1.5" /></div>
                  </div>
                </TiltCard>
              )}
            </motion.div>
          ) : (
            <motion.form key="admin" onSubmit={submit} initial={{ opacity: 0, rotateY: -25, scale: .9 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }} exit={{ opacity: 0, scale: .95 }}
              transition={{ type: 'spring', stiffness: 110, damping: 16 }} className="glass-strong mx-auto max-w-md rounded-3xl p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-saffron"><ShieldCheck className="text-white" size={22} /></div>
                <div><div className="text-lg font-black text-white">ورود مدیر سامانه</div><div className="text-xs text-mute">دسترسی کامل به تنظیمات همه واحدها</div></div>
              </div>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-xs text-mute">نام کاربری</span>
                <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                  <User size={16} className="text-mute" /><input autoFocus dir="ltr" value={user} onChange={e => setUser(e.target.value)} className="h-11 flex-1 bg-transparent text-left text-white outline-none" autoComplete="username" />
                </span>
              </label>
              <label className="mb-2 block">
                <span className="mb-1.5 block text-xs text-mute">رمز عبور</span>
                <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
                  <KeyRound size={16} className="text-mute" /><input type="password" dir="ltr" value={pass} onChange={e => setPass(e.target.value)} className="h-11 flex-1 bg-transparent text-left text-white outline-none" autoComplete="current-password" />
                </span>
              </label>
              <AnimatePresence>{err && <motion.p initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: [10, -8, 6, 0] }} exit={{ opacity: 0 }} className="mb-2 text-sm text-anar" role="alert">{err}</motion.p>}</AnimatePresence>
              <div className="mt-5 flex gap-2">
                <button type="submit" disabled={busy || !user || !pass} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-brand to-brand-400 font-bold text-white shadow-[0_10px_30px_-10px_rgba(242,97,34,.9)] transition hover:-translate-y-0.5 disabled:opacity-50">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : 'ورود'}
                </button>
                <button type="button" onClick={() => { setMode('choose'); setErr(''); }} className="h-11 rounded-xl px-4 text-sm text-mute hover:bg-white/10 hover:text-white">بازگشت</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-12 text-[11px] text-mute/70">مدل ارزیابی چهاربُعدی: وظیفه‌ای، تیمی، فردی، سازمانی</div>
    </div>
  );
}
