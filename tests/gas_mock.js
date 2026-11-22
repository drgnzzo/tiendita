// Simulador minimo de Apps Script para probar Codigo.gs en Node
const vm = require('vm'), fs = require('fs'), crypto = require('crypto');

function makeEnv(seed) {
  const sheets = {};
  const mkSheet = (name, rows) => {
    const sh = { name, rows: rows.map(r => r.slice()),
      getDataRange() { const w = Math.max(...this.rows.map(r => r.length), 1);
        return { getValues: () => this.rows.map(r => { const c = r.slice(); while (c.length < w) c.push(''); return c; }) }; },
      getLastRow() { return this.rows.length; },
      getMaxRows() { return this.rows.length + 1000; },
      insertRowsAfter() {},
      appendRow(r) { this.rows.push(r.slice()); },
      getRange(r, c, nr = 1, nc = 1) { const self = this; return {
        setValue(v) { while (self.rows.length < r) self.rows.push([]); const row = self.rows[r-1]; while (row.length < c) row.push(''); row[c-1] = v; },
        setValues(vs) { vs.forEach((vr, i) => { while (self.rows.length < r+i) self.rows.push([]); const row = self.rows[r+i-1]; vr.forEach((v, j) => { while (row.length < c+j) row.push(''); row[c+j-1] = v; }); }); },
        getValues() { const out=[]; for (let i=0;i<nr;i++){ const row=self.rows[r-1+i]||[]; const o=[]; for(let j=0;j<nc;j++) o.push(row[c-1+j]===undefined?'':row[c-1+j]); out.push(o);} return out; },
        clearContent() { for (let i=0;i<nr;i++){ const row=self.rows[r-1+i]; if(!row) continue; for(let j=0;j<nc;j++) row[c-1+j]=''; } return this; }, setNote(){return this;}, setDataValidation(){return this;}, setFontWeight(){return this;}, setBackground(){return this;}, setFontColor(){return this;}, setHorizontalAlignment(){return this;}, setNumberFormat(){return this;}
      }; },
      setFrozenRows() {}, setColumnWidth() {}, setTabColor(){} };
    sheets[name] = sh; return sh;
  };
  Object.entries(seed).forEach(([n, rows]) => mkSheet(n, rows));
  const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => mkSheet(n, []), getUi: () => ({}) };
  const store = {}; const props = {};
  const logs = [];
  const tz = (d, fmt) => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(d)
      .reduce((a, x) => (a[x.type] = x.value, a), {});
    return fmt.replace('yyyy', p.year).replace('dd', p.day).replace('MM', p.month).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute);
  };
  const ctx = {
    console, Date, Math, JSON, Number, String, Array, Object, parseInt, parseFloat, isFinite, Error, RegExp,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ({ ButtonSet: {}, Button: {} }) },
    Logger: { log: x => logs.push(x) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (store[k] === undefined ? null : store[k]), put: (k, v) => { store[k] = v; }, remove: k => { delete store[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; }, getContent() { return t; } }) },
    ScriptApp: { getProjectTriggers: () => [] },
    MailApp: { sendEmail() {} },
    HtmlService: {},
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => b > 127 ? b - 256 : b),
      computeHmacSha256Signature: (t, k) => Array.from(crypto.createHmac('sha256', k).update(t).digest()),
      base64EncodeWebSafe: x => (typeof x === 'string' ? Buffer.from(x) : Buffer.from(x)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: s => Array.from(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
      newBlob: b => ({ getDataAsString: () => Buffer.from(b).toString('utf8') }),
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, z, f) => tz(d, f)
    }
  };
  vm.createContext(ctx);
  ['Código.gs'].forEach(f => vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/' + f, 'utf8'), ctx, { filename: f }));
  // const/let de nivel superior no quedan en ctx; exponer los que necesitamos
  vm.runInContext('this.__api = (accion, params) => JSON.parse(_handleRequest({ parameter: {}, postData: { contents: JSON.stringify(Object.assign({ action: accion }, params)) } }, "POST").getContent());', ctx);
  return { ctx, sheets, call: ctx.__api, props, store };
}
module.exports = { makeEnv };
