// ═══════════════════════════════════════════════════
//  ui.js — Topbar, panels, keyboard, context menu  (v04)
//  v04: S=toggle connect/select mode, C=fill color panel,
//       Shift+S=toggle line style, File/Edit dropdowns,
//       help modal, prefs panel, import JSON.
// ═══════════════════════════════════════════════════

import { State, saveState, undo, serializeProjectData, getSourceText, resetWorkspaceState } from './state.js';
import { wsEl, showToast } from './utils.js';
import { openFocusRingModal, openFontSettingsModal, getShortcutKeys, setHintsVisible } from './prefs.js';
import {
    spawnBubble, deleteBubble, editBubble,
    selectNode, clearSelection, clearConnectSrc,
    refreshBubbleEl, applyBubbleColor
} from './bubble.js';
import { insertDotOnLine, spawnDotBelowBubble, spawnFreeDot, deleteDot } from './dot.js';
import { deleteLine, getCenter, updateLines, toggleLineStraight, toggleAllLines, applyAllLinesStyle } from './lines.js';
import { computeRadius, createBubbleFromSnap } from './bubble.js';
import { createDotFromSnap } from './dot.js';
import { createLineFromSnap } from './lines.js';
import { resetView } from './zoom.js';

// ── Save Project ──────────────────────────────────
export async function saveCurrentProject() {
    const titleInput = document.getElementById('project-title');
    const title = titleInput ? titleInput.value.trim() : '';

    if (!title) { showToast('Please enter a project title'); return; }

    const payload = {
        project_id: State.projectId || null,
        title,
        source_text: getSourceText(),
        graph_data:  serializeProjectData()
    };

    try {
        const response = await fetch('/save-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            State.projectId = result.project_id;
            showToast('Project saved');
        } else {
            showToast(result.message || 'Save failed');
        }
    } catch (err) {
        console.error('Save error:', err);
        showToast('An error occurred while saving');
    }
}

// ── Export ────────────────────────────────────────
export function exportPNG() {
    const ws = document.getElementById('workspace');
    if (!ws) return;
    const title = document.getElementById('project-title')?.value.trim() || 'logic-bubble';
    if (typeof html2canvas === 'undefined') { showToast('html2canvas not loaded'); return; }
    showToast('Exporting PNG…');
    html2canvas(ws, { backgroundColor: '#0e0f14', scale: 2 }).then(canvas => {
        const a = document.createElement('a');
        a.download = title + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    }).catch(() => showToast('PNG export failed'));
}

export function exportJSON() {
    const title = document.getElementById('project-title')?.value.trim() || 'logic-bubble';
    const data = { title, source_text: getSourceText(), graph_data: serializeProjectData() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = title + '.json';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('JSON exported');
}

export function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                _loadImportedProject(data);
            } catch {
                showToast('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    });
    input.click();
}

function _loadImportedProject(data) {
    resetWorkspaceState();
    const titleInput = document.getElementById('project-title');
    if (titleInput) titleInput.value = data.title || '';
    const textDisplay = document.getElementById('text-display');
    if (textDisplay) textDisplay.textContent = data.source_text || '';
    State.projectId = null; // imported file = new project

    const graph = data.graph_data || {};
    (graph.bubbles  || []).forEach(b => createBubbleFromSnap({
        id: b.id, x: b.x, y: b.y, text: b.text,
        r: computeRadius(b.text), color: b.color || null,
        opacity: b.opacity !== undefined ? b.opacity : 25
    }));
    (graph.dotNodes || []).forEach(d => createDotFromSnap({ id: d.id, x: d.x, y: d.y }));
    (graph.lines    || []).forEach(l => createLineFromSnap({
        id: l.id, fromId: l.fromId, fromType: l.fromType,
        toId: l.toId, toType: l.toType, straight: l.straight || false
    }));
    State.bubbleCtr = Math.max(0, ...(graph.bubbles  || []).map(b => b.id));
    State.dotCtr    = Math.max(0, ...(graph.dotNodes || []).map(d => d.id));
    State.lineCtr   = Math.max(0, ...(graph.lines    || []).map(l => l.id));
    updateLines();
    saveState('import');
    showToast(`Imported: ${data.title || 'untitled'}`);
}

// ── Text panel ─────────────────────────────────────
export function initTextPanel() {
    const submitBtn   = document.getElementById('submit-btn');
    const textInput   = document.getElementById('text-input');
    const textDisplay = document.getElementById('text-display');
    const selTooltip  = document.getElementById('sel-tooltip');

    if (!submitBtn || !textInput || !textDisplay || !selTooltip) return;

    submitBtn.addEventListener('click', submitText);
    textInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); }
    });

    function submitText() {
        const txt = textInput.value.trim();
        if (!txt) return;
        const appendCheckbox = document.getElementById('append-mode');
        const append = appendCheckbox ? appendCheckbox.checked : false;
        if (append && textDisplay.textContent.trim()) {
            textDisplay.textContent += '\n\n' + txt;
        } else {
            textDisplay.textContent = txt;
        }
        textInput.value = '';
        showToast('Text loaded — select words to extract bubbles');
    }

    document.addEventListener('mouseup', e => {
        if (e.target.closest('#text-display')) setTimeout(() => maybeShowTooltip(), 15);
    });

    function maybeShowTooltip() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) { hideTooltip(); return; }
        const txt = sel.toString().trim();
        if (!txt) { hideTooltip(); return; }
        const range = sel.getRangeAt(0);
        const inDisplay = range.commonAncestorContainer.closest
            ? range.commonAncestorContainer.closest('#text-display')
            : range.commonAncestorContainer.parentElement?.closest?.('#text-display');
        if (!inDisplay) { hideTooltip(); return; }
        const rect = range.getBoundingClientRect();
        selTooltip.style.left = `${rect.left + rect.width / 2 - 44}px`;
        selTooltip.style.top  = `${rect.top - 42}px`;
        selTooltip.classList.add('visible');
    }

    function hideTooltip() { selTooltip.classList.remove('visible'); }

    selTooltip.addEventListener('click', extractSelected);
    window._extractSelected = extractSelected;

    function extractSelected() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const txt = sel.toString().trim();
        if (!txt) return;
        hideTooltip();
        const ws = wsEl();
        if (!ws) return;
        spawnBubble(
            txt,
            90 + Math.random() * Math.max(120, ws.clientWidth  - 200),
            90 + Math.random() * Math.max(120, ws.clientHeight - 200)
        );
        sel.removeAllRanges();
        showToast(`Bubble: "${txt.slice(0, 32)}${txt.length > 32 ? '…' : ''}"`);
    }

    // Enter key in text-display to extract
    textDisplay.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) { e.preventDefault(); extractSelected(); }
        }
    });
}

// ── Mode indicator ────────────────────────────────
function _updateModeIndicator() {
    const el = document.getElementById('mode-indicator');
    if (!el) return;
    if (State.connectMode) {
        el.textContent = 'CONNECT';
        el.classList.add('connect-active');
    } else {
        el.textContent = 'SELECT';
        el.classList.remove('connect-active');
    }
}

// ── Shortcut key matcher ──────────────────────────
// Matches a KeyboardEvent against a stored shortcut key string.
// Stored format: lowercase letter = plain key, uppercase letter = Shift+letter,
// multi-char (F2, Enter, ?, . …) = matched as e.key directly.
function _matchShortcut(e, stored) {
    if (!stored) return false;
    if (e.ctrlKey || e.metaKey) return false;
    if (stored.length === 1) {
        if (stored >= 'A' && stored <= 'Z') {
            // Uppercase letter → requires Shift
            return e.shiftKey && e.key === stored;
        }
        if (stored >= 'a' && stored <= 'z') {
            // Lowercase letter → no Shift
            return !e.shiftKey && e.key === stored;
        }
        // Other single-char (?, ., symbols) — match e.key directly
        return e.key === stored;
    }
    // Multi-char key (F2, Enter, ArrowUp, etc.) — match as-is
    return e.key === stored;
}

// ── Keyboard shortcuts ────────────────────────────
export function initKeyboard() {
    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        const inInput = tag === 'INPUT' || tag === 'TEXTAREA';

        // Ctrl/Cmd+S — save
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault(); saveCurrentProject(); return;
        }

        // Ctrl/Cmd+Z — undo
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault(); undo(); return;
        }

        if (inInput) return;

        const sk = getShortcutKeys();

        // Shift+S — toggle ALL lines straight/curve (fixed, not user-remappable)
        if (e.shiftKey && e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleAllLines();
            _syncLineStyleToggle();
            return;
        }

        // S — toggle Connect / Select mode
        if (_matchShortcut(e, sk.toggleConnect)) {
            State.connectMode = !State.connectMode;
            if (!State.connectMode) {
                clearConnectSrc();
            } else if (State.selected) {
                // Immediately show selected node as connect-source in new mode
                const { id, type } = State.selected;
                State.connectSrc = { id, type };
                if (type === 'bubble') {
                    State.bubbles.find(b => b.id === id)?.el.classList.add('connect-source');
                } else if (type === 'dot') {
                    State.dotNodes.find(d => d.id === id)?.el.classList.add('connect-source');
                }
            }
            _updateModeIndicator();
            showToast(State.connectMode ? 'Mode: Connect' : 'Mode: Select');
            return;
        }

        // C — open Fill Color panel for selected bubble
        if (_matchShortcut(e, sk.bubbleColor)) {
            const sel = State.selected;
            if (sel?.type === 'bubble') {
                _openColorPanel(sel.id);
            }
            return;
        }

        // H — reset view
        if (_matchShortcut(e, sk.resetView)) {
            e.preventDefault();
            resetView();
            showToast('View reset');
            return;
        }

        // I — toggle shortcuts hint visibility
        if (_matchShortcut(e, sk.toggleHints)) {
            e.preventDefault();
            _toggleHintsVisibility();
            return;
        }

        // ? — help modal
        if (_matchShortcut(e, sk.help) || e.key === '/') {
            const modal = document.getElementById('help-modal');
            if (modal) modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
            return;
        }

        // Enter — extract selected text or edit selected bubble
        if (e.key === 'Enter') {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const inDisplay = range.commonAncestorContainer.closest
                    ? range.commonAncestorContainer.closest('#text-display')
                    : range.commonAncestorContainer.parentElement?.closest?.('#text-display');
                if (inDisplay) { e.preventDefault(); window._extractSelected?.(); return; }
            }
            if (State.selected?.type === 'bubble') {
                const b = State.bubbles.find(b => b.id === State.selected.id);
                if (b) { e.preventDefault(); editBubble(b); return; }
            }
        }

        // F2 (or custom editBubble shortcut) — edit selected bubble
        if (_matchShortcut(e, sk.editBubble)) {
            if (State.selected?.type === 'bubble') {
                const b = State.bubbles.find(b => b.id === State.selected.id);
                if (b) { e.preventDefault(); editBubble(b); return; }
            }
        }

        // Delete / Backspace — delete selected node
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const sel = State.selected;
            if (!sel) return;
            if (sel.type === 'bubble') deleteBubble(sel.id);
            else if (sel.type === 'dot') deleteDot(sel.id);
            else if (sel.type === 'line') deleteLine(sel.id);
            return;
        }

        // Period — insert dot node
        if (_matchShortcut(e, sk.dotNode) || e.key === '。') {
            const sel = State.selected;
            if (sel?.type === 'line') {
                const l = State.lines.find(line => line.id === sel.id);
                if (l) {
                    const from = getCenter(l.fromId, l.fromType);
                    const to   = getCenter(l.toId,   l.toType);
                    if (from && to) insertDotOnLine(l.id, (from.x + to.x) / 2, (from.y + to.y) / 2);
                }
            } else if (sel?.type === 'bubble') {
                spawnDotBelowBubble(sel.id);
            } else {
                const d = spawnFreeDot();
                selectNode({ id: d.id, type: 'dot' });
            }
            return;
        }

        // Escape — cancel / close
        if (e.key === 'Escape') {
            if (State.connectSrc) clearConnectSrc();
            clearSelection();
            hideCtxMenu();
            document.getElementById('color-panel')?.style.setProperty('display', 'none');
            document.getElementById('help-modal')?.style.setProperty('display', 'none');
            document.getElementById('prefs-panel')?.style.setProperty('display', 'none');
            document.getElementById('focus-ring-modal')?.style.setProperty('display', 'none');
            document.getElementById('kb-modal')?.style.setProperty('display', 'none');
        }
    });
}

// ── Topbar buttons + dropdowns ────────────────────
export function initTopbar() {
    // Save
    document.getElementById('save-project-btn')?.addEventListener('click', saveCurrentProject);

    // Logo nav dropdown — hover trigger
    _initHoverDropdown('logo-btn', 'logo-dropdown');

    // File dropdown
    _initDropdown('file-btn', 'file-dropdown', {
        'export-png-btn':  exportPNG,
        'export-json-btn': exportJSON,
        'import-json-btn': importJSON,
    });

    // Edit dropdown
    _initDropdown('edit-btn', 'edit-dropdown', {
        'undo-btn':   undo,
        'add-dot-btn': () => {
            const sel = State.selected;
            if (sel?.type === 'line') {
                const l = State.lines.find(line => line.id === sel.id);
                if (l) {
                    const from = getCenter(l.fromId, l.fromType);
                    const to   = getCenter(l.toId,   l.toType);
                    if (from && to) insertDotOnLine(l.id, (from.x + to.x) / 2, (from.y + to.y) / 2);
                }
            } else if (sel?.type === 'bubble') {
                spawnDotBelowBubble(sel.id);
            } else {
                const d = spawnFreeDot();
                selectNode({ id: d.id, type: 'dot' });
            }
        },
        'clear-btn': () => {
            if (!confirm('Clear all bubbles, dot nodes and connections?')) return;
            saveState('before clear all');
            State.bubbles.forEach(b => b.el?.remove());
            State.dotNodes.forEach(d => d.el?.remove());
            State.lines.forEach(l => {
                l.el?.remove(); l.hitEl?.remove();
                l.handleEl?.remove(); l.handleFromEl?.remove();
            });
            State.bubbles = []; State.dotNodes = []; State.lines = [];
            State.selected = null; State.connectSrc = null;
            saveState('clear all');
            showToast('Workspace cleared');
        },
    });

    // Help button
    document.getElementById('help-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('help-modal');
        if (modal) modal.style.display = 'flex';
    });

    // Gear / Preferences dropdown
    _initDropdown('gear-btn', 'gear-dropdown', {
        'focus-ring-btn':            openFocusRingModal,
        'kb-shortcuts-settings-btn': () => {
            const m = document.getElementById('kb-modal');
            if (m) m.style.display = 'flex';
        },
        'font-settings-btn':         openFontSettingsModal,
    });

    // Gear inline toggle rows: stop propagation at row level so dropdown stays open
    document.querySelectorAll('#gear-dropdown .tb-toggle-row').forEach(row => {
        row.addEventListener('click', e => e.stopPropagation());
    });

    // lb:applyLineStyle — apply line style from prefs gear toggle
    document.addEventListener('lb:applyLineStyle', e => {
        applyAllLinesStyle(e.detail.style);
        _syncLineStyleToggle();
    });

    // lb:bubbleFontSizeChange — update all bubble radii; animate=false during long-press drag
    document.addEventListener('lb:bubbleFontSizeChange', e => {
        _refreshAllBubblesForFontSize(e.detail.size, e.detail.animate !== false);
    });

    // Mode indicator starts as SELECT
    _updateModeIndicator();
}

function _initHoverDropdown(btnId, dropdownId) {
    const wrap = document.getElementById(btnId)?.closest('.tb-dropdown-wrap');
    const drop = document.getElementById(dropdownId);
    if (!wrap || !drop) return;
    let _hideTimer = null;
    const show = () => {
        if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
        _closeAllDropdowns();
        drop.classList.add('open');
    };
    const hide = () => {
        _hideTimer = setTimeout(() => drop.classList.remove('open'), 120);
    };
    wrap.addEventListener('mouseenter', show);
    wrap.addEventListener('mouseleave', hide);
    drop.addEventListener('mouseenter', () => {
        if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
    });
    drop.addEventListener('mouseleave', hide);
}

function _initDropdown(btnId, dropdownId, handlers) {
    const btn  = document.getElementById(btnId);
    const drop = document.getElementById(dropdownId);
    if (!btn || !drop) return;

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = drop.classList.contains('open');
        _closeAllDropdowns();
        if (!isOpen) drop.classList.add('open');
    });

    for (const [id, fn] of Object.entries(handlers)) {
        document.getElementById(id)?.addEventListener('click', () => {
            _closeAllDropdowns();
            fn();
        });
    }
}

function _closeAllDropdowns() {
    document.querySelectorAll('.tb-dropdown').forEach(d => d.classList.remove('open'));
}

document.addEventListener('click', () => _closeAllDropdowns());

// ── Fill Color panel ──────────────────────────────
let _colorTarget = null;
let _colorOpacity = 25;

function _openColorPanel(bubbleId) {
    const b = State.bubbles.find(b => b.id === bubbleId);
    if (!b) return;
    _colorTarget = bubbleId;
    _colorOpacity = b.opacity !== undefined ? b.opacity : 25;

    const panel   = document.getElementById('color-panel');
    const picker  = document.getElementById('color-panel-picker');
    const opSlider = document.getElementById('color-panel-opacity');
    const opLabel  = document.getElementById('color-panel-opacity-label');
    if (!panel) return;

    if (picker) picker.value = b.color || '#7c6af7';
    if (opSlider) { opSlider.value = _colorOpacity; }
    if (opLabel)  { opLabel.textContent = _colorOpacity + '%'; }

    const bEl = b.el;
    if (bEl) {
        const rect = bEl.getBoundingClientRect();
        panel.style.left = Math.min(rect.right + 8, window.innerWidth - 220) + 'px';
        panel.style.top  = rect.top + 'px';
    }
    panel.style.display = 'flex';
}

export function initColorPanel() {
    const panel      = document.getElementById('color-panel');
    const closeBtn   = document.getElementById('color-panel-close');
    const applyBtn   = document.getElementById('color-panel-apply');
    const clearBtn   = document.getElementById('color-panel-clear');
    const picker     = document.getElementById('color-panel-picker');
    const opSlider   = document.getElementById('color-panel-opacity');
    const opLabel    = document.getElementById('color-panel-opacity-label');

    if (!panel) return;

    closeBtn?.addEventListener('click', () => { panel.style.display = 'none'; });

    opSlider?.addEventListener('input', () => {
        _colorOpacity = parseInt(opSlider.value, 10);
        if (opLabel) opLabel.textContent = _colorOpacity + '%';
    });

    // Swatches — preserve opacity, don't reset slider
    panel.querySelectorAll('.color-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            const color = sw.dataset.color || '';
            if (picker) picker.value = color || '#7c6af7';
            _applyColor(color);
            panel.style.display = 'none';
        });
    });

    applyBtn?.addEventListener('click', () => {
        _applyColor(picker?.value || '');
        panel.style.display = 'none';
    });

    clearBtn?.addEventListener('click', () => {
        _applyColor('');
        panel.style.display = 'none';
    });

    // Also open from ctx-menu "Set Color"
    document.getElementById('ctx-set-color')?.addEventListener('click', () => {
        if (_ctxType === 'bubble') {
            hideCtxMenu();
            _openColorPanel(_ctxTarget);
        }
    });
}

function _applyColor(color) {
    if (_colorTarget === null) return;
    const b = State.bubbles.find(b => b.id === _colorTarget);
    if (!b) return;
    saveState('before set color');
    b.color = color || null;
    b.opacity = _colorOpacity;
    refreshBubbleEl(b);
    saveState('set bubble color');
}

// ── Help modal ────────────────────────────────────
export function initHelpModal() {
    const modal = document.getElementById('help-modal');
    if (!modal) return;
    document.getElementById('help-modal-close')?.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// ── Context menu ──────────────────────────────────
let _ctxTarget = null;
let _ctxType   = null;

export function showCtxMenu(x, y, type, id) {
    _ctxTarget = id;
    _ctxType   = type;

    const menu = document.getElementById('ctx-menu');
    if (!menu) return;

    const editItem     = document.getElementById('ctx-edit');
    const dotOnItem    = document.getElementById('ctx-dot-on');
    const dotBelowItem = document.getElementById('ctx-dot-below');
    const colorItem    = document.getElementById('ctx-set-color');
    const lineStyleItem = document.getElementById('ctx-toggle-straight');

    if (editItem)      editItem.style.display      = type === 'bubble' ? 'flex' : 'none';
    if (dotOnItem)     dotOnItem.style.display     = type === 'line'   ? 'flex' : 'none';
    if (dotBelowItem)  dotBelowItem.style.display  = type === 'bubble' ? 'flex' : 'none';
    if (colorItem)     colorItem.style.display     = type === 'bubble' ? 'flex' : 'none';
    if (lineStyleItem) lineStyleItem.style.display = type === 'line'   ? 'flex' : 'none';

    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    menu.classList.add('visible');
}

export function hideCtxMenu() {
    document.getElementById('ctx-menu')?.classList.remove('visible');
}

export function initCtxMenu() {
    const ctxEdit       = document.getElementById('ctx-edit');
    const ctxDotOn      = document.getElementById('ctx-dot-on');
    const ctxDotBelow   = document.getElementById('ctx-dot-below');
    const ctxDelete     = document.getElementById('ctx-delete');
    const ctxSetColor   = document.getElementById('ctx-set-color');
    const ctxToggleSt   = document.getElementById('ctx-toggle-straight');
    const ctxMenu       = document.getElementById('ctx-menu');

    if (!ctxMenu) { console.warn('Context menu elements missing'); return; }

    ctxEdit?.addEventListener('click', () => {
        if (_ctxType === 'bubble') {
            const b = State.bubbles.find(b => b.id === _ctxTarget);
            if (b) editBubble(b);
        }
        hideCtxMenu();
    });

    ctxDotOn?.addEventListener('click', () => {
        if (_ctxType === 'line') {
            const l = State.lines.find(l => l.id === _ctxTarget);
            if (l) {
                const from = getCenter(l.fromId, l.fromType);
                const to   = getCenter(l.toId,   l.toType);
                if (from && to) insertDotOnLine(l.id, (from.x + to.x) / 2, (from.y + to.y) / 2);
            }
        }
        hideCtxMenu();
    });

    ctxDotBelow?.addEventListener('click', () => {
        if (_ctxType === 'bubble') spawnDotBelowBubble(_ctxTarget);
        hideCtxMenu();
    });

    // ctx-set-color is wired inside initColorPanel()

    ctxToggleSt?.addEventListener('click', () => {
        if (_ctxType === 'line') toggleLineStraight(_ctxTarget);
        hideCtxMenu();
    });

    ctxDelete?.addEventListener('click', () => {
        if (_ctxType === 'bubble') deleteBubble(_ctxTarget);
        else if (_ctxType === 'dot') deleteDot(_ctxTarget);
        else if (_ctxType === 'line') deleteLine(_ctxTarget);
        hideCtxMenu();
    });

    document.addEventListener('click', e => {
        if (!ctxMenu.contains(e.target)) hideCtxMenu();
    });
}

// ── Workspace click ───────────────────────────────
export function initWorkspaceEvents() {
    const ws       = document.getElementById('workspace');
    const svgLines = document.getElementById('svg-lines');
    if (!ws || !svgLines) return;

    ws.addEventListener('click', e => {
        if (
            e.target === ws ||
            e.target.id === 'workspace-grid' ||
            e.target.id === 'canvas-root'    ||
            e.target.id === 'bubbles-layer'  ||
            e.target.id === 'svg-lines'
        ) {
            clearConnectSrc(); clearSelection(); hideCtxMenu();
        }
    });

    svgLines.addEventListener('contextmenu', e => {
        const lid = e.target.dataset.lid;
        if (lid) {
            e.preventDefault();
            const id = parseInt(lid, 10);
            selectNode({ id, type: 'line' });
            showCtxMenu(e.clientX, e.clientY, 'line', id);
        }
    });
}

// ── Refresh all bubble radii for new font size ────
// animate=false: resize only (no spring, e.g. during long-press)
// animate=true:  resize if needed, then always spring all bubbles once (e.g. on release)
function _refreshAllBubblesForFontSize(fontSize, animate = true) {
    State.bubbles.forEach(b => {
        const newR = computeRadius(b.text, fontSize);
        if (newR !== b.r) {
            b.r = newR;
            refreshBubbleEl(b);
        }
        if (animate) {
            b.el.classList.remove('bubble-spring');
            void b.el.offsetWidth; // force reflow to restart animation
            b.el.classList.add('bubble-spring');
            b.el.addEventListener('animationend', () => b.el.classList.remove('bubble-spring'), { once: true });
        }
    });
    updateLines();
}

// ── Hints visibility toggle ───────────────────────
export function _toggleHintsVisibility() {
    const hint = document.getElementById('shortcuts-hint');
    if (!hint) return;
    const visible = hint.style.display !== 'none';
    hint.style.display = visible ? 'none' : 'flex';
    setHintsVisible(!visible);
}

export function _syncLineStyleToggle() {
    const toggle = document.getElementById('gear-line-style-toggle');
    if (toggle) toggle.checked = State.lineStyle === 'straight';
}

// ── Panel resizers ────────────────────────────────
export function initResizers() {
    const vRes   = document.getElementById('v-resizer');
    const hRes   = document.getElementById('h-resizer');
    const mainEl = document.getElementById('main');
    const tdw    = document.getElementById('text-display-wrap');
    const tiw    = document.getElementById('text-input-wrap');

    if (vRes && mainEl && wsEl()) {
        vRes.addEventListener('mousedown', e => {
            e.preventDefault();
            vRes.classList.add('dragging');
            const startX = e.clientX;
            const startW = wsEl().clientWidth;
            const move = ev => {
                const w = Math.max(200, Math.min(mainEl.clientWidth - 240, startW + ev.clientX - startX));
                wsEl().style.width = w + 'px';
                updateLines();
            };
            const up = () => {
                vRes.classList.remove('dragging');
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    }

    if (hRes && tdw && tiw) {
        hRes.addEventListener('mousedown', e => {
            e.preventDefault();
            hRes.classList.add('dragging');
            const startY = e.clientY;
            const startH = tdw.clientHeight;
            const move = ev => {
                const total = tdw.parentElement.clientHeight;
                const nextH = Math.max(120, Math.min(total - 120, startH + ev.clientY - startY));
                tdw.style.height = nextH + 'px';
                tiw.style.height = (total - nextH - hRes.offsetHeight) + 'px';
            };
            const up = () => {
                hRes.classList.remove('dragging');
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    }
}
