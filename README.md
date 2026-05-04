# ZOUI

A lightweight Discord-themed UI library for [zombs.io](https://zombs.io) userscripts.  
Drop it into any userscript to get a polished, tabbed settings panel that matches the game's aesthetic.

---

## Features

- Sidebar navigation with tabs
- Global search bar across all settings
- Toggles, sliders, buttons, dropdowns, text inputs, search lists
- Version switcher with header badge sync
- Zero dependencies — pure vanilla JS + CSS

---

## Installation

Copy the contents of `zoui.js` into the **top** of your userscript (before any code that uses it), or load it as a `@require` in a Tampermonkey/Violentmonkey header:

```js
// @require  https://raw.githubusercontent.com/TropicalBanana2/ZOUI/refs/heads/main/zoui.js
```

---

## Quick Start

```js
// Mount onto the existing game settings container
const ui = new ZOUI(document.querySelector("#hud-menu-settings"), "My Script", "1.0.0");

// Add a tab
const general = ui.addTab("General");

// Add controls to the tab
ui.addHeader(general, "Combat");
ui.addToggle(general, "Auto Attack", false, enabled => {
    // handle toggle
});
ui.addSlider(general, "Attack Speed", 1, 10, 5, value => {
    // handle slider
});
```

---

## API Reference

### Constructor

```js
new ZOUI(container, title?, version?)
```

| Parameter   | Type        | Default    | Description                                      |
|-------------|-------------|------------|--------------------------------------------------|
| `container` | `Element`   | —          | DOM element to mount the UI into                 |
| `title`     | `string`    | `"ZOUI"`   | Title shown in the header bar                    |
| `version`   | `string`    | `"1.0.0"`  | Version string shown in the header badge         |

---

### Instance Methods

#### `addTab(name, icon?)`
Add a tab to the sidebar. Returns the tab name, which is used as the first argument for all `add*` methods.

```js
const tab = ui.addTab("Visuals");
const tab = ui.addTab("Combat", "⚔️");                         // emoji icon
const tab = ui.addTab("Player", "<svg>...</svg>");              // inline SVG
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
Add a plain text block, or a styled info callout when `tip` is `true`.

```js
ui.addText(tab, "Some descriptive text.");
ui.addText(tab, "This feature is experimental.", true); // renders as a blue callout
```

---

#### `addToggle(tab, label, default, callback)`
Add an on/off toggle row.

```js
ui.addToggle(tab, "Show FPS", false, enabled => {
    console.log("Toggle is now:", enabled);
});
```

---

#### `addSlider(tab, label, min, max, value, callback)`
Add a range slider.

```js
ui.addSlider(tab, "FOV", 60, 120, 90, value => {
    console.log("FOV set to:", value);
});
```

---

#### `addButton(tab, label, callback, secondary?)`
Add a single button. Pass `true` for `secondary` to use the ghost style.

```js
ui.addButton(tab, "Reset Defaults", () => resetAll());
ui.addButton(tab, "Cancel", () => close(), true); // secondary style
```

---

#### `addButtonRow(tab, buttons)`
Add multiple buttons in a horizontal row.

```js
ui.addButtonRow(tab, [
    ["Build",  () => buildBase()],
    ["Record", () => recordBase(), true],  // secondary
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

**SelectController methods:**

| Method | Description |
|--------|-------------|
| `sel.addOption(value, label)` | Append a new option, returns the `<option>` element |
| `sel.removeOption(value)` | Remove an option by its value |
| `sel.clear()` | Remove all options |
| `sel.getValue()` | Return the currently selected value |
| `sel.setValue(value)` | Programmatically select an option |
| `sel.value` | Readable/writable shorthand for `getValue`/`setValue` |
| `sel.element` | The raw `<select>` DOM element |

```js
// Dynamic usage:
sel.addOption("expert", "Expert");
sel.removeOption("easy");
sel.setValue("medium");
console.log(sel.getValue()); // "medium"
sel.clear(); // remove all options
```

---

#### `addSearchList(tab, label, items, callback)`
Add a filterable list where items can be clicked to select them.

```js
ui.addSearchList(tab, "Tower Type",
    ["Wall", "Arrow Tower", "Cannon Tower", "Magic Tower"],
    item => console.log("Selected:", item)
);
```

---

#### `addVersionSwitcher(tab, label, versions, current, callback)`
Add a row of version pill buttons. Clicking a pill highlights it and updates the header badge automatically.

```js
ui.addVersionSwitcher(tab, "Script Version",
    ["1.0.0", "1.1.0", "2.0.0"],
    "2.0.0",
    version => {
        console.log("Switched to version:", version);
        // load version-specific features here
    }
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

## License

MIT — free to use, modify, and distribute.
