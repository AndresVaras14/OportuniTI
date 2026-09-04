import { classify, isTechnologyText, isProcurementTechnology, safeUrl, zonedISO } from '../../lib/opportunity-rules.mjs';

export function htmlText(html) {
  const named = {nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',ntilde:'ñ',uuml:'ü'};
  return String(html ?? '').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,'')
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])>/gi,'\n')
    .replace(/<[^>]*>/g,'').replace(/&([a-z]+);/gi,(whole,key)=>named[key.toLowerCase()] ?? whole)
    .replace(/&#(x[\da-f]+|\d+);/gi,(_,code)=>{const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):+code;return n<=0x10ffff?String.fromCodePoint(n):'';})
    .replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

export function mapFreelancerProject(row, now, users = {}) {
  if (row.status !== 'active' || row.frontend_project_status !== 'open' || row.deleted || row.nonpublic || row.hireme || row.upgrades?.fulltime) return null;
  const skills = (row.jobs ?? []).map(job=>job.name);
  if (!isTechnologyText(row.title, row.description, skills.join(' '))) return null;
  const owner = users[row.owner_id] ?? {};
  const url = safeUrl(`/projects/${row.seo_url}`, 'https://www.freelancer.com');
  if (!row.id || !row.seo_url || !url || !row.description) return null;
  const currency = row.currency?.code || 'USD';
  const format = (n)=>new Intl.NumberFormat('es-CL',{style:'currency',currency,maximumFractionDigits:0}).format(n);
  const range = row.budget?.minimum != null && row.budget?.maximum != null
    ? `${format(row.budget.minimum)} – ${format(row.budget.maximum)} ${currency}${row.type==='hourly'?' / hora':''}` : 'Presupuesto no publicado';
  return {
    id:`FL-${row.id}`, title:row.title, buyer:owner.display_name || owner.username || 'Cliente de Freelancer (nombre no público)',
    region:'Cobertura nacional',city:'Chile · remoto',country:'Chile',
    geographicEvidence:'Devuelto por el filtro de país CL de Freelancer; no se publica una región chilena.',
    category:classify(row.title,row.description), publishedAt:new Date(row.time_submitted*1000).toISOString(),
    // bidperiod is not a reliable closing timestamp; the marketplace reports open status.
    status:'open',checkedAt:now.toISOString(),currency,budgetText:range,
    modality:row.type==='hourly'?'Proyecto freelance por horas':'Proyecto freelance a precio fijo',
    description:row.description,requirements:[],skills,
    facts:[{label:'Propuestas recibidas',value:String(row.bid_stats?.bid_count ?? 0)},{label:'Idioma del aviso',value:row.language || 'No informado'}],
    documents:[],documentLinks:[],
    contactName:owner.display_name || owner.username || undefined,
    contactChannel:'El cliente recibe propuestas y consultas mediante Freelancer. El portal no publica correo ni teléfono de contacto en esta respuesta.',
    sourceUrl:url,applicationUrl:url,sourceName:'Freelancer · Chile',sourceType:'marketplace',sourceMode:'live',
    applicationSteps:['Revisa aquí el alcance completo y las habilidades solicitadas.','Abre el proyecto en Freelancer e inicia sesión para proponer.','Presenta alcance, plazo y precio al cliente dentro del portal.'],
    detailLevel:'expanded',detailNotice:'Descripción pública completa, sin traducción ni recortes. Abierto al consultar, sin fecha de cierre publicada; se oculta si pasan 24 horas sin una nueva comprobación. Los rangos del portal pueden diferir del monto indicado por el cliente en el texto.',
  };
}

export async function loadFreelancer(now, {fetchJson}) {
  const found=[];
  for(let offset=0;offset<1000;offset+=100) {
    const params=new URLSearchParams({compact:'false',full_description:'true',job_details:'true',location_details:'true',user_details:'true',user_country_details:'true',limit:'100',offset:String(offset),'countries[]':'cl'});
    const payload=await fetchJson(`https://www.freelancer.com/api/projects/0.1/projects/active/?${params}`);
    if(payload.status!=='success' || !Array.isArray(payload.result?.projects)) throw new Error('Respuesta de Freelancer no reconocida');
    const rows=payload.result.projects;
    found.push(...rows.map(row=>mapFreelancerProject(row,now,payload.result.users)).filter(Boolean));
    if(rows.length<100 || offset+100>=payload.result.total_count) break;
  }
  return found;
}

const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
export function undpDate(value) {
  const m=String(value).match(/(\d{1,2})-([a-z]{3})-(\d{2,4})\s*@?\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if(!m || !months[m[2].toLowerCase()]) return undefined;
  const year=m[3].length===2?`20${m[3]}`:m[3];
  const hour=(+m[4]%12)+(m[6].toUpperCase()==='PM'?12:0);
  return zonedISO(`${year}-${String(months[m[2].toLowerCase()]).padStart(2,'0')}-${m[1].padStart(2,'0')}T${String(hour).padStart(2,'0')}:${m[5]}:00`,'America/New_York');
}

export function mapUndpNotice(html, url, now) {
  const metadata=Object.fromEntries([...html.matchAll(/<h6>([^<]+)<\/h6>\s*<p>([\s\S]*?)<\/p>/gi)].map(m=>[m[1],htmlText(m[2])]));
  if(!/\bCHILE\b/.test(metadata.Office || '')) return null;
  const title=htmlText(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
  const deadline=undpDate(metadata.Deadline);
  if(!title || !deadline || Date.parse(deadline)<=now.getTime()) return null;
  const body=html.split(/class="[^"]*postContent[^"]*"[^>]*>/i)[1]?.split(/<\/main>/i)[0];
  if(!body) throw new Error('No se encontró el cuerpo del aviso PNUD');
  const description=htmlText(body);
  // Avoid treating the standard Quantum supplier-portal instructions as IT scope.
  const scope=description.split(/Scope of Work|Objetivo|Antecedentes|El Programa|El proyecto/i).slice(1).join(' ') || description;
  if(!isProcurementTechnology(title,scope)) return null;
  const email=metadata.Contact?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const documentLinks=[...body.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(m=>({title:htmlText(m[2]),url:safeUrl(m[1].replace(/&amp;/g,'&'),url)}))
    .filter(link=>link.url && /document|anexo|bases|view_file|\.pdf/i.test(`${link.title} ${link.url}`));
  return {
    id:metadata['Reference Number'],title,buyer:'PNUD Chile',region:'Cobertura nacional',city:'Chile',country:'Chile',
    category:classify(title,scope),publishedAt:undpDate(metadata['Published on']),deadline,status:'open',checkedAt:now.toISOString(),
    currency:'USD',modality:metadata['Procurement Process'],description,requirements:[],documents:[],documentLinks,
    contactChannel:metadata.Contact || 'Contacto de la ficha pública PNUD',contactEmail:email,
    sourceUrl:url,applicationUrl:url,sourceName:'PNUD · Chile',sourceType:'multilateral',sourceMode:'live',
    applicationSteps:['Revisa el alcance, elegibilidad y fechas publicados en este aviso.','Consulta los documentos asociados y el contacto del proceso.','Usa el enlace de negociación y el portal Quantum indicados por PNUD para presentar tu propuesta.'],
    detailLevel:'expanded',detailNotice:'Texto público completo del aviso. Los documentos de negociación pueden requerir acceso al portal Quantum.',
  };
}

export async function loadUndp(now,{fetchText}) {
  const base='https://procurement-notices.undp.org/';
  const html=await fetchText(base);
  if(!html.includes('vacanciesTable')) throw new Error('Listado PNUD no reconocido');
  const matches=[...html.matchAll(/<a[^>]*href="(view_(?:negotiation|notice)\.cfm[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .filter(m=>/UNDP-CHL|\/CHILE\b/.test(m[2]));
  const results=[];
  for(const m of matches) {
    const url=new URL(m[1],base).href;
    const notice=mapUndpNotice(await fetchText(url),url,now);
    if(notice) results.push(notice);
  }
  return results;
}
