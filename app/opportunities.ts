export type Opportunity = {
  id: string;
  title: string;
  buyer: string;
  region: string;
  city: string;
  category: string;
  publishedAt: string;
  deadline: string;
  questionsDeadline?: string;
  budget?: number;
  currency: 'CLP' | 'USD';
  modality: string;
  description: string;
  requirements: string[];
  documents: string[];
  contactChannel: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  sourceUrl: string;
  applicationUrl?: string;
  sourceName?: string;
  sourceType?: 'public' | 'multilateral' | 'corporate';
  applicationSteps?: string[];
  sourceMode: 'live' | 'verified';
};

export type OpportunitySource = {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'empty' | 'portal' | 'error';
  count: number;
  detail: string;
};

export const southRegions = [
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
];

export const monitoredSources: OpportunitySource[] = [
  {
    id: 'mercado-publico',
    name: 'Mercado Público',
    url: 'https://www.mercadopublico.cl/Home',
    status: 'online',
    count: 0,
    detail: 'Licitaciones y compras públicas de Chile.',
  },
  {
    id: 'ungm',
    name: 'Naciones Unidas · UNGM',
    url: 'https://www.ungm.org/Public/Notice',
    status: 'online',
    count: 0,
    detail: 'Procesos activos con Chile como país beneficiario.',
  },
  {
    id: 'world-bank',
    name: 'Banco Mundial',
    url: 'https://projects.worldbank.org/en/projects-operations/procurement',
    status: 'online',
    count: 0,
    detail: 'Oportunidades de proyectos financiados en Chile.',
  },
  {
    id: 'codelco',
    name: 'Codelco',
    url: 'https://www.codelco.com/licitaciones-en-proceso',
    status: 'online',
    count: 0,
    detail: 'Licitaciones públicas corporativas en proceso.',
  },
  {
    id: 'bid',
    name: 'BID',
    url: 'https://www.iadb.org/es/como-podemos-trabajar-juntos/adquisiciones/adquisiciones-para-proyectos/avisos-de-adquisiciones',
    status: 'portal',
    count: 0,
    detail: 'Portal oficial de adquisiciones financiadas por el BID.',
  },
  {
    id: 'enap',
    name: 'ENAP',
    url: 'https://www.enap.cl/gestion-proveedores-enap',
    status: 'portal',
    count: 0,
    detail: 'Acceso al portal de licitaciones activas de ENAP.',
  },
];

export const verifiedOpportunities: Opportunity[] = [
  {
    id: '752-29-LP26',
    title: 'Adquisición de licencias y suscripciones',
    buyer: 'Gobierno Regional de Los Lagos',
    region: 'Los Lagos',
    city: 'Puerto Montt',
    category: 'Licencias y nube',
    publishedAt: '2026-08-24T09:39:00-04:00',
    deadline: '2026-09-08T15:30:00-04:00',
    questionsDeadline: '2026-08-27T23:59:00-04:00',
    budget: 271586000,
    currency: 'CLP',
    modality: 'Licitación pública LP',
    description:
      'Adquisición de licencias, suscripciones y servicios asociados para la continuidad tecnológica del Gobierno Regional de Los Lagos.',
    requirements: [
      'Estar hábil en el Registro de Proveedores para contratar con el Estado.',
      'Presentar anexos administrativos, oferta técnica y oferta económica en Mercado Público.',
      'No se permite subcontratación para la prestación principal.',
      'Considerar soporte y postventa, ponderados con un 30% de la evaluación.',
    ],
    documents: [
      'Bases administrativas y técnicas',
      'Anexo 1 — identificación del oferente',
      'Anexo 4 — oferta técnica',
      'Anexo 3 — oferta económica',
    ],
    contactChannel:
      'Foro y módulo de ofertas de Mercado Público. Usa el ID 752-29-LP26 para encontrar el proceso.',
    sourceUrl:
      'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=8ZQsvhILsljZJwGEMeRumQ%3D%3D',
    sourceMode: 'verified',
  },
  {
    id: '1007793-15-LE26',
    title: 'Solución informática institucional para el CFT',
    buyer: 'CFT Estatal de la Región de Los Lagos',
    region: 'Los Lagos',
    city: 'Llanquihue',
    category: 'Desarrollo de software',
    publishedAt: '2026-08-24T12:00:00-04:00',
    deadline: '2026-09-07T15:30:00-04:00',
    currency: 'CLP',
    modality: 'Licitación pública LE',
    description:
      'Diseño e implementación de una plataforma web para administrar iniciativas de vinculación con el medio, incluyendo puesta en marcha y 24 meses de soporte.',
    requirements: [
      'Proponer una solución web alineada con las bases técnicas.',
      'Incluir implementación, puesta en marcha y acompañamiento.',
      'Considerar soporte y continuidad por 24 meses.',
      'Ingresar la propuesta exclusivamente por Mercado Público.',
    ],
    documents: ['Bases administrativas', 'Bases técnicas', 'Anexos de oferta'],
    contactChannel:
      'Foro y módulo de ofertas de Mercado Público. Busca el ID 1007793-15-LE26.',
    sourceUrl:
      'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=rT0Y9g9lZjQr4PKQuyPcQQ%3D%3D',
    sourceMode: 'verified',
  },
  {
    id: '652-37-LP26',
    title: 'Arriendo de servidor informático para programa SISSA',
    buyer: 'Servicio de Salud Arauco',
    region: 'Biobío',
    city: 'Lebu / Temuco',
    category: 'Infraestructura TI',
    publishedAt: '2026-08-25T10:00:00-04:00',
    deadline: '2026-09-11T15:00:00-04:00',
    currency: 'CLP',
    modality: 'Licitación pública LP',
    description:
      'Arriendo por 36 meses de un servidor informático para el programa SISSA, incluyendo instalación y servicios asociados en Temuco.',
    requirements: [
      'Proveer el equipamiento y capacidad descritos en las bases técnicas.',
      'Incluir instalación y puesta en operación en Temuco.',
      'Asegurar continuidad del servicio durante 36 meses.',
      'Postular mediante el portal Mercado Público.',
    ],
    documents: ['Bases administrativas', 'Especificaciones técnicas', 'Anexos de oferta'],
    contactChannel:
      'Foro y módulo de ofertas de Mercado Público. Busca el ID 652-37-LP26.',
    sourceUrl:
      'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=dePvTTA5mPLXePPtJDYdDQ%3D%3D',
    sourceMode: 'verified',
  },
  {
    id: '869591-10-LP26',
    title: 'Diseño y desarrollo del nuevo portal API y capa de datos',
    buyer: 'Dirección de Compras y Contratación Pública',
    region: 'Metropolitana',
    city: 'Santiago',
    category: 'Desarrollo de software',
    publishedAt: '2026-08-18T09:00:00-04:00',
    deadline: '2026-09-07T15:00:00-04:00',
    currency: 'CLP',
    modality: 'Licitación pública LP',
    description:
      'Diseño y desarrollo del nuevo portal de APIs y de una capa de datos de negocio para la plataforma Mercado Público.',
    requirements: [
      'Acreditar experiencia en arquitectura, APIs y desarrollo de productos digitales.',
      'Entregar propuesta técnica, metodología, equipo y plan de trabajo.',
      'Presentar oferta económica y antecedentes administrativos solicitados.',
      'Canalizar preguntas y oferta por Mercado Público.',
    ],
    documents: ['Bases administrativas', 'Bases técnicas', 'Anexos y formatos de oferta'],
    contactChannel:
      'Foro y módulo de ofertas de Mercado Público. Busca el ID 869591-10-LP26.',
    sourceUrl:
      'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=95%2FFWEC+dXz256RVZ%2FCRJw%3D%3D',
    sourceMode: 'verified',
  },
  {
    id: '869591-11-LR26',
    title: 'Desarrollo del proyecto Nueva OC',
    buyer: 'Dirección de Compras y Contratación Pública',
    region: 'Metropolitana',
    city: 'Santiago',
    category: 'Desarrollo de software',
    publishedAt: '2026-08-21T09:00:00-04:00',
    deadline: '2026-09-21T15:01:00-04:00',
    questionsDeadline: '2026-09-02T15:00:00-04:00',
    currency: 'CLP',
    modality: 'Licitación pública LR',
    description:
      'Desarrollo de una nueva experiencia de órdenes de compra con arquitectura cloud-native, modular y orientada a células de producto.',
    requirements: [
      'Experiencia demostrable en desarrollo cloud-native y arquitectura modular.',
      'Proponer equipo multidisciplinario y metodología de ejecución.',
      'Responder a los entregables y niveles de servicio de las bases.',
      'Postular mediante Mercado Público antes del cierre.',
    ],
    documents: ['Bases administrativas', 'Bases técnicas', 'Anexos de evaluación'],
    contactChannel:
      'Foro y módulo de ofertas de Mercado Público. Busca el ID 869591-11-LR26.',
    sourceUrl:
      'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=Ykz9lML6G0KIIVPNn4mrjQ%3D%3D',
    sourceMode: 'verified',
  },
  {
    id: '2239-2-LR26',
    title: 'Convenio Marco de desarrollo y servicios de software',
    buyer: 'Dirección de Compras y Contratación Pública',
    region: 'Metropolitana',
    city: 'Santiago',
    category: 'Servicios TI',
    publishedAt: '2026-08-14T09:00:00-04:00',
    deadline: '2026-09-25T15:00:00-04:00',
    currency: 'CLP',
    modality: 'Convenio Marco LR',
    description:
      'Convenio Marco para desarrollo y mantenimiento de software, servicios TI, nube, datos, inteligencia artificial, automatización y RPA.',
    requirements: [
      'Seleccionar las categorías en que la empresa cumple experiencia y capacidad.',
      'Acreditar antecedentes técnicos y comerciales requeridos por categoría.',
      'Completar los anexos administrativos y económicos de las bases.',
      'Presentar la oferta completa en Mercado Público.',
    ],
    documents: ['Bases del Convenio Marco', 'Fichas por categoría', 'Anexos de postulación'],
    contactChannel:
      'Foro y módulo de ofertas de Mercado Público. Busca el ID 2239-2-LR26.',
    sourceUrl:
      'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=xoQZDcD073vjsJyBHHMKrg%3D%3D',
    sourceMode: 'verified',
  },
];
