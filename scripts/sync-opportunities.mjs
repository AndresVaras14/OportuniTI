import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_ROOT = 'https://api.mercadopublico.cl/APISOCDS/OCDS';
const MARKETPLACE_HOME = 'https://www.mercadopublico.cl/Home';
const SCAN_LIMIT = 72;
const OUTPUT = resolve('public/live-opportunities.json');

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

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL');
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function recentMonths(now, count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
}

async function getLatestTenderUrls(year, month) {
  const probe = await fetchJson(`${API_ROOT}/listaOCDSAgnoMes/${year}/${month}/0/1`);
  const total = Number(probe?.pagination?.total ?? 0);
  if (!total) return [];

  const limit = Math.min(SCAN_LIMIT, total);
  const initialPosition = Math.max(0, total - limit);
  const finalPosition = Math.min(total, initialPosition + limit);
  const payload = await fetchJson(
    `${API_ROOT}/listaOCDSAgnoMes/${year}/${month}/${initialPosition}/${finalPosition}`,
  );
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((row) => row?.urlTender)
    .filter((url) => typeof url === 'string' && url.startsWith('https://'));
}

function isTechnologyTender(release) {
  const tender = release?.tender ?? {};
  const items = Array.isArray(tender.items) ? tender.items : [];
  const itemText = items
    .map((item) => `${item?.description ?? ''} ${item?.classification?.description ?? ''}`)
    .join(' ');
  const text = normalize(`${tender.title ?? ''} ${tender.description ?? ''} ${itemText}`);
  const classifiedAsTechnology = items.some((item) => {
    const id = String(item?.classification?.id ?? '');
    return id.startsWith('43') || id.startsWith('8111');
  });
  return classifiedAsTechnology || IT_TERMS.some((term) => text.includes(term));
}

function classify(release) {
  const text = normalize(`${release?.tender?.title ?? ''} ${release?.tender?.description ?? ''}`);
  if (/ciber|seguridad inform|firewall|soc\b/.test(text)) return 'Ciberseguridad';
  if (/licencia|suscripcion|cloud|nube/.test(text)) return 'Licencias y nube';
  if (/servidor|hardware|redes|datacenter|equipamiento/.test(text)) return 'Infraestructura TI';
  if (/datos|inteligencia artificial|automatizacion|rpa|api/.test(text)) return 'Datos y automatización';
  if (/desarrollo|software|plataforma|aplicacion|sistema/.test(text)) return 'Desarrollo de software';
  return 'Servicios TI';
}

function canonicalRegion(value) {
  const region = normalize(value);
  const mapping = [
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
  return mapping.find(([matcher]) => matcher.test(region))?.[1] ?? String(value || 'Sin región');
}

function buyerParty(release) {
  const parties = Array.isArray(release?.parties) ? release.parties : [];
  return (
    parties.find(
      (party) =>
        Array.isArray(party?.roles) &&
        party.roles.some((role) => role === 'buyer' || role === 'procuringEntity'),
    ) ?? {}
  );
}

function documentNames(tender) {
  const documents = Array.isArray(tender?.documents) ? tender.documents : [];
  const names = documents
    .map((document) => document?.title || document?.description)
    .filter((name) => typeof name === 'string' && name.trim())
    .slice(0, 6);
  return names.length ? names : ['Bases administrativas y técnicas', 'Anexos de la licitación'];
}

function mapTender(payload, sourceUrl, now) {
  const releases = Array.isArray(payload?.releases) ? payload.releases : [];
  const release = releases.at(-1);
  const tender = release?.tender;
  if (!release || !tender || !isTechnologyTender(release)) return null;

  const deadline = tender?.tenderPeriod?.endDate;
  const status = normalize(`${tender?.status ?? ''} ${tender?.statusDetails ?? ''}`);
  if (!deadline || new Date(deadline).getTime() <= now.getTime()) return null;
  if (/(cancelad|desiert|adjudic|cerrad|terminad)/.test(status)) return null;

  const party = buyerParty(release);
  const contact = party?.contactPoint ?? {};
  const address = party?.address ?? {};
  const amount = Number(tender?.value?.amount ?? 0);
  const id = String(tender?.id || release?.id || payload?.ocid || '').trim();
  if (!id) return null;

  const region = canonicalRegion(address?.region);
  return {
    id,
    title: String(tender?.title || 'Proyecto tecnológico'),
    buyer: String(tender?.procuringEntity?.name || party?.name || release?.buyer?.name || 'Entidad pública'),
    region,
    city: String(address?.locality || address?.streetAddress || region),
    category: classify(release),
    publishedAt: String(release?.date || tender?.tenderPeriod?.startDate || now.toISOString()),
    deadline: String(deadline),
    questionsDeadline: tender?.enquiryPeriod?.endDate ? String(tender.enquiryPeriod.endDate) : undefined,
    budget: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    currency: tender?.value?.currency === 'USD' ? 'USD' : 'CLP',
    modality: String(tender?.procurementMethodDetails || tender?.procurementMethod || 'Licitación pública'),
    description: String(tender?.description || tender?.title || '').trim(),
    requirements: [
      'Revisar las bases administrativas y técnicas publicadas por la entidad.',
      'Validar que la empresa se encuentre hábil para contratar con el Estado.',
      'Preparar los antecedentes administrativos, técnicos y económicos solicitados.',
      'Enviar la oferta dentro del plazo exclusivamente por Mercado Público.',
    ],
    documents: documentNames(tender),
    contactChannel: `Canal oficial de consultas y ofertas de Mercado Público. Busca el proceso por su ID: ${id}.`,
    contactName: contact?.name ? String(contact.name) : undefined,
    contactEmail: contact?.email ? String(contact.email) : undefined,
    contactPhone: contact?.telephone ? String(contact.telephone) : undefined,
    sourceUrl,
    applicationUrl: MARKETPLACE_HOME,
    sourceMode: 'live',
  };
}

async function loadTenders(urls, now) {
  const found = [];
  for (let index = 0; index < urls.length; index += 12) {
    const batch = urls.slice(index, index + 12);
    const payloads = await Promise.all(batch.map(async (url) => ({ url, payload: await fetchJson(url) })));
    for (const { url, payload } of payloads) {
      if (!payload) continue;
      const opportunity = mapTender(payload, url, now);
      if (opportunity) found.push(opportunity);
    }
    if (found.length >= 36) break;
  }
  return found.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
  );
}

function updateTime(now) {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago',
  }).format(now);
}

async function main() {
  const now = new Date();
  const monthly = await Promise.all(
    recentMonths(now).map(({ year, month }) => getLatestTenderUrls(year, month)),
  );
  const opportunities = await loadTenders([...new Set(monthly.flat())], now);
  await writeFile(
    OUTPUT,
    `${JSON.stringify({ opportunities, lastUpdated: updateTime(now) }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Oportunidades oficiales encontradas: ${opportunities.length}`);
}

main().catch(async (error) => {
  await writeFile(
    OUTPUT,
    `${JSON.stringify({ opportunities: [], lastUpdated: updateTime(new Date()) }, null, 2)}\n`,
    'utf8',
  );
  console.warn(`ChileCompra no respondió; se publicará el respaldo verificado. ${error.message}`);
});
