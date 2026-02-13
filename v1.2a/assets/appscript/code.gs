const SHEET_ID='1JZ4OV-qpB_QhyXJMeNR9YRAL5GDuKYdAm62ch7ShteM',SETTINGS='.Settings',SRC=['ATM','CASH'],TYP=['debit','kredit'];
function json(c){return ContentService.createTextOutput(JSON.stringify(c)).setMimeType(ContentService.MimeType.JSON)}
function ok(d,m){return json({status:'success',...d,message:m})}
function err(m){return json({status:'error',message:m})}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1).toLowerCase():''}
function ss(){return SpreadsheetApp.openById(SHEET_ID)}

function validateInput(d,pL){
const sr=(d.sumber||'').toUpperCase(),ph=cap(d.pihak||''),jn=(d.jenis||'').toLowerCase(),nm=Number(d.nominal);
if(!SRC.includes(sr))return{valid:false,error:'Sumber tidak valid'};
if(!pL.includes(ph))return{valid:false,error:'Pihak tidak valid'};
if(!TYP.includes(jn))return{valid:false,error:'Jenis tidak valid'};
if(!nm||nm<=0)return{valid:false,error:'Nominal tidak valid'};
return{valid:true,data:{sumber:sr,pihak:ph,jenis:jn,nominal:nm,kategori:cap(d.kategori||'')}}
}

function getPihak(sp){
const s=sp.getSheetByName(SETTINGS);
if(!s)return['Pihak 1','Pihak 2'];
const p1=s.getRange('B5').getValue(),p2=s.getRange('C5').getValue(),l=[];
if(p1)l.push(cap(String(p1)));if(p2)l.push(cap(String(p2)));
return l.length?l:['Pihak 1','Pihak 2']
}

function getOptionsData(s){
const v=s.getRange('B1:G6').getValues(),kat=v[5].map(k=>String(k).trim()).filter(Boolean);
return{photo:v[0][0]||'',title:v[1][0]||'',subtitle:v[2][0]||'',pinHash:v[3][0]||'',pihak:[v[4][0]||'',v[4][1]||''],kategori:kat.length?kat:['Tetap','Pokok','Jajan','Lain','Vacant 1','Vacant 2']}
}

function setFormulas(sh){
if(sh.getLastRow()<4)return;
sh.getRange('A4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; ROW(B4:B) - 2))');
sh.getRange('J4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; J$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "ATM"); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "ATM"); 0)))))');
sh.getRange('K4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; K$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!B5); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!B5); 0)))))');
sh.getRange('L4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; L$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!C5); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!C5); 0)))))')
}

function findRow(sh,id){
const lr=sh.getLastRow();if(lr<4)return-1;
const ids=sh.getRange(4,1,lr-3,1).getValues();
for(let i=0;i<ids.length;i++){if(ids[i][0]==id)return i+4}
return-1
}

function withLock(fn){const lock=LockService.getScriptLock();lock.waitLock(15000);try{return fn()}finally{lock.releaseLock()}}

function doGet(e){
const a=e.parameter.action,sp=ss();
if(a==='getOptions'){const s=sp.getSheetByName(SETTINGS);if(!s)return err('Settings not found');return ok({data:getOptionsData(s)})}
if(a==='getSheets')return ok({data:sp.getSheets().map(s=>s.getName())});
if(a==='getData'){
const sn=e.parameter.sheet;if(!sn)return err('Missing sheet');
const sh=sp.getSheetByName(sn);if(!sh)return err('Sheet not found');
const lr=sh.getLastRow();
if(lr<4)return ok({data:[],saldo:{atm:sh.getRange('J3').getValue()||0,cashPihak1:sh.getRange('K3').getValue()||0,cashPihak2:sh.getRange('L3').getValue()||0}});
const h=sh.getRange('A2:L2').getValues()[0].map(v=>String(v).trim().toLowerCase()),
rows=sh.getRange(4,1,lr-3,h.length).getValues(),
data=rows.map(r=>{let o={};h.forEach((k,i)=>{if(k)o[k]=r[i]!==undefined?r[i]:''});return o}).filter(r=>r.tanggal),
bal=sh.getRange(lr,10,1,3).getValues()[0];
return ok({data,saldo:{atm:bal[0]||0,cashPihak1:bal[1]||0,cashPihak2:bal[2]||0}})}
return err('Invalid action')
}

function doPost(e){
const d=JSON.parse(e.postData.contents||'{}'),sp=ss();
if(d.action==='saveOptions')return saveOptions(sp,d);
if(d.action==='delete')return withLock(()=>deleteRow(sp,d));
if(d.action==='edit')return withLock(()=>editRow(sp,d));
return withLock(()=>addRow(sp,d))
}

function saveOptions(sp,d){
let s=sp.getSheetByName(SETTINGS);
if(!s){s=sp.insertSheet(SETTINGS);s.getRange('A1:A6').setValues([['URL Foto Profil'],['Judul'],['Subjudul'],['PIN Hash (SHA-256)'],['Nama Pihak 1 & 2'],['Kategori 1-6']])}
if(d.photo!==undefined)s.getRange('B1').setValue(d.photo);
if(d.title!==undefined)s.getRange('B2').setValue(d.title);
if(d.subtitle!==undefined)s.getRange('B3').setValue(d.subtitle);
if(d.pinHash!==undefined)s.getRange('B4').setValue(d.pinHash);
if(d.pihak1!==undefined)s.getRange('B5').setValue(d.pihak1);
if(d.pihak2!==undefined)s.getRange('C5').setValue(d.pihak2);
if(d.kategori!==undefined){
const kat=Array.isArray(d.kategori)?d.kategori:String(d.kategori).split(',').map(v=>v.trim()).filter(Boolean),
row=['','','','','',''];kat.slice(0,6).forEach((v,i)=>row[i]=v);s.getRange('B6:G6').setValues([row])}
SpreadsheetApp.flush();return ok({},'Saved')
}

function addRow(sp,d){
const sh=sp.getSheetByName(d.sheetName);if(!sh)return err('Sheet not found');
const pL=getPihak(sp),v=validateInput(d,pL);if(!v.valid)return err(v.error);
const vd=v.data,tgl=d.tanggal||Utilities.formatDate(new Date(),'Asia/Jakarta','dd/MM/yyyy'),
jam=d.includeTime===true?Utilities.formatDate(new Date(),'Asia/Jakarta','HH:mm:ss'):'',
db=vd.jenis==='debit'?vd.nominal:'',kr=vd.jenis==='kredit'?vd.nominal:'',lr=sh.getLastRow();
let targetRow;
if(lr<4){if(sh.getMaxRows()<4)sh.insertRowAfter(3);targetRow=4}
else{targetRow=lr+1;if(sh.getMaxRows()<targetRow)sh.insertRowAfter(lr)}
sh.getRange(targetRow,2,1,8).setValues([[tgl,jam?"'"+jam:'',vd.sumber,d.keterangan||'-',vd.kategori,vd.pihak,db,kr]]);
setFormulas(sh);return ok({},'Saved')
}

function editRow(sp,d){
const sh=sp.getSheetByName(d.sheetName);if(!sh)return err('Sheet not found');
const row=findRow(sh,d.rowNumber);if(row===-1)return err('Not found');
const pL=getPihak(sp),v=validateInput(d,pL);if(!v.valid)return err(v.error);
const vd=v.data,jam=d.includeTime===true?Utilities.formatDate(new Date(),'Asia/Jakarta','HH:mm:ss'):'';
sh.getRange(row,2,1,8).setValues([[d.tanggal||'',jam?"'"+jam:'',vd.sumber,d.keterangan||'-',vd.kategori,vd.pihak,vd.jenis==='debit'?vd.nominal:'',vd.jenis==='kredit'?vd.nominal:'']]);
setFormulas(sh);return ok({},'Updated')
}

function deleteRow(sp,d){
const sh=sp.getSheetByName(d.sheetName);if(!sh)return err('Sheet not found');
const row=findRow(sh,d.rowNumber);if(row===-1)return err('Not found');
sh.deleteRow(row);SpreadsheetApp.flush();
if(sh.getLastRow()<=3){const m=sh.getMaxRows();if(m>3)sh.deleteRows(4,m-3)}
else setFormulas(sh);
return ok({},'Deleted')
}