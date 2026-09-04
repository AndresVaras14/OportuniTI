'use client';

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Binary,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Cloud,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  MapPin,
  Network,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { southRegions, type Opportunity, type OpportunitySource } from './opportunities';
import { categories as topicCategories, classify, isOpenOpportunity, normalize, safeUrl } from '../lib/opportunity-rules.mjs';

type ExplorerProps = {
  opportunities: Opportunity[];
  sources: OpportunitySource[];
  lastUpdated: string;
  dataMode: 'live' | 'verified';
};

const dateFormat = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Santiago',
});

function remainingDays(deadline?: string) {
  if (!deadline) return Infinity;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
}

function deadlineLabel(deadline?: string) {
  if (!deadline) return 'Abierto · sin cierre publicado';
  const days = remainingDays(deadline);
  if (days === 0) return 'Cierra hoy';
  if (days === 1) return 'Cierra mañana';
  return `Quedan ${days} días`;
}

function compactDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'No publicado';
  return dateFormat.format(new Date(value)).replace('.', '');
}

function money(item: Opportunity) {
  if (item.budgetText) return item.budgetText;
  if (!item.budget) return 'Revisar bases';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: item.currency, maximumFractionDigits: 0,
  }).format(item.budget);
}

function sourceStatus(source: OpportunitySource) {
  if (source.status === 'online') return `${source.count} detectadas`;
  if (source.status === 'empty') return 'Sin coincidencias TI';
  if (source.status === 'portal') return 'Consulta directa';
  return 'Reintento próximo';
}

export function OpportunityExplorer({ opportunities: rawOpportunities, sources, lastUpdated, dataMode }: ExplorerProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const opportunities = useMemo(() => rawOpportunities.map(item => ({...item, category: item.checkedAt ? item.category : classify(item.title, item.description)})).filter(item => isOpenOpportunity(item, now)), [rawOpportunities, now]);
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('all');
  const [category, setCategory] = useState('all');
  const [source, setSource] = useState('all');
  const [closing, setClosing] = useState('all');
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const categories = topicCategories;
  const regions = useMemo(() => Array.from(new Set(opportunities.map((item) => item.region))).sort(), [opportunities]);
  const activeSourceNames = useMemo(() => Array.from(new Set(opportunities.map((item) => item.sourceName || 'Mercado Público'))).sort(), [opportunities]);

  const results = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return opportunities.filter((item) => {
      const sourceName = item.sourceName || 'Mercado Público';
      const text = normalize(`${item.title} ${item.description} ${item.requirements.join(' ')} ${item.skills?.join(' ') || ''} ${item.category} ${item.buyer} ${item.city} ${item.region} ${item.id} ${sourceName}`);
      const days = remainingDays(item.deadline);
      return (!normalizedQuery || text.includes(normalizedQuery))
        && (zone === 'all' || (zone === 'sur' ? southRegions.includes(item.region) : item.region === zone))
        && (category === 'all' || item.category === category)
        && (source === 'all' || sourceName === source)
        && (closing === 'all' || (closing === 'undated' ? !item.deadline : days <= Number(closing)));
    }).sort((a, b) => (Date.parse(a.deadline || '') || Infinity) - (Date.parse(b.deadline || '') || Infinity));
  }, [category, closing, opportunities, query, source, zone]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="neon-grid pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,.2),transparent_25%),radial-gradient(circle_at_86%_20%,rgba(124,58,237,.18),transparent_28%),radial-gradient(circle_at_48%_82%,rgba(37,99,235,.12),transparent_30%)]" />
      <TechBackground />

      <header className="relative z-20 border-b border-cyan-300/10 bg-[#020617]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#oportunidades" className="group flex items-center gap-3" aria-label="Ir a oportunidades">
            <span className="neon-orb grid size-11 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 transition group-hover:-rotate-6">
              <Radar className="size-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-[-0.04em] text-white">Oportuni<span className="text-cyan-300">TI</span></p>
              <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-sky-200/55">Radar de proyectos Chile</p>
            </div>
          </a>
          <div className="flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-400/5 px-3 py-2 text-xs font-medium text-sky-100/80">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-300" />
            </span>
            <span className="hidden sm:inline">Proyectos y licitaciones en Chile</span><span className="sm:hidden">Chile</span>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1480px] px-5 pb-10 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pb-16 lg:pt-24">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-violet-200 shadow-[0_0_28px_rgba(139,92,246,.15)]">
              <Sparkles className="size-3.5" /> Todo Chile · foco Santiago al sur
            </div>
            <h1 className="max-w-5xl text-balance text-[clamp(2.9rem,7vw,6.8rem)] font-black leading-[.9] tracking-[-0.07em] text-white">
              Proyectos TI reales,
              <span className="neon-text block bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">en un solo radar.</span>
            </h1>
          </div>
          <div className="rounded-3xl border border-sky-300/15 bg-slate-950/55 p-6 shadow-[0_0_45px_rgba(14,165,233,.08)] backdrop-blur-xl lg:mb-1">
            <p className="text-balance text-base leading-relaxed text-slate-300">
              Licitaciones y proyectos para empresas o equipos que buscan desarrollar soluciones, no ofertas de empleo.
            </p>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-cyan-200/70">
              <ShieldCheck className="size-4" /> Datos vigentes y enlace directo a la fuente
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1480px] px-5 pb-7 sm:px-8 lg:px-12">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-200/50">Fuentes monitoreadas</p>
          <p className="text-[10px] text-slate-500">Los portales directos no se cuentan como resultados automáticos</p>
        </div>
        <div className="source-rail flex gap-3 overflow-x-auto pb-3">
          {sources.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group min-w-[220px] flex-1 rounded-2xl border border-sky-300/10 bg-slate-950/45 p-4 backdrop-blur transition hover:border-cyan-300/35 hover:bg-sky-400/10">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-100">{item.name}</span>
                <ExternalLink className="size-3.5 text-slate-500 transition group-hover:text-cyan-300" />
              </div>
              <p className={`mt-2 text-xs font-semibold ${item.status === 'error' ? 'text-rose-300' : item.status === 'portal' ? 'text-violet-300' : 'text-cyan-300'}`}>{sourceStatus(item)}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>
            </a>
          ))}
        </div>
      </section>

      <section id="oportunidades" className="relative z-10 mx-auto max-w-[1480px] px-5 pb-20 sm:px-8 lg:px-12">
        <div className="rounded-[28px] border border-sky-300/15 bg-[#071126]/80 p-3 shadow-[0_24px_90px_rgba(2,132,199,.12)] backdrop-blur-xl sm:p-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.45fr)_1fr_1fr_1fr_.8fr]">
            <label htmlFor="opportunity-search" className="relative block">
              <span className="sr-only">Buscar oportunidades</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-cyan-300/60" />
              <Input id="opportunity-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Proyecto, entidad, región o ID…" className="h-13 rounded-2xl border border-sky-300/10 bg-[#030b1c] pl-11 text-sm text-white shadow-none placeholder:text-slate-600 focus-visible:border-cyan-300/40 focus-visible:ring-2 focus-visible:ring-cyan-400/15" />
            </label>
            <Filter label="Zona o región" value={zone} onChange={setZone}>
              <option value="all">Todo Chile</option><option value="sur">Santiago al sur</option>
              {regions.map((item) => <option key={item} value={item}>{item}</option>)}
            </Filter>
            <Filter label="Categoría" value={category} onChange={setCategory}>
              <option value="all">Todas las áreas TI</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </Filter>
            <Filter label="Fuente" value={source} onChange={setSource}>
              <option value="all">Todas las fuentes</option>
              {activeSourceNames.map((item) => <option key={item} value={item}>{item}</option>)}
            </Filter>
            <Filter label="Plazo de cierre" value={closing} onChange={setClosing}>
              <option value="all">Cualquier cierre</option><option value="3">Próximos 3 días</option><option value="7">Próximos 7 días</option><option value="14">Próximos 14 días</option><option value="30">Próximos 30 días</option><option value="undated">Sin cierre publicado</option>
            </Filter>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-400">Desarrollo a medida, instalación, licencias y soporte se muestran como servicios distintos. Los proyectos sin fecha de cierre requieren una comprobación de apertura en las últimas 24 horas.</p>
        <div className="mb-6 mt-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300/60">Oportunidades abiertas</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-white sm:text-3xl">{results.length} proyectos para revisar</h2>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-400"><Clock3 className="size-3.5 text-cyan-300" /> Actualizado {lastUpdated} · {dataMode === 'live' ? 'lectura automática' : 'respaldo verificado'}</p>
        </div>

        {results.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((item, index) => {
              const days = remainingDays(item.deadline);
              return (
                <button type="button" key={`${item.sourceName}-${item.id}`} onClick={() => setSelected(item)} className="opportunity-card group relative flex min-h-[370px] flex-col overflow-hidden rounded-[26px] border border-sky-300/12 bg-[#071126]/92 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_20px_70px_rgba(14,165,233,.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <span className="absolute right-5 top-3 font-mono text-5xl font-bold text-sky-300/[.04]">{String(index + 1).padStart(2, '0')}</span>
                  <div className="relative flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-cyan-200">{item.category}</span>
                    <span className={`ml-auto rounded-full px-3 py-1.5 text-[10px] font-bold ${days <= 3 ? 'bg-rose-400/15 text-rose-200' : 'bg-violet-400/10 text-violet-200'}`}>{deadlineLabel(item.deadline)}</span>
                  </div>
                  <div className="relative mt-7">
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-sky-200/45"><Globe2 className="size-3.5 text-cyan-300/70" /> {item.sourceName || 'Mercado Público'} · {item.id}</div>
                    <h3 className="text-[22px] font-extrabold leading-[1.1] tracking-[-.04em] text-white">{item.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-400">{item.description}</p>
                    <p className="mt-3 text-xs font-semibold text-sky-200/70">{item.detailLevel === 'expanded' ? 'Detalle ampliado disponible' : 'Información parcial de la fuente'}</p>
                  </div>
                  <div className="relative mt-auto border-t border-sky-300/10 pt-5">
                    <p className="flex items-start gap-2 text-sm font-semibold text-slate-200"><Building2 className="mt-0.5 size-4 shrink-0 text-cyan-300" /><span className="line-clamp-1">{item.buyer}</span></p>
                    <div className="mt-3 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3.5" /> {item.city}, {item.region}</span><span className="grid size-9 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-cyan-300 transition group-hover:translate-x-1 group-hover:bg-cyan-300 group-hover:text-slate-950"><ChevronRight className="size-4" /></span></div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-sky-300/20 bg-slate-950/35 px-6 py-16 text-center"><SlidersHorizontal className="mx-auto size-7 text-cyan-300/50" /><h3 className="mt-4 text-lg font-bold text-white">No encontramos coincidencias</h3><p className="mt-1 text-sm text-slate-500">Prueba otra región, fuente, categoría o plazo.</p></div>
        )}
      </section>

      <footer className="relative z-10 border-t border-sky-300/10 bg-[#01040d]/80 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1384px] flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-sm font-bold text-white">Oportuni<span className="text-cyan-300">TI</span></p><p className="max-w-2xl text-xs leading-relaxed text-slate-500">Radar de apoyo interno. Confirma siempre fechas, anexos y condiciones en la fuente oficial antes de postular.</p></div>
      </footer>

      <OpportunityDialog selected={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="filter-select">{children}</select></label>;
}

function TechBackground() {
  const glyphs = [
    [Code2, 'left-[5%] top-[29%] rotate-12'], [Cpu, 'right-[7%] top-[33%] -rotate-12'],
    [Database, 'left-[9%] top-[72%] -rotate-6'], [Cloud, 'right-[12%] top-[68%] rotate-6'],
    [Network, 'left-[46%] top-[13%] rotate-12'], [Binary, 'right-[38%] top-[88%] -rotate-12'],
  ] as const;
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">{glyphs.map(([Icon, position], index) => <Icon key={index} className={`tech-glyph absolute ${position} size-16 text-cyan-300 sm:size-24`} />)}</div>;
}

function OpportunityDialog({ selected, onClose }: { selected: Opportunity | null; onClose: () => void }) {
  return <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && onClose()}>{selected ? (
    <DialogContent className="max-h-[92vh] overflow-y-auto border-sky-300/20 bg-[#050d20] p-0 text-slate-100 shadow-[0_0_90px_rgba(14,165,233,.2)] sm:max-w-3xl">
      <div className="relative overflow-hidden border-b border-sky-300/10 bg-[radial-gradient(circle_at_85%_10%,rgba(124,58,237,.25),transparent_35%),linear-gradient(135deg,#07152e,#030817)] px-6 pb-8 pt-9 sm:px-9">
        <div className="absolute right-8 top-7 text-cyan-300/10"><Cpu className="size-24" /></div>
        <div className="relative flex flex-wrap items-center gap-2"><span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-cyan-200">{selected.category}</span><span className="rounded-full bg-violet-400/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-violet-200">{deadlineLabel(selected.deadline)}</span></div>
        <DialogHeader className="relative mt-5 text-left"><p className="font-mono text-xs text-cyan-200/55">{selected.sourceName || 'Mercado Público'} · {selected.id}</p><DialogTitle className="text-balance text-3xl font-extrabold leading-tight tracking-[-.045em] text-white sm:text-4xl">{selected.title}</DialogTitle><DialogDescription className="line-clamp-3 text-sm leading-relaxed text-slate-400 sm:text-base">{selected.description}</DialogDescription></DialogHeader>
      </div>
      <div className="space-y-8 px-6 py-7 sm:px-9 sm:py-9">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><InfoTile icon={Building2} label="Entidad" value={selected.buyer} /><InfoTile icon={MapPin} label="Ubicación" value={`${selected.city}, ${selected.region}`} /><InfoTile icon={CalendarDays} label="Publicada" value={compactDate(selected.publishedAt)} /><InfoTile icon={Clock3} label="Cierre" value={compactDate(selected.deadline)} /><InfoTile icon={Search} label="Preguntas hasta" value={selected.questionsDeadline ? compactDate(selected.questionsDeadline) : 'Revisar calendario oficial'} /><InfoTile icon={CircleDollarSign} label="Presupuesto" value={money(selected)} /></div>
        <div className="rounded-2xl border border-violet-300/20 bg-violet-400/5 p-4 text-sm leading-relaxed text-slate-300">
          <p>{selected.detailNotice || 'Información pública disponible. Las bases pueden incluir condiciones adicionales.'}</p>
          <p className="mt-2 text-cyan-200">Última consulta a la fuente: {compactDate(selected.checkedAt)} · Horarios mostrados en Chile continental.</p>
          {selected.geographicEvidence ? <p className="mt-2 text-slate-400">{selected.geographicEvidence}</p> : null}
        </div>
        <section className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[.04] p-5 sm:p-6"><SectionTitle>Descripción del encargo</SectionTitle><p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-slate-300">{selected.description}</p></section>
        {selected.skills?.length ? <section><SectionTitle>Habilidades solicitadas</SectionTitle><div className="mt-3 flex flex-wrap gap-2">{selected.skills.map(skill => <span key={skill} className="rounded-full border border-sky-300/20 px-3 py-1 text-sm text-sky-200">{skill}</span>)}</div></section> : null}
        {selected.facts?.length ? <section><SectionTitle>Condiciones publicadas</SectionTitle><dl className="mt-4 grid gap-4 sm:grid-cols-2">{selected.facts.map((fact,index) => <div key={`${fact.label}-${index}`} className="rounded-xl bg-sky-400/5 p-4"><dt className="text-sm font-semibold text-cyan-200">{fact.label}</dt><dd className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-300">{fact.value}</dd></div>)}</dl></section> : null}
        {selected.milestones?.length ? <section><SectionTitle>Calendario del proceso</SectionTitle><dl className="mt-4 grid gap-3 sm:grid-cols-2">{selected.milestones.map(entry => <div key={entry.label}><dt className="text-sm text-slate-400">{entry.label}</dt><dd className="text-sm font-semibold text-sky-100">{compactDate(entry.date)}</dd></div>)}</dl></section> : null}
        <div className="grid gap-8 md:grid-cols-2">
          <section><SectionTitle>Alcance e ítems solicitados</SectionTitle>{selected.requirements.length ? <ul className="mt-4 space-y-3">{selected.requirements.map((requirement,index) => <li key={`${index}-${requirement}`} className="flex gap-3 break-words text-sm leading-relaxed text-slate-400"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-cyan-300"><Check className="size-3" /></span>{requirement}</li>)}</ul> : <p className="mt-4 text-sm leading-relaxed text-slate-400">La fuente no entrega una lista de ítems separada. Revisa el alcance y los entregables en la descripción completa de arriba.</p>}</section>
          <section><SectionTitle>Cómo postular</SectionTitle><ol className="mt-4 space-y-3">{(selected.applicationSteps || [`Abre la fuente oficial y busca el ID ${selected.id}.`, 'Descarga y revisa las bases.', 'Prepara antecedentes técnicos y económicos.', 'Envía la oferta antes del cierre.']).map((step, index) => <li key={step} className="flex gap-3 text-sm leading-relaxed text-slate-400"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-violet-400/15 text-[10px] font-bold text-violet-200">{index + 1}</span>{step}</li>)}</ol></section>
        </div>
        {selected.contacts?.length ? <section><SectionTitle>Responsables publicados</SectionTitle><div className="mt-4 grid gap-3 sm:grid-cols-2">{selected.contacts.map((contact,index) => <div key={`${contact.role}-${index}`} className="rounded-xl border border-sky-300/15 p-4 text-sm"><p className="font-semibold text-cyan-200">{contact.role}</p><p className="mt-2 text-slate-200">{contact.name || 'Nombre no publicado'}</p>{contact.email ? <a className="mt-1 block break-all text-sky-300 underline" href={`mailto:${contact.email}`}>{contact.email}</a> : null}{contact.phone ? <p className="mt-1 text-slate-300">{contact.phone}</p> : null}</div>)}</div><p className="mt-3 text-sm text-slate-400">Un responsable administrativo no siempre recibe ofertas directamente; utiliza el canal de postulación del proceso.</p></section> : null}
        {selected.documentLinks?.length ? <section><SectionTitle>Documentos y enlaces del aviso</SectionTitle><ul className="mt-3 space-y-3">{selected.documentLinks.filter(document => safeUrl(document.url)).map((document,index) => <li key={`${document.url}-${index}`}><a className="inline-flex gap-2 text-sm text-cyan-200 underline" href={safeUrl(document.url)} target="_blank" rel="noreferrer"><FileText className="size-4 shrink-0" />{document.title}</a></li>)}</ul></section> : null}
        {!selected.documents.length && !selected.documentLinks?.length ? <p className="text-sm text-slate-400">No hay archivos adjuntos públicos disponibles en la respuesta de esta fuente.</p> : null}
        <section className="rounded-2xl border border-sky-300/12 bg-[#08152c] p-5"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-cyan-300/60">Canal de contacto</p><p className="mt-2 text-sm leading-relaxed text-slate-300">{selected.contactChannel}</p>{selected.contactName || selected.contactEmail || selected.contactPhone ? <div className="mt-3 space-y-1 text-xs text-slate-400">{selected.contactName ? <p>{selected.contactName}</p> : null}{selected.contactEmail ? <a className="block font-semibold text-cyan-300 underline-offset-4 hover:underline" href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a> : null}{selected.contactPhone ? <p>{selected.contactPhone}</p> : null}</div> : null}</div><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-cyan-300/60">Documentos clave</p><ul className="mt-2 space-y-1.5">{selected.documents.map((document) => <li key={document} className="flex items-center gap-2 text-sm text-slate-400"><FileText className="size-3.5 shrink-0 text-violet-300" />{document}</li>)}</ul></div></div></section>
        {selected.questionsDeadline ? <p className="flex items-start gap-2 rounded-xl border border-violet-300/15 bg-violet-400/10 px-4 py-3 text-xs leading-relaxed text-violet-100"><Clock3 className="mt-0.5 size-4 shrink-0" />Fecha publicada para preguntas: {compactDate(selected.questionsDeadline)}. Confirma cambios en el portal.</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-sky-300/10 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Modalidad: {selected.modality}</p><a className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 text-sm font-bold text-[#03101f] shadow-[0_0_30px_rgba(103,232,249,.25)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" href={selected.applicationUrl ?? selected.sourceUrl} target="_blank" rel="noreferrer">Ver y postular en fuente oficial <ArrowUpRight className="size-4" /></a></div>
      </div>
    </DialogContent>
  ) : null}</Dialog>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-bold tracking-[-.03em] text-white">{children}</h3>;
}

function InfoTile({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="rounded-2xl border border-sky-300/10 bg-[#07142a] p-4"><Icon className="size-4 text-cyan-300" /><p className="mt-3 text-[9px] font-bold uppercase tracking-[.14em] text-sky-200/45">{label}</p><p className="mt-1 text-sm font-semibold leading-snug text-slate-200">{value}</p></div>;
}
