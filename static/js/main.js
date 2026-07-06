// ═══════════════════════════════════════════════════
//  main.js — ES module entry point  (v04)
//  v04: imports initZoom (zoom.js) and initPrefs (prefs.js).
// ═══════════════════════════════════════════════════

import { State, saveState, resetWorkspaceState } from './state.js';
import { showToast } from './utils.js';
import { computeRadius, createBubbleFromSnap, clearSelection, clearConnectSrc } from './bubble.js';
import { createDotFromSnap } from './dot.js';
import { createLineFromSnap, updateLines } from './lines.js';
import {
    initTextPanel, initKeyboard, initTopbar,
    initCtxMenu, initWorkspaceEvents, initResizers,
    initColorPanel, initHelpModal
} from './ui.js';
import { initZoom } from './zoom.js';
import { initPrefs } from './prefs.js';

// ── Load a saved project into the editor ──────────
function loadProjectIntoEditor(project) {
    if (!project) return;

    resetWorkspaceState();

    const titleInput = document.getElementById('project-title');
    if (titleInput) titleInput.value = project.title || '';

    const textDisplay = document.getElementById('text-display');
    if (textDisplay) textDisplay.textContent = project.source_text || '';

    State.projectId = project.id || null;

    let graph = project.graph_data;
    if (typeof graph === 'string') {
        try { graph = JSON.parse(graph); } catch { graph = {}; }
    }

    (graph.bubbles   || []).forEach(b => createBubbleFromSnap({
        id: b.id, x: b.x, y: b.y, text: b.text,
        r: computeRadius(b.text), color: b.color || null,
        opacity: b.opacity !== undefined ? b.opacity : 25
    }));
    (graph.dotNodes  || []).forEach(d => createDotFromSnap({ id: d.id, x: d.x, y: d.y }));
    (graph.lines     || []).forEach(l => createLineFromSnap({
        id: l.id, fromId: l.fromId, fromType: l.fromType,
        toId: l.toId, toType: l.toType, straight: l.straight || false
    }));

    State.bubbleCtr = Math.max(0, ...(graph.bubbles   || []).map(b => b.id));
    State.dotCtr    = Math.max(0, ...(graph.dotNodes  || []).map(d => d.id));
    State.lineCtr   = Math.max(0, ...(graph.lines     || []).map(l => l.id));

    updateLines();
    clearSelection();
    clearConnectSrc();
}

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    saveState('init');
    initZoom();
    initTextPanel();
    initKeyboard();
    initTopbar();
    initCtxMenu();
    initColorPanel();
    initHelpModal();
    initWorkspaceEvents();
    initResizers();
    initPrefs();

    if (window.INITIAL_PROJECT) {
        loadProjectIntoEditor(window.INITIAL_PROJECT);
        showToast('Project loaded');
    } else {
        showToast('Logic Bubble Extractor loaded');
    }
});
