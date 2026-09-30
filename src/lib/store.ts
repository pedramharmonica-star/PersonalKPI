import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { DB, Employee, Evaluation, KPI, Period, Settings, Template } from './types';
import { buildSeed, uid, defaultSettings } from './seed';

const KEY = 'arzyabi-db-v1';
const FILE_KEY = 'arzyabi-file-handle';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Store {
  db: DB | null;
  ready: boolean;
  save: SaveState;
  lastSaved: number;
  fileName: string | null;
  fileNeedsPermission: boolean;
  periodId: string | null;
  toast: { id: number; text: string; tone: 'ok' | 'err' } | null;

  init: () => Promise<void>;
  setPeriod: (id: string | null) => void;
  notify: (text: string, tone?: 'ok' | 'err') => void;
  mutate: (fn: (db: DB) => void) => void;
  replaceDB: (db: DB) => void;
  resetToSeed: () => void;

  upsertEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  upsertTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  upsertPeriod: (p: Period) => void;
  deletePeriod: (id: string) => void;
  startEvaluation: (periodId: string, employeeId: string) => string | null;
  setValue: (evalId: string, kpiId: string, v: number | null) => void;
  updateEvalKpi: (evalId: string, kpi: KPI) => void;
  syncEvalWithTemplate: (evalId: string) => void;
  deleteEvaluation: (id: string) => void;
  updateSettings: (fn: (s: Settings) => void) => void;

  linkFile: (create: boolean) => Promise<void>;
  reconnectFile: () => Promise<void>;
  unlinkFile: () => Promise<void>;
}

let timer: number | undefined;
let fileHandle: any = null;

function migrate(raw: any): DB {
  const seed = buildSeed();
  const db: DB = {
    version: 1,
    settings: { ...defaultSettings(), ...(raw?.settings ?? {}) },
    templates: raw?.templates ?? seed.templates,
    employees: raw?.employees ?? [],
    periods: raw?.periods ?? [],
    evaluations: raw?.evaluations ?? [],
  };
  return db;
}

export const useStore = create<Store>((set, get) => {
  const persist = () => {
    set({ save: 'saving' });
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const db = get().db;
      if (!db) return;
      try {
        await idbSet(KEY, db);
        if (fileHandle && !get().fileNeedsPermission) {
          try {
            const w = await fileHandle.createWritable();
            await w.write(JSON.stringify(db, null, 1));
            await w.close();
          } catch { set({ fileNeedsPermission: true }); }
        }
        set({ save: 'saved', lastSaved: Date.now() });
      } catch {
        set({ save: 'error' });
      }
    }, 350);
  };

  const mutate = (fn: (db: DB) => void) => {
    const cur = get().db;
    if (!cur) return;
    const next = structuredClone(cur);
    fn(next);
    set({ db: next });
    persist();
  };

  return {
    db: null, ready: false, save: 'idle', lastSaved: 0, fileName: null, fileNeedsPermission: false, periodId: null, toast: null,

    init: async () => {
      let raw: any = null;
      try { raw = await idbGet(KEY); } catch { /* storage blocked */ }
      const db = raw ? migrate(raw) : buildSeed();
      try {
        fileHandle = await idbGet(FILE_KEY);
        if (fileHandle) {
          const perm = await fileHandle.queryPermission?.({ mode: 'readwrite' });
          set({ fileName: fileHandle.name, fileNeedsPermission: perm !== 'granted' });
        }
      } catch { fileHandle = null; }
      const latest = [...db.periods].sort((a, b) => b.createdAt - a.createdAt)[0];
      set({ db, ready: true, periodId: latest?.id ?? null });
      if (!raw) persist();
    },

    setPeriod: (id) => set({ periodId: id }),
    notify: (text, tone = 'ok') => set({ toast: { id: Date.now(), text, tone } }),
    mutate,
    replaceDB: (db) => {
      const m = migrate(db);
      set({ db: m, periodId: m.periods[0]?.id ?? null });
      persist();
    },
    resetToSeed: () => {
      const db = buildSeed();
      set({ db, periodId: db.periods[0]?.id ?? null });
      persist();
    },

    upsertEmployee: (e) => mutate(db => {
      const i = db.employees.findIndex(x => x.id === e.id);
      if (i >= 0) db.employees[i] = e; else db.employees.push(e);
    }),
    deleteEmployee: (id) => mutate(db => {
      db.employees = db.employees.filter(x => x.id !== id);
      db.evaluations = db.evaluations.filter(x => x.employeeId !== id);
    }),
    upsertTemplate: (t) => mutate(db => {
      const i = db.templates.findIndex(x => x.id === t.id);
      if (i >= 0) db.templates[i] = t; else db.templates.push(t);
    }),
    deleteTemplate: (id) => mutate(db => { db.templates = db.templates.filter(x => x.id !== id); }),
    upsertPeriod: (p) => {
      mutate(db => {
        const i = db.periods.findIndex(x => x.id === p.id);
        if (i >= 0) db.periods[i] = p; else db.periods.push(p);
      });
    },
    deletePeriod: (id) => {
      mutate(db => {
        db.periods = db.periods.filter(x => x.id !== id);
        db.evaluations = db.evaluations.filter(x => x.periodId !== id);
      });
      if (get().periodId === id) set({ periodId: get().db?.periods[0]?.id ?? null });
    },
    startEvaluation: (periodId, employeeId) => {
      const db = get().db;
      if (!db) return null;
      const emp = db.employees.find(e => e.id === employeeId);
      const tpl = db.templates.find(t => t.id === emp?.templateId);
      if (!emp || !tpl) return null;
      const existing = db.evaluations.find(e => e.periodId === periodId && e.employeeId === employeeId);
      if (existing) return existing.id;
      const ev: Evaluation = {
        id: uid('ev'), periodId, employeeId, templateId: tpl.id,
        kpis: structuredClone(tpl.kpis), values: Object.fromEntries(tpl.kpis.map(k => [k.id, null])), note: '', updatedAt: Date.now(),
      };
      mutate(d => { d.evaluations.push(ev); });
      return ev.id;
    },
    setValue: (evalId, kpiId, v) => mutate(db => {
      const e = db.evaluations.find(x => x.id === evalId);
      if (e) { e.values[kpiId] = v; e.updatedAt = Date.now(); }
    }),
    updateEvalKpi: (evalId, kpi) => mutate(db => {
      const e = db.evaluations.find(x => x.id === evalId);
      if (!e) return;
      const i = e.kpis.findIndex(k => k.id === kpi.id);
      if (i >= 0) e.kpis[i] = kpi;
      e.updatedAt = Date.now();
    }),
    syncEvalWithTemplate: (evalId) => mutate(db => {
      const e = db.evaluations.find(x => x.id === evalId);
      if (!e) return;
      const emp = db.employees.find(p => p.id === e.employeeId);
      const tpl = db.templates.find(t => t.id === (emp?.templateId ?? e.templateId));
      if (!tpl) return;
      const old = e.kpis;
      const values: Record<string, number | null> = {};
      for (const k of tpl.kpis) {
        const match = old.find(o => o.id === k.id) ?? old.find(o => o.name.trim() === k.name.trim());
        values[k.id] = match ? e.values[match.id] ?? null : null;
      }
      e.kpis = structuredClone(tpl.kpis);
      e.values = values;
      e.templateId = tpl.id;
      e.updatedAt = Date.now();
    }),
    deleteEvaluation: (id) => mutate(db => { db.evaluations = db.evaluations.filter(x => x.id !== id); }),
    updateSettings: (fn) => mutate(db => fn(db.settings)),

    linkFile: async (createNew) => {
      const w = window as any;
      if (!w.showSaveFilePicker) { get().notify('این مرورگر از اتصال فایل پشتیبانی نمی‌کند؛ از Chrome یا Edge استفاده کنید.', 'err'); return; }
      try {
        let h: any;
        if (createNew) {
          h = await w.showSaveFilePicker({ suggestedName: 'arzyabi-database.json', types: [{ description: 'پایگاه داده سامانه ارزیابی', accept: { 'application/json': ['.json'] } }] });
        } else {
          [h] = await w.showOpenFilePicker({ types: [{ description: 'پایگاه داده سامانه ارزیابی', accept: { 'application/json': ['.json'] } }] });
          const file = await h.getFile();
          const txt = await file.text();
          if (txt.trim()) {
            const parsed = JSON.parse(txt);
            if (parsed?.settings && parsed?.templates) {
              const m = migrate(parsed);
              set({ db: m, periodId: m.periods[0]?.id ?? null });
            }
          }
          const perm = await h.requestPermission?.({ mode: 'readwrite' });
          if (perm && perm !== 'granted') throw new Error('perm');
        }
        fileHandle = h;
        await idbSet(FILE_KEY, h);
        set({ fileName: h.name, fileNeedsPermission: false });
        persist();
        get().notify(`فایل «${h.name}» متصل شد؛ هر تغییر خودکار در آن ذخیره می‌شود.`);
      } catch (e: any) {
        if (e?.name !== 'AbortError') get().notify('اتصال فایل انجام نشد.', 'err');
      }
    },
    reconnectFile: async () => {
      if (!fileHandle) return;
      try {
        const perm = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          set({ fileNeedsPermission: false });
          const txt = await (await fileHandle.getFile()).text();
          if (txt.trim()) {
            const parsed = JSON.parse(txt);
            if (parsed?.settings) { const m = migrate(parsed); set({ db: m }); }
          }
          get().notify('اتصال فایل برقرار شد.');
        }
      } catch { get().notify('دسترسی به فایل داده نشد.', 'err'); }
    },
    unlinkFile: async () => {
      fileHandle = null;
      await idbDel(FILE_KEY);
      set({ fileName: null, fileNeedsPermission: false });
    },
  };
});

export const newKpi = (groupId: string, typeId: string, behaviorId: string): KPI => ({
  id: uid('k'), name: 'شاخص جدید', groupId, typeId, period: 'ماهانه', min: 0, max: 100, unit: 'درصد', weight: 10,
  behaviorId, bonusMode: 'fullFixed', bonusPct: null, scoreCap: null, tiers: [], stepSize: 0, stepPoints: 0,
  definition: '', mechanism: '', source: '',
});
