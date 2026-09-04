import { verifiedOpportunities, type Opportunity } from '../opportunities';
import { classify as classifyTopic, isOpenOpportunity, isTechnologyText } from '../../lib/opportunity-rules.mjs';

const API_ROOT = 'https://api.mercadopublico.cl/APISOCDS/OCDS';
const SCAN_LIMIT = 72;
const REVALIDATE_SECONDS = 30 * 60;

const IT_TERMS = [
  'software',
  'informatic',
  'tecnolog',
  'plataforma web',
  'desarrollo web',
  'aplicacion',
  'licencia',
  'suscripcion',
  'cloud',
  'nube',
  'servidor',
  'ciberseguridad',
  'base de datos',
  'datos',
  'api',
  'automatizacion',
  'inteligencia artificial',
  'rpa',
  'soporte ti',
  'servicios ti',
  'redes',
  'datacenter',
  'telecomunicaciones',
  'erp',
  'crm',
];

// The OCDS payload is schema-flexible and contains nested extension fields.
// oxlint-disable-next-line typescript/no-explicit-any
type JsonObject = Record<string, any>;

export type OpportunityFeed = {
  opportunities: Opportunity[];
  dataMode: 'live' | 'verified';
  lastUpdated: string;
};

function monthKey(date: Date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function recentMonths(now: Date, count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    return monthKey(value);
  });
}

async function fetchJson(url: string): Promise<JsonObject | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) return null;
    return (await response.json()) as JsonObject;
  } catch {
    return null;
  }
}

async function getLatestTenderUrls(year: number, month: number) {
  const probeUrl = `${API_ROOT}/listaOCDSAgnoMes/${year}/${month}/0/1`;
  const probe = await fetchJson(probeUrl);
  const total = Number(probe?.pagination?.total ?? 0);
  if (!total) return [] as string[];

  const limit = Math.min(SCAN_LIMIT, total);
  const offset = Math.max(0, total - limit);
  const finalPosition = Math.min(total, offset + limit);
  const listUrl = `${API_ROOT}/listaOCDSAgnoMes/${year}/${month}/${offset}/${finalPosition}`;
  const payload = await fetchJson(listUrl);
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return rows
    .map((row: JsonObject) => row.urlTender)
    .filter((value: unknown): value is string => typeof value === 'string' && value.startsWith('https://'));
}

function normalize(value: unknown) {
  const safeValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  return safeValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL');
}

function isTechnologyTender(release: JsonObject) {
  const tender = release?.tender ?? {};
  const itemText = Array.isArray(tender.items)
    ? tender.items
        .map((item: JsonObject) => `${item?.description ?? ''} ${item?.classification?.description ?? ''}`)
        .join(' ')
    : '';
  const text = normalize(`${tender.title ?? ''} ${tender.description ?? ''} ${itemText}`);
  const technologyClassification = Array.isArray(tender.items)
    ? tender.items.some((item: JsonObject) => {
        const id = String(item?.classification?.id ?? '');
        return id.startsWith('43') || id.startsWith('8111');
      })
    : false;
  return technologyClassification || IT_TERMS.some((term) => text.includes(term));
}

function classify(release: JsonObject) {
  return classifyTopic(release?.tender?.title, release?.tender?.description);
}

function canonicalRegion(value: unknown) {
  const region = normalize(value);
  const mapping: Array<[RegExp, string]> = [
    [/arica|parinacota/, 'Arica y Parinacota'],
    [/tarapaca/, 'Tarapacá'],
    [/antofagasta/, 'Antofagasta'],
    [/atacama/, 'Atacama'],
    [/coquimbo/, 'Coquimbo'],
    [/valparaiso/, 'Valparaíso'],
    [/metropolitana|santiago/, 'Metropolitana'],
    [/o.?higgins|libertador/, "O'Higgins"],
    [/maule/, 'Maule'],
    [/nuble/, 'Ñuble'],
    [/biobio/, 'Biobío'],
    [/araucania/, 'Araucanía'],
    [/los rios/, 'Los Ríos'],
    [/los lagos/, 'Los Lagos'],
    [/aysen/, 'Aysén'],
    [/magallanes|antartica/, 'Magallanes'],
  ];
  const fallback = typeof value === 'string' && value.trim() ? value : 'Sin región';
  return mapping.find(([matcher]) => matcher.test(region))?.[1] ?? fallback;
}

function findBuyerParty(release: JsonObject) {
  const parties = Array.isArray(release?.parties) ? release.parties : [];
  return (
    parties.find((party: JsonObject) =>
      Array.isArray(party?.roles) && party.roles.some((role: string) => role === 'buyer' || role === 'procuringEntity'),
    ) ?? {}
  );
}

function documentNames(tender: JsonObject) {
  const documents = Array.isArray(tender?.documents) ? tender.documents : [];
  const names = documents
    .map((document: JsonObject) => document?.title || document?.description)
    .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
  return names.length > 0 ? names : ['Bases administrativas y técnicas', 'Anexos de la licitación'];
}

function mapTender(payload: JsonObject, sourceUrl: string, now: Date): Opportunity | null {
  const releases = Array.isArray(payload?.releases) ? payload.releases : [];
  const release = releases.at(-1);
  const tender = release?.tender;
  if (!release || !tender || !isTechnologyTender(release) || !isTechnologyText(tender.title, tender.description, (tender.items ?? []).map((item: JsonObject)=>item.description).join(' '))) return null;

  const deadline = tender?.tenderPeriod?.endDate;
  const statusText = normalize(`${tender?.status ?? ''} ${tender?.statusDetails ?? ''}`);
  if (!deadline || new Date(deadline).getTime() <= now.getTime()) return null;
  if (/(cancelad|desiert|adjudic|cerrad|terminad)/.test(statusText)) return null;

  const buyerParty = findBuyerParty(release);
  const contact = buyerParty?.contactPoint ?? {};
  const address = buyerParty?.address ?? {};
  const value = Number(tender?.value?.amount ?? 0);
  const buyer = tender?.procuringEntity?.name || buyerParty?.name || release?.buyer?.name || 'Entidad pública';
  const region = canonicalRegion(address?.region);
  const city = address?.locality || address?.streetAddress || region;
  const id = String(tender?.id || release?.id || payload?.ocid || '').trim();
  if (!id) return null;

  return {
    id,
    title: String(tender?.title || 'Proyecto tecnológico'),
    buyer: String(buyer),
    region,
    city: String(city),
    category: classify(release),
    publishedAt: String(release?.date || tender?.tenderPeriod?.startDate || now.toISOString()),
    deadline: String(deadline),
    questionsDeadline: tender?.enquiryPeriod?.endDate ? String(tender.enquiryPeriod.endDate) : undefined,
    budget: Number.isFinite(value) && value > 0 ? value : undefined,
    currency: tender?.value?.currency === 'USD' ? 'USD' : 'CLP',
    modality: String(tender?.procurementMethodDetails || tender?.procurementMethod || 'Licitación pública'),
    description: String(tender?.description || tender?.title || '').trim(),
    requirements: (tender.items ?? []).map((item: JsonObject) => `${item.description || item.classification?.description || 'Ítem'}${item.quantity ? ` · ${item.quantity} ${item.unit?.name || 'unidades'}` : ''}`),
    documents: documentNames(tender),
    contactChannel: `Canal oficial de consultas y ofertas de Mercado Público. Busca el proceso por su ID: ${id}.`,
    contactName: contact?.name ? String(contact.name) : undefined,
    contactEmail: contact?.email ? String(contact.email) : undefined,
    contactPhone: contact?.telephone ? String(contact.telephone) : undefined,
    sourceUrl: `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(id)}`,
    applicationUrl: `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(id)}`,
    checkedAt: now.toISOString(), status: 'open',
    sourceMode: 'live',
  };
}

async function loadTenderBatch(urls: string[], now: Date) {
  const found: Opportunity[] = [];
  const batchSize = 12;

  for (let index = 0; index < urls.length; index += batchSize) {
    const batch = urls.slice(index, index + batchSize);
    const payloads = await Promise.all(batch.map(async (url) => ({ url, payload: await fetchJson(url) })));
    for (const { url, payload } of payloads) {
      if (!payload) continue;
      const item = mapTender(payload, url, now);
      if (item) found.push(item);
    }
    if (found.length >= 36) break;
  }
  return found;
}

function formatUpdateTime(now: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago',
  }).format(now);
}

export async function getOpportunities(): Promise<OpportunityFeed> {
  const now = new Date();
  try {
    const monthlyUrls = await Promise.all(
      recentMonths(now).map(({ year, month }) => getLatestTenderUrls(year, month)),
    );
    const urls = Array.from(new Set(monthlyUrls.flat()));
    const live = await loadTenderBatch(urls, now);
    const activeVerified = verifiedOpportunities.filter(
      (item) => isOpenOpportunity(item, now),
    );
    const merged = [...live, ...activeVerified].filter(
      (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
    );

    if (live.length > 0) {
      return { opportunities: merged, dataMode: 'live', lastUpdated: formatUpdateTime(now) };
    }
  } catch {
    // A verified fallback keeps the internal radar useful while ChileCompra is unavailable.
  }

  return {
    opportunities: verifiedOpportunities.filter(
      (item) => isOpenOpportunity(item, now),
    ),
    dataMode: 'verified',
    lastUpdated: formatUpdateTime(now),
  };
}
