const App=(()=>{
let t=new URLSearchParams(location.search).get("config");
if(!t){document.body.innerHTML='<p style="padding:40px;text-align:center;color:#ff3b30;font-weight:700">Config ID Missing</p>';return}
const BASE=`https://script.google.com/macros/s/${t}/exec`,
$=t=>document.getElementById(t),q=(t,e=document)=>e.querySelector(t),qa=(t,e=document)=>e.querySelectorAll(t),
esc=t=>{let e=document.createElement("div");return e.textContent=t,e.innerHTML},
hashPin=async t=>{let e=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return Array.from(new Uint8Array(e)).map(t=>t.toString(16).padStart(2,"0")).join("")},
U={
debounce(fn,ms){let t;return(...a)=>(clearTimeout(t),t=setTimeout(()=>fn(...a),ms))},
int:t=>parseInt(String(t||"").replace(/\D/g,""),10)||0,
money:new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}),
num:t=>t.toLocaleString("id-ID"),
fmtD(t){let e=t.split("-");return`${e[2]}/${e[1]}/${e[0]}`},
fmtDI:t=>`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,
parseD(t){if(!t)return null;let e=new Date(t.includes("/")?t.split("/").reverse().join("-"):t);return isNaN(e)?null:(e.setHours(0,0,0,0),e)},
dispD(t){let e=U.parseD(t);return e?{day:["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][e.getDay()],date:e.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}:{day:"",date:t}},
moneyIn(t){let e=t.target.value.replace(/\D/g,"");t.target.value=e?parseInt(e,10).toLocaleString("id-ID"):""}
},
state={sheet:localStorage.ls_sheet||"",filter:localStorage.ls_filter||"Semua",filterPihak:localStorage.ls_filterPihak||"Semua",dateRange:localStorage.ls_dateRange||"all",search:"",data:[],opt:{title:"Cashly",subtitle:"Smart Money Tracking",pinHash:"",photo:"",pihak:["Pihak 1","Pihak 2"],kategori:[]},unlocked:false,dataLoaded:false,_preloadPromise:null,_saving:false},
dom={lod:$("lod"),lod2:$("lod2"),emp:$("emp"),lst:$("lst"),tabs:$("tabs"),v:{rep:$("rep"),add:$("add")},tit:$("tit"),sub:$("sub"),prof:$("prof"),ref:$("ref"),sht:$("sht"),dark:$("dark"),sal:{atm:$("atm"),p1:$("p1"),p2:$("p2")},lbl:{p1:$("p1l"),p2:$("p2l")},src:{i:$("srch"),c:$("clr")},f:{c:{b:$("fb"),d:$("fd")},p:{b:$("fpb"),d:$("fpd")},dt:{b:$("dfb"),d:$("dfd")},tin:$("ftin"),tout:$("ftout")},frm:{el:$("frm"),dt:$("dt"),dsc:$("dsc"),amt:$("amt_in"),sub:$("sbm"),bp:$("pb"),bk:$("kb"),hi:{p:q("[name=pihak]",$("frm")),k:q("[name=kategori]",$("frm"))}},pin:{l:$("pin"),d:$("pind"),k:$("pink")},app:$("app-main"),tpl:{li:$("tpl-li"),ed:$("tpl-edit"),del:$("tpl-del")}},
chevron='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';

const api=async(body,qs="")=>{
let opt=body?{method:"POST",body:JSON.stringify(body),redirect:"follow"}:{method:"GET",redirect:"follow"};
return(await fetch(`${BASE}${qs}`,opt)).json().catch(()=>({status:"error"}))
};

const buildToggles=(c,items,active,hidden)=>{
c.innerHTML=items.map(t=>`<button type="button" class="tg${t===active?" active":""}" data-v="${esc(t)}">${esc(t)}</button>`).join("");
if(hidden)hidden.value=active||""
};

const buildFilterOpts=(c,items,active)=>{
c.innerHTML=items.map(t=>`<div class="fo${t===active?" active":""}" data-f="${esc(t)}">${esc(t)}</div>`).join("")
};

const isKategoriGrp=el=>{if(!el)return false;let t=el.closest(".togs");return t&&(t.id==="kb"||t.id==="ek")};

const validateFilters=()=>{
if(!["Semua",...state.opt.kategori].includes(state.filter)){state.filter="Semua";localStorage.ls_filter="Semua"}
if(!["Semua",...state.opt.pihak].includes(state.filterPihak)){state.filterPihak="Semua";localStorage.ls_filterPihak="Semua"}
};

const getFiltered=()=>{
if(!state.data.length)return[];
let s=state.search.toLowerCase(),now=new Date;now.setHours(0,0,0,0);let today=now.getTime();
return state.data.filter(r=>{
if(state.filter!=="Semua"&&(r.kategori||"").trim()!==state.filter)return false;
if(state.filterPihak!=="Semua"&&r.pihak!==state.filterPihak)return false;
if(s&&!(r.keterangan||"").toLowerCase().includes(s)&&!String(r.nominal||"").includes(s))return false;
if(state.dateRange!=="all"){
let d=U.parseD(r.tanggal);if(!d)return false;
let diff=Math.ceil((today-d.getTime())/864e5),day=d.getDate(),
map={today:d.getTime()===today,yesterday:diff===1,week:diff>=0&&diff<=7,w1:day<=7,w2:day>=8&&day<=14,w3:day>=15&&day<=21,w4:day>21};
return map[state.dateRange]||false}
return true})
};

const render=()=>{
if(!state.unlocked)return;
let rows=getFiltered(),hasFilter=state.filter!=="Semua"||state.filterPihak!=="Semua"||state.dateRange!=="all"||state.search;
if(hasFilter&&rows.length){let ti=0,to=0;rows.forEach(r=>{ti+=U.int(r.debit);to+=U.int(r.kredit)});dom.f.tin.textContent=`+${U.money.format(ti)}`;dom.f.tout.textContent=`-${U.money.format(to)}`}
dom.f.tin.classList.toggle("show",hasFilter&&rows.length>0);dom.f.tout.classList.toggle("show",hasFilter&&rows.length>0);
dom.lst.innerHTML="";
if(!rows.length){dom.emp.textContent=state.search?`Tidak ditemukan "${esc(state.search)}"`:"Tidak ada data transaksi";dom.emp.style.display="block";return}
dom.emp.style.display="none";
let frag=document.createDocumentFragment();
rows.forEach(row=>{
let el=dom.tpl.li.content.cloneNode(true),dbVal=U.int(row.debit),isIn=dbVal>0,amt=isIn?dbVal:U.int(row.kredit),dd=U.dispD(row.tanggal);
q("li",el).dataset.row=row.no;q(".day",el).textContent=dd.day?dd.day+", ":"";q(".dtxt",el).textContent=dd.date;
if(row.jam)q(".tm",el).textContent=row.jam;else q(".tm",el).remove();
q(".desc",el).textContent=row.keterangan||"-";
let katEl=q(".tkat",el);
if(row.kategori&&row.kategori!=="-"){katEl.textContent=row.kategori;katEl.className="tkat tag-kategori"}else katEl.remove();
q(".tp",el).textContent=row.pihak;q(".tp",el).className="tp tag-p";
q(".ts",el).textContent=row.sumber;q(".ts",el).className=`ts tag-${(row.sumber||"").toLowerCase()}`;
let amtEl=q(".amt",el);amtEl.textContent=`${isIn?"+":"-"} ${U.money.format(amt)}`;amtEl.className=`amt ${isIn?"in":"out"}`;
frag.appendChild(el)});
dom.lst.appendChild(frag)
};

const populateSheets=sheets=>{
dom.sht.innerHTML=sheets.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
state.sheet=sheets.includes(localStorage.ls_sheet)?localStorage.ls_sheet:sheets[0];
dom.sht.value=state.sheet;dom.sht.disabled=false
};

const applySaldo=s=>{
if(!s)return;
dom.sal.atm.textContent=U.money.format(s.atm||0);
dom.sal.p1.textContent=U.money.format(s.cashPihak1||0);
dom.sal.p2.textContent=U.money.format(s.cashPihak2||0)
};

const settings={
menu(){
if(!state.unlocked)return;
Swal.fire({title:"Pengaturan",showConfirmButton:false,showCloseButton:true,
html:`<ul class="sm-list">
<li><button class="sm-item" data-m="1"><div class="sm-icon sm-icon-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="sm-text"><b>Profil & Keamanan</b><small>Avatar, judul, subjudul, PIN</small></div><div class="sm-arr">${chevron}</div></button></li>
<div class="sm-sep"></div>
<li><button class="sm-item" data-m="2"><div class="sm-icon sm-icon-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div class="sm-text"><b>Kelola Data</b><small>Pihak, kategori transaksi</small></div><div class="sm-arr">${chevron}</div></button></li>
<div class="sm-sep"></div>
<li><button class="sm-item" data-m="3"><div class="sm-icon sm-icon-3"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></div><div class="sm-text"><b>Portofolio</b><small>Lihat ringkasan portofolio</small></div><div class="sm-arr">${chevron}</div></button></li>
</ul>`,
didOpen(){let p=Swal.getPopup();["1","2","3"].forEach(id=>q(`[data-m="${id}"]`,p).onclick=()=>{Swal.close();setTimeout(()=>{if(id==="1")settings.profile();else if(id==="2")settings.data();else if(id==="3")window.location.href="https://itsanewdawnnn.github.io/gsheet-web-viewer/"},200)})}})
},
async _save(data,onSuccess){
let btn=Swal.getConfirmButton(),orig=btn.textContent;btn.disabled=true;btn.textContent="Menyimpan...";
let res=await api({action:"saveOptions",...data});btn.disabled=false;btn.textContent=orig;
if(res?.status==="success"){onSuccess();return true}
Swal.showValidationMessage(res?.message||"Gagal menyimpan");return false
},
async profile(){
if(!state.unlocked)return;let o=state.opt;
Swal.fire({title:"Profil & Keamanan",showCancelButton:true,confirmButtonText:"Simpan",cancelButtonText:"Batal",confirmButtonColor:"#007aff",showCloseButton:true,
html:`<div class="s-wrap">
<div class="grp"><label>Avatar (URL)</label><input id="s_ph" class="inp" type="url" placeholder="https://..." value="${esc(o.photo||"")}"><div class="inp-hint">URL gambar foto profil</div></div>
<div class="grp"><label>Judul</label><input id="s_ti" class="inp" value="${esc(o.title||"")}"></div>
<div class="grp"><label>Subjudul</label><input id="s_su" class="inp" value="${esc(o.subtitle||"")}"></div>
<div class="grp"><label>PIN Baru (6 digit)</label><input id="s_pi" class="inp" inputmode="numeric" maxlength="6" placeholder="Kosongkan = tanpa PIN"><div class="inp-hint">Kosongkan untuk nonaktifkan, isi untuk ubah PIN</div></div></div>`,
async preConfirm(){
let p=Swal.getPopup(),pin=q("#s_pi",p).value.trim();
if(pin&&!/^\d{6}$/.test(pin))return Swal.showValidationMessage("PIN harus 6 digit atau kosong"),false;
let hash=pin?await hashPin(pin):"",
vals={photo:q("#s_ph",p).value.trim(),title:q("#s_ti",p).value.trim(),subtitle:q("#s_su",p).value.trim(),pinHash:hash};
return settings._save(vals,()=>{Object.assign(state.opt,vals);dom.tit.textContent=vals.title||"Cashly";dom.sub.textContent=vals.subtitle||"";if(vals.photo)dom.prof.src=vals.photo})}
}).then(r=>r.isConfirmed&&Swal.fire({toast:true,position:"top",icon:"success",title:"Profil diperbarui",timer:1500,showConfirmButton:false,backdrop:false}))
},
data(){
if(!state.unlocked)return;let o=state.opt;
Swal.fire({title:"Kelola Data",showCancelButton:true,confirmButtonText:"Simpan",cancelButtonText:"Batal",confirmButtonColor:"#007aff",showCloseButton:true,
html:`<div class="s-wrap">
<div class="grp"><label>Pihak</label><div class="s-grid"><input id="s_p1" class="inp" placeholder="Pihak 1" value="${esc(o.pihak[0]||"")}"><input id="s_p2" class="inp" placeholder="Pihak 2" value="${esc(o.pihak[1]||"")}"></div><div class="inp-hint">Nama dua pihak pengelola</div></div>
<div class="grp"><label>Kategori (maks 6)</label><div class="s-grid">${[0,1,2,3,4,5].map(i=>`<input id="s_k${i}" class="inp" placeholder="Kategori ${i+1}" value="${esc(o.kategori[i]||"")}">`).join("")}</div><div class="inp-hint">Kosong = diabaikan</div></div></div>`,
preConfirm(){
let p=Swal.getPopup(),p1=q("#s_p1",p).value.trim(),p2=q("#s_p2",p).value.trim();
if(!p1||!p2)return Swal.showValidationMessage("Kedua pihak wajib diisi"),false;
let kat=[0,1,2,3,4,5].map(i=>q(`#s_k${i}`,p).value.trim()).filter(Boolean);
return settings._save({pihak1:p1,pihak2:p2,kategori:kat},()=>{
state.opt.pihak=[p1,p2];state.opt.kategori=kat.length?kat:["Tetap","Pokok","Jajan","Lain","Vacant 1","Vacant 2"];
dom.lbl.p1.textContent=`Cash ${p1}`;dom.lbl.p2.textContent=`Cash ${p2}`;
buildToggles(dom.frm.bp,state.opt.pihak,"",dom.frm.hi.p);buildToggles(dom.frm.bk,state.opt.kategori,"",dom.frm.hi.k);
validateFilters();buildFilterOpts(dom.f.c.d,["Semua",...state.opt.kategori],state.filter);buildFilterOpts(dom.f.p.d,["Semua",...state.opt.pihak],state.filterPihak);
dom.f.c.b.classList.toggle("active",state.filter!=="Semua");dom.f.p.b.classList.toggle("active",state.filterPihak!=="Semua");render()})}
}).then(r=>r.isConfirmed&&Swal.fire({toast:true,position:"top",icon:"success",title:"Data diperbarui",timer:1500,showConfirmButton:false,backdrop:false}))
}};

const ctrl={
async start(){
dom.frm.dt.value=U.fmtDI(new Date);
let res=await api(null,"?action=getOptions");
if(res?.data)state.opt={...state.opt,...res.data};
if(!state.opt.pihak?.length)state.opt.pihak=["Pihak 1","Pihak 2"];
dom.tit.textContent=state.opt.title;dom.sub.textContent=state.opt.subtitle;
if(state.opt.photo)dom.prof.src=state.opt.photo;
dom.lbl.p1.textContent=`Cash ${state.opt.pihak[0]}`;dom.lbl.p2.textContent=`Cash ${state.opt.pihak[1]}`;
buildToggles(dom.frm.bp,state.opt.pihak,"",dom.frm.hi.p);buildToggles(dom.frm.bk,state.opt.kategori,"",dom.frm.hi.k);
validateFilters();buildFilterOpts(dom.f.c.d,["Semua",...state.opt.kategori],state.filter);buildFilterOpts(dom.f.p.d,["Semua",...state.opt.pihak],state.filterPihak);
dom.f.c.b.classList.toggle("active",state.filter!=="Semua");dom.f.p.b.classList.toggle("active",state.filterPihak!=="Semua");
let drBtn=q(`[data-r="${state.dateRange}"]`,dom.f.dt.d);if(drBtn)drBtn.classList.add("active");
dom.f.dt.b.classList.toggle("active",state.dateRange!=="all");
if(localStorage.ls_dark==="true")document.body.classList.add("dark");
dom.dark.onclick=()=>{document.body.classList.toggle("dark");localStorage.ls_dark=document.body.classList.contains("dark")};
dom.lod.classList.add("hidden");
if(state.opt.pinHash){dom.pin.l.classList.remove("hidden");dom.app.classList.add("hidden");pinCtrl.init();this.preloadData()}
else this.unlockApp()
},
preloadData(){
state._preloadPromise=(async()=>{
let res=await api(null,"?action=getSheets");
if(res?.data){populateSheets(res.data.filter(s=>!s.startsWith(".")));
let dr=await api(null,`?action=getData&sheet=${encodeURIComponent(state.sheet)}&t=${Date.now()}`);
if(dr?.status!=="error"){applySaldo(dr.saldo);state.data=dr.data||[];state.dataLoaded=true}}})()
},
async unlockApp(){
state.unlocked=true;dom.app.classList.remove("hidden");dom.pin.l.classList.add("hidden");
if(state._preloadPromise){await state._preloadPromise;state._preloadPromise=null}
if(state.dataLoaded)render();else await this.loadSheets();
this.bind()
},
async loadSheets(){
let res=await api(null,"?action=getSheets");
if(res?.data){populateSheets(res.data.filter(s=>!s.startsWith(".")));await this.load()}
},
async load(){
if(!state.unlocked)return;
if(!state.data.length)dom.lod2.style.display="block";
let res=await api(null,`?action=getData&sheet=${encodeURIComponent(state.sheet)}&t=${Date.now()}`);
dom.lod2.style.display="none";
if(res?.status!=="error"){applySaldo(res.saldo);state.data=res.data||[];state.dataLoaded=true;render()}
else{dom.emp.textContent="Gagal memuat data";dom.emp.style.display="block"}
},
async save(payload,isEdit=false,btn=null){
if(!state.unlocked||state._saving)return false;state._saving=true;
let target=btn||dom.frm.sub,orig=target.textContent;target.disabled=true;target.textContent="Menyimpan...";
let res=await api(payload);target.disabled=false;target.textContent=orig;state._saving=false;
if(res?.status==="success"||res?.result==="success"){
Swal.fire({toast:true,position:"top",icon:"success",title:isEdit?"Diperbarui":"Disimpan",timer:1500,showConfirmButton:false,backdrop:false});
if(!isEdit){dom.frm.el.reset();dom.frm.dt.value=U.fmtDI(new Date);qa(".tg.active",dom.frm.el).forEach(t=>t.classList.remove("active"));qa("input[type=hidden]",dom.frm.el).forEach(t=>t.value="");setTimeout(()=>q('[data-v="rep"]',dom.tabs).click(),100)}
this.load();return true}
Swal.fire({title:"Gagal",text:res?.message||"Kesalahan server",icon:"error"});return false
},
bind(){
if(this._bound)return;this._bound=true;
dom.prof.onclick=()=>settings.menu();
dom.sht.onchange=e=>{state.sheet=localStorage.ls_sheet=e.target.value;this.load()};
dom.ref.onclick=()=>{dom.ref.classList.add("spin");this.load().then(()=>setTimeout(()=>dom.ref.classList.remove("spin"),500))};
dom.frm.amt.oninput=U.moneyIn;
dom.tabs.onclick=e=>{if(!e.target.classList.contains("tab"))return;qa(".tab,.view").forEach(t=>t.classList.remove("active"));e.target.classList.add("active");dom.v[e.target.dataset.v].classList.add("active")};
dom.frm.el.onclick=e=>{
if(!e.target.classList.contains("tg"))return;
let grp=e.target.closest(".grp"),isKat=isKategoriGrp(e.target);
if(isKat&&e.target.classList.contains("active")){e.target.classList.remove("active");q("input[type=hidden]",grp).value="";return}
qa(".tg",grp).forEach(t=>t.classList.remove("active"));e.target.classList.add("active");q("input[type=hidden]",grp).value=e.target.dataset.v
};
let closeAll=()=>qa(".fdd").forEach(t=>t.classList.remove("show")),
toggleDD=el=>{let open=el.classList.contains("show");closeAll();if(!open)el.classList.add("show")};
[["c"],["p"],["dt"]].forEach(([k])=>dom.f[k].b.onclick=e=>{e.stopPropagation();toggleDD(dom.f[k].d)});
document.onclick=e=>{if(!e.target.closest(".fc"))closeAll()};
let applyFilter=(prop,val,btn,dd)=>{state[prop]=localStorage["ls_"+prop]=val;qa(".active",dd).forEach(t=>t.classList.remove("active"));btn.classList.toggle("active",val!==(prop==="dateRange"?"all":"Semua"));render();closeAll()};
dom.f.c.d.onclick=e=>{if(!e.target.dataset.f)return;e.target.classList.add("active");applyFilter("filter",e.target.dataset.f,dom.f.c.b,dom.f.c.d)};
dom.f.p.d.onclick=e=>{if(!e.target.dataset.f)return;e.target.classList.add("active");applyFilter("filterPihak",e.target.dataset.f,dom.f.p.b,dom.f.p.d)};
dom.f.dt.d.onclick=e=>{if(!e.target.dataset.r)return;e.target.classList.add("active");applyFilter("dateRange",e.target.dataset.r,dom.f.dt.b,dom.f.dt.d)};
dom.src.i.oninput=U.debounce(e=>{state.search=e.target.value.trim();dom.src.c.classList.toggle("hidden",!state.search);render()},200);
dom.src.c.onclick=()=>{dom.src.i.value="";state.search="";dom.src.c.classList.add("hidden");render()};
dom.frm.el.onsubmit=e=>{
e.preventDefault();if(state._saving)return;
let fd=new FormData(dom.frm.el),amt=U.int(dom.frm.amt.value),
payload={sheetName:state.sheet,tanggal:U.fmtD(dom.frm.dt.value),keterangan:dom.frm.dsc.value.trim(),pihak:fd.get("pihak"),sumber:fd.get("sumber"),jenis:fd.get("jenis"),kategori:fd.get("kategori")||"",nominal:amt,includeTime:dom.frm.dt.value===U.fmtDI(new Date)};
if(!payload.tanggal||!payload.keterangan||!payload.pihak||!payload.sumber||!payload.jenis||amt<=0)return Swal.fire({icon:"warning",title:"Data Tidak Lengkap"});
this.save(payload)};
dom.lst.onclick=e=>{let btn=e.target.closest("button");if(!btn)return;let li=e.target.closest("li"),row=state.data.find(r=>r.no===parseInt(li.dataset.row,10));if(!row)return;if(btn.dataset.a==="d")this.del(row);else this.edit(row)}
},
del(row){
if(!state.unlocked)return;
let amt=U.int(row.debit)||U.int(row.kredit),el=dom.tpl.del.content.cloneNode(true);
q(".v-date",el).textContent=U.dispD(row.tanggal).date;q(".v-desc",el).textContent=row.keterangan;q(".v-amt",el).textContent=U.money.format(amt);
let wrap=document.createElement("div");wrap.appendChild(el);
Swal.fire({title:"Hapus Transaksi?",html:wrap.innerHTML,showCancelButton:true,confirmButtonColor:"#ff3b30",confirmButtonText:"Hapus",cancelButtonText:"Batal",
preConfirm:()=>this.save({action:"delete",sheetName:state.sheet,rowNumber:row.no},true,Swal.getConfirmButton())})
},
edit(row){
if(!state.unlocked)return;
let isDebit=U.int(row.debit)>0,amt=isDebit?U.int(row.debit):U.int(row.kredit),wrap=document.createElement("div");
wrap.appendChild(dom.tpl.ed.content.cloneNode(true));
let setupToggle=(c,togSel,hidSel,items,active)=>{let togEl=q(togSel,c),hidEl=q(hidSel,c);buildToggles(togEl,items,active,hidEl);
togEl.onclick=e=>{if(!e.target.classList.contains("tg"))return;let isKat=isKategoriGrp(e.target);
if(isKat&&e.target.classList.contains("active")){e.target.classList.remove("active");hidEl.value="";return}
qa(".tg",togEl).forEach(t=>t.classList.remove("active"));e.target.classList.add("active");hidEl.value=e.target.dataset.v}};
Swal.fire({title:"Edit Transaksi",html:wrap.innerHTML,width:"95%",showCancelButton:true,confirmButtonColor:"#007aff",confirmButtonText:"Simpan",cancelButtonText:"Batal",
didOpen(){let p=Swal.getPopup(),d=U.parseD(row.tanggal);q("#x_d",p).value=d?U.fmtDI(d):"";q("#x_k",p).value=row.keterangan;
let nomEl=q("#x_n",p);nomEl.value=U.num(amt);nomEl.oninput=U.moneyIn;
setupToggle(p,"#ep","#xp",state.opt.pihak,row.pihak);setupToggle(p,"#es","#xs",["ATM","CASH"],row.sumber);
setupToggle(p,"#ej","#xj",["Debit","Kredit"],isDebit?"Debit":"Kredit");setupToggle(p,"#ek","#xk",state.opt.kategori,row.kategori&&row.kategori!=="-"?row.kategori:"")},
preConfirm:()=>{let p=Swal.getPopup(),nomVal=U.int(q("#x_n",p).value),tgl=q("#x_d",p).value,ket=q("#x_k",p).value.trim(),
pihak=q("#xp",p).value,sumber=q("#xs",p).value,jenis=q("#xj",p).value,kat=q("#xk",p).value;
if(!tgl||!ket||!pihak||!sumber||!jenis||nomVal<=0)return Swal.showValidationMessage("Data Tidak Lengkap");
return ctrl.save({action:"edit",sheetName:state.sheet,rowNumber:row.no,tanggal:U.fmtD(tgl),keterangan:ket,nominal:nomVal,pihak,sumber,jenis,kategori:kat||"",includeTime:false},true,Swal.getConfirmButton())}})
}};

const pinCtrl={
val:"",
init(){
let avatar=$("pin-avatar");
if(state.opt.photo){avatar.src=state.opt.photo;avatar.style.display="block"}else avatar.style.display="none";
$("pin-title-text").textContent=state.opt.title||"";
dom.pin.d.innerHTML='<div class="pin-dot"></div>'.repeat(6);
dom.pin.k.innerHTML=[1,2,3,4,5,6,7,8,9].map(n=>`<button class="pin-key" data-k="${n}">${n}</button>`).join("")+'<button class="pin-key pin-zero" data-k="0">0</button>';
let fresh=dom.pin.k.cloneNode(true);dom.pin.k.replaceWith(fresh);dom.pin.k=fresh;
dom.pin.k.onclick=async e=>{let key=e.target.closest(".pin-key");if(!key)return;if(navigator.vibrate)navigator.vibrate(10);
if(this.val.length<6)this.val+=key.dataset.k;this.render();if(this.val.length===6)setTimeout(()=>this.check(),200)}
},
render(){qa(".pin-dot",dom.pin.d).forEach((el,i)=>el.classList.toggle("filled",i<this.val.length))},
async check(){let hash=await hashPin(this.val);
if(hash===state.opt.pinHash)ctrl.unlockApp();
else{dom.pin.d.classList.add("shake");setTimeout(()=>{this.val="";this.render();dom.pin.d.classList.remove("shake")},500)}}
};

return{start:()=>ctrl.start()}
})();
document.addEventListener("DOMContentLoaded",App.start);