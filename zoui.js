// ZOUI v3.0.0
// ==============================================================
//  ZOUI  —  Discord-style UI library for zombs.io userscripts
//  https://github.com/TropicalBanana2/ZOUI
//  License: MIT
// ==============================================================

// ── ZOUICache ────────────────────────────────────────────────────────────────
//  Web Cache API persistence with an in-memory mirror for sync reads.
//  Falls back gracefully when CacheStorage is unavailable (non-HTTPS / extension).

class ZOUICache {
    constructor(namespace) {
        this._ns  = namespace;
        this._mem = {};
        this._ready = this._hydrate();
    }

    /** Load ALL keys from CacheStorage into this._mem. */
    async _hydrate() {
        try {
            const cache = await caches.open(this._ns);
            const keys  = await cache.keys();
            await Promise.all(keys.map(async req => {
                const res  = await cache.match(req);
                if (!res) return;
                const text = await res.text();
                // Recover the original key from the URL
                const raw  = new URL(req.url).pathname.replace(/^\/.+\/~z~\//, "");
                const key  = decodeURIComponent(raw);
                try { this._mem[key] = JSON.parse(text); }
                catch { this._mem[key] = text; }
            }));
        } catch (e) {
            // CacheStorage unavailable — mem-only mode
        }
    }

    /** Sync read — returns this._mem[key] ?? fallback. */
    get(key, fallback) {
        return key in this._mem ? this._mem[key] : fallback;
    }

    /** Sync write to mem + async write to CacheStorage. */
    set(key, value) {
        this._mem[key] = value;
        this._write(key, value);
    }

    /** Actual CacheStorage put. */
    async _write(key, val) {
        try {
            const cache = await caches.open(this._ns);
            const url   = `https://zoui-persist/~z~/${encodeURIComponent(key)}`;
            await cache.put(url, new Response(JSON.stringify(val), { headers: { "Content-Type": "application/json" } }));
        } catch (e) { /* silent fallback */ }
    }

    async delete(key) {
        delete this._mem[key];
        try {
            const cache = await caches.open(this._ns);
            await cache.delete(`https://zoui-persist/~z~/${encodeURIComponent(key)}`);
        } catch (e) { /* silent */ }
    }

    async clear() {
        this._mem = {};
        try { await caches.delete(this._ns); } catch (e) { /* silent */ }
    }
}

// ── ZOUIPopup ────────────────────────────────────────────────────────────────
//  Standalone popup / toast system. Used internally by ZOUI but can also be
//  instantiated on its own: const popup = new ZOUIPopup();
//
//  Every method returns a live handle:
//    handle.update(msg)   — rewrite the message text in place
//    handle.setType(type) — swap accent colour + icon
//    handle.dismiss()     — fade out and remove

class ZOUIPopup {
    static _COLORS = { info: "#5865f2", success: "#23a559", warning: "#f0b232", error: "#ed4245" };
    static _ICONS  = {
        info:    `<svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="rgba(88,101,242,0.25)"/><text x="8" y="12" text-anchor="middle" font-size="10" fill="#8b9cf4" font-weight="700">i</text></svg>`,
        success: `<svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="rgba(35,165,89,0.2)"/><path d="M5 8.5l2 2 4-4" stroke="#23a559" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
        warning: `<svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 2.5L13.5 13H2.5z" fill="rgba(240,178,50,0.2)" stroke="#f0b232" stroke-width="1.4" stroke-linejoin="round"/><text x="8" y="12" text-anchor="middle" font-size="7.5" fill="#f0b232" font-weight="700">!</text></svg>`,
        error:   `<svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="rgba(237,66,69,0.2)"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ed4245" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    };

    constructor() {
        this._injectStyles();
    }

    _injectStyles() {
        if (document.getElementById("zui-popup-styles")) return;
        const s = document.createElement("style");
        s.id = "zui-popup-styles";
        s.innerHTML = `
            @keyframes zui-in  { from{opacity:0;transform:translateY(-10px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
            @keyframes zui-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-8px) scale(0.95)} }

            .zui-toast-wrap {
                position:fixed;top:20px;left:50%;transform:translateX(-50%);
                z-index:999999;display:flex;flex-direction:column;align-items:center;
                gap:8px;pointer-events:none;
            }
            .zui-toast {
                pointer-events:auto;background:#2b2d31;border:1px solid rgba(0,0,0,0.5);
                border-left:3px solid #5865f2;border-radius:8px;padding:11px 16px;
                font-family:'gg sans','Noto Sans',sans-serif;font-size:13px;color:#dcddde;
                display:flex;align-items:center;gap:10px;
                box-shadow:0 4px 20px rgba(0,0,0,0.55);min-width:220px;max-width:480px;
                animation:zui-in 0.2s ease forwards;
            }
            .zui-toast.zui-out { animation:zui-out 0.18s ease forwards; }
            .zui-toast-icon { flex-shrink:0;display:flex;align-items:center; }

            .zui-popup {
                pointer-events:auto;background:#2b2d31;border:1px solid rgba(0,0,0,0.5);
                border-top:2px solid #5865f2;border-radius:10px;padding:16px 18px;
                font-family:'gg sans','Noto Sans',sans-serif;font-size:13px;color:#dcddde;
                box-shadow:0 8px 28px rgba(0,0,0,0.65);min-width:260px;max-width:420px;
                animation:zui-in 0.2s ease forwards;display:flex;flex-direction:column;gap:12px;
            }
            .zui-popup-msg { line-height:1.55;color:#dcddde; }
            .zui-popup-btns { display:flex;gap:8px;justify-content:flex-end; }
            .zui-popup-btns button { background:#5865f2;border:none;padding:7px 16px;border-radius:6px;color:white;cursor:pointer;font-size:13px;font-weight:500;transition:background 0.15s; }
            .zui-popup-btns button:hover { background:#4752c4; }
            .zui-popup-btns button.secondary { background:rgba(88,101,242,0.15);color:#8b9cf4; }
            .zui-popup-btns button.secondary:hover { background:rgba(88,101,242,0.25); }
            .zui-popup-input {
                width:100%;padding:8px 10px;border-radius:6px;border:1px solid rgba(0,0,0,0.4);
                background:#1e1f22;color:#dcddde;font-size:13px;font-family:'gg sans','Noto Sans',sans-serif;
                outline:none;transition:border-color 0.15s;
            }
            .zui-popup-input::placeholder { color:#87898c; }
            .zui-popup-input:focus        { border-color:#5865f2; }
        `;
        document.head.appendChild(s);
    }

    _container() {
        let w = document.getElementById("zui-toast-wrap");
        if (!w) {
            w = document.createElement("div");
            w.id = "zui-toast-wrap";
            w.className = "zui-toast-wrap";
            document.body.appendChild(w);
        }
        return w;
    }

    /** @returns a live handle for the given popup/toast element. */
    _handle(el) {
        return {
            /** Rewrite the message text / HTML in place. Chainable. */
            update(msg) {
                const t = el.querySelector("[data-zui-msg]");
                if (t) t.innerHTML = msg;
                return this;
            },
            /** Swap the accent colour and icon. Chainable. */
            setType(type) {
                const c = ZOUIPopup._COLORS[type] ?? ZOUIPopup._COLORS.info;
                el.style.borderLeftColor = c;
                el.style.borderTopColor  = c;
                const icon = el.querySelector(".zui-toast-icon");
                if (icon) icon.innerHTML = ZOUIPopup._ICONS[type] ?? ZOUIPopup._ICONS.info;
                return this;
            },
            /** Fade out and remove. */
            dismiss() {
                if (el._dismissed) return;
                el._dismissed = true;
                el.classList.add("zui-out");
                el.addEventListener("animationend", () => el.remove(), { once: true });
            },
        };
    }

    /**
     * Show a toast notification. Returns a live handle.
     * Pass `duration = 0` to disable auto-dismiss (e.g. for countdowns).
     * If >= 5 live toasts exist, the oldest is dismissed before adding the new one.
     *
     * @param {string}  message
     * @param {"info"|"success"|"warning"|"error"} [type="info"]
     * @param {number}  [duration=3000]  ms before auto-dismiss; 0 = manual only
     * @returns {{ update, setType, dismiss }}
     */
    toast(message, type = "info", duration = 3000) {
        const wrap = this._container();
        // Enforce max 5 live toasts — dismiss the oldest one first
        const live = wrap.querySelectorAll(".zui-toast:not(.zui-out)");
        if (live.length >= 5) this._handle(live[0]).dismiss();

        const el = document.createElement("div");
        el.className = "zui-toast";
        el.style.borderLeftColor = ZOUIPopup._COLORS[type] ?? ZOUIPopup._COLORS.info;
        el.innerHTML = `<span class="zui-toast-icon">${ZOUIPopup._ICONS[type] ?? ZOUIPopup._ICONS.info}</span><span data-zui-msg>${message}</span>`;
        wrap.appendChild(el);
        const handle = this._handle(el);
        if (duration > 0) setTimeout(() => handle.dismiss(), duration);
        return handle;
    }

    /**
     * Show a confirmation popup. Returns a live handle.
     * Enter = confirm · Escape = cancel.
     *
     * @param {string}   message
     * @param {function} onConfirm
     * @param {function} [onCancel]
     * @returns {{ update, setType, dismiss }}
     */
    confirm(message, onConfirm, onCancel = null) {
        const el = document.createElement("div");
        el.className = "zui-popup";
        el.innerHTML = `
            <div class="zui-popup-msg" data-zui-msg>${message}</div>
            <div class="zui-popup-btns">
                <button class="secondary zui-popup-cancel">Cancel</button>
                <button class="zui-popup-confirm">Confirm</button>
            </div>
        `;
        const close = (confirmed) => {
            document.removeEventListener("keydown", onKey);
            el.remove();
            confirmed ? onConfirm?.() : onCancel?.();
        };
        el.querySelector(".zui-popup-confirm").onclick = () => close(true);
        el.querySelector(".zui-popup-cancel").onclick  = () => close(false);
        const onKey = e => {
            if (e.key === "Enter")  close(true);
            if (e.key === "Escape") close(false);
        };
        document.addEventListener("keydown", onKey);
        this._container().appendChild(el);
        return this._handle(el);
    }

    /**
     * Show an input popup with a text field. Returns a live handle.
     * The field is auto-focused. Enter = confirm · Escape = cancel.
     *
     * @param {string}   message
     * @param {function} onConfirm        called with (value: string)
     * @param {function} [onCancel]
     * @param {string}   [placeholder=""]
     * @param {string}   [defaultValue=""]
     * @returns {{ update, setType, dismiss }}
     */
    input(message, onConfirm, onCancel = null, placeholder = "", defaultValue = "") {
        const el = document.createElement("div");
        el.className = "zui-popup";
        el.innerHTML = `
            <div class="zui-popup-msg" data-zui-msg>${message}</div>
            <input class="zui-popup-input" type="text" placeholder="${placeholder}" value="${defaultValue}">
            <div class="zui-popup-btns">
                <button class="secondary zui-popup-cancel">Cancel</button>
                <button class="zui-popup-confirm">Confirm</button>
            </div>
        `;
        const inp = el.querySelector(".zui-popup-input");
        const close = (confirmed) => { el.remove(); confirmed ? onConfirm?.(inp.value) : onCancel?.(); };
        el.querySelector(".zui-popup-confirm").onclick = () => close(true);
        el.querySelector(".zui-popup-cancel").onclick  = () => close(false);
        inp.addEventListener("keydown", e => {
            if (e.key === "Enter")  close(true);
            if (e.key === "Escape") close(false);
        });
        this._container().appendChild(el);
        setTimeout(() => inp.focus(), 30);
        return this._handle(el);
    }
}

// ── ZOUI ─────────────────────────────────────────────────────────────────────

class ZOUI {
    /**
     * @param {Element} container  - DOM element to mount the UI into
     * @param {string}  title      - Title shown in the header bar
     * @param {string}  version    - Version string shown in the header badge (e.g. "1.0.0")
     */
    constructor(container, title = "ZOUI", version = "1.0.0") {
        this.container = container;
        this.tabs      = {};
        this.activeTab = null;
        this.features  = [];
        this.version   = version;

        // ── Collapsible state ────────────────────────────────────────────────
        this._cols      = {};   // collKey → body element
        this._colTabMap = {};   // collKey → parent tab name
        this._collId    = 0;    // counter for unique keys

        // ── Minimize state ───────────────────────────────────────────────────
        this._minimized   = false;
        this._toggleKeyFn = null;

        // ── Cache (one namespace per script title) ───────────────────────────
        this._cache = new ZOUICache("zoui-" + title);

        this.container.style.cssText = "background:transparent;border:none;box-shadow:none;padding:0;";

        this.container.innerHTML = `
            <div class="zui-wrapper">
                <div class="zui-headerbar">
                    <div class="zui-header-left">
                        <div class="zui-logo">
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="white">
                                <polygon points="6,1 11,10 1,10"/>
                            </svg>
                        </div>
                        <span>${title}</span>
                    </div>
                    <div class="zui-header-right">
                        <button class="zui-minimize-btn" title="Minimize / Restore">−</button>
                        <div class="zui-status-dot"></div>
                        <span class="zui-version-badge">v${version}</span>
                    </div>
                </div>
                <div class="zui-global-search">
                    <div class="zui-search-icon">
                        <svg width="14" height="14" viewBox="0 0 16 16">
                            <circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="#87898c" stroke-width="1.8"/>
                            <line x1="10" y1="10" x2="14" y2="14" stroke="#87898c" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <input type="text" placeholder=" Search settings...">
                    <div class="zui-search-results"></div>
                </div>
                <div class="zui-body">
                    <div class="zui-sidebar">
                        <div class="zui-sidebar-label">Navigation</div>
                    </div>
                    <div class="zui-content"></div>
                </div>
            </div>
        `;

        this.sidebar       = this.container.querySelector(".zui-sidebar");
        this.content       = this.container.querySelector(".zui-content");
        this.searchInput   = this.container.querySelector(".zui-global-search input");
        this.searchResults = this.container.querySelector(".zui-search-results");
        this._versionBadge = this.container.querySelector(".zui-version-badge");

        // Wire up minimize button
        this.container.querySelector(".zui-minimize-btn").onclick = () => this.toggleMinimize();

        this._injectStyles();
        this._setupSearch();
        this.popup = new ZOUIPopup();

        // Restore last active tab after cache hydrates
        this._cache._ready.then(() => {
            const t = this._cache.get("__activeTab__");
            if (t && this.tabs[t]) this.switchTab(t);
        });
    }

    // ── Internals ────────────────────────────────────────────────────────────

    _injectStyles() {
        if (document.getElementById("zui-styles")) return;
        const style = document.createElement("style");
        style.id = "zui-styles";
        style.innerHTML = `
            .zui-wrapper {
                display:flex;flex-direction:column;width:620px;height:440px;
                background:#2b2d31;color:#dcddde;font-family:'gg sans','Noto Sans',sans-serif;
                border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.5);
                box-shadow:0 8px 32px rgba(0,0,0,0.6);
            }
            .zui-wrapper * { box-sizing:border-box;margin:0;padding:0; }

            /* Header */
            .zui-headerbar {
                height:48px;background:#1e1f22;display:flex;align-items:center;
                justify-content:space-between;padding:0 16px;
                border-bottom:1px solid rgba(0,0,0,0.4);flex-shrink:0;
            }
            .zui-header-left  { display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#f2f3f5; }
            .zui-header-right { display:flex;align-items:center;gap:8px; }
            .zui-logo {
                width:20px;height:20px;background:#5865f2;border-radius:5px;
                display:flex;align-items:center;justify-content:center;flex-shrink:0;
            }
            .zui-status-dot   { width:7px;height:7px;border-radius:50%;background:#23a559;box-shadow:0 0 0 2px rgba(35,165,89,0.25); }
            .zui-version-badge { font-size:11px;color:#8b9cf4;background:rgba(88,101,242,0.15);padding:2px 8px;border-radius:10px; }

            /* Search bar */
            .zui-global-search {
                position:relative;padding:12px 12px;background:#2b2d31;
                border-bottom:1px solid rgba(0,0,0,0.25);flex-shrink:0;
            }
            .zui-search-icon { position:absolute;left:22px;top:50%;transform:translateY(-50%);pointer-events:none;opacity:0.7; }
            /* 0,2,2 specificity — beats .zui-wrapper input[type="text"] (0,2,1) to keep icon padding */
            .zui-wrapper .zui-global-search input[type="text"] {
                width:100%;height:40px;padding:0 10px 0 44px;
                background:#1e1f22;border:1px solid rgba(0,0,0,0.35);
                border-radius:6px;color:#dcddde;font-size:13px;outline:none;transition:border-color 0.15s;
            }
            .zui-wrapper .zui-global-search input[type="text"]::placeholder { color:#87898c; }
            .zui-wrapper .zui-global-search input[type="text"]:focus        { border-color:#5865f2; }
            .zui-search-results {
                position:absolute;top:calc(100% + 2px);left:12px;right:12px;
                background:#111214;border:1px solid rgba(0,0,0,0.5);border-radius:8px;
                max-height:200px;overflow-y:auto;opacity:0;transform:translateY(-6px);
                pointer-events:none;transition:0.15s ease;z-index:99;box-shadow:0 8px 24px rgba(0,0,0,0.5);
            }
            .zui-search-results.active { opacity:1;transform:translateY(0);pointer-events:auto; }
            .zui-search-result {
                padding:8px 12px;font-size:13px;cursor:pointer;transition:background 0.1s;
                border-radius:4px;margin:3px;display:flex;justify-content:space-between;align-items:center;
            }
            .zui-search-result:hover              { background:#5865f2;color:white; }
            .zui-result-tab                       { font-size:11px;color:#87898c;background:rgba(255,255,255,0.07);padding:2px 6px;border-radius:4px;flex-shrink:0; }
            .zui-search-result:hover .zui-result-tab { color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.15); }
            .zui-search-highlight                 { color:#8b9cf4;font-weight:600; }
            .zui-search-result:hover .zui-search-highlight { color:#c7caf5; }

            /* Layout */
            .zui-body { display:flex;flex:1;min-height:0; }
            .zui-sidebar {
                width:152px;background:#1e1f22;display:flex;flex-direction:column;
                padding:6px;gap:2px;overflow-y:auto;flex-shrink:0;border-right:1px solid rgba(0,0,0,0.25);
            }
            .zui-sidebar-label { font-size:10px;font-weight:700;color:#87898c;letter-spacing:0.07em;text-transform:uppercase;padding:10px 8px 5px; }
            .zui-content       { flex:1;padding:14px 16px;overflow-y:auto;min-height:0; }

            /* Tabs */
            .zui-tab {
                padding:8px 10px;border-radius:6px;cursor:pointer;font-size:13px;
                color:#8e9297;transition:background 0.12s,color 0.12s;
                display:flex;align-items:center;gap:8px;user-select:none;
            }
            .zui-tab:hover            { background:rgba(255,255,255,0.06);color:#dcddde; }
            .zui-tab.active           { background:#5865f2;color:white; }
            .zui-tab-icon             { width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;opacity:0.7; }
            .zui-tab-icon img         { width:16px;height:16px;object-fit:contain;border-radius:2px; }
            .zui-tab-icon svg         { width:14px;height:14px; }
            .zui-tab.active .zui-tab-icon { opacity:1; }
            .zui-tab-icon.icon-emoji  { font-size:14px;opacity:1;line-height:1; }

            /* Content elements */
            .zui-item           { margin-bottom:8px; }
            .zui-section-header { font-size:11px;font-weight:700;color:#87898c;margin:14px 0 8px;text-transform:uppercase;letter-spacing:0.06em; }
            .zui-section-header:first-child { margin-top:2px; }
            .zui-text           { font-size:13px;color:#87898c;line-height:1.5;padding:6px 0; }
            .zui-tip            { display:flex;gap:8px;align-items:flex-start;padding:9px 12px;background:rgba(88,101,242,0.08);border-radius:6px;border-left:3px solid #5865f2;border-top-left-radius:0;border-bottom-left-radius:0; }
            .zui-tip-text       { font-size:12px;color:#8b9cf4;line-height:1.5; }
            .zui-divider        { height:1px;background:rgba(255,255,255,0.06);margin:10px 0; }
            .zui-field-label    { font-size:13px;color:#dcddde;margin-bottom:5px;display:block; }

            /* Toggle */
            .zui-toggle       { display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:6px;cursor:pointer;background:rgba(0,0,0,0.18);transition:background 0.12s; }
            .zui-toggle:hover { background:rgba(0,0,0,0.28); }
            .zui-toggle-label { font-size:13px;color:#dcddde; }
            .zui-switch       { width:40px;height:22px;background:#4e5058;border-radius:999px;position:relative;transition:background 0.25s,box-shadow 0.25s;flex-shrink:0; }
            .zui-switch::before { content:"";position:absolute;width:16px;height:16px;background:white;border-radius:50%;top:3px;left:3px;transition:left 0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.4); }
            .zui-switch.active  { background:#5865f2;box-shadow:0 0 0 2px rgba(88,101,242,0.3); }
            .zui-switch.active::before { left:21px; }

            /* Slider */
            .zui-slider-wrap label     { display:flex;justify-content:space-between;font-size:13px;color:#dcddde;margin-bottom:8px; }
            .zui-slider-wrap label span { color:#8b9cf4;font-weight:600; }
            .zui-wrapper input[type="range"] { width:100%;appearance:none;height:4px;background:#3a3c42;border-radius:999px;outline:none;cursor:pointer; }
            .zui-wrapper input[type="range"]::-webkit-slider-thumb { appearance:none;width:14px;height:14px;background:#5865f2;border-radius:50%;cursor:pointer;border:2px solid #1e1f22;box-shadow:0 0 0 2px rgba(88,101,242,0.3); }

            /* Buttons */
            .zui-wrapper button           { background:#5865f2;border:none;padding:8px 14px;border-radius:6px;color:white;cursor:pointer;font-size:13px;font-weight:500;transition:background 0.15s,transform 0.1s; }
            .zui-wrapper button:hover     { background:#4752c4; }
            .zui-wrapper button:active    { transform:scale(0.97); }
            .zui-wrapper button.secondary { background:rgba(88,101,242,0.15);color:#8b9cf4; }
            .zui-wrapper button.secondary:hover { background:rgba(88,101,242,0.25); }
            .zui-btn-row { display:flex;gap:6px; }

            /* Text input */
            .zui-wrapper input[type="text"]             { width:100%;padding:8px 10px;border-radius:6px;border:1px solid rgba(0,0,0,0.35);background:#1e1f22;color:#dcddde;font-size:13px;outline:none;transition:border-color 0.15s; }
            .zui-wrapper input[type="text"]::placeholder { color:#87898c; }
            .zui-wrapper input[type="text"]:focus        { border-color:#5865f2; }

            /* Select */
            .zui-select       { width:100%;margin-top:4px;padding:8px 10px;border-radius:6px;border:1px solid rgba(0,0,0,0.35);background:#1e1f22;color:#dcddde;font-size:13px;outline:none;cursor:pointer;transition:border-color 0.15s; }
            .zui-select:focus { border-color:#5865f2; }

            /* Search list */
            .zui-search-list { background:#1e1f22;border-radius:6px;max-height:110px;overflow-y:auto;margin-top:6px;border:1px solid rgba(0,0,0,0.3); }
            .zui-search-list .zui-search-result { display:flex;align-items:center;gap:8px; }
            .zui-check        { width:7px;height:7px;border-radius:50%;background:#5865f2;display:none;flex-shrink:0; }
            .zui-search-list .zui-search-result.selected         { color:#8b9cf4;font-weight:600; }
            .zui-search-list .zui-search-result.selected .zui-check { display:block; }
            .zui-search-list .zui-search-result:hover .zui-check    { display:block;background:white; }

            /* Version switcher */
            .zui-version-switcher { display:flex;gap:4px;flex-wrap:wrap;margin-top:4px; }
            .zui-version-pill {
                padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;
                border:1px solid rgba(88,101,242,0.35);color:#8b9cf4;background:transparent;
                transition:background 0.15s,border-color 0.15s,color 0.15s;
            }
            .zui-version-pill:hover  { background:rgba(88,101,242,0.15); }
            .zui-version-pill.active { background:#5865f2;color:white;border-color:#5865f2; }

            /* Scrollbar */
            .zui-wrapper ::-webkit-scrollbar       { width:6px; }
            .zui-wrapper ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:10px; }
            .zui-wrapper ::-webkit-scrollbar-thumb:hover { background:#5865f2; }

            /* ── v3 additions ─────────────────────────────────────────── */

            /* Tab badge */
            .zui-tab-badge { margin-left:auto; background:#ed4245; color:white; font-size:10px; font-weight:700; min-width:18px; height:18px; border-radius:9px; padding:0 5px; display:flex; align-items:center; justify-content:center; }

            /* Collapsible */
            .zui-collapsible-header { display:flex; align-items:center; gap:8px; cursor:pointer; padding:7px 4px; color:#dcddde; font-size:13px; user-select:none; border-radius:4px; transition:background 0.1s; }
            .zui-collapsible-header:hover { background:rgba(255,255,255,0.04); }
            .zui-collapsible-arrow { display:flex; align-items:center; transition:transform 0.2s; color:#87898c; flex-shrink:0; }
            .zui-collapsible-arrow.open { transform:rotate(90deg); }
            .zui-collapsible-body { padding-left:12px; border-left:2px solid rgba(255,255,255,0.06); margin-left:6px; }

            /* Progress bar */
            .zui-progress-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
            .zui-progress-val { font-size:12px; color:#8b9cf4; font-weight:600; }
            .zui-progress-track { height:6px; background:#3a3c42; border-radius:999px; overflow:hidden; }
            .zui-progress-fill { height:100%; background:#5865f2; border-radius:999px; transition:width 0.3s ease; }

            /* Keybind */
            .zui-keybind { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:6px; }
            .zui-keybind-btn { padding:4px 12px !important; font-size:12px !important; font-family:monospace !important; min-width:80px !important; }

            /* Number input */
            .zui-wrapper input[type="number"] { width:100%; padding:8px 10px; border-radius:6px; border:1px solid rgba(0,0,0,0.35); background:#1e1f22; color:#dcddde; font-size:13px; outline:none; transition:border-color 0.15s; -moz-appearance:textfield; }
            .zui-wrapper input[type="number"]:focus { border-color:#5865f2; }
            .zui-wrapper input[type="number"]::-webkit-inner-spin-button { opacity:0.4; }

            /* Color picker */
            .zui-color-row { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:6px; }
            .zui-color-swatch { width:28px; height:28px; border-radius:6px; border:2px solid rgba(255,255,255,0.15); cursor:pointer; transition:border-color 0.15s, transform 0.1s; flex-shrink:0; }
            .zui-color-swatch:hover { border-color:#5865f2; transform:scale(1.05); }

            /* Radio group */
            .zui-radio-group { display:flex; flex-direction:column; gap:4px; margin-top:6px; }
            .zui-radio-label { display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:#dcddde; padding:6px 8px; border-radius:6px; transition:background 0.1s; user-select:none; }
            .zui-radio-label:hover { background:rgba(255,255,255,0.05); }
            .zui-radio { width:16px; height:16px; border-radius:50%; border:2px solid #4e5058; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:border-color 0.2s; }
            .zui-radio::after { content:""; width:7px; height:7px; border-radius:50%; background:#5865f2; opacity:0; transition:opacity 0.2s, transform 0.2s; transform:scale(0.5); }
            .zui-radio.active { border-color:#5865f2; }
            .zui-radio.active::after { opacity:1; transform:scale(1); }

            /* Tag / status chip */
            .zui-tag-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; }
            .zui-tag { font-size:11px; font-weight:600; padding:3px 10px; border-radius:999px; border:1px solid; letter-spacing:0.03em; white-space:nowrap; }

            /* Minimize button */
            .zui-minimize-btn { background:transparent !important; border:none !important; color:#87898c !important; width:22px !important; height:22px !important; padding:0 !important; font-size:16px !important; line-height:1 !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor:pointer; border-radius:4px !important; transition:color 0.15s, background 0.15s !important; transform:none !important; }
            .zui-minimize-btn:hover { color:#dcddde !important; background:rgba(255,255,255,0.08) !important; }

            /* Minimized state */
            .zui-wrapper.zui-minimized .zui-body,
            .zui-wrapper.zui-minimized .zui-global-search { display:none !important; }
            .zui-wrapper.zui-minimized { height:auto !important; }
        `;
        document.head.appendChild(style);
        document.addEventListener("click", e => {
            if (!e.target.closest(".zui-global-search"))
                document.querySelectorAll(".zui-search-results").forEach(r => r.classList.remove("active"));
        });
    }

    // ── Search helpers ───────────────────────────────────────────────────────

    _scoreMatch(text, query) {
        text = text.toLowerCase(); query = query.toLowerCase();
        if (text === query)          return 100;
        if (text.startsWith(query)) return 90;
        if (text.includes(query))   return 80;
        let score = 0, t = 0;
        for (let i = 0; i < query.length; i++) {
            const idx = text.indexOf(query[i], t);
            if (idx === -1) return 0;
            score++; t = idx + 1;
        }
        return score;
    }

    _highlight(text, query) {
        const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return text.replace(new RegExp(`(${safe.split("").join(".*?")})`, "i"), `<span class="zui-search-highlight">$1</span>`);
    }

    _setupSearch() {
        this.searchInput.oninput = () => {
            const val = this.searchInput.value.trim();
            this.searchResults.innerHTML = "";
            if (!val) { this.searchResults.classList.remove("active"); return; }
            const ranked = this.features
                .map(f => ({ ...f, score: this._scoreMatch(f.label, val) }))
                .filter(f => f.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 8);
            ranked.forEach(f => {
                const el = document.createElement("div");
                el.className = "zui-search-result";
                el.innerHTML = `<span>${this._highlight(f.displayLabel ?? f.label, val)}</span><span class="zui-result-tab">${f.tab}</span>`;
                el.onclick = () => {
                    this.switchTab(f.tab);
                    f.element.scrollIntoView({ behavior: "smooth", block: "center" });
                    this.searchResults.classList.remove("active");
                    this.searchInput.value = "";
                };
                this.searchResults.appendChild(el);
            });
            this.searchResults.classList.add("active");
        };
    }

    // ── Icon resolver ────────────────────────────────────────────────────────

    _resolveIcon(name, icon) {
        if (icon && typeof icon === "string") {
            if (icon.trim().startsWith("<svg"))
                return `<div class="zui-tab-icon">${icon}</div>`;
            if (icon.startsWith("http") || icon.startsWith("data:") || icon.includes("/"))
                return `<div class="zui-tab-icon"><img src="${icon}" alt=""></div>`;
            if (icon.codePointAt(0) > 127)
                return `<div class="zui-tab-icon icon-emoji">${icon}</div>`;
        }
        const builtins = {
            Player:  `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>`,
            Combat:  `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2l3 3-1 1 1 1 5-5-1-1 1-1-3-3-1 1-1-1-5 5 1 1zm10 8l-5 5 1 1 1-1 3 3 1-1-3-3 1-1 1 1 5-5-1-1-1 1-3-3-1 1z"/></svg>`,
            Visuals: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.2"/><path d="M8 3C4.5 3 1.5 8 1.5 8S4.5 13 8 13s6.5-5 6.5-5S11.5 3 8 3z"/></svg>`,
            Misc:    `<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>`,
        };
        const svg = builtins[name] || `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="2"/></svg>`;
        return `<div class="zui-tab-icon">${svg}</div>`;
    }

    // ── Feature registration (search index) ─────────────────────────────────

    /**
     * Register an element with the global search.
     * `tabOrColl` may be a real tab name or a collapsible key — we resolve to
     * the parent tab so search results show the right tab label.
     */
    _registerFeature(tabOrColl, label, element) {
        const tab = this._colTabMap?.[tabOrColl] ?? tabOrColl;
        // Strip leading emoji / symbols so "⏺ Record" is searchable as "Record"
        const searchLabel = label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{So}\s]+/u, "").trim() || label;
        this.features.push({ tab, label: searchLabel, displayLabel: label, element });
    }

    // ── Persistence helper ───────────────────────────────────────────────────

    /**
     * Build a persistence helper for any add* method.
     * @param {object|undefined} opts        - May contain `opts.persist` (cache key string)
     * @param {*}                defaultVal  - Default value when nothing is cached yet
     * @returns {{ initial, wrap(cb), hydrate(applyFn) }}
     */
    _makePersist(opts, defaultVal) {
        const key = opts?.persist;
        return {
            /** The starting value — cached value if persist is set, else defaultVal. */
            initial: key ? this._cache.get(key, defaultVal) : defaultVal,
            /**
             * Wraps a callback so every call also saves to the cache.
             * If no persist key, returns the original callback unchanged.
             */
            wrap: (cb) => key
                ? (v => { this._cache.set(key, v); cb(v); })
                : cb,
            /**
             * After the cache is fully hydrated, apply the stored value via applyFn.
             * No-ops if persist is not set or if the stored value is undefined.
             */
            hydrate: (applyFn) => {
                if (!key) return;
                this._cache._ready.then(() => {
                    const stored = this._cache.get(key, undefined);
                    if (stored !== undefined) applyFn(stored);
                });
            },
        };
    }

    // ── Content container resolver ───────────────────────────────────────────

    /**
     * Returns the DOM element that content should be appended to.
     * Handles both real tab content divs and collapsible body elements.
     */
    _getTabEl(tab) {
        return this.tabs[tab] || this._cols[tab];
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /** Update the version string shown in the header badge. */
    setVersion(v) {
        this.version = v;
        this._versionBadge.textContent = `v${v}`;
    }

    /** Switch the visible tab by name. */
    switchTab(name) {
        for (let t in this.tabs) this.tabs[t].style.display = "none";
        [...this.sidebar.querySelectorAll(".zui-tab")].forEach(el => el.classList.remove("active"));
        const index = Object.keys(this.tabs).indexOf(name);
        this.sidebar.querySelectorAll(".zui-tab")[index].classList.add("active");
        this.tabs[name].style.display = "block";
        this.activeTab = name;
        // Persist the active tab across sessions
        this._cache?.set("__activeTab__", name);
    }

    /**
     * Add a sidebar tab.
     * @param {string} name  - Tab label and key
     * @param {string} [icon] - SVG string | image URL | emoji | null (uses built-in)
     * @returns {string} The tab name (use as the `tab` argument for all add* calls)
     */
    addTab(name, icon = null) {
        const tabBtn = document.createElement("div");
        tabBtn.className = "zui-tab";
        tabBtn.innerHTML = this._resolveIcon(name, icon) + `<span>${name}</span>`;

        const tabContent = document.createElement("div");
        tabContent.style.display = "none";

        this.sidebar.appendChild(tabBtn);
        this.content.appendChild(tabContent);
        this.tabs[name] = tabContent;

        tabBtn.onclick = () => this.switchTab(name);
        if (!this.activeTab) tabBtn.click();

        return name;
    }

    /**
     * Set a badge counter on a sidebar tab button.
     * @param {string}      tab   - Tab name
     * @param {string|null} value - Badge text; null removes the badge
     */
    setTabBadge(tab, value) {
        const index = Object.keys(this.tabs).indexOf(tab);
        if (index === -1) return;
        const tabBtn = this.sidebar.querySelectorAll(".zui-tab")[index];
        if (!tabBtn) return;
        // Remove existing badge
        tabBtn.querySelector(".zui-tab-badge")?.remove();
        if (value === null || value === undefined) return;
        const badge = document.createElement("span");
        badge.className = "zui-tab-badge";
        badge.textContent = String(value);
        tabBtn.appendChild(badge);
    }

    /** Add a section header label inside a tab or collapsible. */
    addHeader(tab, text) {
        const el = document.createElement("div");
        el.className = "zui-section-header";
        el.innerText = text;
        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, text, el);
    }

    /** Add a horizontal rule divider inside a tab or collapsible. */
    addDivider(tab) {
        const el = document.createElement("div");
        el.className = "zui-divider";
        this._getTabEl(tab).appendChild(el);
    }

    /**
     * Add a text block inside a tab or collapsible.
     * @param {boolean} [tip=false] - Render as a styled info callout instead of plain text
     */
    addText(tab, text, tip = false) {
        const el = document.createElement("div");
        if (tip) {
            el.className = "zui-tip";
            el.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:1px"><circle cx="8" cy="8" r="7" fill="rgba(88,101,242,0.25)"/><text x="8" y="12" text-anchor="middle" font-size="10" fill="#8b9cf4" font-weight="700">i</text></svg><span class="zui-tip-text">${text}</span>`;
        } else {
            el.className = "zui-text";
            el.innerText = text;
        }
        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, text, el);
    }

    /**
     * Add an on/off toggle row.
     * @param {boolean}  def       - Initial state
     * @param {function} callback  - Called with (boolean) on change
     * @param {object}   [opts]    - { persist: "cacheKey" }
     */
    addToggle(tab, label, def, callback, opts = {}) {
        const p = this._makePersist(opts, def);
        const el = document.createElement("div");
        el.className = "zui-item";
        let active = p.initial;
        el.innerHTML = `<div class="zui-toggle"><span class="zui-toggle-label">${label}</span><div class="zui-switch ${active ? "active" : ""}"></div></div>`;
        const sw = el.querySelector(".zui-switch");
        const cb = p.wrap(callback);
        el.querySelector(".zui-toggle").onclick = () => {
            active = !active;
            sw.classList.toggle("active", active);
            cb(active);
        };
        this._getTabEl(tab).appendChild(el);
        // Apply persisted initial value immediately if it differs from default
        if (opts?.persist && p.initial !== def) callback(p.initial);
        // Hydrate after full cache load
        p.hydrate(v => {
            active = v;
            sw.classList.toggle("active", active);
            callback(v);
        });
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a range slider.
     * @param {function} callback - Called with (number) on change
     * @param {object}   [opts]   - { persist: "cacheKey" }
     */
    addSlider(tab, label, min, max, value, callback, opts = {}) {
        const p  = this._makePersist(opts, value);
        const el = document.createElement("div");
        el.className = "zui-item zui-slider-wrap";
        el.innerHTML = `<label>${label}<span>${p.initial}</span></label><input type="range" min="${min}" max="${max}" value="${p.initial}" step="1">`;
        const input = el.querySelector("input"), span = el.querySelector("span");
        const cb = p.wrap(callback);
        input.oninput = () => { span.innerText = input.value; cb(Number(input.value)); };
        this._getTabEl(tab).appendChild(el);
        if (opts?.persist && p.initial !== value) callback(p.initial);
        p.hydrate(v => {
            input.value = v;
            span.innerText = v;
            callback(Number(v));
        });
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a single button.
     * @param {boolean} [secondary=false] - Use the secondary (ghost) button style
     */
    addButton(tab, label, callback, secondary = false) {
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<button class="${secondary ? "secondary" : ""}">${label}</button>`;
        el.querySelector("button").onclick = callback;
        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a row of buttons.
     * @param {Array<[label, callback, secondary?]>} buttons
     */
    addButtonRow(tab, buttons) {
        const el = document.createElement("div");
        el.className = "zui-item zui-btn-row";
        buttons.forEach(([label, cb, sec]) => {
            const b = document.createElement("button");
            b.className = sec ? "secondary" : "";
            b.innerText = label;
            b.onclick = cb;
            el.appendChild(b);
            this._registerFeature(tab, label, b);
        });
        this._getTabEl(tab).appendChild(el);
    }

    /**
     * Add a text input field.
     * @param {function} callback     - Called with (string) on every keystroke
     * @param {string}   [defaultValue=""]
     * @param {object}   [opts]       - { persist: "cacheKey" }
     */
    addTextbox(tab, label, placeholder, callback, defaultValue = "", opts = {}) {
        const p  = this._makePersist(opts, defaultValue);
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><input type="text" placeholder="${placeholder}" value="${p.initial}">`;
        const input = el.querySelector("input");
        const cb = p.wrap(callback);
        input.oninput = e => cb(e.target.value);
        this._getTabEl(tab).appendChild(el);
        if (opts?.persist && p.initial !== defaultValue) callback(p.initial);
        p.hydrate(v => {
            input.value = v;
            callback(v);
        });
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a dropdown select.
     *
     * @param {Array<{value, label}>} options - Initial option list
     * @param {function} callback             - Called with (value) on change
     * @param {object}   [opts]               - { persist: "cacheKey" }
     * @returns {SelectController}
     *   .addOption(value, label)  — append a new option, returns the <option> element
     *   .removeOption(value)      — remove option by value
     *   .clear()                  — remove all options
     *   .getValue()               — return currently selected value
     *   .setValue(value)          — programmatically select an option
     *   .element                  — the raw <select> element
     */
    addSelect(tab, label, options, callback, opts = {}) {
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><select class="zui-select"></select>`;
        const sel = el.querySelector("select");

        options.forEach(({ value, label: text }) => {
            const opt = document.createElement("option");
            opt.value = value; opt.textContent = text;
            sel.appendChild(opt);
        });

        const p  = this._makePersist(opts, sel.value);
        const cb = p.wrap(callback);
        sel.onchange = () => cb(sel.value);

        // Apply cached selection after DOM is ready
        if (opts?.persist && p.initial !== sel.value) {
            sel.value = p.initial;
            callback(p.initial);
        }
        p.hydrate(v => { sel.value = v; callback(v); });

        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, label, el);

        return {
            element: sel,
            get value() { return sel.value; },
            set value(v) { sel.value = v; },
            addOption(value, label) {
                const opt = document.createElement("option");
                opt.value = value; opt.textContent = label;
                sel.appendChild(opt);
                return opt;
            },
            removeOption(value) {
                sel.querySelector(`option[value="${CSS.escape(value)}"]`)?.remove();
            },
            clear() { sel.innerHTML = ""; },
            getValue() { return sel.value; },
            setValue(v) { sel.value = v; },
        };
    }

    /**
     * Add a filterable list. Returns a **SearchListController** for dynamic item management.
     *
     * SearchListController methods:
     *   .addItem(label)      — append a new item
     *   .removeItem(label)   — remove an item by label
     *   .clear()             — remove all items
     *   .getValue()          — currently selected label (or null)
     *   .setValue(label)     — programmatically select an item
     *   .value               — readable/writable shorthand
     *
     * @param {string[]}  items    - Full list of option strings
     * @param {function}  callback - Called with the selected item string
     * @param {object}    [opts]   - { persist: "cacheKey" }
     */
    addSearchList(tab, label, items, callback, opts = {}) {
        const p  = this._makePersist(opts, null);
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><input type="text" placeholder="Filter..."><div class="zui-search-list"></div>`;
        const input = el.querySelector("input"), list = el.querySelector(".zui-search-list");
        let selected = p.initial;
        const cb = p.wrap(callback);
        const render = (filter = "") => {
            list.innerHTML = "";
            items.filter(i => i.toLowerCase().includes(filter.toLowerCase())).forEach(item => {
                const itemEl = document.createElement("div");
                itemEl.className = "zui-search-result" + (item === selected ? " selected" : "");
                itemEl.innerHTML = `<div class="zui-check"></div>${item}`;
                itemEl.onclick = () => { selected = item; render(input.value); cb(item); };
                list.appendChild(itemEl);
            });
        };
        input.oninput = () => render(input.value);
        render();
        if (opts?.persist && p.initial !== null) callback(p.initial);
        p.hydrate(v => {
            if (items.includes(v)) { selected = v; render(input.value); callback(v); }
        });
        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, label, el);

        return {
            addItem(item)    { if (!items.includes(item)) items.push(item); render(input.value); },
            removeItem(item) {
                const i = items.indexOf(item);
                if (i !== -1) items.splice(i, 1);
                if (selected === item) selected = null;
                render(input.value);
            },
            clear()          { items.length = 0; selected = null; render(input.value); },
            getValue()       { return selected; },
            setValue(item)   { selected = items.includes(item) ? item : null; render(input.value); },
            get value()      { return selected; },
            set value(item)  { this.setValue(item); },
        };
    }

    /**
     * Add a version switcher — a row of pill buttons, one per version.
     * Clicking a pill calls the callback and updates the header badge.
     *
     * @param {string}   tab      - Target tab name
     * @param {string}   label    - Section label above the pills
     * @param {string[]} versions - Array of version strings, e.g. ["1.0.0", "1.1.0", "2.0.0"]
     * @param {string}   current  - The initially active version string
     * @param {function} callback - Called with (versionString) when the user picks a version
     */
    addVersionSwitcher(tab, label, versions, current, callback) {
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><div class="zui-version-switcher"></div>`;
        const row = el.querySelector(".zui-version-switcher");

        versions.forEach(v => {
            const pill = document.createElement("button");
            pill.className = "zui-version-pill" + (v === current ? " active" : "");
            pill.textContent = `v${v}`;
            pill.onclick = () => {
                row.querySelectorAll(".zui-version-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                this.setVersion(v);
                callback(v);
            };
            row.appendChild(pill);
            this._registerFeature(tab, `${label} v${v}`, pill);
        });

        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, label, el);
    }

    // ── v3 new components ────────────────────────────────────────────────────

    /**
     * Add a collapsible section. Returns a collKey that can be passed as the
     * first argument to any add* method to append content inside the section.
     *
     * @param {string}  tab    - Parent tab name
     * @param {string}  label  - Section heading
     * @param {boolean} [open=true]
     * @param {object}  [opts] - { persist: "cacheKey" }
     * @returns {string} collKey
     */
    addCollapsible(tab, label, open = true, opts = {}) {
        const collKey = `__coll_${++this._collId}`;
        const p = this._makePersist(opts, open);
        let isOpen = p.initial;

        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `
            <div class="zui-collapsible-header">
                <span class="zui-collapsible-arrow ${isOpen ? "open" : ""}">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="0,0 8,4 0,8"/></svg>
                </span>
                <span>${label}</span>
            </div>
            <div class="zui-collapsible-body" style="display:${isOpen ? "block" : "none"}"></div>
        `;

        const arrow  = el.querySelector(".zui-collapsible-arrow");
        const body   = el.querySelector(".zui-collapsible-body");
        const header = el.querySelector(".zui-collapsible-header");
        const cb = p.wrap(v => { /* state is the boolean */ });

        header.onclick = () => {
            isOpen = !isOpen;
            arrow.classList.toggle("open", isOpen);
            body.style.display = isOpen ? "block" : "none";
            if (opts?.persist) this._cache.set(opts.persist, isOpen);
        };

        p.hydrate(v => {
            isOpen = v;
            arrow.classList.toggle("open", isOpen);
            body.style.display = isOpen ? "block" : "none";
        });

        // Register the collapsible itself so it's searchable
        this._cols[collKey]      = body;
        this._colTabMap[collKey] = tab;
        this._registerFeature(tab, label, el);
        this._getTabEl(tab).appendChild(el);

        return collKey;
    }

    /**
     * Add a number input field with min/max/step clamping.
     *
     * @param {function} callback - Called with (number) on change
     * @param {object}   [opts]   - { persist: "cacheKey" }
     */
    addNumberInput(tab, label, min, max, step, value, callback, opts = {}) {
        const p  = this._makePersist(opts, value);
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><input type="number" min="${min}" max="${max}" step="${step}" value="${p.initial}">`;
        const input = el.querySelector("input");
        const cb = p.wrap(callback);
        input.onchange = () => {
            let v = Number(input.value);
            v = Math.min(max, Math.max(min, v));
            // Round to nearest step
            v = Math.round(v / step) * step;
            input.value = v;
            cb(v);
        };
        this._getTabEl(tab).appendChild(el);
        if (opts?.persist && p.initial !== value) callback(p.initial);
        p.hydrate(v => { input.value = v; callback(Number(v)); });
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a progress bar.
     * @param {number} [value=0]
     * @param {number} [max=100]
     * @returns {{ setValue(v), setMax(m) }}
     */
    addProgressBar(tab, label, value = 0, max = 100) {
        const el = document.createElement("div");
        el.className = "zui-item";
        const pct = Math.round((value / max) * 100);
        el.innerHTML = `
            <div class="zui-progress-header">
                <span class="zui-field-label" style="margin-bottom:0">${label}</span>
                <span class="zui-progress-val">${value} / ${max}</span>
            </div>
            <div class="zui-progress-track"><div class="zui-progress-fill" style="width:${pct}%"></div></div>
        `;
        const fill   = el.querySelector(".zui-progress-fill");
        const valEl  = el.querySelector(".zui-progress-val");
        let curVal   = value;
        let curMax   = max;
        const update = () => {
            const p = Math.min(100, Math.max(0, (curVal / curMax) * 100));
            fill.style.width   = `${p}%`;
            valEl.textContent  = `${curVal} / ${curMax}`;
        };
        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, label, el);
        return {
            setValue(v) { curVal = Math.min(curMax, Math.max(0, v)); update(); },
            setMax(m)   { curMax = m; curVal = Math.min(curVal, curMax); update(); },
        };
    }

    /**
     * Add a keybind row.
     * @param {string}   defaultKey - e.g. "Insert", "F5"
     * @param {function} callback   - Called with (key: string) when the key changes
     * @param {object}   [opts]     - { persist: "cacheKey" }
     */
    addKeybind(tab, label, defaultKey, callback, opts = {}) {
        const p  = this._makePersist(opts, defaultKey);
        let curKey = p.initial;
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `
            <div class="zui-keybind">
                <span class="zui-toggle-label">${label}</span>
                <button class="zui-keybind-btn">${curKey}</button>
            </div>
        `;
        const btn = el.querySelector(".zui-keybind-btn");
        const cb  = p.wrap(callback);
        btn.onclick = () => {
            btn.textContent = "Press a key...";
            btn.style.color = "#f0b232";
            const onKey = (e) => {
                e.preventDefault(); e.stopPropagation();
                curKey = e.key;
                btn.textContent = curKey;
                btn.style.color = "";
                document.removeEventListener("keydown", onKey, true);
                cb(curKey);
            };
            document.addEventListener("keydown", onKey, true);
        };
        this._getTabEl(tab).appendChild(el);
        if (opts?.persist && p.initial !== defaultKey) callback(p.initial);
        p.hydrate(v => { curKey = v; btn.textContent = v; callback(v); });
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a color picker row.
     * @param {string}   defaultColor - CSS hex color e.g. "#5865f2"
     * @param {function} callback     - Called with (colorString) on change
     * @param {object}   [opts]       - { persist: "cacheKey" }
     * @returns {{ getValue(), setValue(v) }}
     */
    addColorPicker(tab, label, defaultColor, callback, opts = {}) {
        const p   = this._makePersist(opts, defaultColor);
        let curColor = p.initial;
        const el  = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `
            <div class="zui-color-row">
                <span class="zui-toggle-label">${label}</span>
                <div class="zui-color-swatch" style="background:${curColor}"></div>
                <input type="color" value="${curColor}" style="position:absolute;opacity:0;width:0;height:0;pointer-events:none">
            </div>
        `;
        const swatch = el.querySelector(".zui-color-swatch");
        const input  = el.querySelector("input[type='color']");
        const cb     = p.wrap(callback);
        swatch.onclick = () => input.click();
        input.oninput  = () => {
            curColor = input.value;
            swatch.style.background = curColor;
            cb(curColor);
        };
        this._getTabEl(tab).appendChild(el);
        if (opts?.persist && p.initial !== defaultColor) callback(p.initial);
        p.hydrate(v => {
            curColor = v;
            input.value = v;
            swatch.style.background = v;
            callback(v);
        });
        this._registerFeature(tab, label, el);
        return {
            getValue() { return curColor; },
            setValue(v) { curColor = v; input.value = v; swatch.style.background = v; },
        };
    }

    /**
     * Add a radio button group.
     * @param {Array<{value, label}>} options
     * @param {string}   defaultVal - Initially selected value
     * @param {function} callback   - Called with (value) on change
     * @param {object}   [opts]     - { persist: "cacheKey" }
     */
    addRadioGroup(tab, label, options, defaultVal, callback, opts = {}) {
        const p   = this._makePersist(opts, defaultVal);
        let curVal = p.initial;
        const el  = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><div class="zui-radio-group"></div>`;
        const group = el.querySelector(".zui-radio-group");
        const cb    = p.wrap(callback);
        const dots  = [];

        options.forEach(({ value, label: text }) => {
            const row = document.createElement("div");
            row.className = "zui-radio-label";
            row.innerHTML = `<div class="zui-radio ${value === curVal ? "active" : ""}"></div><span>${text}</span>`;
            const dot = row.querySelector(".zui-radio");
            dots.push({ dot, value });
            row.onclick = () => {
                dots.forEach(d => d.dot.classList.remove("active"));
                dot.classList.add("active");
                curVal = value;
                cb(value);
            };
            group.appendChild(row);
        });

        this._getTabEl(tab).appendChild(el);
        if (opts?.persist && p.initial !== defaultVal) callback(p.initial);
        p.hydrate(v => {
            curVal = v;
            dots.forEach(d => d.dot.classList.toggle("active", d.value === v));
            callback(v);
        });
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a status tag / colored chip.
     * @param {string} text          - Chip text
     * @param {string} [color="#5865f2"] - Accent hex color
     * @returns {{ update(text), setColor(c) }}
     */
    addTag(tab, label, text, color = "#5865f2") {
        const el = document.createElement("div");
        el.className = "zui-item";
        // Background = color + "22" alpha, border = color + "55" alpha
        const bg  = color + "22";
        const bdr = color + "55";
        el.innerHTML = `
            <div class="zui-tag-row">
                <span class="zui-toggle-label">${label}</span>
                <span class="zui-tag" style="color:${color};background:${bg};border-color:${bdr}">${text}</span>
            </div>
        `;
        const chip = el.querySelector(".zui-tag");
        this._getTabEl(tab).appendChild(el);
        this._registerFeature(tab, label, el);
        return {
            update(t)   { chip.textContent = t; },
            setColor(c) {
                chip.style.color       = c;
                chip.style.background  = c + "22";
                chip.style.borderColor = c + "55";
            },
        };
    }

    // ── Minimize ─────────────────────────────────────────────────────────────

    /** Toggle the minimized state of the panel. */
    toggleMinimize() {
        this._minimized = !this._minimized;
        const wrapper = this.container.querySelector(".zui-wrapper");
        wrapper.classList.toggle("zui-minimized", this._minimized);
        this.container.querySelector(".zui-minimize-btn").textContent = this._minimized ? "+" : "−";
    }

    /**
     * Bind a keyboard key that toggles the panel open/minimized.
     * Calling again with a new key replaces the previous binding.
     * @param {string} [key="Insert"]
     */
    setToggleKey(key = "Insert") {
        if (this._toggleKeyFn) document.removeEventListener("keydown", this._toggleKeyFn);
        this._toggleKeyFn = e => { if (e.key === key) this.toggleMinimize(); };
        document.addEventListener("keydown", this._toggleKeyFn);
    }

    // ── Popup / Toast (delegates to ZOUIPopup) ───────────────────────────────
    //  All three methods return a live handle: { update, setType, dismiss }

    /** @see ZOUIPopup#toast */
    toast(...args)   { return this.popup.toast(...args);   }
    /** @see ZOUIPopup#confirm */
    confirm(...args) { return this.popup.confirm(...args); }
    /** @see ZOUIPopup#input */
    input(...args)   { return this.popup.input(...args);   }
}
