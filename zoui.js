// ==============================================================
//  ZOUI  —  Discord-style UI library for zombs.io userscripts
//  https://github.com/TropicalBanana2/ZOUI
//  License: MIT
// ==============================================================

class ZOUI {
    /**
     * @param {Element} container  - DOM element to mount the UI into
     * @param {string}  title      - Title shown in the header bar
     * @param {string}  version    - Version string shown in the header badge (e.g. "1.0.0")
     */
    constructor(container, title = "ZOUI", version = "1.0.0") {
        this.container = container;
        this.tabs = {};
        this.activeTab = null;
        this.features = [];
        this.version = version;

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

        this.sidebar      = this.container.querySelector(".zui-sidebar");
        this.content      = this.container.querySelector(".zui-content");
        this.searchInput  = this.container.querySelector(".zui-global-search input");
        this.searchResults = this.container.querySelector(".zui-search-results");
        this._versionBadge = this.container.querySelector(".zui-version-badge");

        this._injectStyles();
        this._setupSearch();
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
            .zui-global-search input {
                width:100%;height:40px;padding:0 10px 0 44px;
                background:#1e1f22;border:1px solid rgba(0,0,0,0.35);
                border-radius:6px;color:#dcddde;font-size:13px;outline:none;transition:border-color 0.15s;
            }
            .zui-global-search input::placeholder { color:#87898c; }
            .zui-global-search input:focus        { border-color:#5865f2; }
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
        `;
        document.head.appendChild(style);
        document.addEventListener("click", e => {
            if (!e.target.closest(".zui-global-search"))
                document.querySelectorAll(".zui-search-results").forEach(r => r.classList.remove("active"));
        });
    }

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
                el.innerHTML = `<span>${this._highlight(f.label, val)}</span><span class="zui-result-tab">${f.tab}</span>`;
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

    _registerFeature(tab, label, element) {
        this.features.push({ tab, label, element });
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

    /** Add a section header label inside a tab. */
    addHeader(tab, text) {
        const el = document.createElement("div");
        el.className = "zui-section-header";
        el.innerText = text;
        this.tabs[tab].appendChild(el);
        this._registerFeature(tab, text, el);
    }

    /** Add a horizontal rule divider inside a tab. */
    addDivider(tab) {
        const el = document.createElement("div");
        el.className = "zui-divider";
        this.tabs[tab].appendChild(el);
    }

    /**
     * Add a text block inside a tab.
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
        this.tabs[tab].appendChild(el);
        this._registerFeature(tab, text, el);
    }

    /**
     * Add an on/off toggle row.
     * @param {boolean}  def       - Initial state
     * @param {function} callback  - Called with (boolean) on change
     */
    addToggle(tab, label, def, callback) {
        const el = document.createElement("div");
        el.className = "zui-item";
        let active = def;
        el.innerHTML = `<div class="zui-toggle"><span class="zui-toggle-label">${label}</span><div class="zui-switch ${active ? "active" : ""}"></div></div>`;
        const sw = el.querySelector(".zui-switch");
        el.querySelector(".zui-toggle").onclick = () => {
            active = !active;
            sw.classList.toggle("active", active);
            callback(active);
        };
        this.tabs[tab].appendChild(el);
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a range slider.
     * @param {function} callback - Called with (number) on change
     */
    addSlider(tab, label, min, max, value, callback) {
        const el = document.createElement("div");
        el.className = "zui-item zui-slider-wrap";
        el.innerHTML = `<label>${label}<span>${value}</span></label><input type="range" min="${min}" max="${max}" value="${value}" step="1">`;
        const input = el.querySelector("input"), span = el.querySelector("span");
        input.oninput = () => { span.innerText = input.value; callback(Number(input.value)); };
        this.tabs[tab].appendChild(el);
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
        this.tabs[tab].appendChild(el);
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
        this.tabs[tab].appendChild(el);
    }

    /**
     * Add a text input field.
     * @param {function} callback    - Called with (string) on every keystroke
     * @param {string}   [defaultValue=""]
     */
    addTextbox(tab, label, placeholder, callback, defaultValue = "") {
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><input type="text" placeholder="${placeholder}" value="${defaultValue}">`;
        el.querySelector("input").oninput = e => callback(e.target.value);
        this.tabs[tab].appendChild(el);
        this._registerFeature(tab, label, el);
    }

    /**
     * Add a dropdown select.
     *
     * @param {Array<{value, label}>} options - Initial option list
     * @param {function} callback             - Called with (value) on change
     * @returns {SelectController}
     *   .addOption(value, label)  — append a new option, returns the <option> element
     *   .removeOption(value)      — remove option by value
     *   .clear()                  — remove all options
     *   .getValue()               — return currently selected value
     *   .setValue(value)          — programmatically select an option
     *   .element                  — the raw <select> element
     */
    addSelect(tab, label, options, callback) {
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><select class="zui-select"></select>`;
        const sel = el.querySelector("select");

        options.forEach(({ value, label: text }) => {
            const opt = document.createElement("option");
            opt.value = value; opt.textContent = text;
            sel.appendChild(opt);
        });

        sel.onchange = () => callback(sel.value);
        this.tabs[tab].appendChild(el);
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
     * Add a filterable search list (multi-select style).
     * @param {string[]}  items    - Full list of option strings
     * @param {function}  callback - Called with the selected item string
     */
    addSearchList(tab, label, items, callback) {
        const el = document.createElement("div");
        el.className = "zui-item";
        el.innerHTML = `<span class="zui-field-label">${label}</span><input type="text" placeholder="Filter..."><div class="zui-search-list"></div>`;
        const input = el.querySelector("input"), list = el.querySelector(".zui-search-list");
        let selected = null;
        const render = (filter = "") => {
            list.innerHTML = "";
            items.filter(i => i.toLowerCase().includes(filter.toLowerCase())).forEach(item => {
                const itemEl = document.createElement("div");
                itemEl.className = "zui-search-result" + (item === selected ? " selected" : "");
                itemEl.innerHTML = `<div class="zui-check"></div>${item}`;
                itemEl.onclick = () => { selected = item; render(input.value); callback(item); };
                list.appendChild(itemEl);
            });
        };
        input.oninput = () => render(input.value);
        render();
        this.tabs[tab].appendChild(el);
        this._registerFeature(tab, label, el);
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

        this.tabs[tab].appendChild(el);
        this._registerFeature(tab, label, el);
    }
}
