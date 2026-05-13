# cs-creative Solutions — React

Converted from Oracle JET (Knockout.js) to React + Vite.

## Project Structure

```
cs-creative Solutions/


+___public
|       config.json
|       favicon.svg
|       menu.json
|
\___src
    |   App.jsx
    |   index.css
    |   main.jsx
    |
    +___assest
    |   |   cs_logo.png
    |   |
    |   \___styles
    |           App.css
    |           Phosphor.css
    |           Phosphor.svg
    |           Phosphor.ttf
    |           Phosphor.woff
    |           Phosphor.woff2
    |
    +___components
    |   |   BarcodesTable.jsx
    |   |   ColumnManager.jsx
    |   |   DataGrid.jsx
    |   |   DescriptorForm.jsx
    |   |   ListPanel.jsx
    |   |   LoginPage.jsx
    |   |   LoginPage.module.css
    |   |   MunimentDataForm.jsx
    |   |   PricesTable.jsx
    |   |   UnitsTable.jsx
    |   |
    |   +___HomePage
    |   |       BarChart.jsx
    |   |       ClockPanel.jsx
    |   |       Commands.jsx
    |   |       FavoriteCommands.jsx
    |   |       PieChart.jsx
    |   |
    |   \___MainPage
    |           Icons.jsx
    |           menuIcons.jsx
    |           Sidebar.jsx
    |           SlidingMenu.jsx
    |           Toggle.jsx
    |           Topbar.jsx
    |           UserDropdown.jsx
    |
    +___context
    |       AppContext.jsx
    |
    +___pages
    |       AccountsPage.jsx
    |       DescriptorsPage.jsx
    |       HomePage.jsx
    |       MainPage.jsx
    |       MaterialsPage.jsx
    |       MunimentsPage.jsx
    |       PaymentsPage.jsx
    |       RepAccBalancesPage.jsx
    |       RepVouItemsPage.jsx
    |       UsersPage.jsx
    |       vouchersPage.jsx
    |
    +___router
    |       ComingSoon.jsx
    |       PageRouter.jsx
    |
    +___services
    |       authService.js
    |       config.js
    |       menuService.js
    |
    \___utils
            core.jsx
            i18n.js
            icons.jsx
            printCard.js
            Styles.js


```

## OJet → React Mapping

| Oracle JET                               | React                                      |
| ---------------------------------------- | ------------------------------------------ |
| `ko.observable(null)`                    | `useState('')`                             |
| `this.connected()`                       | `useEffect(() => { ... }, [])`             |
| `_initLabels()` / `_initIDs()`           | Component props                            |
| `oj-input-text[raw-value]`               | `<input>` with `value` + `onChange`        |
| `oj-input-password[mask-icon="visible"]` | `<input type="password/text">` + toggle    |
| `oj-button[chroming="callToAction"]`     | `<button className={styles.loginButton}>`  |
| `oj-bind-text[value="[[x]]"]`            | `{x}` JSX expression                       |
| `data-bind="event: { keyup: fn }"`       | `onKeyUp={fn}`                             |
| `element.dispatchEvent(CustomEvent)`     | `onLogin(payload)` prop callback           |
| `smScreen` observable + conditional CSS  | `useState` + `useEffect` resize listener   |
| `oj-ux-ico-*` icon classes               | Inline SVG components in `utils/icons.jsx` |

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
