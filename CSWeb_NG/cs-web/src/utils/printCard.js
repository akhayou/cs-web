export function printCard(id, title = '') {
    const appShell = document.querySelector('.app-shell');
    const wasDark = appShell && !appShell.classList.contains('light-theme');
    if (wasDark) appShell.classList.add('light-theme');

    const div = document.getElementById(id);
    if (!div) return;

    const clone = div.cloneNode(true);

    const wrapper = document.createElement('div');
    wrapper.className = 'print-clone';
    wrapper.style.direction = getComputedStyle(div).direction;

    // ── HEADER ─────────────────────────────
    const now = new Date().toLocaleString();
    const header = document.createElement('div');
    header.innerHTML = `
        <div class="print-header-title">${title || ''}</div>
        <div class="print-header-date">${now}</div>
        <hr/>
    `;
    wrapper.appendChild(header);
    wrapper.appendChild(clone);

    // ── REMOVE MAP ─────────────────────────
    wrapper.querySelectorAll('.leaflet-container').forEach((el) => el.remove());

    // ── REACT-SELECT → PRINT TEXT (FINAL) ──
    const seen = new WeakSet();

    wrapper.querySelectorAll('input[role="combobox"]').forEach((input) => {
        const inputWrapper = input.parentElement;
        const valueContainer = inputWrapper?.parentElement;
        const control = valueContainer?.parentElement;
        const container = control?.parentElement;

        if (!valueContainer || !container) return;
        if (seen.has(container)) return;
        seen.add(container);

        const span = document.createElement('div');
        span.className = 'print-value';

        const valueNodes = Array.from(valueContainer.children).filter((n) => n !== inputWrapper && n.tagName === 'DIV');

        // ── MULTI SELECT ─────────────────────
        const chips = valueNodes.filter((node) => node.querySelector('[aria-hidden="true"]'));

        if (chips.length > 0) {
            const ul = document.createElement('ul');
            ul.style.cssText = 'margin:0; padding-inline-start:16px; list-style:disc;';

            chips.forEach((chip) => {
                const labelContainer = chip.firstElementChild;
                if (!labelContainer) return;

                // icon detection
                const iconEl =
                    labelContainer.querySelector('i') ||
                    Array.from(labelContainer.querySelectorAll('span')).find((s) => s.textContent.trim().length <= 3);

                const icon = iconEl?.textContent?.trim() || '';

                // clean text
                let label = labelContainer.textContent.trim();
                if (icon) label = label.replace(icon, '').trim();

                const li = document.createElement('li');
                li.textContent = icon ? `${icon}  ${label}` : label;

                ul.appendChild(li);
            });

            span.appendChild(ul);
        }

        // ── SINGLE SELECT ────────────────────
        else if (valueNodes.length === 1) {
            const node = valueNodes[0];

            const iconEl =
                node.querySelector('i') ||
                Array.from(node.querySelectorAll('span')).find((s) => s.textContent.trim().length <= 3);

            const icon = iconEl?.textContent?.trim() || '';

            let text = node.textContent.trim();
            if (icon) text = text.replace(icon, '').trim();

            span.textContent = icon ? `${icon}  ${text}` : text;
        } else {
            span.textContent = '';
        }

        container.replaceWith(span);
    });

    // ── SWITCHES (ONLY ON) ────────────────
    wrapper.querySelectorAll('.accounts-switch').forEach((switchEl) => {
        const track = switchEl.querySelector('.accounts-switch-track');
        const label = switchEl.querySelector('.accounts-switch-label')?.textContent?.trim() || '';
        const isOn = track?.classList.contains('on');

        const row = switchEl.closest('.accounts-switches-row');

        if (isOn) {
            const el = document.createElement('span');
            el.className = 'print-switch-on';
            el.textContent = `✓ ${label}`;
            switchEl.replaceWith(el);
        } else {
            switchEl.remove();
        }

        if (row && row.querySelectorAll('.accounts-switch, .print-switch-on').length === 0) {
            row.remove();
        }
    });

    wrapper.querySelectorAll('.accounts-switches-row').forEach((row) => {
        const labels = Array.from(row.querySelectorAll('.print-switch-on'))
            .map((el) => el.textContent)
            .join('  ·  ');

        if (!labels) {
            row.remove();
            return;
        }

        const printRow = document.createElement('div');
        printRow.className = 'print-row';
        printRow.innerHTML = `
            <div class="print-label"></div>
            <div class="print-value">${labels}</div>
        `;
        row.replaceWith(printRow);
    });

    // ── CHECKBOXES ────────────────────────
    wrapper.querySelectorAll('label.form-checkbox').forEach((label) => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const text = label.textContent.trim();

        const printRow = document.createElement('div');
        printRow.className = 'print-row';
        printRow.innerHTML = `
            <div class="print-label">${text}</div>
            <div class="print-value">${checkbox?.checked ? '✓' : '✗'}</div>
        `;

        label.replaceWith(printRow);
    });

    // ── DESCRIPTOR FORM ───────────────────
    wrapper.querySelectorAll('.descriptor-field').forEach((field) => {
        const label = field.querySelector('.form-label')?.childNodes[0]?.textContent?.trim() || '';
        let value = '';

        const input = field.querySelector('input:not([type="checkbox"]), textarea');
        if (input) value = input.value;

        const checkbox = field.querySelector('input[type="checkbox"]');
        if (checkbox) value = checkbox.checked ? '✓' : '';

        const select = field.querySelector('.print-value');
        if (select) value = select.textContent;

        const printRow = document.createElement('div');
        printRow.className = 'print-row';
        printRow.innerHTML = `
            <div class="print-label">${label}</div>
            <div class="print-value">${value}</div>
        `;

        field.replaceWith(printRow);
    });

    // ── FORM FIELDS ───────────────────────
    wrapper.querySelectorAll('.form-field').forEach((field) => {
        if (field.classList.contains('print-row')) return;

        const label = field.querySelector('.form-label')?.textContent?.replace(/\*/g, '').trim() || '';
        let value = '';

        const selectGroup = field.querySelectorAll('.react-select-container, .form-select-wrap');

        if (selectGroup) {
            selectGroup.forEach((container) => {
                const span = document.createElement('div');
                span.className = 'print-value';

                if (container) {
                    console.log(container);
                    if (container.childNodes) {
                        if (container.childNodes[0].textContent != label) {
                            value = container.childNodes[0].innerHTML;
                        }
                    }
                }
            });
        }
        const radioGroup = field.querySelector('.accounts-radio-group');

        if (radioGroup) {
            const checked = radioGroup.querySelector('input[type="radio"]:checked');
            if (checked) value = checked.closest('label')?.textContent?.trim() || '';
        } else {
            const input = field.querySelector('input, textarea');
            if (input) value = input.value;
        }

        const printRow = document.createElement('div');
        printRow.className = 'print-row';
        printRow.innerHTML = `
            <div class="print-label">${label}</div>
            <div class="print-value">${value}</div>
        `;

        field.replaceWith(printRow);
    });

    // ── REMOVE ACTIONS ────────────────────
    wrapper.querySelectorAll('.page-form-actions, button, .accounts-location-btn').forEach((el) => el.remove());

    // ── STYLES ────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        @page { size: A4; margin: 20mm; }

        body > *:not(.print-clone) { display: none !important; }

        .print-clone, .print-clone * {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border-color: #ddd !important;
            font-family: Arial, sans-serif;
        }

        .print-header-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
        }

        .print-header-date {
            font-size: 12px;
            text-align: center;
            margin-bottom: 10px;
        }

        .print-row {
            font-size: 14px;
            display: grid;
            grid-template-columns: 50% 50%;
            border-bottom: 1px solid #ddd;
            padding: 2px 0;
        }

        .print-label { font-weight: bold; text-align: left}
        .print-value { text-align: right;;padding-left:6px }

        .print-switch-on { font-weight: 500; }

        .print-value ul {
            margin: 0;
            padding-inline-start: 16px;
        }

        [dir="rtl"] .print-row { direction: rtl; }
        [dir="rtl"] .print-label { text-align: right; }
        [dir="rtl"] .print-value { text-align: right;;padding-right:6px }
    `;

    document.head.appendChild(style);
    document.body.appendChild(wrapper);

    window.print();

    if (wasDark) appShell.classList.remove('light-theme');
    wrapper.remove();
    style.remove();
}
