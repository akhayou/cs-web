# Login App — React

Converted from Oracle JET (Knockout.js) to React + Vite.

## Project Structure

```
login-app/
├── index.html                        ← HTML entry point
├── vite.config.js                    ← Vite + React plugin config
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                      ← ReactDOM.createRoot entry
    ├── App.jsx                       ← Root component (handles login event)
    ├── index.css                     ← Global reset
    ├── components/
    │   ├── LoginPage.jsx             ← Converted OJet login-page-view/viewModel
    │   └── LoginPage.module.css      ← Scoped CSS (mirrors OJet utility classes)
    └── utils/
        └── icons.jsx                 ← SVG icons (replaces oj-ux-ico-* classes)
```

## OJet → React Mapping

| Oracle JET                              | React                                      |
|-----------------------------------------|--------------------------------------------|
| `ko.observable(null)`                   | `useState('')`                             |
| `this.connected()`                      | `useEffect(() => { ... }, [])`             |
| `_initLabels()` / `_initIDs()`          | Component props                            |
| `oj-input-text[raw-value]`              | `<input>` with `value` + `onChange`        |
| `oj-input-password[mask-icon="visible"]`| `<input type="password/text">` + toggle   |
| `oj-button[chroming="callToAction"]`    | `<button className={styles.loginButton}>`  |
| `oj-bind-text[value="[[x]]"]`           | `{x}` JSX expression                      |
| `data-bind="event: { keyup: fn }"`      | `onKeyUp={fn}`                             |
| `element.dispatchEvent(CustomEvent)`    | `onLogin(payload)` prop callback           |
| `smScreen` observable + conditional CSS | `useState` + `useEffect` resize listener   |
| `oj-ux-ico-*` icon classes              | Inline SVG components in `utils/icons.jsx` |

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

## VS Code Tips

- Install the **ES7+ React/Redux/React-Native snippets** extension for JSX shortcuts.
- Install **Vite** extension or just use the integrated terminal to run `npm run dev`.
- The project uses CSS Modules (`LoginPage.module.css`) for scoped styling — VS Code
  will give you autocomplete if you install the **CSS Modules** extension.
