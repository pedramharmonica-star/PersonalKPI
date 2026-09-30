import { Plus, Trash2, Wand2, AlertTriangle } from 'lucide-react';
import type { BonusMode, KPI, Settings } from '../lib/types';
import { engineOf } from '../lib/engine';
import { sampleTiers } from '../lib/seed';
import { Button, Field, NumInput, Select, TextInput, n } from './ui';

export const BONUS_LABEL: Record<BonusMode, string> = {
  none: 'بدون Bonus',
  fullFixed: 'درصد ثابت از وزن، فقط وقتی نمره دقیقاً برابر وزن شود (فرمول اکسل)',
  reachFixed: 'درصد ثابت از وزن وقتی تحقق به ۱۰۰٪ برسد (نمره سقف وزن)',
  overflow: 'نمره مازاد بر وزن به Bonus منتقل شود (فرمول ردیف AOV)',
  step: 'امتیاز به ازای هر پله مازاد بر Max (فرمول پله)',
};

export const ENGINE_LABEL = { spectrum: 'طیفی (خطی بین Min و Max)', step: 'پله‌ای (جدول پله‌ها)', case: 'موردی (مثبت/منفی: وزن × مقدار)', rank: 'رتبه‌ای (نسبت به بهترین عملکرد)' } as const;

/** Inline-editable table cells for one KPI (used in templates and in evaluation edit mode) */
export function KpiCells({ k, s, onChange }: { k: KPI; s: Settings; onChange: (k: KPI) => void }) {
  const up = (p: Partial<KPI>) => onChange({ ...k, ...p });
  return (
    <>
      <td className="min-w-[180px] px-1"><TextInput cell value={k.name} onChange={e => up({ name: e.target.value })} /></td>
      <td className="px-1"><Select cell value={k.typeId} onChange={e => {
        const typeId = e.target.value;
        const eng = engineOf(s, typeId);
        up({ typeId, ...(eng === 'step' && !k.tiers.length ? { tiers: sampleTiers(k.min, k.max, k.weight), tiersSample: true, bonusMode: 'step' as BonusMode } : {}) });
      }}>{s.measureTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></td>
      <td className="px-1"><Select cell value={k.period} onChange={e => up({ period: e.target.value })}>
        {!s.periodLabels.includes(k.period) && <option value={k.period}>{k.period}</option>}
        {s.periodLabels.map(p => <option key={p}>{p}</option>)}</Select></td>
      <td className="w-20 px-1"><NumInput cell value={k.min} onChange={v => up({ min: v ?? 0 })} /></td>
      <td className="w-20 px-1"><NumInput cell value={k.max} onChange={v => up({ max: v ?? 0 })} /></td>
      <td className="px-1"><Select cell value={k.unit} onChange={e => up({ unit: e.target.value })}>
        {!s.units.includes(k.unit) && <option value={k.unit}>{k.unit || '—'}</option>}
        {s.units.map(u => <option key={u}>{u}</option>)}</Select></td>
      <td className="w-16 px-1"><NumInput cell value={k.weight} onChange={v => up({ weight: v ?? 0 })} /></td>
    </>
  );
}

export function BehaviorCell({ k, s, onChange }: { k: KPI; s: Settings; onChange: (k: KPI) => void }) {
  return (
    <Select cell value={k.behaviorId} onChange={e => onChange({ ...k, behaviorId: e.target.value })}>
      {s.behaviors.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </Select>
  );
}

/** Expanded details: descriptions, group, bonus mode, tiers */
export function KpiDetails({ k, s, onChange, readOnly }: { k: KPI; s: Settings; onChange: (k: KPI) => void; readOnly?: boolean }) {
  const up = (p: Partial<KPI>) => onChange({ ...k, ...p });
  const eng = engineOf(s, k.typeId);
  if (readOnly) {
    return (
      <div className="grid gap-4 text-[13px] leading-7 md:grid-cols-3">
        <Info label="تعریف" v={k.definition} />
        <Info label="مکانیزم محاسبه" v={k.mechanism} />
        <Info label="منبع داده" v={k.source} />
        <Info label="روش محاسبه" v={ENGINE_LABEL[eng]} />
        <Info label="Bonus" v={BONUS_LABEL[k.bonusMode].replace('درصد ثابت', `${k.bonusPct ?? s.bonusPct}٪`)} />
        {eng === 'step' && (
          <div>
            <div className="text-xs text-mute">پله‌ها {k.tiersSample && <span className="text-saffron-700">(نمونه)</span>}</div>
            <div className="mt-1 flex flex-wrap gap-1">{[...k.tiers].sort((a, b) => a.from - b.from).map((t, i) => <span key={i} className="rounded bg-paper px-2 py-0.5 tabular-nums">از {n(t.from, 2)} ← {n(t.score, 2)}</span>)}</div>
            {k.stepSize > 0 && <div className="mt-1 text-xs text-mute">مازاد: هر {n(k.stepSize, 2)} واحد بالاتر از Max = {n(k.stepPoints, 2)} امتیاز</div>}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="تعریف"><textarea className="min-h-[72px] w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-firouzeh" value={k.definition} onChange={e => up({ definition: e.target.value })} /></Field>
        <Field label="مکانیزم محاسبه"><textarea className="min-h-[72px] w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-firouzeh" value={k.mechanism} onChange={e => up({ mechanism: e.target.value })} /></Field>
        <Field label="منبع داده"><textarea className="min-h-[72px] w-full rounded-lg border border-line p-2.5 text-sm outline-none focus:border-firouzeh" value={k.source} onChange={e => up({ source: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="گروه شاخص">
          <Select value={k.groupId} onChange={e => up({ groupId: e.target.value })}>{s.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
        </Field>
        <Field label="نحوه محاسبه Bonus" className="md:col-span-2">
          <Select value={k.bonusMode} onChange={e => up({ bonusMode: e.target.value as BonusMode })}>
            {(Object.keys(BONUS_LABEL) as BonusMode[]).map(b => <option key={b} value={b}>{BONUS_LABEL[b]}</option>)}
          </Select>
        </Field>
        <Field label="درصد Bonus از وزن" hint={`خالی = پیش‌فرض (${s.bonusPct}٪)`}>
          <NumInput value={k.bonusPct} onChange={v => up({ bonusPct: v })} placeholder={String(s.bonusPct)} />
        </Field>
      </div>
      {eng === 'step' && (
        <div className="rounded-lg border border-line bg-paper/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="text-sm font-bold text-ink">جدول پله‌ها</div>
            {k.tiersSample && <span className="inline-flex items-center gap-1 rounded-full bg-saffron-50 px-2 py-0.5 text-xs text-saffron-700"><AlertTriangle size={12} />پله‌های نمونه — شیت «پله های فروش» در اکسل خالی بود</span>}
            <div className="mr-auto flex gap-2">
              <Button size="sm" icon={<Wand2 size={14} />} onClick={() => up({ tiers: sampleTiers(k.min, k.max, k.weight), tiersSample: true })}>ساخت خودکار از Min/Max</Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => up({ tiers: [...k.tiers, { from: k.max, score: k.weight }], tiersSample: false })}>افزودن پله</Button>
            </div>
          </div>
          <p className="mb-3 text-xs leading-6 text-mute">
            مطابق فرمول اکسل: اگر مقدار کمتر از Min باشد نمره صفر است؛ وگرنه نمره پله‌ای که «از» آن کوچک‌تر یا مساوی مقدار است (VLOOKUP تقریبی) و حداکثر تا سقف نمره.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {k.tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white p-2">
                <span className="w-6 text-center text-xs text-mute">{i + 1}</span>
                <span className="text-xs text-mute">از</span>
                <NumInput value={t.from} onChange={v => up({ tiers: k.tiers.map((x, j) => j === i ? { ...x, from: v ?? 0 } : x), tiersSample: false })} className="!h-8" />
                <span className="text-xs text-mute">نمره</span>
                <NumInput value={t.score} onChange={v => up({ tiers: k.tiers.map((x, j) => j === i ? { ...x, score: v ?? 0 } : x), tiersSample: false })} className="!h-8" />
                <button className="p-1 text-mute hover:text-anar" aria-label="حذف پله" onClick={() => up({ tiers: k.tiers.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="سقف نمره پله" hint="خالی = برابر وزن (در اکسل عدد ۲۰ ثابت بود)"><NumInput value={k.scoreCap} onChange={v => up({ scoreCap: v })} placeholder={String(k.weight)} /></Field>
            <Field label="اندازه هر پله مازاد (بالاتر از Max)" hint="ستون «امتیاز Bonus» در شیت پله‌ها"><NumInput value={k.stepSize} onChange={v => up({ stepSize: v ?? 0 })} /></Field>
            <Field label="امتیاز هر پله مازاد" hint="ستون «امتیاز پله» در شیت پله‌ها"><NumInput value={k.stepPoints} onChange={v => up({ stepPoints: v ?? 0 })} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return <div><div className="text-xs text-mute">{label}</div><div className="text-ink">{v?.trim() ? v : <span className="text-mute/70">—</span>}</div></div>;
}
