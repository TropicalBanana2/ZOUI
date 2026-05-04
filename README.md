# ZOUI

A lightweight Discord-themed UI library for [zombs.io](https://zombs.io) userscripts.  
Drop it into any userscript to get a polished, tabbed settings panel that matches the game's aesthetic.

---

## Features

- Sidebar navigation with tabs and built-in icons
- Global fuzzy search bar across all settings (emoji-safe)
- Toggles, sliders, buttons, button rows, dropdowns, text inputs, filterable search lists
- Version switcher with automatic header badge sync
- Top-center popup system — toasts, confirmation dialogs, input prompts
- Live popup handles — update text, swap type, or dismiss programmatically (e.g. countdowns)
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

const general = ui.addTab("General");

ui.addHeader(general, "Combat");
ui.addToggle(general, "Auto Attack", false, enabled => { /* ... */ });
ui.addSlider(general, "Attack Speed", 1, 10, 5, value => { /* ... */ });

// Popup — returns a live handle
const t = ui.toast("Wave incoming!", "warning", 0);
setTimeout(() => t.dismiss(), 5000);
```

---

## API Reference

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

#### `addToggle(tab, label, default, callback)`
Add an on/off toggle row.

```js
ui.addToggle(tab, "Show FPS", false, enabled => {
    console.log("Toggle:", enabled);
});
```

---

#### `addSlider(tab, label, min, max, value, callback)`
Add a range slider.

```js
ui.addSlider(tab, "FOV", 60, 120, 90, value => {
    console.log("FOV:", value);
});
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

#### `addTextbox(tab, label, placeholder, callback, defaultValue?)`
Add a text input field.

```js
ui.addTextbox(tab, "Username", "Enter name...", value => {
    console.log("Input:", value);
}, "Player1");
```

---

#### `addSelect(tab, label, options, callback)`
Add a dropdown select. Returns a **SelectController** for dynamic option management.

```js
const sel = ui.addSelect(tab, "Difficulty", [
    { value: "easy",   label: "Easy"   },
    { value: "medium", label: "Medium" },
    { value: "hard",   label: "Hard"   },
], value => {
    console.log("Selected:", value);
});
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

#### `addSearchList(tab, label, items, callback)`
Add a filterable list where items can be clicked to select them. Returns a **SearchListController** for dynamic item management.

```js
const list = ui.addSearchList(tab, "Tower Type",
    ["Wall", "Arrow Tower", "Cannon Tower", "Magic Tower"],
    item => console.log("Selected:", item)
);
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

```js
list.addItem("Bomb Tower");
list.removeItem("Wall");
console.log(list.getValue()); // currently selected item
list.clear();
```

---

#### `addVersionSwitcher(tab, label, versions, current, callback)`
Add a row of version pill buttons. Clicking a pill highlights it and updates the header badge. Each pill is individually searchable.

```js
ui.addVersionSwitcher(tab, "Script Version",
    ["1.0.0", "1.1.0", "2.0.0"],
    "2.0.0",
    version => console.log("Switched to:", version)
);
```

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

## License

MIT — free to use, modify, and distribute.
