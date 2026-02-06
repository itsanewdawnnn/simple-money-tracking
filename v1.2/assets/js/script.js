const App = (() => {
    const CID = new URLSearchParams(location.search).get("config");
    if (!CID) { document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#ff3b30;font-weight:700">Config ID Missing</p>'; return; }
    const BASE = `https://script.google.com/macros/s/${CID}/exec`;
    const $ = id => document.getElementById(id);
    const q = (s, p = document) => p.querySelector(s);
    const qa = (s, p = document) => p.querySelectorAll(s);
    const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    const sha256 = async (message) => {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const U = {
        debounce(fn, ms) { let t; return (...a) => (clearTimeout(t), t = setTimeout(() => fn(...a), ms)); },
        int: v => parseInt(String(v || '').replace(/\D/g, ''), 10) || 0,
        money: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }),
        num: n => n.toLocaleString('id-ID'),
        fmtD: d => { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; },
        fmtDI: d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
        parseD(s) { if (!s) return null; const d = new Date(s.includes('/') ? s.split('/').reverse().join('-') : s); return isNaN(d) ? null : (d.setHours(0,0,0,0), d); },
        dispD(s) { const d = U.parseD(s); return d ? { day: ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d.getDay()], date: d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) } : { day: '', date: s }; },
        moneyIn(e) { const r = e.target.value.replace(/\D/g,''); e.target.value = r ? parseInt(r,10).toLocaleString('id-ID') : ''; }
    };

    const S = {
        sheet: localStorage.ls_sheet || '', filter: localStorage.ls_filter || 'Semua',
        filterPihak: localStorage.ls_filterPihak || 'Semua', dateRange: localStorage.ls_dateRange || 'all',
        search: '', data: [], 
        opt: { title: 'Cashly', subtitle: 'Smart Money Tracking', pinHash: '', photo: '', pihak: ['Pihak 1','Pihak 2'], kategori: [] },
        unlocked: false,
        dataLoaded: false
    };

    const ui = {
        lod: $('lod'), lod2: $('lod2'), emp: $('emp'), lst: $('lst'), tabs: $('tabs'),
        v: { rep: $('rep'), add: $('add') }, tit: $('tit'), sub: $('sub'), prof: $('prof'),
        ref: $('ref'), sht: $('sht'), dark: $('dark'),
        sal: { atm: $('atm'), p1: $('p1'), p2: $('p2') },
        lbl: { p1: $('p1l'), p2: $('p2l') },
        src: { i: $('srch'), c: $('clr') },
        f: {
            c: { b: $('fb'), d: $('fd') }, p: { b: $('fpb'), d: $('fpd') },
            dt: { b: $('dfb'), d: $('dfd') }, tin: $('ftin'), tout: $('ftout')
        },
        frm: { el: $('frm'), dt: $('dt'), dsc: $('dsc'), amt: $('amt_in'), sub: $('sbm'), bp: $('pb'), bk: $('kb'),
            hi: { p: q('[name=pihak]', $('frm')), k: q('[name=kategori]', $('frm')) } },
        pin: { l: $('pin'), d: $('pind'), k: $('pink') },
        app: $('app-main'),
        tpl: { li: $('tpl-li'), ed: $('tpl-edit'), del: $('tpl-del') }
    };

    const api = async (body, query = '') => {
        const o = body ? { method: 'POST', body: JSON.stringify(body), redirect: 'follow' } : { method: 'GET', redirect: 'follow' };
        return (await fetch(`${BASE}${query}`, o)).json().catch(() => ({ status: 'error' }));
    };

    const tog = (c, items, active, hid) => {
        c.innerHTML = items.map(t => `<button type="button" class="tg${t === active ? ' active' : ''}" data-v="${t}">${t}</button>`).join('');
        if (hid) hid.value = active || '';
    };
    const ddrop = (c, items, cur) => { c.innerHTML = items.map(t => `<div class="fo${t === cur ? ' active' : ''}" data-f="${t}">${t}</div>`).join(''); };

    const filterData = () => {
        if (!S.data.length) return [];
        const sq = S.search.toLowerCase(), now = new Date(); now.setHours(0,0,0,0); const ms = now.getTime();
        return S.data.filter(i => {
            if (S.filter !== 'Semua' && (i.kategori||'').trim() !== S.filter) return false;
            if (S.filterPihak !== 'Semua' && i.pihak !== S.filterPihak) return false;
            if (sq && !(i.keterangan||'').toLowerCase().includes(sq) && !String(i.nominal||'').includes(sq)) return false;
            if (S.dateRange !== 'all') {
                const d = U.parseD(i.tanggal); if (!d) return false;
                const diff = Math.ceil((ms - d.getTime()) / 864e5), day = d.getDate();
                const m = { today: d.getTime()===ms, yesterday: diff===1, week: diff>=0&&diff<=7, w1: day<=7, w2: day>=8&&day<=14, w3: day>=15&&day<=21, w4: day>21 };
                return m[S.dateRange] || false;
            }
            return true;
        });
    };

    const renderList = () => {
        if (!S.unlocked) return;
        
        const f = filterData();
        const hasFilter = S.filter !== 'Semua' || S.filterPihak !== 'Semua' || S.dateRange !== 'all' || S.search;
        if (hasFilter && f.length) {
            let tIn = 0, tOut = 0;
            f.forEach(i => { tIn += U.int(i.debit); tOut += U.int(i.kredit); });
            ui.f.tin.textContent = `+${U.money.format(tIn)}`; ui.f.tout.textContent = `-${U.money.format(tOut)}`;
        }
        ui.f.tin.classList.toggle('show', hasFilter && f.length > 0);
        ui.f.tout.classList.toggle('show', hasFilter && f.length > 0);
        ui.lst.innerHTML = '';
        if (!f.length) { ui.emp.textContent = S.search ? `Tidak ditemukan "${S.search}"` : 'Tidak ada data transaksi'; ui.emp.style.display = 'block'; return; }
        ui.emp.style.display = 'none';
        const frag = document.createDocumentFragment();
        f.forEach(i => {
            const c = ui.tpl.li.content.cloneNode(true), debit = U.int(i.debit), isD = debit > 0, amt = isD ? debit : U.int(i.kredit), dO = U.dispD(i.tanggal);
            q('li', c).dataset.row = i.no;
            q('.day', c).textContent = dO.day ? dO.day + ', ' : '';
            q('.dtxt', c).textContent = dO.date;
            i.jam ? q('.tm', c).textContent = i.jam : q('.tm', c).remove();
            q('.desc', c).textContent = i.keterangan || '-';
            const tk = q('.tkat', c);
            i.kategori && i.kategori !== '-' ? (tk.textContent = i.kategori, tk.className = 'tkat tag-kategori') : tk.remove();
            q('.tp', c).textContent = i.pihak; q('.tp', c).className = 'tp tag-p';
            q('.ts', c).textContent = i.sumber; q('.ts', c).className = `ts tag-${(i.sumber||'').toLowerCase()}`;
            const ae = q('.amt', c); ae.textContent = `${isD ? '+' : '-'} ${U.money.format(amt)}`; ae.className = `amt ${isD ? 'in' : 'out'}`;
            frag.appendChild(c);
        });
        ui.lst.appendChild(frag);
    };

    const chevron = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    const Stg = {
        menu() {
            if (!S.unlocked) return;
            Swal.fire({
                title: 'Pengaturan', showConfirmButton: false, showCloseButton: true,
                html: `<ul class="sm-list">
                    <li><button class="sm-item" data-m="1"><div class="sm-icon sm-icon-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="sm-text"><b>Profil & Keamanan</b><small>Avatar, judul, subjudul, PIN</small></div><div class="sm-arr">${chevron}</div></button></li>
                    <div class="sm-sep"></div>
                    <li><button class="sm-item" data-m="2"><div class="sm-icon sm-icon-2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div class="sm-text"><b>Kelola Data</b><small>Pihak, kategori transaksi</small></div><div class="sm-arr">${chevron}</div></button></li></ul>`,
                didOpen: () => { const p = Swal.getPopup(); ['1','2'].forEach(m => q(`[data-m="${m}"]`, p).onclick = () => { Swal.close(); setTimeout(() => m==='1' ? Stg.profile() : Stg.data(), 200); }); }
            });
        },
        async _save(payload, cb) {
            const btn = Swal.getConfirmButton(), txt = btn.textContent;
            btn.disabled = true; btn.textContent = 'Menyimpan...';
            const res = await api({ action: 'saveOptions', ...payload });
            btn.disabled = false; btn.textContent = txt;
            if (res?.status === 'success') { cb(); return true; }
            Swal.showValidationMessage(res?.message || 'Gagal menyimpan'); return false;
        },
        async profile() {
            if (!S.unlocked) return;
            const o = S.opt;
            Swal.fire({
                title: 'Profil & Keamanan', showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#007aff', showCloseButton: true,
                html: `<div class="s-wrap">
                    <div class="grp"><label>Avatar (URL)</label><input id="s_ph" class="inp" type="url" placeholder="https://..." value="${esc(o.photo||'')}"><div class="inp-hint">URL gambar foto profil</div></div>
                    <div class="grp"><label>Judul</label><input id="s_ti" class="inp" value="${esc(o.title||'')}"></div>
                    <div class="grp"><label>Subjudul</label><input id="s_su" class="inp" value="${esc(o.subtitle||'')}"></div>
                    <div class="grp"><label>PIN Baru (6 digit)</label><input id="s_pi" class="inp" inputmode="numeric" maxlength="6" placeholder="Kosongkan = tanpa PIN"><div class="inp-hint">Kosongkan untuk nonaktifkan, isi untuk ubah PIN</div></div></div>`,
                preConfirm: async () => {
                    const p = Swal.getPopup(), pin = q('#s_pi',p).value.trim();
                    if (pin && !/^\d{6}$/.test(pin)) { Swal.showValidationMessage('PIN harus 6 digit atau kosong'); return false; }
                    
                    const pinHash = pin ? await sha256(pin) : '';
                    
                    const d = { photo: q('#s_ph',p).value.trim(), title: q('#s_ti',p).value.trim(), subtitle: q('#s_su',p).value.trim(), pinHash };
                    return Stg._save(d, () => { 
                        Object.assign(S.opt, { photo: d.photo, title: d.title, subtitle: d.subtitle, pinHash: d.pinHash }); 
                        ui.tit.textContent = d.title||'Cashly'; 
                        ui.sub.textContent = d.subtitle||''; 
                        if(d.photo) ui.prof.src = d.photo; 
                    });
                }
            }).then(r => r.isConfirmed && Swal.fire({ toast:true, position:'top', icon:'success', title:'Profil diperbarui', timer:1500, showConfirmButton:false, backdrop:false }));
        },
        data() {
            if (!S.unlocked) return;
            const o = S.opt;
            Swal.fire({
                title: 'Kelola Data', showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#007aff', showCloseButton: true,
                html: `<div class="s-wrap">
                    <div class="grp"><label>Pihak</label><div class="s-grid"><input id="s_p1" class="inp" placeholder="Pihak 1" value="${esc(o.pihak[0]||'')}"><input id="s_p2" class="inp" placeholder="Pihak 2" value="${esc(o.pihak[1]||'')}"></div><div class="inp-hint">Nama dua pihak pengelola</div></div>
                    <div class="grp"><label>Kategori (maks 6)</label><div class="s-grid">${[0,1,2,3,4,5].map(i=>`<input id="s_k${i}" class="inp" placeholder="Kategori ${i+1}" value="${esc(o.kategori[i]||'')}">`).join('')}</div><div class="inp-hint">Kosong = diabaikan</div></div></div>`,
                preConfirm: () => {
                    const p = Swal.getPopup(), p1 = q('#s_p1',p).value.trim(), p2 = q('#s_p2',p).value.trim();
                    if (!p1 || !p2) { Swal.showValidationMessage('Kedua pihak wajib diisi'); return false; }
                    const kat = [0,1,2,3,4,5].map(i => q(`#s_k${i}`,p).value.trim()).filter(Boolean);
                    return Stg._save({ pihak1: p1, pihak2: p2, kategori: kat }, () => {
                        S.opt.pihak = [p1, p2];
                        S.opt.kategori = kat.length ? kat : ['Tetap','Pokok','Jajan','Lain','Vacant 1','Vacant 2'];
                        ui.lbl.p1.textContent = `Cash ${p1}`; ui.lbl.p2.textContent = `Cash ${p2}`;
                        tog(ui.frm.bp, S.opt.pihak, '', ui.frm.hi.p); tog(ui.frm.bk, S.opt.kategori, '', ui.frm.hi.k);
                        ddrop(ui.f.c.d, ['Semua', ...S.opt.kategori], S.filter); ddrop(ui.f.p.d, ['Semua', ...S.opt.pihak], S.filterPihak);
                    });
                }
            }).then(r => r.isConfirmed && Swal.fire({ toast:true, position:'top', icon:'success', title:'Data diperbarui', timer:1500, showConfirmButton:false, backdrop:false }));
        }
    };

    const Act = {
        async start() {
            ui.frm.dt.value = U.fmtDI(new Date());
            const res = await api(null, '?action=getOptions');
            if (res?.data) S.opt = { ...S.opt, ...res.data };
            if (!S.opt.pihak?.length) S.opt.pihak = ['Pihak 1','Pihak 2'];
            ui.tit.textContent = S.opt.title; ui.sub.textContent = S.opt.subtitle;
            if (S.opt.photo) ui.prof.src = S.opt.photo;
            ui.lbl.p1.textContent = `Cash ${S.opt.pihak[0]}`; ui.lbl.p2.textContent = `Cash ${S.opt.pihak[1]}`;
            tog(ui.frm.bp, S.opt.pihak, '', ui.frm.hi.p); tog(ui.frm.bk, S.opt.kategori, '', ui.frm.hi.k);
            ddrop(ui.f.c.d, ['Semua', ...S.opt.kategori], S.filter); ddrop(ui.f.p.d, ['Semua', ...S.opt.pihak], S.filterPihak);
            ui.f.c.b.classList.toggle('active', S.filter !== 'Semua'); ui.f.p.b.classList.toggle('active', S.filterPihak !== 'Semua');
            q(`[data-r="${S.dateRange}"]`, ui.f.dt.d)?.classList.add('active');
            ui.f.dt.b.classList.toggle('active', S.dateRange !== 'all');
            if (localStorage.ls_dark === 'true') document.body.classList.add('dark');
            ui.dark.onclick = () => { document.body.classList.toggle('dark'); localStorage.ls_dark = document.body.classList.contains('dark'); };
            ui.lod.classList.add('hidden');
            
            if (S.opt.pinHash) {
                ui.pin.l.classList.remove('hidden');
                ui.app.classList.add('hidden');
                PIN.init();
                this.preloadData();
            } else {
                this.unlockApp();
            }
        },
        async preloadData() {
            const res = await api(null, '?action=getSheets');
            if (res?.data) {
                const sh = res.data.filter(s => !s.startsWith('.'));
                ui.sht.innerHTML = sh.map(s => `<option value="${s}">${s}</option>`).join('');
                S.sheet = sh.includes(localStorage.ls_sheet) ? localStorage.ls_sheet : sh[0];
                ui.sht.value = S.sheet; ui.sht.disabled = false;
                
                const dataRes = await api(null, `?action=getData&sheet=${S.sheet}&t=${Date.now()}`);
                if (dataRes?.status !== 'error') {
                    if (dataRes.saldo) { 
                        ui.sal.atm.textContent = U.money.format(dataRes.saldo.atm||0); 
                        ui.sal.p1.textContent = U.money.format(dataRes.saldo.cashPihak1||0); 
                        ui.sal.p2.textContent = U.money.format(dataRes.saldo.cashPihak2||0); 
                    }
                    S.data = dataRes.data || [];
                    S.dataLoaded = true;
                    
                    if (S.unlocked) {
                        renderList();
                    }
                }
            }
        },
        unlockApp() {
            S.unlocked = true;
            ui.app.classList.remove('hidden');
            ui.pin.l.classList.add('hidden');
            
            if (S.dataLoaded) {
                renderList();
            } else {
                this.init();
            }
            
            this.bind();
        },
        async init() {
            const res = await api(null, '?action=getSheets');
            if (res?.data) {
                const sh = res.data.filter(s => !s.startsWith('.'));
                ui.sht.innerHTML = sh.map(s => `<option value="${s}">${s}</option>`).join('');
                S.sheet = sh.includes(localStorage.ls_sheet) ? localStorage.ls_sheet : sh[0];
                ui.sht.value = S.sheet; ui.sht.disabled = false; this.load();
            }
        },
        async load() {
            if (!S.unlocked) return;
            
            if (!S.data.length) ui.lod2.style.display = 'block';
            const res = await api(null, `?action=getData&sheet=${S.sheet}&t=${Date.now()}`);
            ui.lod2.style.display = 'none';
            if (res?.status !== 'error') {
                if (res.saldo) { ui.sal.atm.textContent = U.money.format(res.saldo.atm||0); ui.sal.p1.textContent = U.money.format(res.saldo.cashPihak1||0); ui.sal.p2.textContent = U.money.format(res.saldo.cashPihak2||0); }
                S.data = res.data || []; 
                S.dataLoaded = true;
                renderList();
            } else { ui.emp.textContent = 'Gagal memuat data'; ui.emp.style.display = 'block'; }
        },
        async save(data, edit = false, btn = null) {
            if (!S.unlocked) return;
            
            const t = btn || ui.frm.sub, o = t.textContent;
            t.disabled = true; t.textContent = 'Menyimpan...';
            const res = await api(data);
            t.disabled = false; t.textContent = o;
            if (res?.status === 'success' || res?.result === 'success') {
                Swal.fire({ toast:true, position:'top', icon:'success', title: edit ? 'Diperbarui' : 'Disimpan', timer:1500, showConfirmButton:false, backdrop:false });
                if (!edit) { ui.frm.el.reset(); ui.frm.dt.value = U.fmtDI(new Date()); qa('.tg.active', ui.frm.el).forEach(b => b.classList.remove('active')); qa('input[type=hidden]', ui.frm.el).forEach(i => i.value=''); setTimeout(() => q('[data-v="rep"]', ui.tabs).click(), 100); }
                this.load(); return true;
            }
            Swal.fire({ title:'Gagal', text: res?.message || 'Kesalahan server', icon:'error' }); return false;
        },
        bind() {
            if (this._bound) return;
            this._bound = true;
            
            ui.prof.onclick = () => Stg.menu();
            ui.sht.onchange = e => { S.sheet = localStorage.ls_sheet = e.target.value; this.load(); };
            ui.ref.onclick = () => { ui.ref.classList.add('spin'); this.load().then(() => setTimeout(() => ui.ref.classList.remove('spin'), 500)); };
            ui.frm.amt.oninput = U.moneyIn;
            ui.tabs.onclick = e => { if (!e.target.classList.contains('tab')) return; qa('.tab,.view').forEach(el => el.classList.remove('active')); e.target.classList.add('active'); ui.v[e.target.dataset.v].classList.add('active'); };
            ui.frm.el.onclick = e => { if (!e.target.classList.contains('tg')) return; const g = e.target.closest('.grp'); qa('.tg', g).forEach(b => b.classList.remove('active')); e.target.classList.add('active'); q('input[type=hidden]', g).value = e.target.dataset.v; };

            const closeF = () => qa('.fdd').forEach(el => el.classList.remove('show'));
            const togF = d => { const s = d.classList.contains('show'); closeF(); if (!s) d.classList.add('show'); };
            [['c','f'],['p','f'],['dt','f']].forEach(([k]) => ui.f[k].b.onclick = e => { e.stopPropagation(); togF(ui.f[k].d); });
            document.onclick = e => { if (!e.target.closest('.fc')) closeF(); };

            const applyF = (type, val, btn, drop) => { S[type] = localStorage['ls_'+type] = val; qa('.active', drop).forEach(el => el.classList.remove('active')); btn.classList.toggle('active', val !== (type==='dateRange' ? 'all' : 'Semua')); renderList(); closeF(); };
            ui.f.c.d.onclick = e => { if (e.target.dataset.f) { e.target.classList.add('active'); applyF('filter', e.target.dataset.f, ui.f.c.b, ui.f.c.d); } };
            ui.f.p.d.onclick = e => { if (e.target.dataset.f) { e.target.classList.add('active'); applyF('filterPihak', e.target.dataset.f, ui.f.p.b, ui.f.p.d); } };
            ui.f.dt.d.onclick = e => { if (e.target.dataset.r) { e.target.classList.add('active'); applyF('dateRange', e.target.dataset.r, ui.f.dt.b, ui.f.dt.d); } };

            ui.src.i.oninput = U.debounce(e => { S.search = e.target.value.trim(); ui.src.c.classList.toggle('hidden', !S.search); renderList(); }, 100);
            ui.src.c.onclick = () => { ui.src.i.value = ''; S.search = ''; ui.src.c.classList.add('hidden'); renderList(); };

            ui.frm.el.onsubmit = e => {
                e.preventDefault();
                const fd = new FormData(ui.frm.el), nom = U.int(ui.frm.amt.value);
                const d = { sheetName: S.sheet, tanggal: U.fmtD(ui.frm.dt.value), keterangan: ui.frm.dsc.value.trim(), pihak: fd.get('pihak'), sumber: fd.get('sumber'), jenis: fd.get('jenis'), kategori: fd.get('kategori')||'', nominal: nom, includeTime: ui.frm.dt.value === U.fmtDI(new Date()) };
                if (!d.tanggal || !d.keterangan || !d.pihak || !d.sumber || !d.jenis || nom <= 0) return Swal.fire({ icon:'warning', title:'Data Tidak Lengkap' });
                this.save(d);
            };

            ui.lst.onclick = e => {
                const btn = e.target.closest('button'); if (!btn) return;
                const li = e.target.closest('li'), item = S.data.find(d => d.no === parseInt(li.dataset.row, 10));
                if (!item) return;
                btn.dataset.a === 'd' ? this.del(item) : this.edit(item);
            };
        },
        del(item) {
            if (!S.unlocked) return;
            const val = U.int(item.debit) || U.int(item.kredit);
            const tpl = ui.tpl.del.content.cloneNode(true);
            q('.v-date', tpl).textContent = U.dispD(item.tanggal).date;
            q('.v-desc', tpl).textContent = item.keterangan;
            q('.v-amt', tpl).textContent = U.money.format(val);
            const w = document.createElement('div'); w.appendChild(tpl);
            Swal.fire({ title:'Hapus Transaksi?', html: w.innerHTML, showCancelButton:true, confirmButtonColor:'#ff3b30', confirmButtonText:'Hapus', cancelButtonText:'Batal',
                preConfirm: () => this.save({ action:'delete', sheetName: S.sheet, rowNumber: item.no }, true, Swal.getConfirmButton()) });
        },
        edit(item) {
            if (!S.unlocked) return;
            const isD = U.int(item.debit) > 0, val = isD ? U.int(item.debit) : U.int(item.kredit);
            const w = document.createElement('div'); w.appendChild(ui.tpl.ed.content.cloneNode(true));
            const sT = (p, cid, hid, opts, sel) => { const c = q(cid,p), h = q(hid,p); tog(c, opts, sel, h); c.onclick = e => { if (!e.target.classList.contains('tg')) return; qa('.tg',c).forEach(x=>x.classList.remove('active')); e.target.classList.add('active'); h.value=e.target.dataset.v; }; };
            Swal.fire({ title:'Edit Transaksi', html: w.innerHTML, width:'95%', showCancelButton:true, confirmButtonColor:'#007aff', confirmButtonText:'Simpan', cancelButtonText:'Batal',
                didOpen: () => {
                    const p = Swal.getPopup(), pd = U.parseD(item.tanggal);
                    q('#x_d',p).value = pd ? U.fmtDI(pd) : '';
                    q('#x_k',p).value = item.keterangan;
                    const xn = q('#x_n',p); xn.value = U.num(val); xn.oninput = U.moneyIn;
                    sT(p,'#ep','#xp', S.opt.pihak, item.pihak); sT(p,'#es','#xs', ['ATM','CASH'], item.sumber);
                    sT(p,'#ej','#xj', ['Debit','Kredit'], isD ? 'Debit' : 'Kredit');
                    sT(p,'#ek','#xk', S.opt.kategori, item.kategori && item.kategori !== '-' ? item.kategori : '');
                },
                preConfirm: () => {
                    const p = Swal.getPopup(), n = U.int(q('#x_n',p).value), t = q('#x_d',p).value, k = q('#x_k',p).value.trim();
                    const ph = q('#xp',p).value, s = q('#xs',p).value, j = q('#xj',p).value, kat = q('#xk',p).value;
                    if (!t||!k||!ph||!s||!j||n<=0) return Swal.showValidationMessage('Data Tidak Lengkap');
                    return this.save({ action:'edit', sheetName: S.sheet, rowNumber: item.no, tanggal: U.fmtD(t), keterangan: k, nominal: n, pihak: ph, sumber: s, jenis: j, kategori: kat||'', includeTime: false }, true, Swal.getConfirmButton());
                }
            });
        }
    };

    const PIN = {
        v: '',
        async init() {
            const pa = $('pin-avatar'); 
            if (S.opt.photo) {
                pa.src = S.opt.photo;
                pa.style.display = 'block';
            } else {
                pa.style.display = 'none';
            }
            $('pin-title-text').textContent = S.opt.title || '';
            ui.pin.d.innerHTML = '<div class="pin-dot"></div>'.repeat(6);
            ui.pin.k.innerHTML = [1,2,3,4,5,6,7,8,9].map(k => `<button class="pin-key" data-k="${k}">${k}</button>`).join('') + '<button class="pin-key pin-zero" data-k="0">0</button>';
            const nk = ui.pin.k.cloneNode(true); ui.pin.k.replaceWith(nk); ui.pin.k = nk;
            ui.pin.k.onclick = async (e) => {
                const b = e.target.closest('.pin-key'); if (!b) return;
                if (navigator.vibrate) navigator.vibrate(10);
                if (this.v.length < 6) this.v += b.dataset.k;
                this.render();
                if (this.v.length === 6) setTimeout(() => this.check(), 200);
            };
        },
        render() { qa('.pin-dot', ui.pin.d).forEach((d, i) => d.classList.toggle('filled', i < this.v.length)); },
        async check() {
            const inputHash = await sha256(this.v);
            
            if (inputHash === S.opt.pinHash) { 
                Act.unlockApp();
            } else { 
                ui.pin.d.classList.add('shake'); 
                setTimeout(() => { 
                    this.v = ''; 
                    this.render(); 
                    ui.pin.d.classList.remove('shake'); 
                }, 500); 
            }
        }
    };

    return { start: () => Act.start() };
})();
document.addEventListener('DOMContentLoaded', App.start);