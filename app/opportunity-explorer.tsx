'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  MapPin,
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
import type { Opportunity } from './opportunities';
import { southRegions } from './opportunities';

type ExplorerProps = {
  opportunities: Opportunity[];
  lastUpdated: string;
  dataMode: 'live' | 'verified';
};

const TODAY = new Date();

const dateFormat = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const moneyFormat = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function remainingDays(deadline: string) {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - TODAY.getTime()) / 86_400_000));
}

function deadlineLabel(deadline: string) {
  const days = remainingDays(deadline);
  if (days === 0) return 'Cierra hoy';
  if (days === 1) return 'Cierra mañana';
  return `Quedan ${days} días`;
}

function compactDate(value: string) {
  return dateFormat.format(new Date(value)).replace('.', '');
}

export function OpportunityExplorer({ opportunities, lastUpdated, dataMode }: ExplorerProps) {
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState('sur');
  const [category, setCategory] = useState('all');
  const [closing, setClosing] = useState('all');
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(opportunities.map((item) => item.category))).sort(),
    [opportunities],
  );

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es-CL');

    return opportunities
      .filter((item) => {
        const text = `${item.title} ${item.buyer} ${item.city} ${item.region} ${item.id}`.toLocaleLowerCase(
          'es-CL',
        );
        const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
        const matchesZone =
          zone === 'all' || (zone === 'sur' ? southRegions.includes(item.region) : item.region === zone);
        const matchesCategory = category === 'all' || item.category === category;
        const days = remainingDays(item.deadline);
        const matchesClosing = closing === 'all' || days <= Number(closing);
        const isActive = new Date(item.deadline).getTime() > TODAY.getTime();
        return matchesQuery && matchesZone && matchesCategory && matchesClosing && isActive;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [category, closing, opportunities, query, zone]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(49,147,102,.13),transparent_28%),radial-gradient(circle_at_92%_13%,rgba(238,183,94,.13),transparent_24%)]" />

      <header className="relative border-b border-emerald-950/8 bg-[#f7f3e9]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#oportunidades" className="group flex items-center gap-3" aria-label="Ir a oportunidades">
            <span className="grid size-10 place-items-center rounded-full bg-emerald-950 text-[#d7f4df] shadow-sm transition-transform group-hover:-rotate-6">
              <Radar className="size-5" />
            </span>
            <div>
              <p className="text-[17px] font-bold tracking-[-0.04em] text-emerald-950">OportuniTI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/60">
                Radar de proyectos
              </p>
            </div>
          </a>
          <div className="flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-2 text-xs font-medium text-emerald-950 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            <span className="hidden sm:inline">Información vigente</span>
            <span className="sm:hidden">Vigente</span>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pb-12 lg:pt-20">
        <div className="grid items-end gap-9 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-[#eef4e9] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-900">
              <Sparkles className="size-3.5" />
              Santiago al sur · Todo Chile disponible
            </div>
            <h1 className="max-w-4xl text-balance text-[clamp(2.7rem,7vw,6.5rem)] font-black leading-[.88] tracking-[-0.07em] text-emerald-950">
              Proyectos TI,
              <span className="block font-serif font-medium italic tracking-[-0.055em] text-emerald-700">
                antes que se cierren.
              </span>
            </h1>
          </div>
          <div className="border-l-2 border-amber-400 pl-5 lg:mb-2">
            <p className="text-balance text-base leading-relaxed text-emerald-950/72">
              Un radar simple para encontrar licitaciones y proyectos reales, revisar sus requisitos y
              llegar directo al canal oficial de postulación.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-800/60">
              <ShieldCheck className="size-4" />
              Fuente oficial · ChileCompra / Mercado Público
            </p>
          </div>
        </div>
      </section>

      <section id="oportunidades" className="relative mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12">
        <div className="rounded-[28px] border border-emerald-950/10 bg-white/72 p-3 shadow-[0_28px_80px_rgba(25,70,50,.08)] backdrop-blur sm:p-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(260px,1.5fr)_1fr_1fr_.8fr]">
            <label htmlFor="opportunity-search" className="relative block">
              <span className="sr-only">Buscar oportunidades</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-emerald-900/45" />
              <Input
                id="opportunity-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar proyecto, entidad o ID…"
                className="h-13 rounded-2xl border-0 bg-[#f5f2e9] pl-11 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-emerald-700/25"
              />
            </label>
            <label>
              <span className="sr-only">Zona o región</span>
              <select value={zone} onChange={(event) => setZone(event.target.value)} className="filter-select">
                <option value="sur">Santiago al sur</option>
                <option value="all">Todo Chile</option>
                {Array.from(new Set(opportunities.map((item) => item.region)))
                  .sort()
                  .map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Categoría</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="filter-select"
              >
                <option value="all">Todas las áreas TI</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Plazo de cierre</span>
              <select
                value={closing}
                onChange={(event) => setClosing(event.target.value)}
                className="filter-select"
              >
                <option value="all">Cualquier cierre</option>
                <option value="3">Próximos 3 días</option>
                <option value="7">Próximos 7 días</option>
                <option value="14">Próximos 14 días</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mb-5 mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800/55">Oportunidades abiertas</p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-emerald-950 sm:text-3xl">
              {results.length} proyectos para revisar
            </h2>
          </div>
          <p className="flex items-center gap-2 text-xs text-emerald-900/55">
            <Clock3 className="size-3.5" />
            Actualizado {lastUpdated} · {dataMode === 'live' ? 'conexión en vivo' : 'datos verificados'}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((item, index) => {
              const days = remainingDays(item.deadline);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="opportunity-card group relative flex min-h-[350px] flex-col overflow-hidden rounded-[26px] border border-emerald-950/10 bg-[#fffdf7] p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-emerald-800/25 hover:shadow-[0_25px_60px_rgba(21,76,52,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <span className="absolute right-5 top-4 font-serif text-5xl italic text-emerald-900/[.055]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="rounded-full bg-emerald-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#e8f5e9]">
                      {item.category}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                        days <= 3 ? 'bg-[#ffe1bc] text-[#934700]' : 'bg-[#e8f2e6] text-emerald-800'
                      }`}
                    >
                      {deadlineLabel(item.deadline)}
                    </span>
                  </div>

                  <div className="relative mt-7">
                    <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-emerald-800/55">
                      {item.id}
                    </p>
                    <h3 className="text-[22px] font-bold leading-[1.08] tracking-[-0.045em] text-emerald-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-emerald-950/58">{item.description}</p>
                  </div>

                  <div className="relative mt-auto border-t border-emerald-950/8 pt-5">
                    <p className="flex items-start gap-2 text-sm font-semibold text-emerald-950/78">
                      <Building2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                      <span className="line-clamp-1">{item.buyer}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-900/55">
                        <MapPin className="size-3.5" />
                        {item.city}, {item.region}
                      </span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-300 text-emerald-950 transition-transform group-hover:translate-x-1">
                        <ChevronRight className="size-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-emerald-900/20 bg-white/55 px-6 py-16 text-center">
            <SlidersHorizontal className="mx-auto size-7 text-emerald-800/45" />
            <h3 className="mt-4 text-lg font-bold text-emerald-950">No encontramos coincidencias</h3>
            <p className="mt-1 text-sm text-emerald-900/55">Prueba con otra región, categoría o plazo de cierre.</p>
          </div>
        )}
      </section>

      <footer className="relative border-t border-emerald-950/8 bg-emerald-950 px-5 py-7 text-[#e9f2e6] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1344px] flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-bold">OportuniTI</p>
          <p className="max-w-2xl text-xs leading-relaxed text-[#e9f2e6]/60">
            Esta herramienta reúne oportunidades para facilitar su evaluación. Antes de postular, confirma fechas,
            anexos y condiciones en la fuente oficial.
          </p>
        </div>
      </footer>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent className="max-h-[92vh] overflow-y-auto border-emerald-950/10 bg-[#fffdf7] p-0 sm:max-w-3xl">
            <div className="bg-emerald-950 px-6 pb-7 pt-8 text-[#f4f0e5] sm:px-9">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.13em]">
                  {selected.category}
                </span>
                <span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-emerald-950">
                  {deadlineLabel(selected.deadline)}
                </span>
              </div>
              <DialogHeader className="mt-5 text-left">
                <p className="font-mono text-xs text-[#d8ead9]/60">{selected.id}</p>
                <DialogTitle className="text-balance text-3xl font-bold leading-tight tracking-[-0.045em] text-white sm:text-4xl">
                  {selected.title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-[#e2eee3]/70 sm:text-base">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-8 px-6 py-7 sm:px-9 sm:py-9">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoTile icon={Building2} label="Entidad" value={selected.buyer} />
                <InfoTile icon={MapPin} label="Ubicación" value={`${selected.city}, ${selected.region}`} />
                <InfoTile icon={CalendarDays} label="Cierre" value={compactDate(selected.deadline)} />
                <InfoTile
                  icon={CircleDollarSign}
                  label="Presupuesto"
                  value={selected.budget ? moneyFormat.format(selected.budget) : 'Revisar bases'}
                />
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <section>
                  <SectionTitle>Qué debes cumplir</SectionTitle>
                  <ul className="mt-4 space-y-3">
                    {selected.requirements.map((requirement) => (
                      <li key={requirement} className="flex gap-3 text-sm leading-relaxed text-emerald-950/70">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#e5f1e5] text-emerald-800">
                          <Check className="size-3" />
                        </span>
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <SectionTitle>Cómo postular</SectionTitle>
                  <ol className="mt-4 space-y-3">
                    {[
                      `Ingresa a Mercado Público y busca el ID ${selected.id}.`,
                      'Descarga y revisa las bases y todos sus anexos.',
                      'Prepara antecedentes administrativos, técnicos y económicos.',
                      'Carga y envía la oferta antes de la fecha de cierre.',
                    ].map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm leading-relaxed text-emerald-950/70">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-300 text-[10px] font-bold text-emerald-950">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <section className="rounded-2xl border border-emerald-950/8 bg-[#f3f4e9] p-5">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-800/55">Canal de contacto</p>
                    <p className="mt-2 text-sm leading-relaxed text-emerald-950/75">{selected.contactChannel}</p>
                    {selected.contactName || selected.contactEmail || selected.contactPhone ? (
                      <div className="mt-3 space-y-1 text-xs text-emerald-950/65">
                        {selected.contactName ? <p>{selected.contactName}</p> : null}
                        {selected.contactEmail ? (
                          <a className="block font-semibold text-emerald-800 underline-offset-4 hover:underline" href={`mailto:${selected.contactEmail}`}>
                            {selected.contactEmail}
                          </a>
                        ) : null}
                        {selected.contactPhone ? <p>{selected.contactPhone}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-800/55">Documentos clave</p>
                    <ul className="mt-2 space-y-1.5">
                      {selected.documents.map((document) => (
                        <li key={document} className="flex items-center gap-2 text-sm text-emerald-950/70">
                          <FileText className="size-3.5 shrink-0 text-emerald-700" />
                          {document}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {selected.questionsDeadline ? (
                <p className="flex items-start gap-2 rounded-xl bg-amber-100 px-4 py-3 text-xs leading-relaxed text-amber-950">
                  <Clock3 className="mt-0.5 size-4 shrink-0" />
                  Fecha publicada para preguntas: {compactDate(selected.questionsDeadline)}. Confirma si hubo cambios en el portal.
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-emerald-950/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-emerald-900/50">Modalidad: {selected.modality}</p>
                <a
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-950 px-5 text-sm font-semibold text-[#f3f0e5] transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  href={selected.applicationUrl ?? selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver y postular en fuente oficial
                  <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold tracking-[-0.03em] text-emerald-950">{children}</h3>;
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-950/8 bg-white p-4">
      <Icon className="size-4 text-emerald-700" />
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-800/50">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-emerald-950">{value}</p>
    </div>
  );
}
