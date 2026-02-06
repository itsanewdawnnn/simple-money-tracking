const SHEET_ID = '1JZ4OV-qpB_QhyXJMeNR9YRAL5GDuKYdAm62ch7ShteM';
const SETTINGS = '.Settings';
const SRC = ['ATM','CASH'], TYP = ['debit','kredit'];
const json = c => ContentService.createTextOutput(JSON.stringify(c)).setMimeType(ContentService.MimeType.JSON);
const ok = (d, m) => json({ status:'success', ...d, message: m });
const err = m => json({ status:'error', message: m });
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
const ss = () => SpreadsheetApp.openById(SHEET_ID);

function getPihak(sp) {
  const s = sp.getSheetByName(SETTINGS);
  if (!s) return ['Pihak 1','Pihak 2'];
  const p1 = s.getRange('B5').getValue(), p2 = s.getRange('C5').getValue();
  const l = []; if (p1) l.push(cap(String(p1))); if (p2) l.push(cap(String(p2)));
  return l.length ? l : ['Pihak 1','Pihak 2'];
}

function doGet(e) {
  const a = e.parameter.action, sp = ss();
  if (a === 'getOptions') {
    const s = sp.getSheetByName(SETTINGS);
    if (!s) return err('Settings not found');
    const kat = s.getRange('B6:G6').getValues()[0].map(k => String(k).trim()).filter(Boolean);
    
    // Kirim hash PIN (bukan PIN asli) ke client
    return ok({ data: {
      title: s.getRange('B2').getValue() || '', 
      subtitle: s.getRange('B3').getValue() || '',
      pinHash: s.getRange('B4').getValue() || '', // Ini sudah berupa hash SHA-256
      photo: s.getRange('B1').getValue() || '',
      pihak: [s.getRange('B5').getValue()||'', s.getRange('C5').getValue()||''],
      kategori: kat.length ? kat : ['Tetap','Pokok','Jajan','Lain','Vacant 1','Vacant 2']
    }});
  }
  if (a === 'getSheets') return ok({ data: sp.getSheets().map(s => s.getName()) });
  if (a === 'getData') {
    const sn = e.parameter.sheet; if (!sn) return err('Missing sheet');
    const sh = sp.getSheetByName(sn); if (!sh) return err('Sheet not found');
    const lr = sh.getLastRow();
    if (lr < 4) return ok({ data: [], saldo: { atm: sh.getRange('J3').getValue()||0, cashPihak1: sh.getRange('K3').getValue()||0, cashPihak2: sh.getRange('L3').getValue()||0 } });
    const h = sh.getRange('A2:L2').getValues()[0].map(v => String(v).trim().toLowerCase());
    const rows = sh.getRange(4,1,lr-3,h.length).getValues();
    const data = rows.map(r => { let o={}; h.forEach((k,i) => { if(k) o[k]=r[i]!==undefined?r[i]:''; }); return o; }).filter(r => r.tanggal);
    const bal = sh.getRange(lr,10,1,3).getValues()[0];
    return ok({ data, saldo: { atm: bal[0]||0, cashPihak1: bal[1]||0, cashPihak2: bal[2]||0 } });
  }
  return err('Invalid action');
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents || '{}'), sp = ss();
  if (d.action === 'saveOptions') return saveOpt(sp, d);
  if (d.action === 'delete') return delRow(sp, d);
  if (d.action === 'edit') return editRow(sp, d);
  return addRow(sp, d);
}

function saveOpt(sp, d) {
  let s = sp.getSheetByName(SETTINGS);
  if (!s) { 
    s = sp.insertSheet(SETTINGS); 
    ['URL Foto Profil','Judul','Subjudul','PIN Hash (SHA-256)','Nama Pihak 1 & 2','Kategori 1-6'].forEach((v,i) => s.getRange(i+1,1).setValue(v)); 
  }
  if (d.photo !== undefined) s.getRange('B1').setValue(d.photo);
  if (d.title !== undefined) s.getRange('B2').setValue(d.title);
  if (d.subtitle !== undefined) s.getRange('B3').setValue(d.subtitle);
  
  // Simpan hash PIN (sudah di-hash di client-side)
  if (d.pinHash !== undefined) s.getRange('B4').setValue(d.pinHash);
  
  if (d.pihak1 !== undefined) s.getRange('B5').setValue(d.pihak1);
  if (d.pihak2 !== undefined) s.getRange('C5').setValue(d.pihak2);
  if (d.kategori !== undefined) {
    const k = Array.isArray(d.kategori) ? d.kategori : String(d.kategori).split(',').map(v=>v.trim()).filter(Boolean);
    s.getRange('B6:G6').clearContent();
    k.slice(0,6).forEach((v,i) => s.getRange(6, 2+i).setValue(v));
  }
  return ok({}, 'Saved');
}

function findRow(sh, id) {
  const lr = sh.getLastRow(); if (lr < 4) return -1;
  const ids = sh.getRange(4,1,lr-3,1).getValues();
  for (let i=0; i<ids.length; i++) if (ids[i][0] == id) return i+4;
  return -1;
}

function setFormulas(sh) {
  if (sh.getLastRow() < 4) return;
  sh.getRange('A4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; ROW(B4:B) - 2))');
  sh.getRange('J4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; J$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "ATM"); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "ATM"); 0)))))');
  sh.getRange('K4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; K$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!B5); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!B5); 0)))))');
  sh.getRange('L4').setFormula('=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; L$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!C5); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!C5); 0)))))');
}

function addRow(sp, d) {
  const sh = sp.getSheetByName(d.sheetName); if (!sh) return err('Sheet not found');
  const pihakList = getPihak(sp);
  const sumber = (d.sumber||'').toUpperCase(), pihak = cap(d.pihak||''), jenis = (d.jenis||'').toLowerCase(), nom = Number(d.nominal), kat = cap(d.kategori||'');
  const tgl = d.tanggal || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
  if (!SRC.includes(sumber) || !pihakList.includes(pihak) || !TYP.includes(jenis) || !nom || nom <= 0) return err('Invalid data');
  const jam = d.includeTime === true ? Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss') : '';
  const debit = jenis==='debit' ? nom : '', kredit = jenis==='kredit' ? nom : '';
  const lr = sh.getLastRow();
  if (lr < 4) {
    if (sh.getMaxRows() < 4) sh.insertRowAfter(3);
    sh.getRange(4,2,1,8).setValues([[tgl, jam?"'"+jam:'', sumber, d.keterangan||'-', kat, pihak, debit, kredit]]);
  } else {
    sh.appendRow([null, tgl, jam?"'"+jam:'', sumber, d.keterangan||'-', kat, pihak, debit, kredit]);
  }
  setFormulas(sh);
  return ok({}, 'Saved');
}

function editRow(sp, d) {
  const sh = sp.getSheetByName(d.sheetName); if (!sh) return err('Sheet not found');
  const row = findRow(sh, d.rowNumber); if (row === -1) return err('Not found');
  const pihakList = getPihak(sp);
  const sumber = (d.sumber||'').toUpperCase(), pihak = cap(d.pihak||''), jenis = (d.jenis||'').toLowerCase(), nom = Number(d.nominal), kat = cap(d.kategori||'');
  if (!SRC.includes(sumber) || !pihakList.includes(pihak) || !TYP.includes(jenis) || !nom || nom <= 0) return err('Invalid data');
  const jam = d.includeTime === true ? Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss') : '';
  sh.getRange(row,2).setValue(d.tanggal||'');
  if (jam) sh.getRange(row,3).setValue("'"+jam);
  sh.getRange(row,4).setValue(sumber);
  sh.getRange(row,5).setValue(d.keterangan||'-');
  sh.getRange(row,6).setValue(kat);
  sh.getRange(row,7).setValue(pihak);
  sh.getRange(row,8).setValue(jenis==='debit' ? nom : '');
  sh.getRange(row,9).setValue(jenis==='kredit' ? nom : '');
  setFormulas(sh);
  return ok({}, 'Updated');
}

function delRow(sp, d) {
  const sh = sp.getSheetByName(d.sheetName); if (!sh) return err('Sheet not found');
  const row = findRow(sh, d.rowNumber); if (row === -1) return err('Not found');
  sh.deleteRow(row); SpreadsheetApp.flush();
  if (sh.getLastRow() <= 3) { const m = sh.getMaxRows(); if (m > 3) sh.deleteRows(4, m-3); }
  else setFormulas(sh);
  return ok({}, 'Deleted');
}