import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Trophy, Orbit, ListOrdered } from 'lucide-react';
import { useStore } from '../../lib/store';
import { usePeople, useResults, useUnit } from '../../lib/hooks';
import type { PersonResult } from '../../lib/types';
import { Empty, Panel, Segmented } from '../../components/ui';
import { DimChampions, OrbitRank, Petal, Podium, RankList, SortBar, sortPeople, type SortKey } from '../../components/People';
import { Heatmap } from '../../components/Viz';
import Analytics from '../Analytics';
import { avgDims } from './OrgView';
import type { ViewRoute } from '../../App';

export default function UnitView({ go }: { go: (r: ViewRoute) => void }) {
  const db = useStore(s => s.db)!;
  const { periodId, setUnit } = useStore();
  const unit = useUnit();
  const people = usePeople(periodId, unit?.id);
  const results = useResults(periodId);
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [view, setView] = useState<'list' | 'orbit'>('list');
  const sorted = useMemo(() => sortPeople(people, sortKey), [people, sortKey]);
  const pick = (p: PersonResult) => go({ page: 'person', id: p.emp.id });
  if (!unit) return <Empty title="واحدی تعریف نشده" />;
  const avg = avgDims(people);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap gap-2">
        {db.units.map((u, i) => (
          <motion.button key={u.id} onClick={() => setUnit(u.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}
            className={clsx('glass pop relative rounded-2xl px-5 py-3 text-right', unit.id === u.id && '!border-brand/60')}>
            {unit.id === u.id && <motion.span layoutId="unitTab" className="absolute inset-0 rounded-2xl" style={{ boxShadow: `0 0 30px -6px ${u.color}`, background: u.color + '18' }} />}
            <span className="relative flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: u.color, boxShadow: `0 0 10px ${u.color}` }} /><b className="text-white">{u.name}</b></span>
            <span className="relative text-[11px] text-mute">{db.employees.filter(e => e.unitId === u.id && e.active).length} نفر</span>
          </motion.button>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel lift="lg" float={1}>
          <div className="flex flex-col items-center">
            <div className="self-start text-sm text-mute">میانگین واحد <b className="text-white">{unit.name}</b></div>
            <Petal {...avg} size={300} label={`میانگین ${unit.name}`} />
          </div>
        </Panel>
        <Panel lift="none" title={<span className="flex items-center gap-2"><Trophy size={18} className="text-saffron" />برترین‌های {unit.name}</span>} action={<SortBar value={sortKey} onChange={setSortKey} />}>
          {people.length ? <Podium people={sorted} sortKey={sortKey} onPick={pick} /> : <div className="py-16 text-center text-sm text-mute">در این بازه ارزیابی ثبت نشده است.</div>}
        </Panel>
      </section>

      {people.length > 0 && (
        <>
          <DimChampions people={people} onPick={pick} />
          <Panel lift="none" title={`رتبه‌بندی ${unit.name}`} action={<>
            <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'فهرست' }, { value: 'orbit', label: 'مدار عملکرد' }]} />
            {view === 'list' ? <ListOrdered size={16} className="text-mute" /> : <Orbit size={16} className="text-mute" />}
          </>}>
            {view === 'list' ? <RankList people={sorted} sortKey={sortKey} onPick={pick} showUnit={false} rankOf={sortKey === 'overall' ? p => p.unitRank : undefined} />
              : <OrbitRank people={sorted} sortKey={sortKey} onPick={pick} />}
          </Panel>
          {results.length > 0 && (
            <Panel lift="sm" title="نقشه تحقق شاخص‌های وظیفه‌ای و تیمی" action={<span className="text-xs text-mute">درصد تحقق و نمره هر شاخص</span>}>
              <Heatmap results={results} db={db} settings={unit.settings} onPick={id => go({ page: 'person', id })} />
            </Panel>
          )}
          <Analytics viewer />
        </>
      )}
    </div>
  );
}
