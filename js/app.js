// Disciplinas por Bloques — MEGA PLAST / Grupo Nuwek
// Lógica principal · 2026
// ================================================== 

// ══════ CONSTANTES ══════
var TBKG={tactica:'#DBEAFE',operativa:'#D1FAE5',estrategica:'#FEF3C7',directiva:'#FEE2E2',socio:'#EDE9FE'};
var TCLR={tactica:'#2563EB',operativa:'#059669',estrategica:'#D97706',directiva:'#DC2626',socio:'#7C3AED'};
var TLBL={tactica:'Tactica',operativa:'Operativa',estrategica:'Estrategica',directiva:'Directiva',socio:'Socio'};
var TLBL2={tactica:'T\u00e1ctica',operativa:'Operativa',estrategica:'Estrat\u00e9gica',directiva:'Directiva',socio:'Socio'};
var TCLS={tactica:'tt',operativa:'to',estrategica:'te'};
var DIAS=['DOM.','LUN.','MAR.','MI\u00c9.','JUE.','VIE.','S\u00c1B.'];
var DLBL=['Domingo','Lunes','Martes','Mi\u00e9rcoles','Jueves','Viernes','S\u00e1bado'];
var H_INI=5,H_FIN=21;
var DURS=[{q:1,label:'15 min',sub:'m\u00ednimo'},{q:2,label:'30 min',sub:''},{q:4,label:'1 hora',sub:'por defecto'},{q:8,label:'2 horas',sub:''},{q:16,label:'4 horas',sub:''},{q:0,label:'Todo el d\u00eda',sub:'m\u00e1ximo'}];
function durLabel(q){var d=DURS.find(function(x){return x.q===q;});return d?d.label:'1 hora';}
function badgeHTML(tipo){
  var bg=TBKG[tipo]||'#F3F4F6',cl=TCLR[tipo]||'#6B7280',lbl=TLBL2[tipo]||tipo;
  return '<span style="background:'+bg+';color:'+cl+';padding:4px 10px;border-radius:8px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:5px;min-width:90px;justify-content:center;white-space:nowrap;"><span style="width:7px;height:7px;border-radius:50%;background:'+cl+';flex-shrink:0;display:inline-block;"></span>'+lbl+'</span>';
}
function G(id){return document.getElementById(id);}
function initials(n){return n.split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase();}

// ══════ ESTADO GLOBAL ══════
// EMPRESAS[id] = { id, nombre, puestos:{}, puestoId }
// puestos[id]  = { id, nombre, acts[], fmts{}, encs[], encId, actCtr }
var EMPRESAS={};
var empresaId=null;
var empCounter=0,puestoCounter=0;
var dragActId=null,dragFrom=null,pending=null,popDurQ=4,popRep='solo',editActId=null,fmtActId=null;

function getEmpresa(){return EMPRESAS[empresaId];}
function getPuesto(){var e=getEmpresa();return e?e.puestos[e.puestoId]:null;}
function getEnc(){var p=getPuesto();return p?p.encs.find(function(e){return e.id===p.encId;}):null;}
function newEmpId(){return 'E'+(++empCounter)+'_'+Date.now();}
function newPuestoId(){return 'P'+(++puestoCounter)+'_'+Date.now();}
function newActId(p){return 'A'+(++(p.actCtr))+'_'+p.id;}
function newEncId(){return 'enc_'+Date.now();}

function crearEmpresa(nombre){
  var id=newEmpId();
  EMPRESAS[id]={id:id,nombre:nombre,puestos:{},puestoId:null};
  return id;
}
function crearPuesto(empId,nombre){
  var e=EMPRESAS[empId];
  var id=newPuestoId();
  var eid=newEncId();
  e.puestos[id]={id:id,nombre:nombre,acts:[],fmts:{},encs:[{id:eid,nombre:nombre,celdas:{}}],encId:eid,actCtr:0};
  if(!e.puestoId)e.puestoId=id;
  return id;
}


// ══════ GOOGLE SHEETS ══════
var GS_URL='https://script.google.com/macros/s/AKfycby5DTjPIEbUQ5quH9hhYNssfwFv4gCIABW5gDu2bJHTzyiHuo8Yhy_K-YlgxyhOkU4l/exec';
var _saveTimer=null;
var _gsOk=false;

function syncStatus(state,msg){
  var bar=G('sync-bar'),sp=G('sync-msg');
  if(!bar)return;
  bar.className='sync-bar '+state;
  if(sp)sp.textContent=msg;
}

async function gs(action,data){
  var res=await fetch(GS_URL,{method:'POST',body:new URLSearchParams({action:action,data:JSON.stringify(data||{})})});
  return res.json();
}

// Carga todo desde Sheets al arrancar
async function cargarDesdeSheets(){
  syncStatus('loading','Cargando datos...');
  try{
    var r=await gs('cargarTodo');
    if(!r.ok) throw new Error(r.error||'Error al cargar');
    if(r.empresas && r.empresas.length){
      // Reconstruir estado desde Sheets
      EMPRESAS={};empCounter=0;puestoCounter=0;
      // empresas
      r.empresas.forEach(function(e){
        EMPRESAS[e.id]={id:e.id,nombre:e.nombre,puestos:{},puestoId:null};
      });
      // puestos
      r.puestos.forEach(function(p){
        var e=EMPRESAS[p.empresaId];if(!e)return;
        e.puestos[p.id]={id:p.id,nombre:p.nombre,acts:[],fmts:{},encs:[],encId:null,actCtr:0};
        if(!e.puestoId)e.puestoId=p.id;
      });
      // encargados
      r.encargados.forEach(function(enc){
        var e=EMPRESAS[enc.empresaId];if(!e)return;
        var p=e.puestos[enc.puestoId];if(!p)return;
        p.encs.push({id:enc.id,nombre:enc.nombre,celdas:{}});
        if(!p.encId)p.encId=enc.id;
      });
      // actividades
      r.actividades.forEach(function(a){
        var e=EMPRESAS[a.empresaId];if(!e)return;
        var p=e.puestos[a.puestoId];if(!p)return;
        p.acts.push({id:a.id,nombre:a.nombre,tipo:a.tipo,freq:a.freq});
      });
      // formatos
      r.formatos.forEach(function(f){
        var e=EMPRESAS[f.empresaId];if(!e)return;
        var p=e.puestos[f.puestoId];if(!p)return;
        p.fmts[f.actividadId]={link:f.link,nombre:f.nombre,notas:f.notas};
      });
      // bloques
      r.bloques.forEach(function(b){
        var e=EMPRESAS[b.empresaId];if(!e)return;
        var p=e.puestos[b.puestoId];if(!p)return;
        var enc=p.encs.find(function(en){return en.id===b.encargadoId;});if(!enc)return;
        var d=parseInt(b.dia),h=parseInt(b.hora),q=parseInt(b.durQ);
        if(!enc.celdas[d])enc.celdas[d]={};
        if(!enc.celdas[d][h])enc.celdas[d][h]=[];
        enc.celdas[d][h].push({actId:b.actividadId,durQ:q});
      });
      // Seleccionar primera empresa
      var ids=Object.keys(EMPRESAS);
      if(ids.length)empresaId=ids[0];
    }
    // Si Sheets estaba vacío, se mantienen los datos de demostración
    _gsOk=true;
    syncStatus('ok','Sincronizado con Google Sheets');
  } catch(err){
    _gsOk=false;
    syncStatus('err','Sin conexión — trabajando local ('+err.message+')');
  }
  renderEmpDrop();renderPuestosBar();renderCurrentView();
}

// Serializa el estado completo para enviarlo a Sheets
function serializarEstado(){
  var empresas=[],puestos=[],encargados=[],actividades=[],formatos=[],bloques=[];
  var hoy=new Date().toISOString().slice(0,10);
  Object.values(EMPRESAS).forEach(function(e){
    empresas.push({id:e.id,nombre:e.nombre,creadoEn:hoy});
    Object.values(e.puestos).forEach(function(p){
      puestos.push({id:p.id,empresaId:e.id,nombre:p.nombre,creadoEn:hoy});
      p.encs.forEach(function(enc){
        encargados.push({id:enc.id,puestoId:p.id,empresaId:e.id,nombre:enc.nombre,creadoEn:hoy});
        // bloques de este encargado
        Object.keys(enc.celdas).forEach(function(d){
          Object.keys(enc.celdas[d]).forEach(function(h){
            (enc.celdas[d][h]||[]).forEach(function(b){
              bloques.push({encargadoId:enc.id,actividadId:b.actId,puestoId:p.id,empresaId:e.id,dia:d,hora:h,durQ:b.durQ});
            });
          });
        });
      });
      p.acts.forEach(function(a){
        actividades.push({id:a.id,puestoId:p.id,empresaId:e.id,nombre:a.nombre,tipo:a.tipo,freq:a.freq,creadoEn:hoy});
      });
      Object.keys(p.fmts).forEach(function(actId){
        var f=p.fmts[actId];
        formatos.push({actividadId:actId,puestoId:p.id,empresaId:e.id,link:f.link||'',nombre:f.nombre||'',notas:f.notas||''});
      });
    });
  });
  return {empresas:empresas,puestos:puestos,encargados:encargados,actividades:actividades,formatos:formatos,bloques:bloques};
}

// Guarda con debounce de 1.5s para no saturar con cada clic
function guardarEnSheets(){
  if(!_gsOk)return;
  if(_saveTimer)clearTimeout(_saveTimer);
  syncStatus('saving','Guardando...');
  _saveTimer=setTimeout(async function(){
    try{
      var r=await gs('guardarTodo',serializarEstado());
      if(!r.ok)throw new Error(r.error||'Error al guardar');
      syncStatus('ok','Guardado ✓ '+new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}));
    } catch(err){
      syncStatus('err','Error al guardar: '+err.message);
    }
  },1500);
}

// ══════ INIT ══════
// Los datos de demostración se muestran solo si Sheets está vacío
(function(){
  var gnId=crearEmpresa('Grupo Nuwek');
  var cooId=crearPuesto(gnId,'COO');
  var pCoo=EMPRESAS[gnId].puestos[cooId];
  pCoo.acts.push({id:newActId(pCoo),nombre:'Reuni\u00f3n semanal de avances',tipo:'tactica',freq:'Semanal'});
  var mpId=crearEmpresa('Mega Plast');
  var udnId=crearPuesto(mpId,'Encargado de UDN');
  var pUdn=EMPRESAS[mpId].puestos[udnId];
  var base=[
    {nombre:'Brief diario con el equipo (5 min)',tipo:'tactica',freq:'Diaria'},
    {nombre:'Supervisar apertura y cierre con checklists',tipo:'operativa',freq:'Diaria'},
    {nombre:'Revisar venta vs metas del d\u00eda',tipo:'tactica',freq:'Diaria'},
    {nombre:'Supervisar caja, kileos y pedidos B2B',tipo:'operativa',freq:'Diaria'},
    {nombre:'Frenteo y rotaci\u00f3n de productos en piso',tipo:'operativa',freq:'Diaria'},
    {nombre:'Enlistar faltantes y cotejo vs SICAR',tipo:'operativa',freq:'Diaria'},
    {nombre:'Solicitudes de compra a AyF',tipo:'tactica',freq:'Semanal'},
    {nombre:'Reporte semanal de indicadores al Coord.',tipo:'tactica',freq:'Semanal'},
    {nombre:'Revisar KPIs y definir t\u00e1cticas',tipo:'estrategica',freq:'Semanal'},
    {nombre:'Supervisar entradas e inventario cr\u00edtico',tipo:'operativa',freq:'Semanal'},
    {nombre:'Acciones correctivas ante incidencias',tipo:'tactica',freq:'Semanal'},
  ];
  base.forEach(function(a){pUdn.acts.push({id:newActId(pUdn),nombre:a.nombre,tipo:a.tipo,freq:a.freq});});
  empresaId=gnId;
})();

// ══════ EMPRESA DROPDOWN ══════
function renderEmpDrop(){
  var e=getEmpresa();
  G('emp-btn-label').textContent=e?e.nombre:'—';
  G('logo-nombre').textContent=e?e.nombre.toUpperCase():'—';
  G('logo-initials').textContent=e?initials(e.nombre):'?';
  var list=G('emp-list');list.innerHTML='';
  Object.values(EMPRESAS).forEach(function(emp){
    var item=document.createElement('div');item.className='emp-item'+(emp.id===empresaId?' active':'');
    var check=document.createElement('span');check.className='emp-item-check';check.textContent=emp.id===empresaId?'\u2714':'';check.style.width='16px';
    var lbl=document.createElement('span');lbl.textContent=emp.nombre;lbl.style.flex='1';
    var x=document.createElement('button');x.className='emp-item-x';x.textContent='\u00d7';x.title='Eliminar empresa';
    x.onclick=function(e){e.stopPropagation();confirmarEliminarEmpresa(emp.id);};
    item.appendChild(check);item.appendChild(lbl);item.appendChild(x);
    item.onclick=function(){switchEmpresa(emp.id);closeEmpDrop();};
    list.appendChild(item);
  });
}
function toggleEmpDrop(){
  var btn=G('emp-btn'),drop=G('emp-drop');
  var isOpen=drop.classList.contains('open');
  if(isOpen){closeEmpDrop();}else{renderEmpDrop();drop.classList.add('open');btn.classList.add('open');}
}
function closeEmpDrop(){G('emp-drop').classList.remove('open');G('emp-btn').classList.remove('open');}
document.addEventListener('click',function(e){
  var sel=G('emp-selector');
  if(sel&&!sel.contains(e.target))closeEmpDrop();
});

function switchEmpresa(id){
  empresaId=id;
  renderEmpDrop();
  renderPuestosBar();
  renderCurrentView();
}

// ══════ MODAL NUEVA EMPRESA ══════
function openModalNuevaEmpresa(){
  closeEmpDrop();
  openOverlay('<div class="modal modal-sm"><div class="mhd"><div class="mttl">Nueva empresa</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div><div class="mlbl">Nombre de la empresa</div><input type="text" class="minp" id="ne-inp" placeholder="Ej: Distribuidora Norte..." onkeydown="if(event.key===\'Enter\')saveNuevaEmpresa()"/><div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bsav" onclick="saveNuevaEmpresa()">Crear</button></div></div>');
  setTimeout(function(){var i=G('ne-inp');if(i)i.focus();},80);
}
function saveNuevaEmpresa(){
  var i=G('ne-inp');if(!i)return;
  var n=i.value.trim();if(!n){showToast('Escribe un nombre');return;}
  var id=crearEmpresa(n);
  empresaId=id;
  closeOverlay();renderEmpDrop();renderPuestosBar();renderCurrentView();
  showToast('Empresa "'+n+'" creada');guardarEnSheets();
}
function confirmarEliminarEmpresa(id){
  closeEmpDrop();
  if(Object.keys(EMPRESAS).length===1){showToast('Debe existir al menos una empresa');return;}
  var nombre=EMPRESAS[id].nombre;
  openOverlay('<div class="modal modal-sm"><div class="mhd"><div class="mttl">Eliminar empresa</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div><p style="font-size:12px;line-height:1.6;margin-bottom:18px;color:var(--gris-m);">Eliminar <strong style="color:var(--negro);">'+nombre+'</strong> y todos sus puestos y calendarios. No se puede deshacer.</p><div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bdanger" onclick="eliminarEmpresa(\''+id+'\')">S\u00ed, eliminar</button></div></div>');
}
function eliminarEmpresa(id){
  delete EMPRESAS[id];
  if(empresaId===id)empresaId=Object.keys(EMPRESAS)[0];
  closeOverlay();renderEmpDrop();renderPuestosBar();renderCurrentView();showToast('Empresa eliminada');guardarEnSheets();
}

// ══════ BARRA PUESTOS ══════
function renderPuestosBar(){
  var e=getEmpresa();
  var bar=G('puestos-bar');bar.innerHTML='';
  if(!e)return;
  Object.values(e.puestos).forEach(function(p){
    var btn=document.createElement('button');
    btn.className='pt'+(p.id===e.puestoId?' active':'');
    var span=document.createElement('span');span.textContent=p.nombre;
    var x=document.createElement('button');x.className='pt-x';x.innerHTML='\u00d7';x.title='Eliminar puesto';
    x.onclick=function(ev){ev.stopPropagation();confirmarEliminarPuesto(p.id);};
    btn.appendChild(span);btn.appendChild(x);
    btn.onclick=function(){switchPuesto(p.id);};
    bar.appendChild(btn);
  });
  var add=document.createElement('button');add.className='pt-add';add.textContent='+ Nuevo puesto';
  add.onclick=openModalNuevoPuesto;
  bar.appendChild(add);
}
function switchPuesto(id){
  var e=getEmpresa();if(!e)return;
  e.puestoId=id;
  renderPuestosBar();renderCurrentView();
}
function renderCurrentView(){
  var active=document.querySelector('.view.active');if(!active)return;
  var name=active.id.replace('view-','');
  if(name==='clasificacion')renderClas();
  if(name==='calendario')renderCal();
  if(name==='biblioteca')renderBib();
}

// ══════ MODALES PUESTOS ══════
function openModalNuevoPuesto(){
  openOverlay('<div class="modal modal-sm"><div class="mhd"><div class="mttl">Nuevo puesto</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div><div class="mlbl">Nombre del puesto</div><input type="text" class="minp" id="np-inp" placeholder="Ej: Hunter, Gerente General..." onkeydown="if(event.key===\'Enter\')saveNuevoPuesto()"/><div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bsav" onclick="saveNuevoPuesto()">Crear</button></div></div>');
  setTimeout(function(){var i=G('np-inp');if(i)i.focus();},80);
}
function saveNuevoPuesto(){
  var i=G('np-inp');if(!i)return;
  var n=i.value.trim();if(!n){showToast('Escribe un nombre');return;}
  var e=getEmpresa();if(!e)return;
  var id=crearPuesto(empresaId,n);
  e.puestoId=id;
  closeOverlay();renderPuestosBar();renderCurrentView();showToast('Puesto "'+n+'" creado');guardarEnSheets();
}
function renombrarPuesto(){
  var p=getPuesto();if(!p)return;
  openOverlay('<div class="modal modal-sm"><div class="mhd"><div class="mttl">Renombrar puesto</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div><div class="mlbl">Nuevo nombre</div><input type="text" class="minp" id="rp-inp" value="'+p.nombre+'" onkeydown="if(event.key===\'Enter\')saveRenombrar()"/><div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bsav" onclick="saveRenombrar()">Guardar</button></div></div>');
  setTimeout(function(){var i=G('rp-inp');if(i){i.focus();i.select();}},80);
}
function saveRenombrar(){
  var n=(G('rp-inp')||{}).value.trim();if(!n)return;
  getPuesto().nombre=n;closeOverlay();renderPuestosBar();renderClas();showToast('Puesto renombrado');guardarEnSheets();
}
function confirmarEliminarPuesto(id){
  var e=getEmpresa();if(!e)return;
  if(Object.keys(e.puestos).length===1){showToast('Debe existir al menos un puesto');return;}
  var nombre=e.puestos[id].nombre;
  openOverlay('<div class="modal modal-sm"><div class="mhd"><div class="mttl">Eliminar puesto</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div><p style="font-size:12px;line-height:1.6;margin-bottom:18px;color:var(--gris-m);">Eliminar <strong style="color:var(--negro);">'+nombre+'</strong> y todo su contenido. No se puede deshacer.</p><div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bdanger" onclick="eliminarPuesto(\''+id+'\')">S\u00ed, eliminar</button></div></div>');
}
function eliminarPuesto(id){
  var e=getEmpresa();if(!e)return;
  delete e.puestos[id];
  if(e.puestoId===id)e.puestoId=Object.keys(e.puestos)[0]||null;
  closeOverlay();renderPuestosBar();renderCurrentView();showToast('Puesto eliminado');guardarEnSheets();
}

// ══════ NAVEGACION TABS ══════
function showView(name,btn){
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('active');});
  G('view-'+name).classList.add('active');
  if(btn)btn.classList.add('active');
  if(name==='clasificacion')renderClas();
  if(name==='calendario')renderCal();
  if(name==='biblioteca')renderBib();
}

// ══════ CLASIFICACION ══════
function renderClas(){
  var p=getPuesto();
  G('clas-titulo').textContent=p?p.nombre:'Sin puesto';
  var list=G('act-list');list.innerHTML='';
  if(!p||!p.acts.length){
    list.innerHTML='<div class="empty-puesto"><div class="ep-icon">&#128203;</div><div class="ep-t">Sin actividades todav\u00eda</div><div class="ep-s">Haz clic en <strong>+ Nueva actividad</strong> para construir el inventario.</div></div>';
    return;
  }
  p.acts.forEach(function(act){
    var fmt=p.fmts[act.id];
    var d=document.createElement('div');d.className='ac';
    d.innerHTML=badgeHTML(act.tipo)
      +'<span class="bfq">'+act.freq+'</span>'
      +'<span class="an">'+act.nombre+'</span>'
      +'<button class="bedit" onclick="openEditAct(\''+act.id+'\')">&#9998; Editar</button>'
      +'<button class="bfmt'+(fmt?' hl':'')+'" onclick="openFmt(\''+act.id+'\')">'+(fmt?'&#128279; '+(fmt.nombre||'Ver formato'):'+Formato')+'</button>'
      +'<button class="bdel" onclick="deleteAct(\''+act.id+'\')">\u00d7</button>';
    list.appendChild(d);
  });
}

// ══════ NUEVA / EDITAR ACTIVIDAD ══════
function openModalNuevaAct(){editActId=null;_openActModal('Nueva actividad','','tactica','Diaria',{});}
function openEditAct(id){
  var p=getPuesto();var act=p.acts.find(function(a){return a.id===id;});if(!act)return;
  editActId=id;_openActModal('Editar actividad',act.nombre,act.tipo,act.freq,p.fmts[id]||{});
}
function _openActModal(titulo,nombreVal,tipoVal,freqVal,fmtA){
  var tipos=[
    {k:'socio',l:'Socio',bg:'#EDE9FE',cl:'#7C3AED'},
    {k:'directiva',l:'Directiva',bg:'#FEE2E2',cl:'#DC2626'},
    {k:'estrategica',l:'Estrat\u00e9gica',bg:'#FEF3C7',cl:'#D97706'},
    {k:'tactica',l:'T\u00e1ctica',bg:'#DBEAFE',cl:'#2563EB'},
    {k:'operativa',l:'Operativa',bg:'#D1FAE5',cl:'#059669'},
  ];
  var freqs=['Diaria','Semanal','Quincenal','Mensual','Cuatrimestral'];
  var tipoBtns=tipos.map(function(t){
    var sel=tipoVal===t.k;
    return '<button class="tipo-btn'+(sel?' sel':'')+'" style="'+(sel?'background:'+t.bg+';color:'+t.cl+';border-color:'+t.cl+';':'')+'" onclick="selTipo(\''+t.k+'\',this,\''+t.bg+'\',\''+t.cl+'\')"><span style="width:9px;height:9px;border-radius:50%;background:'+t.cl+';display:inline-block;"></span>'+t.l+'</button>';
  }).join('');
  var freqOpts=freqs.map(function(f){return '<option'+(freqVal===f?' selected':'')+'>'+f+'</option>';}).join('');
  var flink=fmtA.link||'',fnom=fmtA.nombre||'',fnotas=fmtA.notas||'';
  openOverlay('<div class="modal" style="width:480px;"><div class="mhd"><div class="mttl">'+titulo+'</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div>'
    +'<div class="mlbl">Nombre de la actividad</div><input type="text" class="minp" id="na-nombre" value="'+nombreVal+'" placeholder="Ej: Revisi\u00f3n de inventario"/>'
    +'<div class="mlbl">Tipo</div><div class="tipo-grid">'+tipoBtns+'</div><input type="hidden" id="na-tipo" value="'+tipoVal+'"/>'
    +'<div class="mlbl">Frecuencia</div><select class="minp" id="na-freq" style="cursor:pointer;">'+freqOpts+'</select>'
    +'<div style="height:1px;background:var(--borde);margin:4px 0 14px;"></div>'
    +'<div class="mlbl">Formato (opcional)</div>'
    +'<input type="url" class="minp" id="na-flink" value="'+flink+'" placeholder="https://docs.google.com/..."/>'
    +'<input type="text" class="minp" id="na-fnom" value="'+fnom+'" placeholder="Nombre del formato"/>'
    +'<textarea class="mta" id="na-fnotas" placeholder="Para qu\u00e9 sirve?">'+fnotas+'</textarea>'
    +'<div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bsav" onclick="saveNuevaAct()">Guardar</button></div></div>');
  setTimeout(function(){var i=G('na-nombre');if(i){i.focus();i.select();}},80);
}
function selTipo(key,btn,bg,cl){
  G('na-tipo').value=key;
  document.querySelectorAll('.tipo-btn').forEach(function(b){b.classList.remove('sel');b.style.background='';b.style.color='';b.style.borderColor='';});
  btn.classList.add('sel');btn.style.background=bg;btn.style.color=cl;btn.style.borderColor=cl;
}
function saveNuevaAct(){
  var nombre=(G('na-nombre')||{}).value.trim();
  var tipo=(G('na-tipo')||{}).value||'tactica';
  var freq=(G('na-freq')||{}).value||'Diaria';
  var flink=(G('na-flink')||{}).value.trim();
  var fnom=(G('na-fnom')||{}).value.trim();
  var fnotas=(G('na-fnotas')||{}).value.trim();
  if(!nombre){showToast('Escribe un nombre');return;}
  var p=getPuesto();var actId;
  if(editActId){
    var act=p.acts.find(function(a){return a.id===editActId;});
    if(act){act.nombre=nombre;act.tipo=tipo;act.freq=freq;}
    actId=editActId;showToast('Actividad actualizada');
  } else {
    actId=newActId(p);p.acts.push({id:actId,nombre:nombre,tipo:tipo,freq:freq});
    showToast('Actividad creada');
  }
  if(flink||fnom||fnotas)p.fmts[actId]={link:flink,nombre:fnom,notas:fnotas};
  closeOverlay();renderClas();renderBanco();renderBib();guardarEnSheets();
}
function deleteAct(id){
  var p=getPuesto();if(!p)return;
  p.encs.forEach(function(enc){
    Object.keys(enc.celdas).forEach(function(d){
      Object.keys(enc.celdas[d]).forEach(function(h){
        enc.celdas[d][h]=enc.celdas[d][h].filter(function(b){return b.actId!==id;});
      });
    });
  });
  p.acts=p.acts.filter(function(a){return a.id!==id;});
  delete p.fmts[id];
  showToast('Actividad eliminada');guardarEnSheets();
  renderClas();renderBanco();buildTable();renderComp();
}

// ══════ OVERLAY ══════
function openOverlay(html){G('overlay-content').innerHTML=html;G('overlay').classList.add('open');}
function closeOverlay(){G('overlay').classList.remove('open');G('overlay-content').innerHTML='';}
function overlayClick(e){if(e.target===G('overlay'))closeOverlay();}

// ══════ MODAL FORMATO ══════
function openFmt(id){
  fmtActId=id;
  var p=getPuesto();var act=p.acts.find(function(a){return a.id===id;});var fmt=p.fmts[id]||{};
  openOverlay('<div class="modal"><div class="mhd"><div class="mttl">'+act.nombre+'</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div>'
    +'<div class="mbdg">'+badgeHTML(act.tipo)+'<span class="bfq">'+act.freq+'</span></div>'
    +'<div class="mlbl">Link al formato</div><input type="url" class="minp" id="fmt-link" value="'+(fmt.link||'')+'" placeholder="https://..."/>'
    +'<div class="mlbl">Nombre del formato</div><input type="text" class="minp" id="fmt-nom" value="'+(fmt.nombre||'')+'" placeholder="Ej: Checklist de Apertura"/>'
    +'<div class="mlbl">Notas (opcional)</div><textarea class="mta" id="fmt-notas">'+(fmt.notas||'')+'</textarea>'
    +'<div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bsav" onclick="saveFmt()">Guardar</button></div></div>');
}
function saveFmt(){
  var p=getPuesto();
  p.fmts[fmtActId]={link:G('fmt-link').value.trim(),nombre:G('fmt-nom').value.trim(),notas:G('fmt-notas').value.trim()};
  closeOverlay();renderClas();showToast('Formato guardado');guardarEnSheets();
}

// ══════ MODAL ENCARGADO ══════
function openModalEnc(){
  openOverlay('<div class="modal modal-sm"><div class="mhd"><div class="mttl">Nuevo encargado</div><button class="mx" onclick="closeOverlay()">\u00d7</button></div><div class="mlbl">Nombre</div><input type="text" class="minp" id="enc-inp" placeholder="Ej: Luis Ram\u00edrez" onkeydown="if(event.key===\'Enter\')saveEnc()"/><div class="mfts"><button class="bcan" onclick="closeOverlay()">Cancelar</button><button class="bsav" onclick="saveEnc()">Agregar</button></div></div>');
  setTimeout(function(){var i=G('enc-inp');if(i)i.focus();},80);
}
function saveEnc(){
  var i=G('enc-inp');if(!i)return;var n=i.value.trim();if(!n)return;
  var p=getPuesto();var id=newEncId();
  p.encs.push({id:id,nombre:n,celdas:{}});p.encId=id;
  closeOverlay();renderCal();showToast(n+' agregado');guardarEnSheets();
}

// ══════ POPUP BLOQUE ══════
function openPopup(actId,diaIdx,horaIdx,durQ,isNew){
  pending={actId:actId,diaIdx:diaIdx,horaIdx:horaIdx,isNew:isNew};
  popDurQ=durQ||4;popRep='solo';
  var acts=getPuesto().acts;var act=acts.find(function(a){return a.id===actId;});
  var h=horaIdx+H_INI,hd=h>12?h-12:h,suf=h<12?'AM':'PM';
  var durBtns=DURS.map(function(d){return '<button class="dur-btn'+(popDurQ===d.q?' sel':'')+'" onclick="selDur('+d.q+',this)">'+d.label+(d.sub?'<small>'+d.sub+'</small>':'')+'</button>';}).join('');
  var repSec=isNew?'<div class="sep"></div><div class="pb-sect">En qu\u00e9 d\u00edas?</div><div class="rep-grid"><button class="rep-btn sel" id="pb-rep-solo" onclick="selRep(\'solo\')">Solo este d\u00eda<small>'+DLBL[diaIdx]+'</small></button><button class="rep-btn" id="pb-rep-week" onclick="selRep(\'semana\')">Toda la semana<small>Dom \u2013 S\u00e1b</small></button></div>':'';
  openOverlay('<div class="popup-box"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;"><div style="font-family:\'DM Serif Display\',serif;font-size:17px;">'+(isNew?'Configurar bloque':'Editar duraci\u00f3n')+'</div><button class="mx" onclick="cancelPopup()">\u00d7</button></div><div style="font-size:11px;color:var(--gris-m);margin-bottom:18px;"><strong>'+act.nombre+'</strong> \u2014 '+DLBL[diaIdx]+', '+hd+':00 '+suf+'</div><div class="pb-sect">Duraci\u00f3n</div><div class="dur-grid">'+durBtns+'</div>'+repSec+'<div class="pb-fts"><button class="bcan" onclick="cancelPopup()">Cancelar</button><button class="bsav" onclick="confirmBloque()">Confirmar</button></div></div>');
}
function selDur(q,btn){popDurQ=q;document.querySelectorAll('.dur-btn').forEach(function(b){b.classList.remove('sel');});if(btn)btn.classList.add('sel');}
function selRep(val){
  popRep=val;
  var s=G('pb-rep-solo'),w=G('pb-rep-week');
  if(s)s.classList.toggle('sel',val==='solo');
  if(w)w.classList.toggle('sel',val==='semana');
}
function confirmBloque(){
  if(!pending)return;
  var enc=getEnc();var actId=pending.actId,diaIdx=pending.diaIdx,horaIdx=pending.horaIdx;
  if(popRep==='semana'){
    DIAS.forEach(function(_,d){rmCell(enc,d,horaIdx,actId);cell(enc,d,horaIdx).push({actId:actId,durQ:popDurQ});});
    showToast('Colocado toda la semana \u2014 '+durLabel(popDurQ));
  } else {
    rmCell(enc,diaIdx,horaIdx,actId);cell(enc,diaIdx,horaIdx).push({actId:actId,durQ:popDurQ});
    if(!pending.isNew)showToast('Duraci\u00f3n: '+durLabel(popDurQ));
  }
  pending=null;closeOverlay();buildTable();renderBanco();renderComp();guardarEnSheets();
}
function cancelPopup(){pending=null;closeOverlay();buildTable();renderBanco();}

// ══════ HELPERS CALENDARIO ══════
function cell(enc,d,h){if(!enc.celdas[d])enc.celdas[d]={};if(!enc.celdas[d][h])enc.celdas[d][h]=[];return enc.celdas[d][h];}
function rmCell(enc,d,h,actId){if(enc.celdas[d]&&enc.celdas[d][h])enc.celdas[d][h]=enc.celdas[d][h].filter(function(b){return b.actId!==actId;});}
function placed(enc){
  var s=new Set();
  Object.values(enc.celdas).forEach(function(r){
    Object.values(r).forEach(function(arr){
      arr.forEach(function(b){ if(b.actId) s.add(b.actId); });
    });
  });
  return s;
}
function debugPlaced(){
  var enc=getEnc();var p=getPuesto();if(!enc||!p)return;
  var pl=placed(enc);
  console.log('=== PLACED actIds ===');
  pl.forEach(function(id){console.log('  placed:',JSON.stringify(id));});
  console.log('=== ACT ids ===');
  p.acts.forEach(function(a){console.log('  act:',JSON.stringify(a.id),'|',a.nombre);});
  console.log('=== RAW CELDAS ===');
  Object.keys(enc.celdas).forEach(function(d){
    Object.keys(enc.celdas[d]).forEach(function(h){
      (enc.celdas[d][h]||[]).forEach(function(b){
        console.log('  d:'+d+' h:'+h+' actId:'+JSON.stringify(b.actId));
      });
    });
  });
}

// ══════ RENDER CALENDARIO ══════
function renderCal(){renderEncTabs();buildTable();renderBanco();renderComp();var enc=getEnc();G('enc-label').textContent=enc?enc.nombre:'\u2014';}
function renderEncTabs(){
  var p=getPuesto();if(!p)return;
  var row=G('enc-row');row.innerHTML='';
  p.encs.forEach(function(enc){
    var b=document.createElement('button');b.className='ec'+(enc.id===p.encId?' active':'');b.textContent=enc.nombre;
    b.onclick=function(){p.encId=enc.id;renderCal();};
    row.appendChild(b);
  });
}
function buildTable(){
  var PX_H=60,PX_Q=PX_H/4;
  var thead=G('cal-thead');thead.innerHTML='<th style="width:54px;background:#fff;border:none;"></th>';
  DIAS.forEach(function(d){var th=document.createElement('th');th.textContent=d;thead.appendChild(th);});
  var tbody=G('cal-tbody');tbody.innerHTML='';
  for(var h=H_INI;h<H_FIN;h++){
    var hIdx=h-H_INI;var tr=document.createElement('tr');
    var htd=document.createElement('td');htd.className='hora-td';
    var hd=h>12?h-12:h,suf=h<12?'AM':'PM';htd.textContent=hd+' '+suf;
    tr.appendChild(htd);
    DIAS.forEach(function(_,dIdx){
      (function(cD,cH){
        var td=document.createElement('td');td.className='cal-td';td.dataset.dia=cD;td.dataset.hora=cH;
        td.addEventListener('dragover',function(e){e.preventDefault();td.classList.add('drag-over');});
        td.addEventListener('dragleave',function(){td.classList.remove('drag-over');});
        td.addEventListener('drop',function(e){e.preventDefault();td.classList.remove('drag-over');handleDrop(cD,cH);});
        tr.appendChild(td);
      })(dIdx,hIdx);
    });
    tbody.appendChild(tr);
  }
  requestAnimationFrame(function(){drawBlockLayer(PX_H,PX_Q);});
}
function drawBlockLayer(PX_H,PX_Q){
  var layer=G('bloque-layer');if(!layer)return;
  layer.innerHTML='';layer.style.pointerEvents='none';
  var table=G('cal-table-el');if(!table)return;
  var headers=table.querySelectorAll('thead th');
  var colLeft=[],colWidth=[];
  headers.forEach(function(th,i){if(i===0)return;colLeft.push(th.offsetLeft);colWidth.push(th.offsetWidth);});
  var theadH=table.querySelector('thead').offsetHeight;
  var enc=getEnc();if(!enc)return;
  var acts=getPuesto().acts;
  DIAS.forEach(function(_,dIdx){
    for(var hIdx=0;hIdx<(H_FIN-H_INI);hIdx++){
      var arr=(enc.celdas[dIdx]||{})[hIdx]||[];if(!arr.length)continue;
      var x=colLeft[dIdx],w=colWidth[dIdx],yBase=theadH+hIdx*PX_H;
      var stackTop=yBase+2;
      arr.forEach(function(b){
        var act=acts.find(function(a){return a.id===b.actId;});if(!act)return;
        var slots=b.durQ===0?(H_FIN-H_INI)*4:b.durQ;
        var blqH=Math.max(slots*PX_Q-2,16);
        var el=document.createElement('div');
        var bCls=TCLS[act.tipo];
        var bBg=TBKG[act.tipo]||'#D1FAE5',bCl=TCLR[act.tipo]||'#059669';
        if(bCls){el.className='bloque '+bCls;}
        else{el.className='bloque';el.style.background=bBg;el.style.color=bCl;el.style.borderLeftColor=bCl;el.style.borderRadius='5px';}
        el.style.position='absolute';el.style.left=(x+2)+'px';el.style.top=stackTop+'px';
        el.style.width=(w-4)+'px';el.style.height=blqH+'px';el.style.pointerEvents='all';el.style.zIndex=5;
        el.style.display='flex';el.style.alignItems='flex-start';el.style.gap='4px';el.style.boxSizing='border-box';
        var showDur=blqH>=32;
        el.innerHTML='<div style="flex:1;overflow:hidden;min-width:0;"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:600;">'+act.nombre+'</span>'+(showDur?'<span style="font-size:8px;font-weight:500;opacity:.65;">'+durLabel(b.durQ)+'</span>':'')+'</div><button class="bx" style="pointer-events:all;">\u00d7</button>';
        el.draggable=true;
        (function(bActId,dI,hI){
          el.addEventListener('dragstart',function(e){dragActId=bActId;dragFrom={diaIdx:dI,horaIdx:hI};e.dataTransfer.effectAllowed='move';});
          el.querySelector('.bx').addEventListener('click',function(e){e.stopPropagation();rmCell(getEnc(),dI,hI,bActId);buildTable();renderBanco();renderComp();guardarEnSheets();});
          el.addEventListener('click',function(e){if(e.target.classList.contains('bx'))return;openPopup(bActId,dI,hI,b.durQ,false);});
        })(b.actId,dIdx,hIdx);
        layer.appendChild(el);stackTop+=blqH+2;
      });
    }
  });
}
function handleDrop(diaIdx,horaIdx){
  if(!dragActId)return;
  var enc=getEnc();
  if(dragFrom){rmCell(enc,dragFrom.diaIdx,dragFrom.horaIdx,dragActId);dragFrom=null;}
  openPopup(dragActId,diaIdx,horaIdx,4,true);dragActId=null;
}
function renderBanco(){
  var p=getPuesto();var enc=getEnc();
  if(!enc||!p){G('banco-list').innerHTML='';return;}
  var pl=placed(enc);var list=G('banco-list');list.innerHTML='';
  var disp=p.acts.filter(function(a){return !pl.has(a.id);});
  if(!disp.length){list.innerHTML='<div class="banco-empty">\ud83c\udf89 Todas las actividades est\u00e1n en el calendario</div>';return;}
  disp.forEach(function(act){
    var el=document.createElement('div');
    var cls=TCLS[act.tipo];var bg=TBKG[act.tipo]||'#F3F4F6',cl=TCLR[act.tipo]||'#6B7280';
    if(cls){el.className='bi '+cls;}else{el.className='bi';el.style.cssText='background:'+bg+';color:'+cl+';border-color:'+cl+';';}
    el.draggable=true;
    el.innerHTML='<span>'+act.nombre+'</span><span class="bi-fq">'+act.freq+'</span>';
    el.addEventListener('dragstart',function(e){dragActId=act.id;dragFrom=null;e.dataTransfer.effectAllowed='move';});
    list.appendChild(el);
  });
}
function renderComp(){
  var p=getPuesto();if(!p)return;
  var el=G('comp');
  if(p.encs.length<2){el.classList.remove('vis');return;}
  el.innerHTML='Comparativo: '+p.encs.map(function(e){return '<span><strong>'+e.nombre+'</strong>: '+placed(e).size+' actividades</span>';}).join(' &middot; ');
  el.classList.add('vis');
}

// ══════ BIBLIOTECA ══════
function renderBib(){
  var p=getPuesto();var e=getEmpresa();
  G('bib-titulo').textContent=e?(e.nombre+' \u2014 Formatos'):'Biblioteca';
  var c=G('bib-content');
  if(!p){c.innerHTML='<div class="bempty">Selecciona un puesto.</div>';return;}
  var cl=p.acts.filter(function(a){return p.fmts[a.id]&&p.fmts[a.id].link;});
  if(!cl.length){c.innerHTML='<div class="bempty"><div style="font-size:32px;margin-bottom:8px">\ud83d\udcc1</div><div style="font-size:14px;font-weight:700;margin-bottom:4px">Sin formatos</div><div style="font-size:11px">Ve a Clasificaci\u00f3n y agrega formatos.</div></div>';return;}
  var g=document.createElement('div');g.className='bgrid';
  cl.forEach(function(act){
    var fmt=p.fmts[act.id];var card=document.createElement('div');card.className='bcard';
    card.innerHTML='<div class="brol">'+p.nombre+' \u2014 '+(TLBL2[act.tipo]||act.tipo)+'</div><div class="bnm">'+act.nombre+'</div>'+(fmt.notas?'<div class="bnts">'+fmt.notas+'</div>':'')+'<a href="'+fmt.link+'" target="_blank" class="blnk">&#128279; '+(fmt.nombre||'Abrir formato')+'</a>';
    g.appendChild(card);
  });
  c.innerHTML='';c.appendChild(g);
}

// ══════ PDF ══════
function qrImgTag(url,size){return 'https://api.qrserver.com/v1/create-qr-code/?size='+size+'x'+size+'&data='+encodeURIComponent(url);}
function exportarPDF(){
  var emp=getEmpresa();var p=getPuesto();if(!p)return;
  var enc=getEnc();if(!enc)return;
  var fecha=new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'});
  var CBKG={tactica:'#DBEAFE',operativa:'#D1FAE5',estrategica:'#FEF3C7',directiva:'#FEE2E2',socio:'#EDE9FE'};
  var CCLR={tactica:'#2563EB',operativa:'#059669',estrategica:'#D97706',directiva:'#DC2626',socio:'#7C3AED'};
  var CNOM={tactica:'T\u00e1ctica',operativa:'Operativa',estrategica:'Estrat\u00e9gica',directiva:'Directiva',socio:'Socio'};
  function fmtHora(h){var hd=h>12?h-12:h,suf=h>=12?'PM':'AM';return hd+':00 '+suf;}
  function fmtHoraFin(h,durQ){if(durQ===0)return fmtHora(H_FIN);var tm=h*60+durQ*15,hh=Math.floor(tm/60),mm=tm%60;var hd=hh>12?hh-12:hh,suf=hh>=12?'PM':'AM';return hd+':'+(mm<10?'0'+mm:mm)+' '+suf;}
  var rowsHTML='';
  for(var h=H_INI;h<H_FIN;h++){
    var hd=h>12?h-12:h,suf=h<12?'AM':'PM';
    var cells='<td class="hc">'+hd+'<br><span style="font-size:6px;">'+suf+'</span></td>';
    for(var dIdx=0;dIdx<7;dIdx++){
      var arr=(enc.celdas[dIdx]||{})[h-H_INI]||[];var inner='';
      arr.forEach(function(b){
        var act=p.acts.find(function(a){return a.id===b.actId;});if(!act)return;
        var bg=CBKG[act.tipo]||'#F3F4F6',cl=CCLR[act.tipo]||'#374151';
        inner+='<div style="background:'+bg+';color:'+cl+';border-left:3px solid '+cl+';border-radius:3px;padding:3px 5px;margin-bottom:3px;line-height:1.35;"><div style="font-size:8px;font-weight:700;">'+act.nombre+'</div><div style="font-size:6.5px;font-weight:600;opacity:.8;">'+fmtHora(h)+' \u2013 '+fmtHoraFin(h,b.durQ)+'</div><div style="font-size:6.5px;opacity:.6;">'+(CNOM[act.tipo]||act.tipo)+' \u00b7 '+(b.durQ===0?'Todo el d\u00eda':durLabel(b.durQ))+'</div></div>';
      });
      cells+='<td class="dc">'+inner+'</td>';
    }
    rowsHTML+='<tr>'+cells+'</tr>';
  }
  var hdrs='<th class="hc" style="background:#F9FAFB;"></th>';
  ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'].forEach(function(d){hdrs+='<th style="background:#111827;color:#fff;font-size:9px;font-weight:700;text-align:center;padding:6px 2px;border-left:1px solid #374151;">'+d+'</th>';});
  var fmtHTML='';
  var cf=p.acts.filter(function(a){return p.fmts[a.id]&&p.fmts[a.id].link;});
  if(cf.length){
    fmtHTML='<div style="margin-top:20px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6B7280;border-bottom:2px solid #111827;padding-bottom:4px;margin-bottom:12px;">Biblioteca de Formatos</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">';
    cf.forEach(function(act){
      var f=p.fmts[act.id];
      fmtHTML+='<div style="border:1px solid #E5E7EB;border-radius:6px;padding:8px;display:flex;gap:8px;align-items:flex-start;"><img src="'+qrImgTag(f.link,150)+'" style="width:60px;height:60px;flex-shrink:0;border:1px solid #E5E7EB;border-radius:4px;"/><div style="flex:1;min-width:0;"><div style="font-size:8px;font-weight:700;color:#111827;margin-bottom:2px;line-height:1.3;">'+act.nombre+'</div><div style="font-size:7.5px;font-weight:700;color:#2563EB;margin-bottom:2px;">'+(f.nombre||'Ver formato')+'</div>'+(f.notas?'<div style="font-size:7px;color:#6B7280;">'+f.notas+'</div>':'')+'<div style="font-size:6px;color:#9CA3AF;margin-top:3px;word-break:break-all;">'+f.link+'</div></div></div>';
    });
    fmtHTML+='</div></div>';
  }
  var empNombre=emp?emp.nombre:'';
  var css='*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;color:#111;padding:12px;}.hdr{background:#111827;color:#fff;padding:10px 14px;border-radius:6px;margin-bottom:10px;border-bottom:3px solid #F5B800;}.hdr h1{font-size:15px;font-weight:800;margin-bottom:3px;}.hdr .meta{font-size:8px;color:#9CA3AF;}.hdr .meta strong{color:#F5B800;}table{width:100%;border-collapse:collapse;table-layout:fixed;}.hc{width:40px;font-size:8px;font-weight:700;color:#9CA3AF;text-align:right;padding:3px 5px 0 0;vertical-align:top;border-bottom:1px solid #F3F4F6;background:#F9FAFB;}.dc{border-left:1px solid #E5E7EB;border-bottom:1px solid #F3F4F6;vertical-align:top;padding:2px;min-height:32px;}tr:nth-child(even) .dc{background:#FAFAFA;}.ley{display:flex;gap:14px;margin-bottom:10px;flex-wrap:wrap;}.foot{margin-top:12px;font-size:7px;color:#9CA3AF;text-align:center;border-top:1px solid #E5E7EB;padding-top:6px;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0;}@page{size:A4 landscape;margin:8mm;}}';
  var leyenda='<div class="ley"><span style="font-size:8px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#EDE9FE;border-left:3px solid #7C3AED;display:inline-block;"></span>Socio</span><span style="font-size:8px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#FEE2E2;border-left:3px solid #DC2626;display:inline-block;"></span>Directiva</span><span style="font-size:8px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#FEF3C7;border-left:3px solid #D97706;display:inline-block;"></span>Estrat\u00e9gica</span><span style="font-size:8px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#DBEAFE;border-left:3px solid #2563EB;display:inline-block;"></span>T\u00e1ctica</span><span style="font-size:8px;display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#D1FAE5;border-left:3px solid #059669;display:inline-block;"></span>Operativa</span></div>';
  var fullHTML='<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'+css+'</style><script>window.onload=function(){window.print();}<\/script></head><body>'
    +'<div class="hdr"><h1>Disciplinas por Bloques \u2014 2026</h1><div class="meta">Empresa: <strong>'+empNombre+'</strong> &nbsp;\u00b7&nbsp; Puesto: <strong>'+p.nombre+'</strong> &nbsp;\u00b7&nbsp; Responsable: <strong style="color:#fff;">'+enc.nombre+'</strong> &nbsp;\u00b7&nbsp; '+fecha+'</div></div>'
    +leyenda
    +'<table><thead><tr>'+hdrs+'</tr></thead><tbody>'+rowsHTML+'</tbody></table>'
    +fmtHTML
    +'<div class="foot">'+empNombre+' \u00b7 Disciplinas por Bloques 2026</div></body></html>';
  var blob=new Blob([fullHTML],{type:'text/html;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='Bloques_'+p.nombre.replace(/\s+/g,'_')+'_'+enc.nombre.replace(/\s+/g,'_')+'.html';
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},1000);
  showToast('Descargado \u2014 \u00e1brelo y usa Guardar como PDF');
}

// ══════ TOAST / ESC / INIT ══════
function showToast(msg){var t=G('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2600);}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){cancelPopup();closeOverlay();closeEmpDrop();}});

// INIT — carga desde Google Sheets (si está vacío usa datos de demo)
cargarDesdeSheets();