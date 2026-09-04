import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, isOpenOpportunity, isTechnologyText, isProcurementTechnology, isChileProcurement, zonedISO, safeUrl } from '../lib/opportunity-rules.mjs';
import { mapCodelcoRow, mapMarketApiTender } from '../scripts/sync-opportunities.mjs';
import { loadFreelancer, mapFreelancerProject, mapUndpNotice, undpDate, htmlText } from '../scripts/sources/additional-sources.mjs';

const now = new Date('2026-09-04T12:00:00Z');
test('procurement portal instructions and appliance features do not imply IT work',()=>{
  assert.equal(isProcurementTechnology('Aplicación de prueba piloto a establecimientos','Consulte las guías del sitio web del PNUD https://oraclecloud.com'),false);
  assert.equal(isProcurementTechnology('Equipamiento de refrigeración','Programación de carga y conectividad Bluetooth en balanza'),false);
  assert.equal(isProcurementTechnology('Servicios para el proyecto','Se requiere desarrollo de software para análisis de datos'),true);
  assert.equal(isChileProcurement('Chile'),true);
  assert.equal(isChileProcurement('Multiple destinations (see the Countries or territories tab)'),false);
  assert.equal(isChileProcurement(undefined),false);
});
for (const [title, expected] of [
  ['Instalación de software antivirus','Instalación y configuración'],
  ['Instalación de software de desarrollo','Instalación y configuración'],
  ['Licencias Moodle LMS','Licencias y suscripciones'],
  ['Implementación Moodle','ERP, CRM y plataformas'],
  ['Plataforma LMS','ERP, CRM y plataformas'],
  ['Adquisición de software','Licencias y suscripciones'],
  ['Desarrollo de software a medida','Desarrollo de software'],
  ['Diseño y desarrollo de sitio web','Desarrollo web y e-commerce'],
  ['Desarrollo de aplicación móvil Android','Aplicaciones móviles'],
  ['Servicio de soporte informático','Soporte y mantenimiento'],
  ['Restablecer accesos SSH/HTTP Azure','Soporte y mantenimiento'],
  ['Arriendo de servidores','Hardware y equipamiento'],
  ['Servicio de conectividad fibra óptica','Redes y telecomunicaciones'],
  ['Servicio de hosting cloud','Cloud, hosting y DevOps'],
  ['Auditoría de ciberseguridad','Consultoría y auditoría TI'],
  ['Análisis de datos Power BI','Datos y BI'],
  ['Automatización RPA','IA y automatización'],
  ['Diseño UX/UI','Diseño UX/UI'],
  ['Capacitación informática','Capacitación TI'],
  ['API .NET para DTE Chile','Servicios TI por precisar'],
  ['ARRIENDO DE SOFTWARE DE REGISTRO CLÍNICO ELECTRÓNICO','Licencias y suscripciones'],
  ['ADQUISICIÓN DE CREDITOS GOOGLE CLOUD PLATFORM','Cloud, hosting y DevOps'],
  ['CÁPSULA DIGITAL MOODLE – SALUD MENTAL','Capacitación TI'],
  ['SERVICIO DE MEJORA CONTINUA DEL SISTEMA ERP SAP','Soporte y mantenimiento'],
  ['SERVICIO DE OPERACIÓN SISTEMA DE CONTROL CENTRALIZADO BMS','Soporte y mantenimiento'],
]) test(`clasificación: ${title}`,()=>assert.equal(classify(title),expected));

test('installation intent in title wins over incidental development in description',()=>assert.equal(classify('Instalación de software','El fabricante describe su desarrollo de software a medida.'),'Instalación y configuración'));
test('non-IT and warehouse false positives are excluded',()=>{
  assert.equal(isTechnologyText('Licencia de conducir'),false);
  assert.equal(isTechnologyText('ARRIENDO MODULOS BODEGA PARA INFORMÁTICA HSR'),false);
  assert.equal(isTechnologyText('Servicio de programación web'),true);
  assert.equal(isTechnologyText('PROGRAMA AMPLIADO DE INTERCAMBIO Y CAPACITACIÓN DE BENEFICIARIOS'),false);
  assert.equal(isTechnologyText('SERVICIOS DE TRANSPORTE SUM PLANTA'),false);
  assert.equal(isTechnologyText('Edición Videos Promocionales','programas informáticos'),false);
});
test('API development is not mistaken for incidental audit requirements',()=>assert.equal(classify('API .NET para DTE Chile','Necesito desarrollar una API robusta en .NET 9. Registro de auditoría interna.'),'Integraciones y API'));
test('Chilean dates respect DST and explicit offsets',()=>{
  assert.equal(zonedISO('2026-09-04T15:00:00'),'2026-09-04T19:00:00.000Z');
  assert.equal(zonedISO('2026-09-10T15:00:00'),'2026-09-10T18:00:00.000Z');
  assert.equal(zonedISO('2026-09-10T15:00:00Z'),'2026-09-10T15:00:00.000Z');
  assert.equal(zonedISO('1900-01-01T00:00:00'),undefined);
});
test('undated open projects expire after 24h without a new check',()=>{
  assert.equal(isOpenOpportunity({status:'open',checkedAt:now.toISOString()},now),true);
  assert.equal(isOpenOpportunity({status:'open',checkedAt:'2026-09-03T10:00:00Z'},now),false);
  assert.equal(isOpenOpportunity({},now),false);
  assert.equal(isOpenOpportunity({deadline:'2026-09-03T10:00:00Z'},now),false);
  assert.equal(isOpenOpportunity({status:'closed',deadline:'2026-09-10T10:00:00Z'},now),false);
});
test('Mercado Público keeps every item and real contacts and calendar',()=>{
  const row={CodigoExterno:'TEST-1',CodigoEstado:5,Nombre:'Instalación de software',Descripcion:'Instalar software existente',FechaCierre:'2026-09-10T15:00:00',Comprador:{NombreOrganismo:'Entidad',NombreUsuario:'Comprador'},NombreResponsableContrato:'Responsable',EmailResponsableContrato:'contratos@example.cl',Fechas:{FechaPubRespuestas:'2026-09-08T15:00:00'},Items:{Listado:Array.from({length:12},(_,i)=>({NombreProducto:`Software ${i}`,Descripcion:`Instalación ${i}`,Cantidad:i+1,UnidadMedida:'unidad'}))}};
  const mapped=mapMarketApiTender(row,now);
  assert.equal(mapped.requirements.length,12);
  assert.equal(mapped.contacts[1].role,'Responsable del contrato');
  assert.equal(mapped.category,'Instalación y configuración');
  assert.equal(mapped.deadline,'2026-09-10T18:00:00.000Z');
  assert.equal(mapped.milestones.length,1);
  assert.equal(mapped.publishedAt,undefined);
  assert.equal(mapMarketApiTender({...row,CodigoEstado:8},now),null);
});
test('software development product labels do not imply custom development',()=>{
  const item=mapMarketApiTender({CodigoExterno:'TEST',Nombre:'SOLUCIÓN INFORMÁTICA INSTITUCIONAL',Descripcion:'Adquisición de una solución informática para gestión.',FechaCierre:'2026-09-10T15:00:00',Items:{Listado:[{NombreProducto:'Software de desarrollo de plataforma Web',Descripcion:'Implementación y puesta en marcha de la solución'}]}},now);
  assert.equal(item.category,'Instalación y configuración');
});
const project={id:1,seo_url:'software/test',title:'Desarrollo de software',description:'Alcance completo\n'+ 'Requisito real. '.repeat(200),status:'active',frontend_project_status:'open',time_submitted:1788512942,currency:{code:'USD'},budget:{minimum:100,maximum:500},type:'fixed',jobs:[],bidperiod:7};
test('Freelancer retains full text without inventing contact or closing date',()=>{
  const mapped=mapFreelancerProject(project,now);
  assert.equal(mapped.description,project.description);
  assert.equal(mapped.deadline,undefined);
  assert.equal(mapped.contactEmail,undefined);
  assert.equal(mapped.sourceType,'marketplace');
  assert.equal(mapFreelancerProject({...project,frontend_project_status:'closed'},now),null);
  assert.equal(mapFreelancerProject({...project,upgrades:{fulltime:true}},now),null);
});
test('Freelancer uses country code cl, not an ignored country name',async()=>{
  const results=await loadFreelancer(now,{fetchJson:async url=>{
    assert.equal(new URL(url).searchParams.get('countries[]'),'cl');
    assert.equal(new URL(url).searchParams.get('full_description'),'true');
    return {status:'success',result:{projects:[project],total_count:1,users:{}}};
  }});
  assert.equal(results.length,1);
});
test('PNUD parses office, deadline, full description and documents',()=>{
  const html='<h2>Desarrollo web</h2><h6>Office</h6><p>UNDP-CHL - CHILE</p><h6>Deadline</h6><p>28-Sep-26 @ 03:00 PM (New York time)</p><h6>Reference Number</h6><p>UNDP-CHL-TEST</p><h6>Contact</h6><p>Contacto - proyecto@example.cl</p><div class="postContent"><p>Alcance: desarrollar software con entregables.</p><a href="view_file.cfm?doc_id=1">Documento</a></div></main><footer>No incluir</footer>';
  const item=mapUndpNotice(html,'https://procurement-notices.undp.org/view_negotiation.cfm?nego_id=1',now);
  assert.equal(item.deadline,'2026-09-28T19:00:00.000Z');
  assert.equal(item.documentLinks.length,1);
  assert.ok(!item.description.includes('No incluir'));
  assert.equal(mapUndpNotice(html.replace('UNDP-CHL - CHILE','UNDP-PER - PERU'),'https://example.com',now),null);
  assert.equal(undpDate('bad date'),undefined);
});
test('HTML stays plain text and external URLs are safe',()=>{
  assert.equal(htmlText('<p>Uno</p><p>Dos &aacute;</p><script>alert(1)</script>'),'Uno\nDos á');
  assert.equal(safeUrl('javascript:alert(1)'),undefined);
  assert.equal(safeUrl('/document.pdf','https://example.cl'),'https://example.cl/document.pdf');
});
test('Codelco uses the actual closing column, stable ID, and a direct document',()=>{
  const row=['04/09/2026','Servicios','<a href="/proceso.pdf">Instalación de software</a>','División','Ariba','Sin costo','10/09/2026 hasta las 16:00 horas'].map(value=>`<td>${value}</td>`).join('');
  const item=mapCodelcoRow(row,now);
  assert.equal(item.deadline,'2026-09-10T19:00:00.000Z');
  assert.equal(item.sourceUrl,'https://www.codelco.com/proceso.pdf');
  assert.equal(item.detailLevel,'summary');
  assert.equal(item.id,mapCodelcoRow(row,new Date('2026-09-05T12:00:00Z')).id);
  assert.equal(mapCodelcoRow(row.replace('Instalación de software','SERVICIOS DE TRANSPORTE'),now),null);
});
