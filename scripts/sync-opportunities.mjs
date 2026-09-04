import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { classify, isTechnologyText, normalize, safeUrl, zonedISO } from '../lib/opportunity-rules.mjs';
import { htmlText, loadFreelancer, loadUndp } from './sources/additional-sources.mjs';

const OUTPUT = resolve('public/live-opportunities.json');
const MARKET_HOME = 'https://www.mercadopublico.cl/Home';
const MARKET_API = 'https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json';
const OCDS_API = 'https://api.mercadopublico.cl/APISOCDS/OCDS';
const UNGM_SEARCH = 'https://www.ungm.org/Public/Notice/Search';
const WORLD_BANK_API = 'https://search.worldbank.org/api/v2/procnotices';

const SOURCE_DEFINITIONS = [
  ['mercado-publico', 'Mercado Público', MARKET_HOME, 'Licitaciones y compras públicas de Chile.'],
  ['ungm', 'Naciones Unidas · UNGM', 'https://www.ungm.org/Public/Notice', 'Procesos activos que incluyen a Chile.'],
  ['world-bank', 'Banco Mundial', 'https://projects.worldbank.org/en/projects-operations/procurement', 'Oportunidades de proyectos financiados en Chile.'],
  ['codelco', 'Codelco', 'https://www.codelco.com/licitaciones-en-proceso', 'Licitaciones corporativas publicadas en proceso.'],
  ['freelancer', 'Freelancer · Chile', 'https://www.freelancer.com/jobs/?countries=cl', 'Proyectos abiertos del filtro de país Chile de Freelancer. No empleos permanentes.'],
  ['undp', 'PNUD · Chile', 'https://procurement-notices.undp.org/', 'Avisos públicos de contratación de la oficina PNUD Chile; se revisa el detalle antes de admitirlos.'],
];

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&(?:ldquo|rdquo);/gi, '"')
    .replace(/&(?:lsquo|rsquo);/gi, "'")
    .replace(/&shy;/gi, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}


function canonicalRegion(value) {
  const region = normalize(value);
  const mapping = [
    [/arica|parinacota/, 'Arica y Parinacota'], [/tarapaca/, 'Tarapacá'],
    [/antofagasta/, 'Antofagasta'], [/atacama/, 'Atacama'], [/coquimbo/, 'Coquimbo'],
    [/valparaiso/, 'Valparaíso'], [/metropolitana|santiago/, 'Metropolitana'],
    [/o.?higgins|libertador/, "O'Higgins"], [/maule/, 'Maule'], [/nuble/, 'Ñuble'],
    [/biobio/, 'Biobío'], [/araucania/, 'Araucanía'], [/los rios/, 'Los Ríos'],
    [/los lagos/, 'Los Lagos'], [/aysen/, 'Aysén'], [/magallanes|antartica/, 'Magallanes'],
  ];
  return mapping.find(([matcher]) => matcher.test(region))?.[1] ?? String(value || 'Cobertura nacional');
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'User-Agent': 'OportuniTI/1.0 (+https://github.com/AndresVaras14/OportuniTI)', ...options.headers },
    signal: AbortSignal.timeout(options.timeout ?? 20_000),
  });
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return response;
}

async function fetchJson(url, options) {
  return (await request(url, options)).json();
}

async function fetchText(url, options) {
  return (await request(url, options)).text();
}

async function inBatches(values, size, worker) {
  const results = [];
  let failed = 0;
  for (let index = 0; index < values.length; index += size) {
    const batch = await Promise.allSettled(values.slice(index, index + size).map(worker));
    for (const result of batch) {
      if (result.status === 'rejected') failed += 1;
      else if (result.value) results.push(result.value);
    }
  }
  if (values.length && failed === values.length) throw new Error('No se pudo consultar ninguna ficha de esta fuente');
  return results;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function future(value, now) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > now.getTime();
}

function marketSteps(id) {
  return [
    `Ingresa a Mercado Público y busca el ID ${id}.`,
    'Descarga las bases, anexos y eventuales aclaraciones.',
    'Prepara los antecedentes administrativos, técnicos y económicos solicitados.',
    'Envía la oferta en el portal oficial antes del cierre.',
  ];
}

export function mapMarketApiTender(row, now) {
  const id = String(row?.CodigoExterno ?? row?.codigoExterno ?? '').trim();
  const title = String(row?.Nombre ?? row?.nombre ?? '').trim();
  const deadline = zonedISO(row?.FechaCierre ?? row?.Fechas?.FechaCierre);
  const items = row?.Items?.Listado ?? [];
  const itemText = items.map((item) => `${item?.NombreProducto ?? ''} ${item?.Descripcion ?? ''}`).join(' ');
  const excluded = /(coffee break|licencia de conducir|reactiv|insumos.*laborator|hematolog|bioquim|cirugia robot|tecnologo medic|gira tecnolog|festival.*ciencia|conservacion.*redes? (?:de )?(?:agua|gases))/;
  if (!id || !title || excluded.test(normalize(title)) || (row?.CodigoEstado && Number(row.CodigoEstado) !== 5) || !future(deadline, now) || !isTechnologyText(title, row?.Descripcion, itemText)) return null;
  const buyer = row?.Comprador ?? {};
  const itemSummaries = items
    .map((item) => {
      const name = String(item?.NombreProducto || item?.Categoria || 'Ítem solicitado').trim();
      const description = String(item?.Descripcion || '').trim();
      const quantity = Number(item?.Cantidad) > 0
        ? ` · ${item.Cantidad} ${item?.UnidadMedida || 'unidad(es)'}`
        : '';
      return `${name}${description && normalize(description) !== normalize(name) ? `: ${description}` : ''}${quantity}`;
    })
    .filter(Boolean);
  const contactName = String(buyer?.NombreContacto || buyer?.NombreUsuario || '').trim();
  const contactRole = String(buyer?.CargoContacto || buyer?.CargoUsuario || '').trim();
  return {
    id, title,
    buyer: String(buyer?.NombreOrganismo ?? buyer?.NombreUnidad ?? 'Entidad pública'),
    region: canonicalRegion(buyer?.RegionUnidad),
    city: String(buyer?.ComunaUnidad || buyer?.CiudadUnidad || buyer?.RegionUnidad || 'Chile').trim(),
    // Product taxonomy such as 'Software de desarrollo' describes the product,
    // not the requested service. Do not use product labels as development evidence.
    category: classify(title, `${row?.Descripcion ?? ''} ${items.map(item=>item.Descripcion || '').join(' ')}`),
    publishedAt: zonedISO(row?.Fechas?.FechaPublicacion ?? row?.FechaPublicacion),
    deadline, questionsDeadline: zonedISO(row?.Fechas?.FechaFinal ?? row?.Fechas?.FechaCierrePreguntas),
    budget: Number(row?.MontoEstimado) > 0 ? Number(row.MontoEstimado) : undefined,
    currency: row?.Moneda || 'CLP',
    modality: String(row?.Tipo ?? row?.TipoConvocatoria ?? 'Licitación pública'),
    description: String(row?.Descripcion || title),
    requirements: itemSummaries,
    detailLevel: items.length || row?.Descripcion ? 'expanded' : 'summary',
    detailNotice: 'Se muestran todos los ítems y campos públicos recibidos. Las bases, anexos y criterios de evaluación no incluidos por la API deben consultarse en la ficha oficial.',
    checkedAt: now.toISOString(), status: 'open',
    contacts: [
      { name: contactName, role: contactRole || 'Comprador', email: buyer?.CorreoContacto, phone: buyer?.FonoContacto },
      { name: row?.NombreResponsableContrato, role: 'Responsable del contrato', email: row?.EmailResponsableContrato, phone: row?.FonoResponsableContrato },
      { name: row?.NombreResponsablePago, role: 'Responsable del pago', email: row?.EmailResponsablePago },
    ].filter((contact) => contact.name || contact.email || contact.phone),
    facts: [
      ['Dirección de entrega', row?.DireccionEntrega], ['Dirección de visita', row?.DireccionVisita],
      ['Fuente de financiamiento', row?.FuenteFinanciamiento], ['Observaciones del contrato', row?.ObservacionContract],
      ['Justificación del presupuesto', row?.JustificacionMontoEstimado],
    ].filter(([,value]) => value && String(value).trim()).map(([label,value]) => ({label,value:String(value)})),
    milestones: [
      ['Respuestas a consultas', row?.Fechas?.FechaPubRespuestas], ['Apertura técnica', row?.Fechas?.FechaActoAperturaTecnica],
      ['Apertura económica', row?.Fechas?.FechaActoAperturaEconomica], ['Adjudicación estimada', row?.Fechas?.FechaEstimadaAdjudicacion],
      ['Visita a terreno', row?.Fechas?.FechaVisitaTerreno], ['Entrega de antecedentes', row?.Fechas?.FechaEntregaAntecedentes],
    ].map(([label,date])=>({label,date:zonedISO(date)})).filter((entry)=>entry.date),
    documents: [
      'Bases administrativas y técnicas publicadas en la ficha',
      'Anexos, aclaraciones y respuestas del proceso',
      items.length ? `${items.length} ítem(s) informado(s) por la entidad` : 'Detalle de productos o servicios solicitados',
    ],
    contactChannel: contactName
      ? `${contactName}${contactRole ? ` · ${contactRole}` : ''}. Las preguntas y ofertas se tramitan en el foro y módulo oficial de Mercado Público.`
      : `Foro y módulo de ofertas de Mercado Público. Busca el proceso por el ID ${id}.`,
    contactName: contactName || undefined, contactEmail: buyer?.CorreoContacto,
    contactPhone: buyer?.FonoContacto,
    sourceUrl: `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(id)}`,
    applicationUrl: `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(id)}`,
    sourceName: 'Mercado Público', sourceType: 'public',
    applicationSteps: marketSteps(id), sourceMode: 'live',
  };
}

function buyerParty(release) {
  return (release?.parties ?? []).find((party) => party?.roles?.some((role) => role === 'buyer' || role === 'procuringEntity')) ?? {};
}

function mapOcds(payload, sourceUrl, now) {
  const release = payload?.releases?.at(-1);
  const tender = release?.tender;
  const items = tender?.items ?? [];
  const itemText = items.map((item) => `${item?.description ?? ''} ${item?.classification?.description ?? ''}`).join(' ');
  const deadline = tender?.tenderPeriod?.endDate;
  const status = normalize(`${tender?.status ?? ''} ${tender?.statusDetails ?? ''}`);
  if (!tender || !future(deadline, now) || /(cancelad|desiert|adjudic|cerrad|terminad)/.test(status)) return null;
  if (/(coffee break|licencia de conducir|reactiv|insumos.*laborator|hematolog|bioquim|cirugia robot|tecnologo medic|gira tecnolog|festival.*ciencia|conservacion.*redes? (?:de )?(?:agua|gases))/.test(normalize(tender?.title))) return null;
  if (!isTechnologyText(tender?.title, tender?.description, itemText) && !items.some((item) => /^(43|8111)/.test(String(item?.classification?.id ?? '')))) return null;
  const party = buyerParty(release);
  const contact = party?.contactPoint ?? {};
  const address = party?.address ?? {};
  const id = String(tender?.id || release?.id || payload?.ocid || '').trim();
  if (!id) return null;
  const documents = (tender?.documents ?? []).map((doc) => doc?.title || doc?.description).filter(Boolean);
  return {
    id, title: String(tender?.title || 'Proyecto tecnológico'),
    buyer: String(tender?.procuringEntity?.name || party?.name || release?.buyer?.name || 'Entidad pública'),
    region: canonicalRegion(address?.region), city: String(address?.locality || address?.streetAddress || address?.region || 'Chile'),
    category: classify(tender?.title, `${tender?.description} ${items.map(item=>item.description || '').join(' ')}`),
    publishedAt: String(release?.date || tender?.tenderPeriod?.startDate || now.toISOString()), deadline: String(deadline),
    questionsDeadline: tender?.enquiryPeriod?.endDate,
    budget: Number(tender?.value?.amount) > 0 ? Number(tender.value.amount) : undefined,
    currency: tender?.value?.currency === 'USD' ? 'USD' : 'CLP',
    modality: String(tender?.procurementMethodDetails || tender?.procurementMethod || 'Licitación pública'),
    description: String(tender?.description || tender?.title || ''),
    requirements: items.map(item => `${item.description || item.classification?.description || 'Ítem'}${item.quantity ? ` · ${item.quantity} ${item.unit?.name || 'unidades'}` : ''}`),
    documentLinks: (tender?.documents ?? []).map(doc=>({title:doc.title || doc.description || 'Documento oficial',url:safeUrl(doc.url)})).filter(doc=>doc.url),
    checkedAt: now.toISOString(), status: 'open', detailLevel: 'expanded',
    detailNotice: 'Detalle público OCDS; las bases pueden contener requisitos adicionales.',
    documents: documents.length ? documents : ['Bases administrativas y técnicas', 'Anexos de la licitación'],
    contactChannel: `Canal oficial de Mercado Público. Busca el proceso por el ID ${id}.`,
    contactName: contact?.name, contactEmail: contact?.email, contactPhone: contact?.telephone,
    sourceUrl: `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(id)}`,
    applicationUrl: `https://www.mercadopublico.cl/fichaLicitacion.html?idLicitacion=${encodeURIComponent(id)}`,
    sourceName: 'Mercado Público', sourceType: 'public', applicationSteps: marketSteps(id), sourceMode: 'live',
  };
}

async function loadMarketApi(ticket, now) {
  let list;
  for (let attempt=0;attempt<4;attempt++) {
    try { list=await fetchJson(`${MARKET_API}?estado=activas&ticket=${encodeURIComponent(ticket)}`); break; }
    catch(error) { if(error.status!==429 || attempt===3) throw error; await sleep(5000*(attempt+1)); }
  }
  if (!Array.isArray(list?.Listado)) throw new Error('Listado de Mercado Público no reconocido');
  const rows = Array.isArray(list?.Listado) ? list.Listado : [];
  const candidates = rows.filter((row) => isTechnologyText(row?.Nombre, row?.Descripcion));
  console.log(`Mercado Público: ${candidates.length} candidatos TI; sin el límite anterior de 80.`);
  const opportunities = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    const id = row?.CodigoExterno;
    if (index > 0) await sleep(1_250);
    let mapped = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const detail = await fetchJson(`${MARKET_API}?codigo=${encodeURIComponent(id)}&ticket=${encodeURIComponent(ticket)}`);
        mapped = mapMarketApiTender(detail?.Listado?.[0] ?? row, now);
        break;
      } catch (error) {
        if (error.status !== 429 || attempt === 3) break;
        await sleep(2_500 * (attempt + 1));
      }
    }
    if (!mapped) mapped = mapMarketApiTender(row, now);
    if (mapped) opportunities.push(mapped);
  }
  return opportunities;
}

function recentMonths(now, count = 9) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
}

async function loadMarketOcds(now) {
  const available = [];
  for (const { year, month } of recentMonths(now)) {
    try {
      const probe = await fetchJson(`${OCDS_API}/listaOCDSAgnoMes/${year}/${month}/0/1`);
      const total = Number(probe?.pagination?.total ?? 0);
      if (total) available.push({ year, month, total });
      if (available.length === 2) break;
    } catch { /* Mes todavía no publicado. */ }
  }
  const urls = [];
  for (const { year, month, total } of available) {
    const limit = Math.min(360, total);
    const start = Math.max(0, total - limit);
    const payload = await fetchJson(`${OCDS_API}/listaOCDSAgnoMes/${year}/${month}/${start}/${total}`);
    urls.push(...(payload?.data ?? []).map((row) => row?.urlTender).filter(Boolean));
  }
  return inBatches(Array.from(new Set(urls)), 20, async (url) => {
    try { return mapOcds(await fetchJson(String(url).replace(/^http:/, 'https:')), url, now); } catch { return null; }
  });
}

async function loadMercadoPublico(now) {
  const tickets = [...new Set([process.env.CHILECOMPRA_TICKET, 'F8537A18-6766-4DEF-9E59-426B4FEE2844'].filter(Boolean))];
  for (const ticket of tickets) {
    try {
      const opportunities = await loadMarketApi(ticket, now);
      if (opportunities.length) return opportunities;
    } catch (error) { console.warn(`Mercado Público REST no disponible: ${error.message}`); }
  }
  const fallback = await loadMarketOcds(now);
  if (!fallback.length) throw new Error('No se pudo confirmar el listado activo; REST limitado y respaldo sin resultados vigentes');
  return fallback;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function parseUngmDate(value) {
  const match = String(value).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?:\s+\(GMT\s*([+-]?\d+(?:\.\d+)?)\))?/i);
  if (!match) return null;
  const [, day, monthText, year, hour, minute, offsetText = '0'] = match;
  const month = MONTHS[monthText.toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(year), month, Number(day), Number(hour), Number(minute)) - Number(offsetText) * 3_600_000).toISOString();
}

function ungmCell(block, className) {
  const match = block.match(new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`, 'i'));
  return decodeHtml(match?.[1]);
}

function parsePublishedDate(value) {
  const match = String(value).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  return month === undefined ? null : new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString();
}

function ungmDescription(detail, title) {
  const start = detail.indexOf('Description');
  if (start < 0) return title;
  const remainder = detail.slice(start + 'Description'.length);
  const stops = ['Documents Contacts', 'Documents  Contacts', 'Countries or territories', 'UNSPSC codes']
    .map((marker) => remainder.indexOf(marker))
    .filter((index) => index > 0);
  const end = stops.length ? Math.min(...stops) : remainder.length;
  return remainder.slice(0, end).trim() || title;
}

async function loadUngm(now) {
  const notices = [];
  for (let page = 0; page < 4; page += 1) {
    const body = {
      PageIndex: page, PageSize: 15, Title: '', Description: '', Reference: '', PublishedFrom: '', PublishedTo: '',
      DeadlineFrom: '', DeadlineTo: '', Countries: ['2333'], Agencies: [], UNSPSCs: [], NoticeTypes: [],
      SortField: 'DatePublished', SortAscending: false, isPicker: false, IsSustainable: false,
      IsActive: true, NoticeDisplayType: null, NoticeSearchTotalLabelId: 'noticeSearchTotal', TypeOfCompetitions: [],
    };
    const html = await fetchText(UNGM_SEARCH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const blocks = html.split(/<div\s+role="row"/i).slice(1);
    for (const block of blocks) {
      const id = block.match(/data-noticeid="(\d+)"/i)?.[1];
      const title = decodeHtml(block.match(/<span[^>]*class="[^"]*ungm-title[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]);
      const deadline = parseUngmDate(ungmCell(block, 'deadline'));
      if (id && title && deadline && future(deadline, now)) notices.push({ id, title, deadline, block });
    }
    if (blocks.length < 15) break;
  }
  return inBatches(notices, 10, async ({ id, title, deadline, block }) => {
    const url = `https://www.ungm.org/Public/Notice/${id}`;
    const detailHtml = await fetchText(url);
    const detail = decodeHtml(detailHtml);
    const descriptionHtml = detailHtml.split(/<div class="title">Description<\/div>/i)[1]?.split(/<div class="accessibilityTabs">/i)[0];
    const description = descriptionHtml ? htmlText(descriptionHtml) : ungmDescription(detail, title);
    if (!isTechnologyText(title, description)) return null;
    if (/(el salvador|gaza|gambia|haiti|central african republic|\bdrc\b|sub-sahara)/i.test(decodeHtml(title))) return null;
    const email = detail.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const agency = ungmCell(block, 'resultAgency') || 'Naciones Unidas';
    const reference = detail.match(/Reference:\s*(.*?)\s+Beneficiary countries/i)?.[1] || `UNGM-${id}`;
    const publishedAt = parsePublishedDate(detail.match(/Published on:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/i)?.[1]) || now.toISOString();
    return {
      id: reference, title, buyer: agency, region: 'Cobertura nacional', city: 'Chile',
      category: classify(title, description), publishedAt, deadline, currency: 'USD',
      checkedAt: now.toISOString(), status: 'open', detailLevel: description === title ? 'summary' : 'expanded',
      detailNotice: 'Texto público del aviso. Algunos anexos requieren iniciar sesión en el portal de la agencia.',
      modality: 'Aviso de contratación internacional', description,
      documentLinks: [...detailHtml.matchAll(/<a[^>]*href="([^"]*DownloadDocument\?[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
        .map(match => ({ title: decodeHtml(match[2]), url: safeUrl(match[1].replace(/&amp;/g, '&'), url) })).filter(link=>link.url),
      requirements: ['Revisar elegibilidad y alcance en el aviso oficial.', 'Descargar los documentos indicados por la agencia.', 'Preparar la propuesta en el idioma y formato exigidos.', 'Enviar por el canal oficial antes del cierre.'],
      documents: ['Aviso oficial UNGM', 'Documentos de solicitud indicados por la agencia'],
      contactChannel: email ? `Contacto publicado por la agencia: ${email}` : 'Consulta el aviso UNGM para ver el contacto y canal de envío vigentes.',
      contactEmail: email, sourceUrl: url, applicationUrl: url, sourceName: 'Naciones Unidas · UNGM',
      sourceType: 'multilateral', applicationSteps: ['Abre el aviso oficial de UNGM.', 'Confirma países elegibles, alcance y fecha límite.', 'Descarga las bases o sigue el enlace de la agencia.', 'Envía la propuesta por el canal indicado en el aviso.'], sourceMode: 'live',
    };
  });
}

async function loadWorldBank(now) {
  const payload = await fetchJson(`${WORLD_BANK_API}?format=json&project_ctry_name_exact=Chile&rows=100&srt=notice_date&order=desc`);
  const documents = Object.values(payload?.procurement_notices ?? payload?.documents ?? {});
  return documents.filter((row) => future(row?.submission_deadline_date, now) && isTechnologyText(row?.bid_description, row?.project_name, row?.notice_text)).map((row) => {
    const id = String(row?.bid_reference_no || row?.id || row?.project_id);
    const sourceUrl = `https://projects.worldbank.org/en/projects-operations/procurement-detail/${encodeURIComponent(row?.id || '')}`;
    return {
      id, title: String(row?.bid_description || row?.project_name || 'Proyecto tecnológico'), buyer: String(row?.contact_organization || row?.project_name || 'Banco Mundial'),
      region: 'Cobertura nacional', city: String(row?.contact_ctry_name || 'Chile'), category: classify(row?.bid_description, row?.notice_text),
      publishedAt: String(row?.noticedate || now.toISOString()), deadline: String(row.submission_deadline_date), currency: 'USD',
      modality: String(row?.procurement_method_name || row?.notice_type || 'Procurement notice'), description: decodeHtml(row?.notice_text || row?.bid_description),
      checkedAt: now.toISOString(), status: 'open', detailLevel: 'expanded',
      requirements: ['Revisar elegibilidad y método de selección.', 'Consultar el aviso y documentos oficiales.', 'Preparar expresiones de interés u oferta solicitada.', 'Enviar por el canal indicado antes del cierre.'],
      documents: ['Aviso de contratación', 'Documentos indicados en la ficha'], contactChannel: String(row?.contact_address || row?.contact_email || 'Contacto publicado en la ficha oficial.'),
      contactName: row?.contact_name, contactEmail: row?.contact_email, contactPhone: row?.contact_phone_no,
      sourceUrl, applicationUrl: sourceUrl, sourceName: 'Banco Mundial', sourceType: 'multilateral',
      applicationSteps: ['Abre el aviso del Banco Mundial.', 'Confirma el método y la elegibilidad.', 'Descarga los documentos asociados.', 'Contacta o envía la propuesta por el canal oficial.'], sourceMode: 'live',
    };
  });
}

function parseChileDate(text, now) {
  const match = String(text).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(?:hasta las\s+)?(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const date=zonedISO(`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}T${(match[4]||'00').padStart(2,'0')}:${match[5]||'00'}:00`);
  return future(date, now) ? date : null;
}

export function mapCodelcoRow(row, now) {
    const listingUrl = 'https://www.codelco.com/licitaciones-en-proceso';
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(match=>match[1]);
    if(cells.length<7) return null;
    const title=htmlText(cells[2]);
    if(!isTechnologyText(title)) return null;
    const deadline = parseChileDate(htmlText(cells[6]), now);
    if (!deadline) return null;
    const documents=[...cells[2].matchAll(/href="([^"]+)"/gi)].map(match=>({title:'Llamado y antecedentes del proceso',url:safeUrl(match[1],listingUrl)})).filter(link=>link.url);
    const sourceUrl=documents[0]?.url || listingUrl;
    return {
      id: `CODELCO-${createHash('sha256').update(sourceUrl+title).digest('hex').slice(0,12)}`, title, buyer: 'Codelco', region: 'Cobertura nacional', city: htmlText(cells[3]) || 'Chile',
      category: classify(title), publishedAt:parseChileDate(htmlText(cells[0]), new Date(0)) || undefined, deadline, currency: 'CLP', modality: 'Licitación corporativa',
      description: `${title}\n\nOperación: ${htmlText(cells[3])}\nBases disponibles: ${htmlText(cells[4])}\nValor de bases (no es presupuesto): ${htmlText(cells[5])}\nFecha de entrega y canal: ${htmlText(cells[6])}`,
      requirements: [],documents: [],documentLinks:documents, contactChannel: htmlText(cells[6]),
      checkedAt:now.toISOString(),status:'open',detailLevel:'summary',detailNotice:'Datos de la tabla pública. El alcance completo está en el documento enlazado; no se ha extraído su contenido. Si sólo se publica el día de cierre, se oculta desde el inicio de ese día por precaución.',
      sourceUrl, applicationUrl: sourceUrl, sourceName: 'Codelco', sourceType: 'corporate',
      applicationSteps: ['Abre la licitación en proceso.', 'Descarga bases y anexos.', 'Verifica el canal indicado o SAP Ariba.', 'Envía tu propuesta antes del cierre.'], sourceMode: 'live',
    };
}

async function loadCodelco(now) {
  const html = await fetchText('https://www.codelco.com/licitaciones-en-proceso');
  if(!html.includes('Fecha de entrega')) throw new Error('Listado Codelco no reconocido');
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(match=>mapCodelcoRow(match[1],now)).filter(Boolean);
}

async function collectSource(definition, loader, now) {
  const [id, name, url, detail] = definition;
  try {
    const opportunities = await loader(now);
    return { opportunities, source: { id, name, url, status: opportunities.length ? 'online' : 'empty', count: opportunities.length, detail } };
  } catch (error) {
    console.warn(`${name}: ${error.message}`);
    return { opportunities: [], source: { id, name, url, status: 'error', count: 0, detail: `${detail} Conexión temporalmente no disponible.` } };
  }
}

export async function syncOpportunities() {
const now = new Date();
const loaders = [loadMercadoPublico, loadUngm, loadWorldBank, loadCodelco,
  (date)=>loadFreelancer(date,{fetchJson}), (date)=>loadUndp(date,{fetchText})];
const collected = await Promise.all(SOURCE_DEFINITIONS.map((definition, index) => collectSource(definition, loaders[index], now)));
if (collected.every(entry => entry.source.status === 'error')) throw new Error('Ninguna fuente disponible. Se conserva el archivo anterior.');
const opportunities = collected.flatMap((entry) => entry.opportunities)
  .filter((item, index, all) => all.findIndex((candidate) => `${candidate.sourceName}:${candidate.id}` === `${item.sourceName}:${item.id}`) === index)
  // Same PNUD negotiation may also be present on UNGM. Prefer its richer direct notice.
  .filter((item, index, all) => !all.some((candidate, other) => other > index && candidate.id.replace(/,\d+$/, '') === item.id.replace(/,\d+$/, '')))
  .sort((a, b) => (Date.parse(a.deadline)||Infinity) - (Date.parse(b.deadline)||Infinity));

const sources = [
  ...collected.map((entry) => ({...entry.source, checkedAt:now.toISOString(),count:opportunities.filter(item=>item.sourceName===entry.source.name).length})),
  { id: 'bid', name: 'BID', url: 'https://www.iadb.org/es/como-podemos-trabajar-juntos/adquisiciones/adquisiciones-para-proyectos/avisos-de-adquisiciones', status: 'portal', count: 0, detail: 'Portal oficial de adquisiciones financiadas por el BID.' },
  { id: 'enap', name: 'ENAP', url: 'https://www.enap.cl/gestion-proveedores-enap', status: 'portal', count: 0, detail: 'Acceso al portal oficial de licitaciones activas de ENAP.' },
  { id: 'workana', name: 'Workana · Chile', url: 'https://www.workana.com/jobs?country=CL&category=it-programming', status: 'portal', count: 0, detail: 'Proyectos freelance de Chile. Bloquea el acceso automático; no se cuentan resultados de este portal.' },
];

const lastUpdated = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(now);
await writeFile(OUTPUT, `${JSON.stringify({ opportunities, sources, lastUpdated, generatedAt: now.toISOString() }, null, 2)}\n`, 'utf8');
console.log(`OportuniTI: ${opportunities.length} oportunidades vigentes.`);
for (const source of sources) console.log(`- ${source.name}: ${source.count} (${source.status})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await syncOpportunities();
