(() => {
    // ===== CONFIG =====
    const urlParams = new URLSearchParams(window.location.search);
    const configId = urlParams.get("config");
    if (!configId) {
        document.getElementById("loadingOverlay").classList.add("hidden");
        return Swal.fire({
            icon: "error",
            title: "Gagal Terhubung",
            text: "Parameter tidak valid",
            confirmButtonText: "OK",
            allowOutsideClick: false
        });
    }
    
    const ENDPOINT = `https://script.google.com/macros/s/${configId}/exec`;
    const LS_KEY = "ls_v1", LS_FILTER_KEY = "ls_filter_v1";
    const IDR = new Intl.NumberFormat("id-ID", {style: "currency", currency: "IDR", maximumFractionDigits: 0});
    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    
    // ===== HELPERS =====
    const $ = id => document.getElementById(id);
    const $$ = (p, s) => p.querySelector(s);
    const $$$ = (p, s) => p.querySelectorAll(s);
    const animNum = (el, end) => {
        let start = 0, t = null;
        const step = ts => {
            if (!t) t = ts;
            const p = Math.min((ts - t) / 1000, 1);
            el.textContent = IDR.format(Math.floor((1 - Math.pow(1 - p, 4)) * end));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    const fmtDate = d => {
        const dt = new Date(d);
        return isNaN(dt) ? d : `${DAYS[dt.getDay()]}, ${dt.toLocaleDateString("id-ID", {day:"numeric", month:"short", year:"numeric"})}`;
    };
    const toYMD = d => {
        const [y, m, day] = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')];
        return `${y}-${m}-${day}`;
    };
    const toDMY = ymd => {
        const [y, m, d] = ymd.split("-");
        return `${d}/${m}/${y}`;
    };
    const parseNum = v => parseInt((v || "").replace(/\D/g, "")) || 0;
    const toast = (msg, icon = "success") => Swal.fire({toast: true, position: "top", icon, title: msg, timer: 1500, showConfirmButton: false});
    const api = async (data, query = "") => {
        try {
            const opts = data ? {method: "POST", mode: "no-cors", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)} : {};
            const req = await fetch(`${ENDPOINT}${query}`, opts);
            return data ? req : req.json();
        } catch (e) {
            $("loadingOverlay").classList.add("hidden");
            Swal.fire({icon: "error", title: "Gagal Terhubung", text: "Config tidak valid", confirmButtonText: "OK"});
            throw e;
        }
    };
    const loading = show => $("loadingOverlay").classList.toggle("hidden", !show);
    
    // ===== STATE =====
    const state = {
        curSheet: localStorage.getItem(LS_KEY) || "",
        activeFilter: localStorage.getItem(LS_FILTER_KEY) || "All",
        data: [],
        opt: {title: "", subtitle: "", pin: "", photo: "", pihak: ["Pihak 1", "Pihak 2"], kategori: []}
    };
    
    // ===== DOM =====
    const dom = {
        sel: $("sel"), ld: $("ld"), emp: $("emp"), lst: $("lst"),
        s1: $("s1"), s2: $("s2"), s3: $("s3"),
        f: $("f"), d: $("fd"), ket: $("fket"), n: $("fn"), b: $("bs"),
        pihakCont: $("pihakContainer"), kategoriCont: $("kategoriContainer"),
        ref: $("ref"), nav: $("nav"),
        pinLock: $("pinLock"), pinDis: $("pinDisplay"), pinKey: $("pinKeypad"),
        img: $("profileImg"), ttl: $("appTitle"), sub: $("appSubtitle"),
        loading: $("loadingOverlay"), filterBtn: $("filterBtn"), filterDropdown: $("filterDropdown")
    };
    
    // ===== PIN SYSTEM =====
    const pin = {
        val: "",
        init() {
            dom.pinKey.addEventListener("click", e => {
                const btn = e.target.closest(".pin-key");
                if (!btn || btn.classList.contains("empty")) return;
                const key = btn.dataset.key;
                if (key === "delete") this.val = this.val.slice(0, -1);
                else if (this.val.length < 6) this.val += key;
                this.render();
                if (this.val.length === 6) setTimeout(() => this.check(), 200);
            });
        },
        render() {
            $$$(dom.pinDis, ".pin-dot").forEach((dot, i) => {
                dot.classList.toggle("filled", i < this.val.length);
                dot.classList.remove("shake");
            });
        },
        check() {
            if (this.val === state.opt.pin) {
                dom.pinLock.classList.add("hidden");
                app.init();
            } else {
                $$$(dom.pinDis, ".pin-dot").forEach(d => d.classList.add("shake"));
                setTimeout(() => {
                    this.val = "";
                    this.render();
                }, 400);
            }
        }
    };
    
    // ===== APP =====
    const app = {
        async start() {
            try {
                loading(true);
                const res = await api(null, "?action=getOptions");
                if (res.status !== "success") throw new Error("Gagal memuat pengaturan");
                
                state.opt = {...state.opt, ...res.data};
                if (!state.opt.pihak || state.opt.pihak.length < 2) state.opt.pihak = ["Pihak 1", "Pihak 2"];
                if (!state.opt.kategori || !state.opt.kategori.length) {
                    state.opt.kategori = ["Tetap", "Pokok", "Jajan", "Lain", "Vacant 1", "Vacant 2"];
                }
                
                $$(dom.s2.parentElement, 'span').textContent = `Cash ${state.opt.pihak[0]}`;
                $$(dom.s3.parentElement, 'span').textContent = `Cash ${state.opt.pihak[1]}`;
                dom.pihakCont.innerHTML = state.opt.pihak.map(p => `<button type="button" class="tg" data-v="${p}">${p}</button>`).join('');
                dom.kategoriCont.innerHTML = state.opt.kategori.map(k => `<button type="button" class="tg" data-v="${k}">${k}</button>`).join('');
                this.buildFilter();
                
                dom.ttl.textContent = state.opt.title;
                dom.sub.textContent = state.opt.subtitle;
                if (state.opt.photo) dom.img.src = state.opt.photo;
                
                loading(false);
                if (state.opt.pin) {
                    dom.pinLock.classList.remove("hidden");
                    pin.init();
                } else this.init();
            } catch (e) {
                console.error(e);
            }
        },
        buildFilter() {
            const opts = ['All', ...state.opt.kategori];
            dom.filterDropdown.innerHTML = opts.map(o => 
                `<div class="filter-option ${o === state.activeFilter ? 'active' : ''}" data-filter="${o}">${o}</div>`
            ).join('');
            dom.filterBtn.classList.toggle('active', state.activeFilter !== 'All');
        },
        applyFilter() {
            const filtered = state.activeFilter === 'All' 
                ? state.data 
                : state.data.filter(r => String(r.kategori || '').trim() === state.activeFilter);
            this.renderList(filtered);
        },
        renderList(data) {
            dom.lst.innerHTML = "";
            if (!data.length) {
                dom.emp.style.display = "block";
                dom.emp.textContent = state.activeFilter === 'All' 
                    ? 'Belum ada data transaksi' 
                    : `Tidak ada transaksi kategori "${state.activeFilter}"`;
                return;
            }
            dom.emp.style.display = "none";
            
            const frag = document.createDocumentFragment();
            data.forEach(row => {
                const node = $("t-row").content.cloneNode(true);
                const li = $$(node, "li");
                li.dataset.idx = state.data.findIndex(d => d.no === row.no && d.tanggal === row.tanggal && d.nominal === row.nominal);
                
                const debit = parseFloat(row.debit) || 0;
                const isDebit = debit > 0;
                const amt = isDebit ? debit : (parseFloat(row.kredit) || 0);
                const [day, dtxt] = fmtDate(row.tanggal).split(", ");
                
                $$(node, ".day").textContent = day + ", ";
                $$(node, ".d-txt").textContent = dtxt;
                if (row.jam) $$(node, ".tm").textContent = row.jam;
                else $$(node, ".tm").remove();
                
                $$(node, ".desc").textContent = row.keterangan || '-';
                
                const kat = $$(node, ".tg-kat");
                if (row.kategori && row.kategori !== '-') {
                    kat.textContent = row.kategori;
                    kat.className = "tg-kat tag-kategori";
                } else kat.remove();
                
                const pIdx = state.opt.pihak.indexOf(row.pihak);
                const pTag = $$(node, ".tg-p");
                pTag.textContent = row.pihak;
                pTag.className = `tg-p tag-p${pIdx + 1}`;
                if (pIdx === -1) pTag.classList.add('tag-atm');
                
                const src = $$(node, ".tg-s");
                src.textContent = row.sumber;
                src.className = `tg-s tag-${row.sumber.toLowerCase()}`;
                
                const amtEl = $$(node, ".amt");
                amtEl.textContent = `${isDebit ? "+" : "-"} ${IDR.format(amt)}`;
                amtEl.classList.add(isDebit ? "in" : "out");
                
                frag.appendChild(node);
            });
            dom.lst.appendChild(frag);
            
            $$$(dom.lst, ".li").forEach((el, i) => {
                el.style.opacity = 0;
                el.animate([
                    {opacity: 0, transform: "translateY(5px)"},
                    {opacity: 1, transform: "translateY(0)"}
                ], {duration: 200, delay: 15 * i, fill: "forwards", easing: "ease-out"});
            });
        },
        async load() {
            dom.ld.style.display = "block";
            dom.emp.style.display = "none";
            dom.lst.innerHTML = "";
            const res = await api(null, `?action=getData&sheet=${state.curSheet}&t=${Date.now()}`);
            dom.ld.style.display = "none";
            const {atm = 0, cashPihak1 = 0, cashPihak2 = 0} = res.saldo || {};
            animNum(dom.s1, atm);
            animNum(dom.s2, cashPihak1);
            animNum(dom.s3, cashPihak2);
            state.data = res.data || [];
            if (!state.data.length) {
                dom.emp.style.display = "block";
                dom.emp.textContent = 'Belum ada data transaksi';
                return;
            }
            this.applyFilter();
        },
        async sheets() {
            const res = await api(null, "?action=getSheets");
            if (res.status !== "success") return;
            const list = res.data.filter(s => !s.startsWith("."));
            dom.sel.innerHTML = list.map(s => `<option value="${s}">${s}</option>`).join("");
            dom.sel.disabled = false;
            state.curSheet = (state.curSheet && list.includes(state.curSheet)) ? state.curSheet : list[0];
            dom.sel.value = state.curSheet;
            localStorage.setItem(LS_KEY, state.curSheet);
            this.load();
        },
        async save(payload, isEdit = false) {
            Swal.fire({title: "Menyimpan...", didOpen: Swal.showLoading, showConfirmButton: false});
            await api(payload);
            toast("Tersimpan");
            if (!isEdit) {
                dom.f.reset();
                dom.d.value = toYMD(new Date());
                $$$(document, ".tg").forEach(b => b.classList.remove("active"));
                $$$(dom.nav, ".tab")[0].click();
            }
            this.load();
            dom.b.disabled = false;
            dom.b.textContent = "Simpan Transaksi";
        },
        ui() {
            dom.d.value = toYMD(new Date());
            
            // Tab Navigation
            dom.nav.addEventListener("click", e => {
                const t = e.target.dataset.t;
                if (!t) return;
                $$$(document, ".tab, .view").forEach(el => el.classList.remove("active"));
                e.target.classList.add("active");
                $(t).classList.add("active");
            });
            
            // Toggle Buttons
            dom.f.addEventListener("click", e => {
                if (!e.target.classList.contains("tg")) return;
                const grp = e.target.closest(".grp");
                $$$(grp, ".tg").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                $$(grp, "input[type=hidden]").value = e.target.dataset.v;
            });
            
            // Sheet Selection
            dom.sel.addEventListener("change", e => {
                state.curSheet = e.target.value;
                localStorage.setItem(LS_KEY, state.curSheet);
                this.load();
            });
            
            // Refresh
            dom.ref.addEventListener("click", () => {
                dom.ref.classList.add("spin");
                setTimeout(() => {
                    dom.ref.classList.remove("spin");
                    this.load();
                }, 500);
            });
            
            // Filter
            dom.filterBtn.addEventListener("click", e => {
                e.stopPropagation();
                dom.filterDropdown.classList.remove('hidden');
                setTimeout(() => dom.filterDropdown.classList.toggle("show"), 10);
            });
            dom.filterDropdown.addEventListener("click", e => {
                const opt = e.target.closest(".filter-option");
                if (!opt) return;
                const val = opt.dataset.filter;
                state.activeFilter = val;
                localStorage.setItem(LS_FILTER_KEY, val);
                $$$(dom.filterDropdown, ".filter-option").forEach(o => o.classList.remove("active"));
                opt.classList.add("active");
                dom.filterBtn.classList.toggle('active', val !== 'All');
                dom.filterDropdown.classList.remove("show");
                setTimeout(() => dom.filterDropdown.classList.add('hidden'), 300);
                this.applyFilter();
            });
            document.addEventListener("click", e => {
                if (!dom.filterBtn.contains(e.target) && !dom.filterDropdown.contains(e.target)) {
                    dom.filterDropdown.classList.remove("show");
                    setTimeout(() => dom.filterDropdown.classList.add('hidden'), 300);
                }
            });
            
            // Form Submit - IMPROVED VALIDATION
            dom.f.addEventListener("submit", e => {
                e.preventDefault();
                
                // Direct access to hidden inputs
                const tanggal = dom.d.value;
                const keterangan = dom.ket.value.trim();
                const pihak = dom.f.querySelector('input[name="pihak"]')?.value || '';
                const sumber = dom.f.querySelector('input[name="sumber"]')?.value || '';
                const jenis = dom.f.querySelector('input[name="jenis"]')?.value || '';
                const nominal = parseNum(dom.n.value);
                
                // Complete validation - semua wajib kecuali kategori
                if (!tanggal || !keterangan || !pihak || !sumber || !jenis || !nominal || nominal <= 0) {
                    return Swal.fire({
                        icon: "warning",
                        title: "Data Tidak Lengkap",
                        text: "Silakan periksa kembali dan lengkapi seluruh data sebelum melanjutkan",
                        confirmButtonText: "OK"
                    });
                }
                
                dom.b.textContent = "...";
                dom.b.disabled = true;
                
                const kategori = dom.f.querySelector('input[name="kategori"]')?.value || "-";
                
                this.save({
                    sheetName: state.curSheet,
                    tanggal: toDMY(tanggal),
                    keterangan: keterangan,
                    kategori,
                    nominal,
                    pihak,
                    sumber,
                    jenis,
                    includeTime: tanggal === toYMD(new Date())
                });
            });
            
            // List Actions
            dom.lst.addEventListener("click", async e => {
                const btn = e.target.closest("button");
                if (!btn) return;
                const row = state.data[e.target.closest("li").dataset.idx];
                
                if (btn.dataset.a === "d") {
                    // DELETE
                    const tmpl = $("t-del-card").content.cloneNode(true);
                    const debit = parseFloat(row.debit) || 0;
                    const amt = debit > 0 ? debit : (parseFloat(row.kredit) || 0);
                    $$(tmpl, ".del-date").textContent = fmtDate(row.tanggal);
                    $$(tmpl, ".del-keterangan").textContent = row.keterangan || '-';
                    $$(tmpl, ".del-kategori").textContent = row.kategori || '-';
                    $$(tmpl, ".del-meta").textContent = `${row.pihak} • ${row.sumber}`;
                    const amtEl = $$(tmpl, ".del-amount");
                    amtEl.textContent = IDR.format(amt);
                    amtEl.classList.add(debit > 0 ? "in" : "out");
                    const div = document.createElement("div");
                    div.appendChild(tmpl);
                    const res = await Swal.fire({
                        title: "Hapus Transaksi",
                        html: div.innerHTML,
                        showCancelButton: true,
                        confirmButtonColor: "#FF3B30",
                        confirmButtonText: "Hapus",
                        cancelButtonText: "Batal"
                    });
                    if (res.isConfirmed) {
                        this.save({action: "delete", sheetName: state.curSheet, rowNumber: row.no}, true);
                    }
                } else {
                    // EDIT
                    const debit = parseFloat(row.debit) || 0;
                    const amt = debit > 0 ? debit : (parseFloat(row.kredit) || 0);
                    const jenis = debit > 0 ? "debit" : "kredit";
                    const pOpts = state.opt.pihak.map(p => `<option value="${p}">${p}</option>`).join('');
                    const kOpts = state.opt.kategori.map(k => `<option value="${k}">${k}</option>`).join('');
                    
                    const {value: fv} = await Swal.fire({
                        title: "Edit Transaksi",
                        html: `<div style="text-align:left">
                            <div class="grp"><label class="lbl">Tanggal</label><input id="ex_d" type="date" class="inp"></div>
                            <div class="grp"><label class="lbl">Keterangan</label><input id="ex_k" class="inp"></div>
                            <div class="grp"><label class="lbl">Nominal</label><input id="ex_n" class="inp"></div>
                            <div class="grid-2">
                                <div class="grp"><label class="lbl">Pihak</label><select id="ex_p" class="inp">${pOpts}</select></div>
                                <div class="grp"><label class="lbl">Sumber</label><select id="ex_s" class="inp"><option>ATM</option><option>CASH</option></select></div>
                            </div>
                            <div class="grp"><label class="lbl">Jenis</label><select id="ex_j" class="inp"><option value="debit">Masuk (Debit)</option><option value="kredit">Keluar (Kredit)</option></select></div>
                            <div class="grp"><label class="lbl">Kategori</label><select id="ex_kat" class="inp">${kOpts}</select></div>
                        </div>`,
                        showCancelButton: true,
                        confirmButtonText: "Simpan",
                        cancelButtonText: "Batal",
                        didOpen: () => {
                            $("ex_d").value = toYMD(new Date(row.tanggal));
                            $("ex_k").value = row.keterangan && row.keterangan !== '-' ? row.keterangan : '';
                            $("ex_n").value = amt;
                            $("ex_s").value = row.sumber;
                            $("ex_j").value = jenis;
                            
                            const ks = $("ex_kat");
                            const nk = String(row.kategori).trim();
                            for (let i = 0; i < ks.options.length; i++) {
                                if (ks.options[i].value.trim() === nk) {
                                    ks.selectedIndex = i;
                                    break;
                                }
                            }
                            
                            const ps = $("ex_p");
                            const np = String(row.pihak).trim();
                            for (let i = 0; i < ps.options.length; i++) {
                                if (ps.options[i].value.trim() === np) {
                                    ps.selectedIndex = i;
                                    break;
                                }
                            }
                        },
                        preConfirm: () => ({
                            t: $("ex_d").value,
                            k: $("ex_k").value || '-',
                            kat: $("ex_kat").value,
                            n: parseNum($("ex_n").value),
                            p: $("ex_p").value,
                            s: $("ex_s").value,
                            j: $("ex_j").value
                        })
                    });
                    if (fv) {
                        this.save({
                            action: "edit",
                            sheetName: state.curSheet,
                            rowNumber: row.no,
                            tanggal: toDMY(fv.t),
                            keterangan: fv.k,
                            kategori: fv.kat,
                            nominal: fv.n,
                            pihak: fv.p,
                            sumber: fv.s,
                            jenis: fv.j,
                            includeTime: fv.t === toYMD(new Date(row.tanggal))
                        }, true);
                    }
                }
            });
            
            // Settings
            dom.img.addEventListener("click", async () => {
                const {value: sv} = await Swal.fire({
                    title: "Pengaturan",
                    html: `<div style="text-align:left">
                        <div class="grp"><label class="lbl">Judul</label><input id="set_title" class="inp"></div>
                        <div class="grp"><label class="lbl">Sub Judul</label><input id="set_subtitle" class="inp"></div>
                        <div class="grp"><label class="lbl">URL Foto</label><input id="set_photo" class="inp"></div>
                        <div class="grid-2">
                            <div class="grp"><label class="lbl">Nama Pihak 1</label><input id="set_p1" class="inp"></div>
                            <div class="grp"><label class="lbl">Nama Pihak 2</label><input id="set_p2" class="inp"></div>
                        </div>
                        <div class="grp"><label class="lbl">PIN Baru (6 digit)</label><input id="set_pin" type="tel" maxlength="6" class="inp" placeholder="******"></div>
                    </div>`,
                    showCancelButton: true,
                    confirmButtonText: "Simpan",
                    didOpen: () => {
                        $("set_title").value = state.opt.title;
                        $("set_subtitle").value = state.opt.subtitle;
                        $("set_photo").value = state.opt.photo;
                        $("set_p1").value = state.opt.pihak[0] || "";
                        $("set_p2").value = state.opt.pihak[1] || "";
                    },
                    preConfirm: () => {
                        const pin = $("set_pin").value;
                        if (pin && !/^\d{6}$/.test(pin)) return Swal.showValidationMessage("PIN harus 6 angka");
                        return {
                            title: $("set_title").value,
                            subtitle: $("set_subtitle").value,
                            photo: $("set_photo").value,
                            pin: pin,
                            pihak1: $("set_p1").value,
                            pihak2: $("set_p2").value
                        }
                    }
                });
                if (sv) {
                    Swal.fire({title: "Menyimpan...", didOpen: Swal.showLoading, showConfirmButton: false});
                    await api({
                        action: "saveOptions",
                        title: sv.title,
                        subtitle: sv.subtitle,
                        photo: sv.photo,
                        pin: sv.pin || state.opt.pin,
                        pihak1: sv.pihak1,
                        pihak2: sv.pihak2
                    });
                    state.opt = {...state.opt, title: sv.title, subtitle: sv.subtitle, photo: sv.photo};
                    if (sv.pihak1) state.opt.pihak[0] = sv.pihak1;
                    if (sv.pihak2) state.opt.pihak[1] = sv.pihak2;
                    if (sv.pin) state.opt.pin = sv.pin;
                    dom.ttl.textContent = sv.title;
                    dom.sub.textContent = sv.subtitle;
                    if (sv.photo) dom.img.src = sv.photo;
                    $$(dom.s2.parentElement, 'span').textContent = `Cash ${state.opt.pihak[0]}`;
                    $$(dom.s3.parentElement, 'span').textContent = `Cash ${state.opt.pihak[1]}`;
                    dom.pihakCont.innerHTML = state.opt.pihak.map(p => `<button type="button" class="tg" data-v="${p}">${p}</button>`).join('');
                    dom.kategoriCont.innerHTML = state.opt.kategori.map(k => `<button type="button" class="tg" data-v="${k}">${k}</button>`).join('');
                    this.buildFilter();
                    toast("Pengaturan tersimpan");
                }
            });
        },
        init() {
            this.ui();
            this.sheets();
        }
    };
    
    app.start();
})();