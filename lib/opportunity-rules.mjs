export const categories = [
  'Desarrollo de software', 'Desarrollo web y e-commerce', 'Aplicaciones móviles', 'Integraciones y API',
  'Instalación y configuración', 'ERP, CRM y plataformas', 'Licencias y suscripciones',
  'Soporte y mantenimiento', 'Hardware y equipamiento', 'Redes y telecomunicaciones',
  'Cloud, hosting y DevOps', 'Ciberseguridad', 'Datos y BI', 'IA y automatización',
  'Diseño UX/UI', 'Consultoría y auditoría TI', 'Capacitación TI', 'Servicios TI por precisar',
];

export function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const technology = /software|informatic|computador|computacional|hardware|servidor|ciberseguridad|cybersecurity|firewall|datacenter|data center|telecom|conectividad|fibra optica|cableado estructurado|red(?:es)? (?:de )?datos|sitio web|pagina web|portal web|plataforma (?:web|digital)|sistema(?:s)? (?:de informacion|informatico)|desarrollo (?:de )?sistema|cloud|hosting|devops|nube|base(?:s)? de datos|database|analitica|data (?:analysis|management|processing|collection|mining)|inteligencia artificial|artificial intelligence|automatizacion|automation|e-?commerce|wordpress|woocommerce|shopify|programacion|programming|web development|game development|roblox|android|\bios\b|flutter|\breact\b|\bpython\b|moodle|learning management|soporte ti|servicios ti|seguridad de la informacion|information technology|\b(?:erp|crm|lms|rpa|api|wifi|tic|ict|lan|wan|saas|sql|sap|odoo)\b/;
const excluded = /licencia de conducir|coffee break|cirugia robot|tecnologo medic|gira tecnolog|festival.*ciencia|(?:arriendo|adquisicion).*modulos? (?:de )?bodega|reactivos? (?:de )?laboratorio|conservacion.*redes? (?:de )?(?:agua|gases)|edicion (?:de )?videos|trafico.*adsense|trabajo remoto para|busqueda de empleo/;

export function isTechnologyText(...values) {
  return !excluded.test(normalize(values[0])) && technology.test(normalize(values.join(' ')));
}

// Procurement boilerplate mentions websites, cloud URLs and digital submission
// even when the purchased service is unrelated to IT. Require a concrete scope.
export function isProcurementTechnology(title, description = '') {
  if (isTechnologyText(title)) return true;
  const scope = normalize(description).replace(/https?:\/\/\S+/g, '');
  return /software|informatic|computador|ciberseguridad|cybersecurity|base(?:s)? de datos|database|desarrollo (?:de )?(?:web|sistema|aplicaci)|(?:web|software|app) development|inteligencia artificial|artificial intelligence|\b(?:erp|crm|api)\b/.test(scope);
}

export function isChileProcurement(beneficiaries) {
  return /^chile$/i.test(String(beneficiaries ?? '').trim());
}

// Intention first: a product name alone is NEVER evidence of bespoke development.
function intent(text) {
  if (/capsula digital|curso (?:digital|moodle)|contenido(?:s)? (?:educativo|e-learning)/.test(text)) return 'Capacitación TI';
  if (/(?:adquisicion|compra|recarga).{0,25}creditos.{0,30}(?:cloud|gcp|nube)/.test(text)) return 'Cloud, hosting y DevOps';
  if (/(?:arriendo|alquiler|adquisicion|compra|renovacion).{0,25}(?:software|licencia|suscripcion)/.test(text)) return 'Licencias y suscripciones';
  if (/servicio de operacion|mejora continua/.test(text)) return 'Soporte y mantenimiento';
  const development = /(?:\bdesarroll(?:o|ar|e)\b|programacion|construccion|creacion|redise[nñ]o|dise[nñ]o y desarrollo).{0,65}(?:software|sistema|web|aplicaci|plataforma|modulo|portal|tienda|\bapi\b)|(?:develop|build|create|redesign).{0,65}(?:software|system|website|web|app|platform|game|store)|(?:web|software|game|app) development|codigo a medida|a medida|custom (?:software|development)/.test(text)
    && !/no (?:requiere|incluye|implica).{0,25}desarrollo/.test(text);
  if (development) {
    if (/android|\bios\b|flutter|react native|aplicaci.{0,10}movil|mobile app/.test(text)) return 'Aplicaciones móviles';
    if (/\bapi\b|integraci.{0,15}sistema/.test(text) && !/sitio web|pagina web|e-?commerce/.test(text)) return 'Integraciones y API';
    if (/web|e-?commerce|tienda|wordpress|woocommerce|shopify/.test(text)) return 'Desarrollo web y e-commerce';
    return 'Desarrollo de software';
  }
  if (/licencia|licensing|suscripci|subscription|renovacion de software/.test(text)) return 'Licencias y suscripciones';
  if (/discovery|levantamiento tecnico|consultoria|consultor|auditoria de|assessment|consulting/.test(text)) return 'Consultoría y auditoría TI';
  if (/instalaci|instalar|configuraci|implementaci|migraci|installation|setup|configuration|deployment/.test(text)) {
    if (/\berp\b|\bcrm\b|\bsap\b|odoo|moodle|\blms\b/.test(text)) return 'ERP, CRM y plataformas';
    return 'Instalación y configuración';
  }
  if (/soporte|mantenimi|mantenci|reparaci|restablecer|recovery|troubleshoot|maintenance|support|optimizaci/.test(text)) return 'Soporte y mantenimiento';
  if (/capacitaci|formacion|curso|training/.test(text)) return 'Capacitación TI';
  if (/consultoria|consultor|auditoria|assessment|consulting/.test(text)) return 'Consultoría y auditoría TI';
  return null;
}

export function classify(title, description = '') {
  const heading = normalize(title);
  const text = `${heading} ${normalize(description)}`;
  const primary = intent(heading) || intent(text);
  if (primary) return primary;
  if (/ciber|cyber|seguridad (?:inform|de la informacion)|firewall|pentest|\bsoc\b/.test(text)) return 'Ciberseguridad';
  if (/inteligencia artificial|artificial intelligence|\bllm\b|chatbot|automatizacion|automation|\brpa\b/.test(text)) return 'IA y automatización';
  if (/base(?:s)? de datos|database|\bdatos\b|analitica|\bcsv\b|data (?:mining|processing|collection|analysis|management)|\bbi\b|power bi/.test(text)) return 'Datos y BI';
  if (/\bux\b|\bui\b|figma|diseno de interfaz/.test(text)) return 'Diseño UX/UI';
  if (/cloud|nube|hosting|devops|azure|\baws\b|kubernetes/.test(text)) return 'Cloud, hosting y DevOps';
  if (/redes|red de datos|conectividad|telecom|fibra optica|cableado|wifi/.test(text)) return 'Redes y telecomunicaciones';
  if (/hardware|servidor|computador|computacional|notebook|impresor|scanner|escaner/.test(text)) return 'Hardware y equipamiento';
  if (/\berp\b|\bcrm\b|\bsap\b|odoo|moodle|\blms\b/.test(text)) return 'ERP, CRM y plataformas';
  return 'Servicios TI por precisar';
}

export function isOpenOpportunity(item, now = new Date()) {
  if (item.status && item.status !== 'open') return false;
  if (item.deadline) return new Date(item.deadline).getTime() > now.getTime();
  // No invented deadline: require a recent explicit open status for marketplaces.
  const age = now.getTime() - new Date(item.checkedAt).getTime();
  return item.status === 'open' && age >= -300_000 && age < 24 * 3_600_000;
}

export function safeUrl(value, base) {
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

// Interpret source-local times consistently on GitHub's UTC runner and in Chile.
export function zonedISO(value, timeZone = 'America/Santiago') {
  if (!value) return undefined;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
  }
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m || Number(m[1]) < 2000) return undefined;
  const desired = Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0));
  let guess = desired;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' });
  for (let i=0;i<3;i++) {
    const p=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
    const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    guess += desired-actual;
  }
  return new Date(guess).toISOString();
}
