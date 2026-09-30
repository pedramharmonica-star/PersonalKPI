import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { DB, Employee, Evaluation, KPI, Period, Template, Unit } from './types';
import { buildSeed, uid, defaultSettings, defaultDims } from './seed';

const KEY = 'arzyabi-db-v1';
const FILE_KEY = 'arzyabi-file-handle';
const UI_KEY = 'arzyabi-ui';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type Session = 'entry' | 'viewer' | 'admin';
export type Scene = 'orbit' | 'galaxy' | 'frost';

/** Non-cryptographic hash (the app runs fully client-side; this only hides the password from plain view). */
export function hashPass(s: string) {
  let h1 = 0xdeadbeef ^ 7, h2 = 0x41c6ce57 ^ 7;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const DEFAULT_PASS = 'aA123456';

interface Store {
  db: DB | null; ready: boolean; save: SaveState; lastSaved: number;
  fileName: string | null; fileNeedsPermission: boolean;
  periodId: string | null; unitId: string | null;
  toast: { id: number; text: string; tone: 'ok' | 'err' } | null;
  session: Session; readonly: boolean; scene: Scene; calm: boolean;

  init: () => Promise<void>;
  setPeriod: (id: string | null) => void;
  setUnit: (id: string | null) => void;
  setScene: (s: Scene) => void;
  setCalm: (v: boolean) => void;
  notify: (text: string, tone?: 'ok' | 'err') => void;
  mutate: (fn: (db: DB) => void) => void;
  replaceDB: (db: DB) => void;
  resetToSeed: () => void;

  enterViewer: () => void;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
  setCredentials: (user: string, pass: string) => void;

  updateUnit: (unitId: string, fn: (u: Unit) => void) => void;
  addUnit: (name: string, fromUnitId: string | null, copyPeople: boolean) => string;
  deleteUnit: (unitId: string) => void;

  upsertEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  upsertTemplate: (unitId: string, t: Template) => void;
  deleteTemplate: (unitId: string, id: string) => void;
  upsertPeriod: (p: Period) => void;
  deletePeriod: (id: string) => void;
  startEvaluation: (periodId: string, employeeId: string) => string | null;
  setValue: (evalId: string, kpiId: string, v: number | null) => void;
  updateEval: (evalId: string, fn: (e: Evaluation) => void) => void;
  updateEvalKpi: (evalId: string, kpi: KPI) => void;
  syncEvalWithTemplate: (evalId: string) => void;
  deleteEvaluation: (id: string) => void;

  linkFile: (create: boolean) => Promise<void>;
  reconnectFile: () => Promise<void>;
  unlinkFile: () => Promise<void>;
}

let timer: number | undefined;
let fileHandle: any = null;

const fillEval = (e: any): Evaluation => ({ exams: [], competency: null, org: {}, note: '', ...e });

/** Accepts v1 (single-unit) or v2 data and returns a complete v2 DB */
export function migrate(raw: any): DB {
  const seed = buildSeed();
  if (raw && raw.version >= 2 && Array.isArray(raw.units)) {
    return {
      version: 2,
      units: raw.units.map((u: any) => ({ description: '', color: '#F26122', createdAt: 0, ...u, settings: { ...defaultSettings(), ...u.settings }, dims: { ...defaultDims(), ...(u.dims ?? {}) }, templates: u.templates ?? [] })),
      employees: (raw.employees ?? []).map((e: any) => ({ ...e })),
      periods: raw.periods ?? [],
      evaluations: (raw.evaluations ?? []).map(fillEval),
      security: raw.security ?? seed.security,
      publishedAt: raw.publishedAt,
    };
  }
  if (raw && raw.settings && raw.templates) {
    // v1 → the sales unit keeps the user's own data untouched
    const sales = seed.units.find(u => u.id === 'u_sales')!;
    const settings = { ...defaultSettings(), ...raw.settings };
    const oldColors: Record<string, string> = { '#178C8C': '#EEC56A', '#2F5D8A': '#7FA3C0' };
    settings.groups = settings.groups.map((g: any) => ({ ...g, color: oldColors[g.color] ?? g.color }));
    const unit: Unit = { ...sales, settings, templates: raw.templates };
    return {
      version: 2,
      units: [unit, ...seed.units.filter(u => u.id !== 'u_sales')],
      employees: (raw.employees ?? []).map((e: any) => ({ ...e, unitId: 'u_sales' })),
      periods: raw.periods ?? [],
      evaluations: (raw.evaluations ?? []).map(fillEval),
      security: seed.security,
    };
  }
  return seed;
}

function readUi() { try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch { return {}; } }
function writeUi(p: any) { try { localStorage.setItem(UI_KEY, JSON.stringify({ ...readUi(), ...p })); } catch { /* ignore */ } }

export const useStore = create<Store>((set, get) => {
  const persist = () => {
    if (get().readonly) return;
    set({ save: 'saving' });
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const db = get().db;
      if (!db) return;
      try {
        await idbSet(KEY, db);
        if (fileHandle && !get().fileNeedsPermission) {
          try { const w = await fileHandle.createWritable(); await w.write(JSON.stringify(db)); await w.close(); }
          catch { set({ fileNeedsPermission: true }); }
        }
        set({ save: 'saved', lastSaved: Date.now() });
      } catch { set({ save: 'error' }); }
    }, 350);
  };

  const mutate = (fn: (db: DB) => void) => {
    const cur = get().db;
    if (!cur || get().readonly) return;
    const next = structuredClone(cur);
    fn(next);
    set({ db: next });
    persist();
  };

  const ui = readUi();
  const prefersCalm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return {
    db: null, ready: false, save: 'idle', lastSaved: 0, fileName: null, fileNeedsPermission: false,
    periodId: null, unitId: null, toast: null, session: 'entry', readonly: false,
    scene: ui.scene ?? 'orbit', calm: ui.calm ?? !!prefersCalm,

    init: async () => {
      // 1) a published snapshot carries its data inside the HTML file → read-only viewer
      const emb = document.getElementById('embedded-db')?.textContent?.trim();
      if (emb) {
        try {
          const db = migrate(JSON.parse(emb));
          const latest = [...db.periods].sort((a, b) => b.createdAt - a.createdAt)[0];
          set({ db, ready: true, readonly: true, periodId: latest?.id ?? null, unitId: db.units[0]?.id ?? null });
          return;
        } catch { /* fall through */ }
      }
      let raw: any = null;
      try { raw = await idbGet(KEY); } catch { /* storage blocked */ }
      const db = migrate(raw);
      try {
        fileHandle = await idbGet(FILE_KEY);
        if (fileHandle) {
          const perm = await fileHandle.queryPermission?.({ mode: 'readwrite' });
          set({ fileName: fileHandle.name, fileNeedsPermission: perm !== 'granted' });
        }
      } catch { fileHandle = null; }
      const latest = [...db.periods].sort((a, b) => b.createdAt - a.createdAt)[0];
      const s = sessionStorage.getItem('arzyabi-session') as Session | null;
      set({ db, ready: true, periodId: latest?.id ?? null, unitId: db.units[0]?.id ?? null, session: s ?? 'entry' });
      if (!raw || raw.version !== 2) persist();
    },

    setPeriod: (id) => set({ periodId: id }),
    setUnit: (id) => set({ unitId: id }),
    setScene: (scene) => { set({ scene }); writeUi({ scene }); },
    setCalm: (calm) => { set({ calm }); writeUi({ calm }); },
    notify: (text, tone = 'ok') => set({ toast: { id: Date.now(), text, tone } }),
    mutate,
    replaceDB: (db) => { const m = migrate(db); set({ db: m, periodId: m.periods[0]?.id ?? null, unitId: m.units[0]?.id ?? null }); persist(); },
    resetToSeed: () => { const db = buildSeed(); set({ db, periodId: db.periods[0]?.id ?? null, unitId: db.units[0]?.id ?? null }); persist(); },

    enterViewer: () => { set({ session: 'viewer' }); try { sessionStorage.setItem('arzyabi-session', 'viewer'); } catch { /* */ } },
    login: (user, pass) => {
      const sec = get().db?.security;
      if (!sec || get().readonly) return false;
      const ok = user.trim() === sec.user && (sec.passHash ? hashPass(pass) === sec.passHash : pass === DEFAULT_PASS);
      if (ok) { set({ session: 'admin' }); try { sessionStorage.setItem('arzyabi-session', 'admin'); } catch { /* */ } }
      return ok;
    },
    logout: () => { set({ session: 'entry' }); try { sessionStorage.removeItem('arzyabi-session'); } catch { /* */ } },
    setCredentials: (user, pass) => mutate(db => { db.security = { user: user.trim() || 'admin', passHash: hashPass(pass) }; }),

    updateUnit: (unitId, fn) => mutate(db => { const u = db.units.find(x => x.id === unitId); if (u) fn(u); }),
    addUnit: (name, fromUnitId, copyPeople) => {
      const id = uid('u');
      mutate(db => {
        const src = db.units.find(u => u.id === fromUnitId);
        const idMap = new Map<string, string>();
        const unit: Unit = src
          ? { ...structuredClone(src), id, name, createdAt: Date.now(), templates: src.templates.map(t => { const nid = uid('tpl'); idMap.set(t.id, nid); return { ...structuredClone(t), id: nid }; }) }
          : { id, name, color: '#F26122', description: '', settings: defaultSettings(), templates: [], dims: defaultDims(), createdAt: Date.now() };
        db.units.push(unit);
        if (src && copyPeople) {
          for (const e of db.employees.filter(x => x.unitId === src.id)) db.employees.push({ ...structuredClone(e), id: uid('e'), unitId: id, templateId: idMap.get(e.templateId) ?? e.templateId });
        }
      });
      return id;
    },
    deleteUnit: (unitId) => {
      mutate(db => {
        const ids = new Set(db.employees.filter(e => e.unitId === unitId).map(e => e.id));
        db.units = db.units.filter(u => u.id !== unitId);
        db.employees = db.employees.filter(e => e.unitId !== unitId);
        db.evaluations = db.evaluations.filter(e => !ids.has(e.employeeId));
      });
      if (get().unitId === unitId) set({ unitId: get().db?.units[0]?.id ?? null });
    },

    upsertEmployee: (e) => mutate(db => { const i = db.employees.findIndex(x => x.id === e.id); if (i >= 0) db.employees[i] = e; else db.employees.push(e); }),
    deleteEmployee: (id) => mutate(db => { db.employees = db.employees.filter(x => x.id !== id); db.evaluations = db.evaluations.filter(x => x.employeeId !== id); }),
    upsertTemplate: (unitId, t) => mutate(db => {
      const u = db.units.find(x => x.id === unitId); if (!u) return;
      const i = u.templates.findIndex(x => x.id === t.id); if (i >= 0) u.templates[i] = t; else u.templates.push(t);
    }),
    deleteTemplate: (unitId, id) => mutate(db => { const u = db.units.find(x => x.id === unitId); if (u) u.templates = u.templates.filter(x => x.id !== id); }),
    upsertPeriod: (p) => mutate(db => { const i = db.periods.findIndex(x => x.id === p.id); if (i >= 0) db.periods[i] = p; else db.periods.push(p); }),
    deletePeriod: (id) => {
      mutate(db => { db.periods = db.periods.filter(x => x.id !== id); db.evaluations = db.evaluations.filter(x => x.periodId !== id); });
      if (get().periodId === id) set({ periodId: get().db?.periods[0]?.id ?? null });
    },
    startEvaluation: (periodId, employeeId) => {
      const db = get().db;
      if (!db) return null;
      const emp = db.employees.find(e => e.id === employeeId);
      const unit = db.units.find(u => u.id === emp?.unitId);
      const tpl = unit?.templates.find(t => t.id === emp?.templateId);
      if (!emp || !tpl) return null;
      const existing = db.evaluations.find(e => e.periodId === periodId && e.employeeId === employeeId);
      if (existing) return existing.id;
      const ev: Evaluation = {
        id: uid('ev'), periodId, employeeId, templateId: tpl.id, kpis: structuredClone(tpl.kpis),
        values: Object.fromEntries(tpl.kpis.map(k => [k.id, null])), exams: [], competency: null, org: {}, note: '', updatedAt: Date.now(),
      };
      mutate(d => { d.evaluations.push(ev); });
      return ev.id;
    },
    setValue: (evalId, kpiId, v) => mutate(db => { const e = db.evaluations.find(x => x.id === evalId); if (e) { e.values[kpiId] = v; e.updatedAt = Date.now(); } }),
    updateEval: (evalId, fn) => mutate(db => { const e = db.evaluations.find(x => x.id === evalId); if (e) { fn(e); e.updatedAt = Date.now(); } }),
    updateEvalKpi: (evalId, kpi) => mutate(db => {
      const e = db.evaluations.find(x => x.id === evalId); if (!e) return;
      const i = e.kpis.findIndex(k => k.id === kpi.id); if (i >= 0) e.kpis[i] = kpi; e.updatedAt = Date.now();
    }),
    syncEvalWithTemplate: (evalId) => mutate(db => {
      const e = db.evaluations.find(x => x.id === evalId); if (!e) return;
      const emp = db.employees.find(p => p.id === e.employeeId);
      const unit = db.units.find(u => u.id === emp?.unitId);
      const tpl = unit?.templates.find(t => t.id === (emp?.templateId ?? e.templateId));
      if (!tpl) return;
      const old = e.kpis; const values: Record<string, number | null> = {};
      for (const k of tpl.kpis) { const m = old.find(o => o.id === k.id) ?? old.find(o => o.name.trim() === k.name.trim()); values[k.id] = m ? e.values[m.id] ?? null : null; }
      e.kpis = structuredClone(tpl.kpis); e.values = values; e.templateId = tpl.id; e.updatedAt = Date.now();
    }),
    deleteEvaluation: (id) => mutate(db => { db.evaluations = db.evaluations.filter(x => x.id !== id); }),

    linkFile: async (createNew) => {
      const w = window as any;
      if (!w.showSaveFilePicker) { get().notify('این مرورگر از اتصال فایل پشتیبانی نمی‌کند؛ از Chrome یا Edge استفاده کنید.', 'err'); return; }
      try {
        let h: any;
        if (createNew) {
          h = await w.showSaveFilePicker({ suggestedName: 'arzyabi-database.json', types: [{ description: 'پایگاه داده سامانه ارزیابی', accept: { 'application/json': ['.json'] } }] });
        } else {
          [h] = await w.showOpenFilePicker({ types: [{ description: 'پایگاه داده سامانه ارزیابی', accept: { 'application/json': ['.json'] } }] });
          const txt = await (await h.getFile()).text();
          if (txt.trim()) { const m = migrate(JSON.parse(txt)); set({ db: m, periodId: m.periods[0]?.id ?? null, unitId: m.units[0]?.id ?? null }); }
          const perm = await h.requestPermission?.({ mode: 'readwrite' });
          if (perm && perm !== 'granted') throw new Error('perm');
        }
        fileHandle = h; await idbSet(FILE_KEY, h);
        set({ fileName: h.name, fileNeedsPermission: false }); persist();
        get().notify(`فایل «${h.name}» متصل شد؛ هر تغییر خودکار در آن ذخیره می‌شود.`);
      } catch (e: any) { if (e?.name !== 'AbortError') get().notify('اتصال فایل انجام نشد.', 'err'); }
    },
    reconnectFile: async () => {
      if (!fileHandle) return;
      try {
        const perm = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          set({ fileNeedsPermission: false });
          const txt = await (await fileHandle.getFile()).text();
          if (txt.trim()) set({ db: migrate(JSON.parse(txt)) });
          get().notify('اتصال فایل برقرار شد.');
        }
      } catch { get().notify('دسترسی به فایل داده نشد.', 'err'); }
    },
    unlinkFile: async () => { fileHandle = null; await idbDel(FILE_KEY); set({ fileName: null, fileNeedsPermission: false }); },
  };
});

export const newKpi = (groupId: string, typeId: string, behaviorId: string): KPI => ({
  id: uid('k'), name: 'شاخص جدید', groupId, typeId, period: 'ماهانه', min: 0, max: 100, unit: 'درصد', weight: 10,
  behaviorId, bonusMode: 'fullFixed', bonusPct: null, scoreCap: null, tiers: [], stepSize: 0, stepPoints: 0,
  definition: '', mechanism: '', source: '',
});
