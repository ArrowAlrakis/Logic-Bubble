// ═══════════════════════════════════════════════════
//  prefs.js — User preferences (v4.1.3)
//  Manages preference panels:
//    • Focus Ring Colors (#focus-ring-modal) — two independent colors
//    • Keyboard Shortcuts (#kb-modal)        — editable via localStorage
//    • Font Settings     (#prefs-panel)      — font only, real-time preview
//  Loads/saves per-user preferences via GET/POST /api/preferences.
// ═══════════════════════════════════════════════════

import { showToast } from './utils.js';
import { State } from './state.js';

const DEFAULTS = {
    focusRingColor:        '#7c6af7',
    connectFocusRingColor: '#c2e2ff',
    textFontSize:          13,
    bubbleFontSize:        12,
    fontFamily:            "'JetBrains Mono', monospace",
    lineStyle:             'curve',
    hintsVisible:          true,
};

let _prefs = { ...DEFAULTS };

export function getPrefs() { return { ..._prefs }; }

// ── Shortcut config (localStorage) ───────────────
const SHORTCUT_DEFAULTS = {
    toggleConnect: 's',
    bubbleColor:   'c',
    dotNode:       '.',
    resetView:     'h',
    toggleHints:   'i',
    help:          '?',
    editBubble:    'F2',
};

const SHORTCUT_LABELS = {
    toggleConnect: 'Toggle Connect / Select',
    bubbleColor:   'Open Bubble Color Picker',
    dotNode:       'Insert Dot Node',
    resetView:     'Reset View',
    toggleHints:   'Toggle Hints Visibility',
    help:          'Open Help',
    editBubble:    'Edit Selected Bubble',
};

const LS_SHORTCUTS_KEY = 'lb_shortcuts';

export function getShortcutKeys() {
    try {
        const stored = JSON.parse(localStorage.getItem(LS_SHORTCUTS_KEY) || '{}');
        return { ...SHORTCUT_DEFAULTS, ...stored };
    } catch { return { ...SHORTCUT_DEFAULTS }; }
}

function _saveShortcutKey(action, key) {
    try {
        const stored = JSON.parse(localStorage.getItem(LS_SHORTCUTS_KEY) || '{}');
        stored[action] = key;
        localStorage.setItem(LS_SHORTCUTS_KEY, JSON.stringify(stored));
    } catch { /* ignore */ }
}

function _resetShortcuts() {
    localStorage.removeItem(LS_SHORTCUTS_KEY);
}

// ── Load from server ─────────────────────────────
export async function loadPrefs() {
    try {
        const resp = await fetch('/api/preferences');
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.preferences) {
            const p = { ...data.preferences };
            // backward compat: accentColor → focusRingColor
            if (!p.focusRingColor && p.accentColor) p.focusRingColor = p.accentColor;
            _prefs = { ...DEFAULTS, ...p };
            _applyPrefs();
        }
    } catch { /* offline / not logged in — use defaults */ }
}

// ── Save to server ───────────────────────────────
async function _saveToServer() {
    try {
        await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(_prefs)
        });
    } catch { /* ignore network errors */ }
}

// ── Apply to DOM ─────────────────────────────────
function _applyPrefs() {
    const root = document.documentElement;

    // Selection focus ring — independent from global --accent
    const fr = _prefs.focusRingColor || DEFAULTS.focusRingColor;
    root.style.setProperty('--focus-ring',      fr);
    root.style.setProperty('--focus-ring-glow', fr + '40');

    // Connect mode focus ring
    const cfr = _prefs.connectFocusRingColor || DEFAULTS.connectFocusRingColor;
    root.style.setProperty('--connect-focus-ring',      cfr);
    root.style.setProperty('--connect-focus-ring-glow', cfr + '40');

    // Bubble / text font size
    root.style.setProperty('--bubble-font-size', (_prefs.bubbleFontSize || DEFAULTS.bubbleFontSize) + 'px');

    // Font family
    const ff = _prefs.fontFamily || DEFAULTS.fontFamily;
    root.style.setProperty('--editor-font', ff);

    const td = document.getElementById('text-display');
    if (td) td.style.fontSize = (_prefs.textFontSize || DEFAULTS.textFontSize) + 'px';

    // Line style sync (only set State, do NOT dispatch event here)
    if (_prefs.lineStyle) State.lineStyle = _prefs.lineStyle;

    // Sync gear inline toggles
    const gearLineToggle  = document.getElementById('gear-line-style-toggle');
    const gearHintsToggle = document.getElementById('gear-hints-toggle');
    if (gearLineToggle)  gearLineToggle.checked  = ((_prefs.lineStyle  || DEFAULTS.lineStyle) === 'straight');
    if (gearHintsToggle) gearHintsToggle.checked = (_prefs.hintsVisible !== false);

    // Hints visibility
    const hint = document.getElementById('shortcuts-hint');
    if (hint) {
        hint.style.display = (_prefs.hintsVisible === false) ? 'none' : 'flex';
    }
}

// ── Hints visibility (called from ui.js I-key handler) ──
export function setHintsVisible(visible) {
    _prefs.hintsVisible = visible;
    const hint = document.getElementById('shortcuts-hint');
    if (hint) hint.style.display = visible ? 'flex' : 'none';
    const gearHintsToggle = document.getElementById('gear-hints-toggle');
    if (gearHintsToggle) gearHintsToggle.checked = visible;
    _saveToServer();
}

// ── Open helpers (called from ui.js gear dropdown) ──
// openFocusRingModal defined below, after snapshot variables.

// Snapshot for Cancel support
let _fontSettingsSnapshot = null;
let _focusRingSnapshot    = null;

// Current stepper values tracked while panel is open
let _bubbleFontValue = DEFAULTS.bubbleFontSize;
let _textFontValue   = DEFAULTS.textFontSize;

export function openFontSettingsModal() {
    const textSzInput = document.getElementById('pref-text-font-size');
    const bblDisplay  = document.getElementById('pref-bubble-font-display');
    const fontSel     = document.getElementById('pref-font-family');

    _bubbleFontValue = _prefs.bubbleFontSize || DEFAULTS.bubbleFontSize;
    _textFontValue   = _prefs.textFontSize   || DEFAULTS.textFontSize;

    if (textSzInput) textSzInput.value = String(_textFontValue);
    if (bblDisplay)  bblDisplay.value  = String(_bubbleFontValue);
    if (fontSel) {
        fontSel.value = _prefs.fontFamily || DEFAULTS.fontFamily;
        // Set font preview on each option
        Array.from(fontSel.options).forEach(opt => {
            opt.style.fontFamily = opt.value;
        });
    }

    // Take snapshot for Cancel
    _fontSettingsSnapshot = {
        textFontSize:   _prefs.textFontSize,
        bubbleFontSize: _prefs.bubbleFontSize,
        fontFamily:     _prefs.fontFamily,
    };

    const panel = document.getElementById('prefs-panel');
    if (panel) panel.style.display = 'flex';
}

export function openFocusRingModal() {
    const selInput  = document.getElementById('pref-select-focus-ring-color');
    const connInput = document.getElementById('pref-connect-focus-ring-color');
    if (selInput)  selInput.value  = _prefs.focusRingColor        || DEFAULTS.focusRingColor;
    if (connInput) connInput.value = _prefs.connectFocusRingColor || DEFAULTS.connectFocusRingColor;

    // Take snapshot for Cancel
    _focusRingSnapshot = {
        focusRingColor:        _prefs.focusRingColor,
        connectFocusRingColor: _prefs.connectFocusRingColor,
    };

    const modal = document.getElementById('focus-ring-modal');
    if (modal) modal.style.display = 'flex';
}

// ── Init all preference modals ───────────────────
export function initPrefs() {
    loadPrefs();

    // ── Focus Ring Color modal ────────────────────
    const frModal    = document.getElementById('focus-ring-modal');
    const frClose    = document.getElementById('focus-ring-modal-close');
    const frSave     = document.getElementById('focus-ring-save-btn');
    const frReset    = document.getElementById('focus-ring-reset-btn');
    const selInput   = document.getElementById('pref-select-focus-ring-color');
    const connInput  = document.getElementById('pref-connect-focus-ring-color');

    if (frModal) {
        const _cancelFocusRingModal = () => {
            if (_focusRingSnapshot) {
                _prefs.focusRingColor        = _focusRingSnapshot.focusRingColor;
                _prefs.connectFocusRingColor = _focusRingSnapshot.connectFocusRingColor;
                _applyPrefs();
            }
            frModal.style.display = 'none';
        };

        frClose?.addEventListener('click', _cancelFocusRingModal);
        frModal.addEventListener('click', e => { if (e.target === frModal) _cancelFocusRingModal(); });

        document.getElementById('focus-ring-cancel-btn')?.addEventListener('click', _cancelFocusRingModal);

        // Real-time preview for both pickers
        selInput?.addEventListener('input', () => {
            document.documentElement.style.setProperty('--focus-ring', selInput.value);
            document.documentElement.style.setProperty('--focus-ring-glow', selInput.value + '40');
        });
        connInput?.addEventListener('input', () => {
            document.documentElement.style.setProperty('--connect-focus-ring', connInput.value);
            document.documentElement.style.setProperty('--connect-focus-ring-glow', connInput.value + '40');
        });

        frSave?.addEventListener('click', () => {
            if (selInput)  _prefs.focusRingColor        = selInput.value;
            if (connInput) _prefs.connectFocusRingColor = connInput.value;
            _applyPrefs();
            _saveToServer();
            frModal.style.display = 'none';
            showToast('Focus ring colors saved');
        });

        frReset?.addEventListener('click', () => {
            _prefs.focusRingColor        = DEFAULTS.focusRingColor;
            _prefs.connectFocusRingColor = DEFAULTS.connectFocusRingColor;
            _applyPrefs();
            _saveToServer();
            if (selInput)  selInput.value  = DEFAULTS.focusRingColor;
            if (connInput) connInput.value = DEFAULTS.connectFocusRingColor;
            showToast('Focus ring colors reset');
        });
    }

    // ── Keyboard Shortcuts modal (editable) ───────
    _initKbModal();

    // ── Font Settings panel (#prefs-panel) ───────
    const panel        = document.getElementById('prefs-panel');
    const closeBtn     = document.getElementById('prefs-panel-close');
    const saveBtn      = document.getElementById('prefs-save-btn');
    const cancelBtn    = document.getElementById('prefs-cancel-btn');
    const resetBtn     = document.getElementById('prefs-reset-btn');
    const fontSelInput = document.getElementById('pref-font-family');

    const _cancelFontPanel = () => {
        if (_fontSettingsSnapshot) {
            _prefs.textFontSize   = _fontSettingsSnapshot.textFontSize;
            _prefs.bubbleFontSize = _fontSettingsSnapshot.bubbleFontSize;
            _prefs.fontFamily     = _fontSettingsSnapshot.fontFamily;
            _bubbleFontValue = _prefs.bubbleFontSize;
            _textFontValue   = _prefs.textFontSize;
            _applyPrefs();
            document.dispatchEvent(new CustomEvent('lb:bubbleFontSizeChange', { detail: { size: _prefs.bubbleFontSize } }));
        }
        panel.style.display = 'none';
    };

    if (panel) {
        closeBtn?.addEventListener('click', _cancelFontPanel);
        panel.addEventListener('click', e => { if (e.target === panel) _cancelFontPanel(); });

        fontSelInput?.addEventListener('change', () => {
            const ff = fontSelInput.value || DEFAULTS.fontFamily;
            document.documentElement.style.setProperty('--editor-font', ff);
        });

        saveBtn?.addEventListener('click', () => {
            _prefs.textFontSize   = _textFontValue;
            _prefs.bubbleFontSize = _bubbleFontValue;
            if (fontSelInput) _prefs.fontFamily = fontSelInput.value || DEFAULTS.fontFamily;
            _applyPrefs();
            document.dispatchEvent(new CustomEvent('lb:bubbleFontSizeChange', { detail: { size: _prefs.bubbleFontSize } }));
            _saveToServer();
            panel.style.display = 'none';
            showToast('Font settings saved');
        });

        cancelBtn?.addEventListener('click', _cancelFontPanel);

        resetBtn?.addEventListener('click', () => {
            _prefs.textFontSize   = DEFAULTS.textFontSize;
            _prefs.bubbleFontSize = DEFAULTS.bubbleFontSize;
            _prefs.fontFamily     = DEFAULTS.fontFamily;
            _bubbleFontValue = DEFAULTS.bubbleFontSize;
            _textFontValue   = DEFAULTS.textFontSize;
            _applyPrefs();
            document.dispatchEvent(new CustomEvent('lb:bubbleFontSizeChange', { detail: { size: _prefs.bubbleFontSize } }));
            _saveToServer();
            openFontSettingsModal();
            showToast('Font settings reset');
        });

        _initBubbleFontStepper();
        _initTextFontStepper();
    }

    // ── Gear dropdown inline toggles ─────────────
    const gearLineToggle  = document.getElementById('gear-line-style-toggle');
    const gearHintsToggle = document.getElementById('gear-hints-toggle');

    gearLineToggle?.addEventListener('change', () => {
        _prefs.lineStyle = gearLineToggle.checked ? 'straight' : 'curve';
        document.dispatchEvent(new CustomEvent('lb:applyLineStyle', { detail: { style: _prefs.lineStyle } }));
        _saveToServer();
    });

    gearHintsToggle?.addEventListener('change', () => {
        _prefs.hintsVisible = gearHintsToggle.checked;
        const hint = document.getElementById('shortcuts-hint');
        if (hint) hint.style.display = _prefs.hintsVisible ? 'flex' : 'none';
        _saveToServer();
    });
}

// ── Bubble font stepper (+/− long-press buttons) ─
function _initBubbleFontStepper() {
    const decBtn  = document.getElementById('pref-bubble-font-dec');
    const incBtn  = document.getElementById('pref-bubble-font-inc');
    const display = document.getElementById('pref-bubble-font-display');
    if (!decBtn || !incBtn || !display) return;

    const MIN = 8, MAX = 20;
    let _pressTimer = null;
    let _pressing   = false;

    const _applyStep = (delta) => {
        const next = Math.max(MIN, Math.min(MAX, _bubbleFontValue + delta));
        if (next === _bubbleFontValue) return false;
        _bubbleFontValue = next;
        display.value = String(next);
        document.documentElement.style.setProperty('--bubble-font-size', next + 'px');
        document.dispatchEvent(new CustomEvent('lb:bubbleFontSizeChange', { detail: { size: next, animate: false } }));
        return true;
    };

    const _springAll = () => {
        document.dispatchEvent(new CustomEvent('lb:bubbleFontSizeChange', { detail: { size: _bubbleFontValue, animate: true } }));
    };

    const _stopPress = () => {
        if (!_pressing) return;
        _pressing = false;
        if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
        document.removeEventListener('mouseup', _stopPress);
        _springAll();
    };

    [decBtn, incBtn].forEach(btn => {
        const delta = btn === incBtn ? 1 : -1;
        btn.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            _pressing = true;
            _applyStep(delta);

            let delay = 380;
            const repeat = () => {
                if (!_pressing) return;
                _applyStep(delta);
                delay = Math.max(50, delay * 0.82);
                _pressTimer = setTimeout(repeat, delay);
            };
            _pressTimer = setTimeout(repeat, delay);

            document.addEventListener('mouseup', _stopPress, { once: true });
        });
    });

    // Manual input entry
    display.addEventListener('change', () => {
        const v = Math.max(MIN, Math.min(MAX, parseInt(display.value) || DEFAULTS.bubbleFontSize));
        _bubbleFontValue = v;
        display.value = String(v);
        document.documentElement.style.setProperty('--bubble-font-size', v + 'px');
        document.dispatchEvent(new CustomEvent('lb:bubbleFontSizeChange', { detail: { size: v, animate: true } }));
    });
}

// ── Text font stepper (+/− long-press buttons) ───
function _initTextFontStepper() {
    const decBtn  = document.getElementById('pref-text-font-dec');
    const incBtn  = document.getElementById('pref-text-font-inc');
    const display = document.getElementById('pref-text-font-size');
    if (!decBtn || !incBtn || !display) return;

    const MIN = 10, MAX = 24;
    let _pressTimer = null;
    let _pressing   = false;

    const _applyStep = (delta) => {
        const next = Math.max(MIN, Math.min(MAX, _textFontValue + delta));
        if (next === _textFontValue) return false;
        _textFontValue = next;
        display.value = String(next);
        const td = document.getElementById('text-display');
        if (td) td.style.fontSize = next + 'px';
        return true;
    };

    const _stopPress = () => {
        if (!_pressing) return;
        _pressing = false;
        if (_pressTimer) { clearTimeout(_pressTimer); _pressTimer = null; }
        document.removeEventListener('mouseup', _stopPress);
    };

    [decBtn, incBtn].forEach(btn => {
        const delta = btn === incBtn ? 1 : -1;
        btn.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            _pressing = true;
            _applyStep(delta);

            let delay = 380;
            const repeat = () => {
                if (!_pressing) return;
                _applyStep(delta);
                delay = Math.max(50, delay * 0.82);
                _pressTimer = setTimeout(repeat, delay);
            };
            _pressTimer = setTimeout(repeat, delay);

            document.addEventListener('mouseup', _stopPress, { once: true });
        });
    });

    // Manual input entry
    display.addEventListener('change', () => {
        const v = Math.max(MIN, Math.min(MAX, parseInt(display.value) || DEFAULTS.textFontSize));
        _textFontValue = v;
        display.value = String(v);
        const td = document.getElementById('text-display');
        if (td) td.style.fontSize = v + 'px';
    });
}

// ── Keyboard shortcuts modal logic ────────────────
function _initKbModal() {
    const kbModal = document.getElementById('kb-modal');
    const kbClose = document.getElementById('kb-modal-close');
    const kbReset = document.getElementById('kb-modal-reset');
    const kbBody  = document.getElementById('kb-modal-body');

    if (!kbModal) return;

    kbClose?.addEventListener('click', () => { kbModal.style.display = 'none'; });
    kbModal.addEventListener('click', e => { if (e.target === kbModal) kbModal.style.display = 'none'; });

    kbReset?.addEventListener('click', () => {
        _resetShortcuts();
        _renderKbRows(kbBody);
        showToast('Shortcuts reset to defaults');
    });

    _renderKbRows(kbBody);
}

const _FIXED_SHORTCUTS = [
    { label: 'Toggle ALL line style', key: 'Shift+S' },
    { label: 'Delete Selected',       key: 'Del / Backspace' },
    { label: 'Extract / Edit',        key: 'Enter' },
    { label: 'Save Project',          key: 'Ctrl+S' },
    { label: 'Undo',                  key: 'Ctrl+Z' },
    { label: 'Zoom Canvas',           key: 'Wheel' },
    { label: 'Pan Canvas',            key: 'Space+Drag' },
    { label: 'Pan Canvas',            key: 'MMB+Drag' },
    { label: 'Cancel / Close',        key: 'Esc' },
];

function _renderKbRows(kbBody) {
    if (!kbBody) return;
    const current = getShortcutKeys();

    const existing = kbBody.querySelector('#kb-unified-table');
    if (existing) existing.remove();

    const table = document.createElement('table');
    table.id = 'kb-unified-table';

    // Configurable rows — click to remap
    Object.entries(SHORTCUT_LABELS).forEach(([action, labelText]) => {
        const tr = document.createElement('tr');
        tr.className = 'kb-row-configurable';
        tr.dataset.action = action;

        const tdLabel = document.createElement('td');
        tdLabel.textContent = labelText;

        const tdKey = document.createElement('td');
        const kbd = document.createElement('kbd');
        kbd.textContent = _formatKey(current[action] || SHORTCUT_DEFAULTS[action]);
        tdKey.appendChild(kbd);

        tr.appendChild(tdLabel);
        tr.appendChild(tdKey);
        table.appendChild(tr);

        tr.addEventListener('click', () => _startCapture(tr, tdKey, action, current[action] || SHORTCUT_DEFAULTS[action]));
    });

    // Fixed rows — read-only
    _FIXED_SHORTCUTS.forEach(({ label: labelText, key }) => {
        const tr = document.createElement('tr');
        tr.className = 'kb-row-fixed';

        const tdLabel = document.createElement('td');
        tdLabel.textContent = labelText;

        const tdKey = document.createElement('td');
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        tdKey.appendChild(kbd);

        tr.appendChild(tdLabel);
        tr.appendChild(tdKey);
        table.appendChild(tr);
    });

    kbBody.appendChild(table);
}

// Fix: only single uppercase letters indicate Shift; multi-char keys like 'F2' show as-is
function _formatKey(key) {
    if (!key) return '';
    if (key === '?' || key === '.') return key;
    // Multi-char keys (F1, F2, Enter, etc.) — show as-is
    if (key.length > 1) return key;
    // Single char: uppercase letter means Shift
    if (key >= 'A' && key <= 'Z') return 'Shift+' + key;
    return key.toUpperCase();
}

let _capturingRow    = null;
let _capturingTdKey  = null;
let _capturingOrig   = '';
let _capturingCleanup = null;

function _cancelCapture() {
    if (!_capturingRow) return;
    _capturingRow.classList.remove('kb-capturing');
    // Restore original key display
    if (_capturingTdKey) {
        _capturingTdKey.innerHTML = '';
        const kbd = document.createElement('kbd');
        kbd.textContent = _formatKey(_capturingOrig);
        _capturingTdKey.appendChild(kbd);
    }
    if (_capturingCleanup) { _capturingCleanup(); _capturingCleanup = null; }
    _capturingRow   = null;
    _capturingTdKey = null;
    _capturingOrig  = '';
}

function _startCapture(tr, tdKey, action, origKey) {
    if (_capturingRow) _cancelCapture();
    _capturingRow    = tr;
    _capturingTdKey  = tdKey;
    _capturingOrig   = origKey || '';
    tr.classList.add('kb-capturing');
    tdKey.innerHTML = '<kbd class="kb-capturing-hint">Press a key…</kbd>';

    const onKeydown = e => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { _cancelCapture(); return; }
        // Skip modifier-only keys
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

        let key;
        if (e.key.length === 1) {
            // Single character key: uppercase if Shift held, else lowercase
            key = e.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase();
        } else {
            // Multi-char key like F2, Enter, ArrowUp — store as-is
            key = e.key;
        }

        _saveShortcutKey(action, key);
        const kbd = document.createElement('kbd');
        kbd.textContent = _formatKey(key);
        tdKey.innerHTML = '';
        tdKey.appendChild(kbd);
        tr.classList.remove('kb-capturing');
        _capturingRow   = null;
        _capturingTdKey = null;
        _capturingOrig  = '';
        if (_capturingCleanup) { _capturingCleanup(); _capturingCleanup = null; }
        document.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('mousedown', onOutsideClick, true);
        showToast(`Shortcut updated: ${_formatKey(key)}`);
    };

    const onOutsideClick = e => {
        if (!tr.contains(e.target)) {
            _cancelCapture();
        }
    };

    const cleanup = () => {
        document.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('mousedown', onOutsideClick, true);
    };
    _capturingCleanup = cleanup;

    document.addEventListener('keydown', onKeydown, true);
    // Small delay to avoid the click that triggered _startCapture from firing onOutsideClick
    setTimeout(() => {
        document.addEventListener('mousedown', onOutsideClick, true);
    }, 100);
}
