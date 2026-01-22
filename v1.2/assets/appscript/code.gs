// ===================== CONFIGURATION =====================
const SHEET_ID = 'SHEET_ID'; // Replace with your Spreadsheet ID
const SETTINGS_SHEET = '.Settings';
const VALID_SOURCES = ['ATM', 'CASH'];
const VALID_TYPES = ['debit', 'kredit'];

// ===================== DO GET =====================
function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // 1. Get Options from .Settings
    if (action === 'getOptions') {
      return getOptions(ss);
    }
    
    // 2. Get All Sheet Names
    if (action === 'getSheets') {
      const sheets = ss.getSheets();
      const sheetNames = sheets.map(sheet => sheet.getName());
      return sendJSON({ status: 'success', data: sheetNames });
    }
    
    // 3. Get Data from Specific Sheet
    if (action === 'getData') {
      const sheetName = e.parameter.sheet;
      if (!sheetName) return sendJSON({ status: 'error', message: 'Parameter "sheet" is required.' });
      
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return sendJSON({ status: 'error', message: `Sheet "${sheetName}" not found.` });
      
      const lastRow = sheet.getLastRow();
      
      // Case A: No data (only headers and initial balance row)
      if (lastRow < 4) {
        const initialBal = sheet.getRange('J3:L3').getValues()[0];
        return sendJSON({
          status: 'success',
          data: [],
          saldo: {
            atm: initialBal[0] || 0,
            cashPihak1: initialBal[1] || 0,
            cashPihak2: initialBal[2] || 0
          }
        });
      }
      
      // Case B: Data exists
      const headersRange = sheet.getRange('A2:L2').getValues();
      const headers = headersRange[0].map(h => String(h).trim().toLowerCase());
      
      const dataRange = sheet.getRange(4, 1, lastRow - 3, headers.length);
      const rows = dataRange.getValues();
      
      const result = rows.map(row => {
        let obj = {};
        headers.forEach((header, i) => {
          if (header) {
            obj[header] = row[i] !== undefined ? row[i] : '';
          }
        });
        return obj;
      }).filter(row => row.tanggal !== '' && row.tanggal !== null);
      
      const latestBal = sheet.getRange(lastRow, 10, 1, 3).getValues()[0];
      
      return sendJSON({
        status: 'success',
        data: result,
        saldo: {
          atm: latestBal[0] || 0,
          cashPihak1: latestBal[1] || 0,
          cashPihak2: latestBal[2] || 0
        }
      });
    }
    
    return sendJSON({ status: 'error', message: 'Invalid action for doGet.' });
  } catch (err) {
    return sendJSON({ status: 'error', message: err.message });
  }
}

// ===================== DO POST =====================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    if (data.action === 'saveOptions') return saveOptions(ss, data);
    if (data.action === 'delete') return handleDelete(ss, data);
    if (data.action === 'edit') return handleEdit(ss, data);
    
    return handleAddTransaction(ss, data);
  } catch (err) {
    return sendJSON({ status: 'error', message: `Server Error: ${err.message}` });
  }
}

// ===================== LOGIC: OPTIONS =====================
function getOptions(ss) {
  try {
    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
    if (!settingsSheet) return sendJSON({ status: 'error', message: `Sheet "${SETTINGS_SHEET}" not found.` });
    
    const photo = settingsSheet.getRange('B1').getValue();
    const title = settingsSheet.getRange('B2').getValue();
    const subtitle = settingsSheet.getRange('B3').getValue();
    const pin = settingsSheet.getRange('B4').getValue();
    const pihak1 = settingsSheet.getRange('B5').getValue();
    const pihak2 = settingsSheet.getRange('C5').getValue();
    
    // Membaca KATEGORI dari B6 sampai G6 (6 kategori)
    const kategoriRange = settingsSheet.getRange('B6:G6').getValues()[0];
    const kategori = kategoriRange
      .map(k => String(k).trim())
      .filter(k => k && k !== '');
    
    const finalKategori = kategori.length > 0 ? 
      kategori : 
      ["Tetap", "Pokok", "Jajan", "Lain", "Vacant 1", "Vacant 2"];
    
    return sendJSON({
      status: 'success',
      data: {
        title: title || '',
        subtitle: subtitle || '',
        pin: String(pin || ''),
        photo: photo || '',
        pihak: [pihak1 || '', pihak2 || ''],
        kategori: finalKategori
      }
    });
  } catch (err) {
    return sendJSON({ status: 'error', message: err.message });
  }
}

function saveOptions(ss, data) {
  try {
    let sheet = ss.getSheetByName(SETTINGS_SHEET);
    
    if (!sheet) {
      sheet = ss.insertSheet(SETTINGS_SHEET);
      sheet.getRange('A1').setValue('URL Foto Profil');
      sheet.getRange('A2').setValue('Judul');
      sheet.getRange('A3').setValue('Subjudul');
      sheet.getRange('A4').setValue('PIN (6 digit)');
      sheet.getRange('A5').setValue('Nama Pihak 1 & 2');
      sheet.getRange('A6').setValue('Kategori 1-6');
    }
    
    if (data.photo !== undefined) sheet.getRange('B1').setValue(data.photo);
    if (data.title !== undefined) sheet.getRange('B2').setValue(data.title);
    if (data.subtitle !== undefined) sheet.getRange('B3').setValue(data.subtitle);
    if (data.pin !== undefined) sheet.getRange('B4').setValue(data.pin);
    if (data.pihak1 !== undefined) sheet.getRange('B5').setValue(data.pihak1);
    if (data.pihak2 !== undefined) sheet.getRange('C5').setValue(data.pihak2);
    
    // Save kategori to B6:G6
    if (data.kategori !== undefined) {
      const katArray = typeof data.kategori === 'string' ? 
        data.kategori.split(',').map(k => k.trim()).filter(k => k) : 
        data.kategori;
      
      sheet.getRange('B6:G6').clearContent();
      
      katArray.slice(0, 6).forEach((kat, index) => {
        sheet.getRange(6, 2 + index).setValue(kat);
      });
    }
    
    return sendJSON({ status: 'success', message: 'Settings saved successfully.' });
  } catch (err) {
    return sendJSON({ status: 'error', message: err.message });
  }
}

// ===================== LOGIC: ADD TRANSACTION =====================
function handleAddTransaction(ss, data) {
  let { sheetName, tanggal, sumber, keterangan, kategori, pihak, jenis, nominal, includeTime } = data;
  
  if (!sheetName) return sendJSON({ status: 'error', message: 'Sheet name is required.' });
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return sendJSON({ status: 'error', message: `Sheet "${sheetName}" not found.` });
  
  const validPihakList = getDynamicPihak(ss);
  
  tanggal = tanggal ? tanggal : Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy");
  sumber = (sumber || '').toUpperCase();
  kategori = capitalize(kategori || '');
  pihak = capitalize(pihak || '');
  jenis = (jenis || '').toLowerCase();
  nominal = Number(nominal);
  
  if (!VALID_SOURCES.includes(sumber)) return sendJSON({ status: 'error', message: 'Invalid Source.' });
  if (!validPihakList.includes(pihak)) return sendJSON({ status: 'error', message: 'Invalid Party Name.' });
  if (!VALID_TYPES.includes(jenis)) return sendJSON({ status: 'error', message: 'Invalid Type (debit/kredit).' });
  if (isNaN(nominal) || nominal <= 0) return sendJSON({ status: 'error', message: 'Invalid Nominal amount.' });
  
  let jam = '';
  if (includeTime === true) {
    jam = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm:ss");
  }
  
  const debit = jenis === 'debit' ? nominal : '';
  const kredit = jenis === 'kredit' ? nominal : '';
  
  const lastRow = sheet.getLastRow();
  const isFirstData = lastRow < 4;
  
  if (isFirstData) {
    if (sheet.getMaxRows() < 4) {
      sheet.insertRowAfter(3);
    }
    
    sheet.getRange(4, 2, 1, 8).setValues([[
      tanggal,
      jam ? "'" + jam : '',
      sumber,
      keterangan || '-',
      kategori || '-',
      pihak,
      debit,
      kredit
    ]]);
  } else {
    sheet.appendRow([
      null,
      tanggal,
      jam ? "'" + jam : '',
      sumber,
      keterangan || '-',
      kategori || '-',
      pihak,
      debit,
      kredit
    ]);
  }
  
  setSheetFormulas(sheet);
  
  return sendJSON({ status: 'success', message: 'Transaction saved successfully.' });
}

// ===================== LOGIC: EDIT TRANSACTION =====================
function handleEdit(ss, data) {
  const { sheetName, rowNumber, tanggal, keterangan, kategori, nominal, pihak, sumber, jenis, includeTime } = data;
  
  if (!sheetName) return sendJSON({ status: 'error', message: 'Sheet name is required.' });
  if (!rowNumber) return sendJSON({ status: 'error', message: 'Row number is required.' });
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return sendJSON({ status: 'error', message: `Sheet "${sheetName}" not found.` });
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return sendJSON({ status: 'error', message: 'Data not found.' });
  
  const ids = sheet.getRange(4, 1, lastRow - 3, 1).getValues();
  let targetRow = -1;
  
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] == rowNumber) {
      targetRow = i + 4;
      break;
    }
  }
  
  if (targetRow === -1) return sendJSON({ status: 'error', message: 'Data ID not found.' });
  
  const validPihakList = getDynamicPihak(ss);
  const valSumber = (sumber || '').toUpperCase();
  const valKategori = capitalize(kategori || '');
  const valPihak = capitalize(pihak || '');
  const valJenis = (jenis || '').toLowerCase();
  const valNominal = Number(nominal);
  
  if (!VALID_SOURCES.includes(valSumber)) return sendJSON({ status: 'error', message: 'Invalid Source.' });
  if (!validPihakList.includes(valPihak)) return sendJSON({ status: 'error', message: 'Invalid Party.' });
  if (!VALID_TYPES.includes(valJenis)) return sendJSON({ status: 'error', message: 'Invalid Type.' });
  if (isNaN(valNominal) || valNominal <= 0) return sendJSON({ status: 'error', message: 'Invalid Nominal.' });
  
  const debit = valJenis === 'debit' ? valNominal : '';
  const kredit = valJenis === 'kredit' ? valNominal : '';
  
  let jam = '';
  if (includeTime === true) {
    jam = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm:ss");
  }
  
  sheet.getRange(targetRow, 2).setValue(tanggal || '');
  if (jam) sheet.getRange(targetRow, 3).setValue("'" + jam);
  sheet.getRange(targetRow, 4).setValue(valSumber);
  sheet.getRange(targetRow, 5).setValue(keterangan || '-');
  sheet.getRange(targetRow, 6).setValue(valKategori || '-');
  sheet.getRange(targetRow, 7).setValue(valPihak);
  sheet.getRange(targetRow, 8).setValue(debit);
  sheet.getRange(targetRow, 9).setValue(kredit);
  
  setSheetFormulas(sheet);
  
  return sendJSON({ status: 'success', message: 'Data updated successfully.' });
}

// ===================== LOGIC: DELETE =====================
function handleDelete(ss, data) {
  const { sheetName, rowNumber } = data;
  
  if (!sheetName || !rowNumber) return sendJSON({ status: 'error', message: 'Missing parameters.' });
  
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return sendJSON({ status: 'error', message: 'Sheet not found.' });
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return sendJSON({ status: 'error', message: 'No data to delete.' });
  
  const ids = sheet.getRange(4, 1, lastRow - 3, 1).getValues();
  let targetRow = -1;
  
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] == rowNumber) {
      targetRow = i + 4;
      break;
    }
  }
  
  if (targetRow === -1) return sendJSON({ status: 'error', message: 'Data not found.' });
  
  sheet.deleteRow(targetRow);
  SpreadsheetApp.flush();
  
  if (sheet.getLastRow() <= 3) {
    const maxRows = sheet.getMaxRows();
    if (maxRows > 3) {
      sheet.deleteRows(4, maxRows - 3);
    }
  } else {
    setSheetFormulas(sheet);
  }
  
  return sendJSON({ status: 'success', message: 'Data deleted successfully.' });
}

// ===================== HELPER: FORMULAS =====================
function setSheetFormulas(sheet) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 4) return;
  
  const formulaA = '=ARRAYFORMULA(IF(B4:B=""; ""; ROW(B4:B) - 2))';
  const formulaJ = '=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; J$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "ATM"); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "ATM"); 0)))))';
  const formulaK = '=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; K$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!B5); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!B5); 0)))))';
  const formulaL = '=ARRAYFORMULA(IF(B4:B=""; ""; MAP(ROW(B4:B); LAMBDA(r; L$3 + IFERROR(SUMIFS(INDIRECT("H4:H"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!C5); 0) - IFERROR(SUMIFS(INDIRECT("I4:I"&r); INDIRECT("D4:D"&r); "CASH"; INDIRECT("G4:G"&r); \'.Settings\'!C5); 0)))))';
  
  sheet.getRange('A4').setFormula(formulaA);
  sheet.getRange('J4').setFormula(formulaJ);
  sheet.getRange('K4').setFormula(formulaK);
  sheet.getRange('L4').setFormula(formulaL);
}

// ===================== UTILITIES =====================
function getDynamicPihak(ss) {
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!settingsSheet) return ['Pihak 1', 'Pihak 2'];
  
  const p1 = settingsSheet.getRange('B5').getValue();
  const p2 = settingsSheet.getRange('C5').getValue();
  
  const list = [];
  if (p1) list.push(capitalize(String(p1)));
  if (p2) list.push(capitalize(String(p2)));
  
  return list.length > 0 ? list : ['Pihak 1', 'Pihak 2'];
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function sendJSON(content) {
  return ContentService
    .createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}