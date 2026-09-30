import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { MONTHS, monthLen, parseJ, fmt, todayJ } from '../lib/jalali';

export const n = (v: number | null | undefined, d = 1) =>
  v == null || !Number.isFinite(v) ? '—' : Number(v.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });

export function parseNum(s: string): number | null {
  const t = s.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[٬,]/g, '').replace('٫', '.').trim();
  if (t === '' || t === '-') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'danger' | 'soft' | 'saffron'; size?: 'sm' | 'md'; icon?: React.ReactNode };
export function Button({ tone = 'soft', size = 'md', icon, className, children, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-10 px-4 text-sm',
        tone === 'primary' && 'bg-ink text-white hover:bg-ink-700',
        tone === 'saffron' && 'bg-saffron text-white hover:bg-saffron-700',
        tone === 'soft' && 'bg-white border border-line text-ink hover:border-ink-300',
        tone === 'ghost' && 'text-ink hover:bg-ink/5',
        tone === 'danger' && 'text-anar hover:bg-anar-50',
        className,
      )}
    >
      {icon}{children}
    </button>
  );
}

export function Panel({ title, action, children, className, pad = true }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={clsx('bg-white border border-line rounded-xl', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          <div className="flex items-center gap-2">{action}</div>
        </header>
      )}
      <div className={clsx(pad && 'px-5 pb-5 pt-2')}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium text-mute">{label}</span>
      {children}
      {hint && <span className="text-xs text-mute/80">{hint}</span>}
    </label>
  );
}

export const inputCls = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-firouzeh focus:ring-2 focus:ring-firouzeh/20';
export const cellInputCls = 'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-[13px] text-ink outline-none hover:border-line focus:border-firouzeh focus:bg-white focus:ring-2 focus:ring-firouzeh/20';

export function TextInput(p: React.InputHTMLAttributes<HTMLInputElement> & { cell?: boolean }) {
  const { cell, className, ...rest } = p;
  return <input {...rest} className={clsx(cell ? cellInputCls : inputCls, className)} />;
}

export function Select({ cell, className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { cell?: boolean }) {
  return <select {...p} className={clsx(cell ? cellInputCls : inputCls, 'cursor-pointer', className)}>{children}</select>;
}

/** Number field that keeps typed text until blur, accepts Persian digits, empty → null */
export function NumInput({ value, onChange, cell, className, placeholder, ...rest }: { value: number | null | undefined; onChange: (v: number | null) => void; cell?: boolean; className?: string; placeholder?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [txt, setTxt] = useState(value == null ? '' : String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(value == null ? '' : String(value)); }, [value]);
  return (
    <input
      {...rest}
      inputMode="decimal"
      dir="ltr"
      value={txt}
      placeholder={placeholder}
      onFocus={e => { focused.current = true; e.currentTarget.select(); }}
      onChange={e => { setTxt(e.target.value); const v = parseNum(e.target.value); if (v !== null || e.target.value.trim() === '') onChange(v); }}
      onBlur={() => { focused.current = false; setTxt(value == null ? '' : String(value)); }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-nav="actual"]'));
          const i = inputs.indexOf(e.currentTarget);
          if (i >= 0 && inputs[i + 1]) inputs[i + 1].focus(); else e.currentTarget.blur();
        }
      }}
      className={clsx(cell ? cellInputCls : inputCls, 'text-right tabular-nums', className)}
    />
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div className={clsx('w-full rounded-xl bg-white shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')} onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-mute hover:bg-paper" aria-label="بستن"><X size={18} /></button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-start gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirm({ open, text, onYes, onNo, yes = 'حذف' }: { open: boolean; text: React.ReactNode; onYes: () => void; onNo: () => void; yes?: string }) {
  return (
    <Modal open={open} onClose={onNo} title="تأیید" footer={<><Button tone="primary" className="!bg-anar hover:!bg-anar/90" onClick={onYes}>{yes}</Button><Button onClick={onNo}>انصراف</Button></>}>
      <div className="text-sm leading-7 text-ink">{text}</div>
    </Modal>
  );
}

export function Chip({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', className)}
      style={color ? { background: color + '1f', color } : undefined}>{children}</span>
  );
}

export function Empty({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      {icon && <div className="text-ink-300">{icon}</div>}
      <div className="text-[15px] font-bold text-ink">{title}</div>
      {text && <p className="max-w-md text-sm leading-7 text-mute">{text}</p>}
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-line bg-paper p-0.5">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={clsx('h-8 rounded-md px-3 text-[13px] font-medium transition-colors', value === o.value ? 'bg-white text-ink shadow-sm' : 'text-mute hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function JDate({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const p = parseJ(value) ?? todayJ();
  const years = Array.from({ length: 16 }, (_, i) => 1398 + i);
  const set = (y: number, m: number, d: number) => onChange(fmt(y, m, Math.min(d, monthLen(y, m))));
  return (
    <div className="flex gap-1.5">
      <Select value={p.d} onChange={e => set(p.y, p.m, +e.target.value)} className="!w-20">
        {Array.from({ length: monthLen(p.y, p.m) }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </Select>
      <Select value={p.m} onChange={e => set(p.y, +e.target.value, p.d)} className="!w-32">
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </Select>
      <Select value={p.y} onChange={e => set(+e.target.value, p.m, p.d)} className="!w-24">
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </Select>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-sm text-ink">
      <span className={clsx('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-firouzeh' : 'bg-line')}>
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'right-0.5' : 'right-[18px]')} />
      </span>
      {label}
    </button>
  );
}
