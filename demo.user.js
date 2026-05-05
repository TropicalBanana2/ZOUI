// ==UserScript==
// @name         ZOUI Demo
// @namespace    https://github.com/TropicalBanana2/ZOUI
// @version      1.0.0
// @description  Feature showcase for ZOUI — the Discord-themed UI library for zombs.io
// @author       TropicalBanana2
// @match        *://zombs.io/*
// @require      https://raw.githubusercontent.com/TropicalBanana2/ZOUI/refs/heads/main/zoui.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

const ui = new ZOUI(document.querySelector("#hud-menu-settings"), "ZOUI Demo", "1.0.0");

// Press Insert anywhere to minimize / restore the panel
ui.setToggleKey("Insert");

// ── Tab: Player ───────────────────────────────────────────────────────────────
// Covers: addToggle (persist), addSlider (persist), addRadioGroup (persist)

const player = ui.addTab("Player");

ui.addHeader(player, "Display");
ui.addToggle(player, "Show Username",  true,  v => console.log("Username:", v),  { persist: "demo-showName"  });
ui.addToggle(player, "Show HP Bar",    true,  v => console.log("HP Bar:", v),     { persist: "demo-showHP"    });
ui.addSlider(player, "UI Scale",       50, 150, 100, v => console.log("Scale:", v), { persist: "demo-uiScale" });

ui.addDivider(player);
ui.addHeader(player, "Team");
ui.addRadioGroup(player, "Team Color",
    [
        { value: "red",   label: "Red"   },
        { value: "blue",  label: "Blue"  },
        { value: "green", label: "Green" },
        { value: "gold",  label: "Gold"  },
    ],
    "blue",
    v => console.log("Team:", v),
    { persist: "demo-teamColor" }
);

// ── Tab: Combat ───────────────────────────────────────────────────────────────
// Covers: addKeybind (persist), addNumberInput (persist), addCollapsible (persist)

const combat = ui.addTab("Combat");

ui.addHeader(combat, "Keybinds");
ui.addKeybind(combat, "Attack",  "Q", k => console.log("Attack key:", k),  { persist: "demo-keyAttack"  });
ui.addKeybind(combat, "Ability", "E", k => console.log("Ability key:", k), { persist: "demo-keyAbility" });

ui.addDivider(combat);
ui.addHeader(combat, "Targeting");
ui.addNumberInput(combat, "Attack Range",  1, 500, 1, 120, v => console.log("Range:", v),  { persist: "demo-range"  });
ui.addNumberInput(combat, "Aggro Radius",  1, 500, 1, 200, v => console.log("Aggro:", v),  { persist: "demo-aggro"  });

ui.addDivider(combat);
// Collapsible — closed by default; state persisted
const adv = ui.addCollapsible(combat, "Advanced", false, { persist: "demo-collAdv" });
ui.addToggle(adv, "Predict Movement",  false, v => console.log("Predict:", v));
ui.addToggle(adv, "Auto-target Doors", false, v => console.log("Auto-target:", v));
ui.addSlider(adv, "Reaction Delay (ms)", 0, 500, 80, v => console.log("Delay:", v));

// ── Tab: Visuals ──────────────────────────────────────────────────────────────
// Covers: addColorPicker (persist), addToggle, addSearchList

const visuals = ui.addTab("Visuals");

ui.addHeader(visuals, "Colors");
ui.addColorPicker(visuals, "Player Highlight", "#5865f2",
    c => console.log("Player color:", c), { persist: "demo-colorPlayer" });
ui.addColorPicker(visuals, "Enemy Highlight",  "#ed4245",
    c => console.log("Enemy color:", c),  { persist: "demo-colorEnemy"  });

ui.addDivider(visuals);
ui.addHeader(visuals, "Overlays");
ui.addToggle(visuals, "Show Grid",          false, v => console.log("Grid:", v),        { persist: "demo-grid"        });
ui.addToggle(visuals, "Show Range Circles", false, v => console.log("Ranges:", v),      { persist: "demo-ranges"      });
ui.addToggle(visuals, "High Contrast Mode", false, v => console.log("Hi-contrast:", v), { persist: "demo-hiContrast"  });

ui.addDivider(visuals);
ui.addHeader(visuals, "Theme Preset");
ui.addSearchList(visuals, "Choose Theme",
    ["Default Blue", "Crimson", "Forest Green", "Sunset Orange", "Violet"],
    item => console.log("Theme:", item),
    { persist: "demo-theme" }
);

// ── Tab: Misc ─────────────────────────────────────────────────────────────────
// Covers: addTag, addTextbox (persist), addSelect + dynamic controller, addProgressBar

const misc = ui.addTab("Misc");

ui.addHeader(misc, "Status");
const connTag   = ui.addTag(misc, "Connection", "Online",  "#23a559");
const serverTag = ui.addTag(misc, "Server",     "US-East", "#5865f2");
ui.addButtonRow(misc, [
    ["Go Offline", () => { connTag.update("Offline"); connTag.setColor("#ed4245"); }, true],
    ["Go Online",  () => { connTag.update("Online");  connTag.setColor("#23a559"); }, true],
]);

ui.addDivider(misc);
ui.addHeader(misc, "Identity");
ui.addTextbox(misc, "Custom Tag", "e.g. [MVP]", v => console.log("Tag:", v), "",
    { persist: "demo-customTag" });

ui.addDivider(misc);
ui.addHeader(misc, "Build Queue");
const buildBar = ui.addProgressBar(misc, "Queued Buildings", 0, 10);
let queued = 0;
ui.addButtonRow(misc, [
    ["+ Enqueue",  () => buildBar.setValue(++queued),                              true],
    ["✓ Build One",() => { if (queued > 0) buildBar.setValue(--queued); },         true],
    ["Clear",      () => { queued = 0; buildBar.setValue(0); },                    true],
]);

ui.addDivider(misc);
ui.addHeader(misc, "Game Mode");
const modeSel = ui.addSelect(misc, "Difficulty",
    [
        { value: "easy",   label: "Easy"   },
        { value: "normal", label: "Normal" },
        { value: "hard",   label: "Hard"   },
        { value: "insane", label: "Insane" },
    ],
    v => console.log("Difficulty:", v),
    { persist: "demo-difficulty" }
);
ui.addButtonRow(misc, [
    ["Add Custom", () => modeSel.addOption("custom", "Custom"),  true],
    ["Remove Easy",() => modeSel.removeOption("easy"),           true],
    ["Reset",      () => { modeSel.clear(); modeSel.addOption("easy","Easy"); modeSel.addOption("normal","Normal"); modeSel.addOption("hard","Hard"); modeSel.addOption("insane","Insane"); }, true],
]);

// ── Tab: About ────────────────────────────────────────────────────────────────
// Covers: addVersionSwitcher, addText, addText(tip), addButton

const about = ui.addTab("About", "ℹ️");

ui.addHeader(about, "ZOUI");
ui.addVersionSwitcher(about, "Library Version",
    ["1.0.0", "2.0.0", "3.0.0"],
    "3.0.0",
    v => { console.log("Version:", v); ui.toast(`Switched to v${v}`, "info", 2000); }
);

ui.addDivider(about);
ui.addText(about, "A Discord-themed UI library for zombs.io userscripts. Drop it into any script with a single @require line.");
ui.addText(about, "Press Insert at any time to minimize or restore this panel.", true);

ui.addDivider(about);
ui.addHeader(about, "Links");
ui.addButtonRow(about, [
    ["Open GitHub",   () => window.open("https://github.com/TropicalBanana2/ZOUI", "_blank")],
    ["Report Issue",  () => window.open("https://github.com/TropicalBanana2/ZOUI/issues",  "_blank"), true],
]);

// ── Tab: Popups 🧪 ────────────────────────────────────────────────────────────
// Covers: toast (all types + handle API), confirm, input

const popups = ui.addTab("Popups", "🧪");
// Badge to draw attention
ui.setTabBadge(popups, "NEW");

ui.addHeader(popups, "Toasts");
ui.addText(popups, "Up to 5 toasts stack simultaneously; the oldest is auto-dismissed when the cap is hit.");
ui.addButtonRow(popups, [
    ["Info",    () => ui.toast("This is an info toast.",          "info"),    true],
    ["Success", () => ui.toast("Action completed successfully.",  "success"), true],
    ["Warning", () => ui.toast("Wave starting in 10 seconds.",   "warning"), true],
    ["Error",   () => ui.toast("Gold Stash not found.",          "error"),   true],
]);

ui.addDivider(popups);
ui.addHeader(popups, "Live Handle API");
ui.addText(popups, "Every popup method returns a handle — update text, swap type, or dismiss it programmatically.", true);

ui.addButton(popups, "Countdown Toast", () => {
    let n = 5;
    const h = ui.toast(`Wave incoming in ${n}s`, "warning", 0);
    const id = setInterval(() => {
        n--;
        if (n <= 0) {
            clearInterval(id);
            h.setType("error").update("Wave is here!");
            setTimeout(() => h.dismiss(), 1500);
        } else {
            h.update(`Wave incoming in ${n}s`);
        }
    }, 1000);
});

ui.addButton(popups, "Type Cycle Toast", () => {
    const types  = ["info", "success", "warning", "error"];
    const labels = ["Loading...", "Done!", "Watch out!", "Failed!"];
    let i = 0;
    const h = ui.toast(labels[0], types[0], 0);
    const id = setInterval(() => {
        i++;
        if (i >= types.length) { clearInterval(id); h.dismiss(); return; }
        h.setType(types[i]).update(labels[i]);
    }, 800);
});

ui.addDivider(popups);
ui.addHeader(popups, "Dialogs");

ui.addButton(popups, "Confirm Dialog", () =>
    ui.confirm("Are you sure you want to reset all settings?",
        () => ui.toast("Settings reset.", "success"),
        () => ui.toast("Cancelled.",      "info", 1500)
    )
);

ui.addButton(popups, "Auto-cancel Confirm (5s)", () => {
    let sec = 5;
    const h = ui.confirm(`Confirm? Auto-cancels in ${sec}s…`,
        () => ui.toast("Confirmed!", "success")
    );
    const id = setInterval(() => {
        sec--;
        if (sec <= 0) { clearInterval(id); h.dismiss(); ui.toast("Timed out.", "warning"); }
        else h.update(`Confirm? Auto-cancels in ${sec}s…`);
    }, 1000);
}, true);

ui.addButton(popups, "Input Dialog", () =>
    ui.input("Enter a base name:",
        v  => ui.toast(`Saved as "${v}"`,  "success"),
        () => ui.toast("Cancelled.",        "info", 1500),
        "My awesome base",
    )
);
