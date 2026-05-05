# ZOUI

A lightweight Discord-themed UI library for [zombs.io](https://zombs.io) userscripts.  
Drop it into any userscript to get a polished, tabbed settings panel that matches the game's aesthetic.

---

## Features

- Sidebar navigation with tabs, built-in icons, and badge counters
- Global fuzzy search bar across all settings (emoji-safe)
- Collapsible sections to organise dense tabs
- Toggles, sliders, buttons, button rows, dropdowns, text inputs, number inputs, filterable search lists
- Color pickers, keybind capture, radio groups, status tags, progress bars
- Version switcher with automatic header badge sync
- Top-center popup system — toasts (max 5 stacked), confirmation dialogs, input prompts
- Live popup handles — update text, swap type, or dismiss programmatically (e.g. countdowns)
- **Web Cache API persistence** — any component can save its state across page reloads via `opts.persist`
- Minimize / restore via header button or a configurable keyboard shortcut
- Zero dependencies — pure vanilla JS + CSS

---

## Installation

Load as a `@require` in Tampermonkey / Violentmonkey:

```js
// @require  https://raw.githubusercontent.com/TropicalBanana2/ZOUI/refs/heads/main/zoui.js
```

Or copy `zoui.js` directly into the top of your userscript before any code that uses it.

---

## Quick Start

```js
const ui = new ZOUI(document.querySelector("#hud-menu-settings"), "My Script", "1.0.0");

ui.setToggleKey("Insert"); // Press Insert to minimize / restore

const general = ui.addTab("General");

ui.addHeader(general, "Combat");
ui.addToggle(general, "Auto Attack", false, enabled => { /* ... */ }, { persist: "myScript-autoAttack" });
ui.addSlider(general, "Attack Speed", 1, 10, 5, value => { /* ... */ });

// Popup — returns a live handle
const t = ui.toast("Wave incoming!", "warning", 0);
setTimeout(() => t.dismiss(), 5000);
```

---

## Persistence (`opts.persist`)

Any component that accepts an `opts` parameter can persist its value across page reloads using the [Web Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).

Pass `{ persist: "uniqueKey" }` as the last argument to any persistable `add*` method.  
Keys must be unique within a script. A good pattern is `"scriptName-settingName"`.

```js
ui.addToggle(tab, "Night Mode", false, v => applyNightMode(v), { persist: "myScript-nightMode" });
ui.addSlider(tab, "Speed",      1, 10,  5, v => setSpeed(v),   { persist: "myScript-speed"     });
ui.addSelect(tab, "Difficulty", options, v => setDiff(v),      { persist: "myScript-difficulty" });
```

Persistence is handled internally by `ZOUICache`. You never need to interact with it directly — just pass the `persist` key.

---

## API Reference

### `ZOUICache` — Web Cache persistence

Internal class used by ZOUI for persistence. Can also be used standalone.

```js
const cache = new ZOUICache("my-namespace");

// Reads are synchronous (from in-memory mirror)
cache.get("speed", 5);       // returns stored value or fallback

// Writes are synchronous to memory, async to CacheStorage
cache.set("speed", 8);

// Async deletion
await cache.delete("speed");

// Async full clear
await cache.clear();

// Promise that resolves when all stored values are hydrated into memory
await cache._ready;
```

| Member | Description |
|--------|-------------|
| `get(key, fallback)` | Sync read — returns stored value or `fallback` |
| `set(key, value)` | Sync write to memory + async write to CacheStorage |
| `delete(key)` | Remove a single key |
| `clear()` | Wipe the entire namespace |
| `_ready` | Promise that resolves when hydration from CacheStorage is complete |

---

### `ZOUI` — Settings panel

#### Constructor

```js
new ZOUI(container, title?, version?)
```

| Parameter   | Type      | Default   | Description                              |
|-------------|-----------|-----------|------------------------------------------|
| `container` | `Element` | —         | DOM element to mount the UI into         |
| `title`     | `string`  | `"ZOUI"`  | Title shown in the header bar            |
| `version`   | `string`  | `"1.0.0"` | Version string shown in the header badge |

ZOUI creates its own `ZOUICache` instance namespaced to `"zoui-" + title`. The last active tab is automatically persisted and restored on the next load.

---

#### `addTab(name, icon?)`
Add a tab to the sidebar. Returns the tab name used as the first argument for all `add*` methods.

```js
const tab = ui.addTab("Visuals");
const tab = ui.addTab("Combat", "⚔️");                          // emoji icon
const tab = ui.addTab("Player", "<svg>...</svg>");               // inline SVG
const tab = ui.addTab("Items",  "https://example.com/icon.png"); // image URL
```

Built-in icons are provided automatically for tabs named: `Player`, `Combat`, `Visuals`, `Misc`.

---

#### `setTabBadge(tab, value)`
Set a notification badge counter on a sidebar tab button. Pass `null` to remove the badge.

```js
ui.setTabBadge("Alerts", 3);      // shows a red "3" pill on the tab
ui.setTabBadge("Alerts", null);   // removes the badge
```

---

#### `addHeader(tab, text)`
Add an uppercase section label.

```js
ui.addHeader(tab, "Movement");
```

---

#### `addDivider(tab)`
Add a thin horizontal rule.

```js
ui.addDivider(tab);
```

---

#### `addText(tab, text, tip?)`
Add a plain text block, or a styled blue info callout when `tip` is `true`.

```js
ui.addText(tab, "Some descriptive text.");
ui.addText(tab, "This feature is experimental.", true);
```

---

#### `addToggle(tab, label, default, callback, opts?)`
Add an on/off toggle row.

```js
ui.addToggle(tab, "Show FPS", false, enabled => {
    console.log("Toggle:", enabled);
});

// With persistence:
ui.addToggle(tab, "Night Mode", false, v => applyNightMode(v), { persist: "myScript-nightMode" });
```

---

#### `addSlider(tab, label, min, max, value, callback, opts?)`
Add a range slider.

```js
ui.addSlider(tab, "FOV", 60, 120, 90, value => {
    console.log("FOV:", value);
});

// With persistence:
ui.addSlider(tab, "Speed", 1, 10, 5, v => setSpeed(v), { persist: "myScript-speed" });
```

---

#### `addButton(tab, label, callback, secondary?)`
Add a single button. Pass `true` for `secondary` to use the ghost style.

```js
ui.addButton(tab, "Reset Defaults", () => resetAll());
ui.addButton(tab, "Cancel", () => close(), true);
```

---

#### `addButtonRow(tab, buttons)`
Add multiple buttons in a horizontal row. Each button is individually searchable via the global search bar.

```js
ui.addButtonRow(tab, [
    ["Build",  () => buildBase()],
    ["Record", () => recordBase(), true],  // secondary style
    ["Delete", () => deleteBase(), true],
]);
```

---

#### `addTextbox(tab, label, placeholder, callback, defaultValue?, opts?)`
Add a text input field.

```js
ui.addTextbox(tab, "Username", "Enter name...", value => {
    console.log("Input:", value);
}, "Player1");

// With persistence:
ui.addTextbox(tab, "API Key", "Enter key...", v => setKey(v), "", { persist: "myScript-apiKey" });
```

---

#### `addSelect(tab, label, options, callback, opts?)` → SelectController
Add a dropdown select. Returns a **SelectController** for dynamic option management.

```js
const sel = ui.addSelect(tab, "Difficulty", [
    { value: "easy",   label: "Easy"   },
    { value: "medium", label: "Medium" },
    { value: "hard",   label: "Hard"   },
], value => {
    console.log("Selected:", value);
});

// With persistence:
const sel = ui.addSelect(tab, "Mode", options, v => setMode(v), { persist: "myScript-mode" });
```

**SelectController:**

| Method | Description |
|--------|-------------|
| `sel.addOption(value, label)` | Append a new option, returns the `<option>` element |
| `sel.removeOption(value)` | Remove an option by value |
| `sel.clear()` | Remove all options |
| `sel.getValue()` | Return the currently selected value |
| `sel.setValue(value)` | Programmatically select an option |
| `sel.value` | Readable/writable shorthand for `getValue` / `setValue` |
| `sel.element` | The raw `<select>` DOM element |

---

#### `addSearchList(tab, label, items, callback, opts?)` → SearchListController
Add a filterable list where items can be clicked to select them. Returns a **SearchListController** for dynamic item management.

```js
const list = ui.addSearchList(tab, "Tower Type",
    ["Wall", "Arrow Tower", "Cannon Tower", "Magic Tower"],
    item => console.log("Selected:", item)
);

// With persistence:
const list = ui.addSearchList(tab, "Preset", presets, v => loadPreset(v), { persist: "myScript-preset" });
```

**SearchListController:**

| Method | Description |
|--------|-------------|
| `list.addItem(label)` | Append a new item |
| `list.removeItem(label)` | Remove an item by label |
| `list.clear()` | Remove all items |
| `list.getValue()` | Return the currently selected label (or `null`) |
| `list.setValue(label)` | Programmatically select an item |
| `list.value` | Readable/writable shorthand for `getValue` / `setValue` |

---

#### `addVersionSwitcher(tab, label, versions, current, callback)`
Add a row of version pill buttons. Clicking a pill highlights it and updates the header badge. Each pill is individually searchable.

```js
ui.addVersionSwitcher(tab, "Script Version",
    ["1.0.0", "2.0.0", "3.0.0"],
    "3.0.0",
    version => console.log("Switched to:", version)
);
```

---

#### `addCollapsible(tab, label, open?, opts?)` → collKey
Add a collapsible section. Returns a **collKey** that can be passed as the `tab` argument to any `add*` method to place content inside the section.

```js
const coll = ui.addCollapsible(tab, "Advanced Settings");

// Add components inside the collapsible — pass collKey as first arg
ui.addToggle(coll, "Debug Mode", false, v => console.log(v));
ui.addSlider(coll, "Timeout",    0, 60, 10, v => console.log(v));

// Open/close state persisted:
const coll = ui.addCollapsible(tab, "Combat", true, { persist: "myScript-collCombat" });
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tab` | `string` | — | Parent tab name |
| `label` | `string` | — | Heading text |
| `open` | `boolean` | `true` | Initially expanded |
| `opts` | `object` | `{}` | `{ persist: "key" }` to save open/close state |

---

#### `addNumberInput(tab, label, min, max, step, value, callback, opts?)`
Add a number input field. Values are automatically clamped to `[min, max]` and rounded to the nearest `step` on change.

```js
ui.addNumberInput(tab, "Max Towers", 0, 200, 5, 50, value => {
    console.log("Max:", value);
});

// With persistence:
ui.addNumberInput(tab, "Gold Target", 0, 100000, 100, 5000, v => setGoal(v),
    { persist: "myScript-goldTarget" });
```

---

#### `addProgressBar(tab, label, value?, max?)` → `{ setValue, setMax }`
Add a progress bar. Returns a handle to update it programmatically.

```js
const bar = ui.addProgressBar(tab, "Build Progress", 0, 10);

bar.setValue(5);   // 50%
bar.setMax(20);    // new maximum; value is clamped if needed
```

| Return method | Description |
|---------------|-------------|
| `setValue(v)` | Update the current value (clamped to `[0, max]`) |
| `setMax(m)` | Update the maximum value |

---

#### `addKeybind(tab, label, defaultKey, callback, opts?)`
Add a keybind capture row. Click the button then press any key to rebind.

```js
ui.addKeybind(tab, "Toggle Menu", "Insert", key => {
    console.log("New key:", key);
});

// With persistence:
ui.addKeybind(tab, "Quick Build", "F2", k => bindKey(k), { persist: "myScript-quickBuild" });
```

---

#### `addColorPicker(tab, label, defaultColor, callback, opts?)` → `{ getValue, setValue }`
Add a color picker row with a clickable swatch that opens the native color chooser.

```js
ui.addColorPicker(tab, "Accent Color", "#5865f2", color => {
    document.documentElement.style.setProperty("--accent", color);
});

// With persistence + controller:
const picker = ui.addColorPicker(tab, "Theme", "#5865f2", applyTheme, { persist: "myScript-theme" });
picker.getValue();       // "#5865f2"
picker.setValue("#ff0"); // programmatically update
```

| Return method | Description |
|---------------|-------------|
| `getValue()` | Return the current color string |
| `setValue(color)` | Programmatically set the color (does not fire callback) |

---

#### `addRadioGroup(tab, label, options, defaultVal, callback, opts?)`
Add a radio button group.

```js
ui.addRadioGroup(tab, "Quality",
    [
        { value: "low",    label: "Low — best performance" },
        { value: "medium", label: "Medium" },
        { value: "high",   label: "High — best visuals" },
    ],
    "medium",
    value => console.log("Quality:", value)
);

// With persistence:
ui.addRadioGroup(tab, "Mode", options, "normal", v => applyMode(v), { persist: "myScript-mode" });
```

---

#### `addTag(tab, label, text, color?)` → `{ update, setColor }`
Add a static status chip / colored tag.

```js
const status = ui.addTag(tab, "Connection", "Online",    "#23a559");
const ver    = ui.addTag(tab, "Script",     "v3.0.0",    "#5865f2");
const warn   = ui.addTag(tab, "Wave",       "Incoming!", "#f0b232");

// Update dynamically:
status.update("Offline");
status.setColor("#ed4245");
```

| Return method | Description |
|---------------|-------------|
| `update(text)` | Change the chip's display text |
| `setColor(hex)` | Swap the accent colour (text, background tint, border) |

---

#### `setVersion(v)`
Programmatically update the version badge in the header.

```js
ui.setVersion("2.1.0");
```

---

#### `switchTab(name)`
Programmatically switch to a tab by name.

```js
ui.switchTab("Visuals");
```

---

#### `toggleMinimize()`
Toggle the minimized state of the panel. When minimized the body and search bar collapse, leaving only the header visible.

```js
ui.toggleMinimize();
```

---

#### `setToggleKey(key?)`
Bind a keyboard key that calls `toggleMinimize()` globally. Calling again with a new key replaces the previous binding.

```js
ui.setToggleKey("Insert"); // default
ui.setToggleKey("F9");
```

---

#### `toast(message, type?, duration?)` → `PopupHandle`
#### `confirm(message, onConfirm, onCancel?)` → `PopupHandle`
#### `input(message, onConfirm, onCancel?, placeholder?, defaultValue?)` → `PopupHandle`

Convenience wrappers around `ZOUIPopup` — see the [ZOUIPopup](#ZOUIPopup--standalone-popup-system) section below for full documentation.

---

---

### `ZOUIPopup` — Standalone popup system

Can be used directly without a `ZOUI` instance. The `ZOUI` class creates one internally as `ui.popup` and exposes `toast`, `confirm`, and `input` as thin wrappers.

```js
// Standalone usage:
const popup = new ZOUIPopup();
popup.toast("Hello!", "success");

// Via ZOUI (equivalent):
ui.toast("Hello!", "success");

// Access the internal instance directly:
ui.popup.toast("Hello!", "success");
```

All three methods return a **PopupHandle** for live updates.

---

#### `toast(message, type?, duration?)` → `PopupHandle`

Show a brief auto-dismissing notification at the **top-center** of the screen, over the game canvas.  
A maximum of **5 live toasts** are displayed at once — if 5 already exist, the oldest is dismissed before the new one appears.

| Parameter  | Type     | Default  | Description                                       |
|------------|----------|----------|---------------------------------------------------|
| `message`  | `string` | —        | Text to display                                   |
| `type`     | `string` | `"info"` | `"info"` · `"success"` · `"warning"` · `"error"` |
| `duration` | `number` | `3000`   | ms before auto-dismiss. **Pass `0` to disable.**  |

```js
ui.toast("Base saved!");
ui.toast("Build complete.", "success");
ui.toast("Gold Stash not found.", "error");
ui.toast("Wave incoming!", "warning", 5000);

// No auto-dismiss — controlled manually:
const t = ui.toast("Wave in 5s", "warning", 0);
```

---

#### `confirm(message, onConfirm, onCancel?)` → `PopupHandle`

Show a top-center confirmation popup. Stays visible until dismissed.  
**Enter** confirms · **Escape** cancels.

```js
ui.confirm("Delete this base?",
    () => console.log("Confirmed!"),
    () => console.log("Cancelled.")
);
```

---

#### `input(message, onConfirm, onCancel?, placeholder?, defaultValue?)` → `PopupHandle`

Show a top-center input popup with a text field. The field is auto-focused.  
**Enter** confirms · **Escape** cancels. `onConfirm` receives the input value as a string.

| Parameter      | Type       | Default | Description                       |
|----------------|------------|---------|-----------------------------------|
| `message`      | `string`   | —       | Label shown above the input field |
| `onConfirm`    | `function` | —       | Called with `(value: string)`     |
| `onCancel`     | `function` | `null`  | Called with no args on cancel     |
| `placeholder`  | `string`   | `""`    | Input placeholder text            |
| `defaultValue` | `string`   | `""`    | Pre-filled value                  |

```js
ui.input("Name your base:", name => saveBase(name), null, "Enter a name...");

// Pre-filled (rename flow):
ui.input("Rename base:", newName => rename(id, newName), null, "Enter a name...", currentName);
```

---

#### `PopupHandle`

Every popup method returns a live handle with three chainable methods:

| Method | Description |
|--------|-------------|
| `handle.update(message)` | Rewrite the popup's message text in place |
| `handle.setType(type)` | Swap the accent colour and icon (`"info"` · `"success"` · `"warning"` · `"error"`) |
| `handle.dismiss()` | Fade out and remove (safe to call multiple times) |

All methods return the handle so calls can be chained.

```js
// Countdown toast:
let n = 5;
const h = ui.toast(`Wave in ${n}s`, "warning", 0);
const id = setInterval(() => {
    n--;
    if (n <= 0) {
        clearInterval(id);
        h.setType("error").update("Wave is here!");
        setTimeout(() => h.dismiss(), 1500);
    } else {
        h.update(`Wave in ${n}s`);
    }
}, 1000);

// Auto-cancelling confirm:
let sec = 10;
const c = ui.confirm(`Confirm? (${sec}s)`, onYes);
const id = setInterval(() => {
    sec--;
    if (sec <= 0) { clearInterval(id); c.dismiss(); }
    else c.update(`Confirm? (${sec}s)`);
}, 1000);
```

---

---

## License

MIT — free to use, modify, and distribute.
