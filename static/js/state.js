// ═══════════════════════════════════════════════════
//  state.js — Application state and undo history
//  Priority 9: ES module — exports all public symbols.
// ═══════════════════════════════════════════════════
//
//  Circular-import note:
//  undo() calls createBubbleFromSnap / createDotFromSnap /
//  createLineFromSnap / clearSelection / clearConnectSrc /
//  updateLines — imported from bubble.js, dot.js, lines.js.
//  Those modules in turn import State / saveState from here.
//  This circular dependency is safe because:
//    • All cross-module calls happen inside function bodies
//      (never at module evaluation time / top level).
//    • ES modules use live bindings — by the time any event
//      handler or function is invoked, all modules are fully
//      evaluated and the bindings resolve correctly.
// ═══════════════════════════════════════════════════

import { showToast } from './utils.js';
import { createBubbleFromSnap, clearSelection, clearConnectSrc } from './bubble.js';
import { createDotFromSnap } from './dot.js';
import { createLineFromSnap, updateLines } from './lines.js';

// ── State object ───────────────────────────────────
export const State = {
    bubbles: [],   // { id, x, y, r, text, color, el }
    dotNodes: [],  // { id, x, y, el }
    lines: [],     // { id, fromId, fromType, toId, toType, straight, el, hitEl, handleEl, handleFromEl }
    selected: null,    // { type:'bubble'|'dot'|'line', id }
    connectSrc: null,  // { id, type }
    connectMode: false,   // v04: true = Connect mode, false = Select mode
    undoStack: [],
    bubbleCtr: 0,
    dotCtr: 0,
    lineCtr: 0,
    projectId: null,   // Priority 2: id of the currently open project (null = new)
    lineStyle: 'curve',  // v04: 'curve' | 'straight' — default for new lines
};

// ── Undo ──────────────────────────────────────────
export function saveState(label) {
    const snap = {
        label,
        bubbles: State.bubbles.map(b => ({
            id: b.id, x: b.x, y: b.y, r: b.r, text: b.text, color: b.color || null,
            opacity: b.opacity !== undefined ? b.opacity : 25
        })),
        dotNodes: State.dotNodes.map(d => ({ id: d.id, x: d.x, y: d.y })),
        lines: State.lines.map(l => ({
            id: l.id, fromId: l.fromId, fromType: l.fromType,
            toId: l.toId, toType: l.toType, straight: l.straight || false
        })),
        bubbleCtr: State.bubbleCtr,
        dotCtr: State.dotCtr,
        lineCtr: State.lineCtr,
    };
    State.undoStack.push(snap);
    if (State.undoStack.length > 80) State.undoStack.shift();
}

export function undo() {
    if (State.undoStack.length < 2) { showToast('Nothing to undo'); return; }
    State.undoStack.pop();
    const snap = State.undoStack[State.undoStack.length - 1];

    // wipe DOM
    State.bubbles.forEach(b => b.el?.remove());
    State.dotNodes.forEach(d => d.el?.remove());
    State.lines.forEach(l => {
        l.el?.remove(); l.hitEl?.remove();
        l.handleEl?.remove(); l.handleFromEl?.remove();
    });

    State.bubbles = [];
    State.dotNodes = [];
    State.lines = [];
    State.selected = null;
    State.connectSrc = null;
    State.bubbleCtr = snap.bubbleCtr;
    State.dotCtr = snap.dotCtr;
    State.lineCtr = snap.lineCtr;

    snap.bubbles.forEach(b => createBubbleFromSnap(b));
    snap.dotNodes.forEach(d => createDotFromSnap(d));
    snap.lines.forEach(l => createLineFromSnap(l));

    updateLines();
    clearSelection();
    clearConnectSrc();

    showToast(`Undo: ${snap.label}`);
}

// ── Serialisation ─────────────────────────────────
export function serializeProjectData() {
    return {
        bubbles: State.bubbles.map(b => ({
            id: b.id, text: b.text, x: b.x, y: b.y, color: b.color || null,
            opacity: b.opacity !== undefined ? b.opacity : 25
        })),
        dotNodes: State.dotNodes.map(d => ({ id: d.id, x: d.x, y: d.y })),
        lines: State.lines.map(l => ({
            id: l.id, fromType: l.fromType, fromId: l.fromId,
            toType: l.toType, toId: l.toId, straight: l.straight || false
        }))
    };
}

export function getSourceText() {
    const el = document.getElementById('text-display');
    return el ? el.innerText.trim() : '';
}

// ── Reset (wipe DOM + state arrays) ───────────────
export function resetWorkspaceState() {
    State.bubbles.forEach(b => b.el?.remove());
    State.dotNodes.forEach(d => d.el?.remove());
    State.lines.forEach(l => {
        l.el?.remove(); l.hitEl?.remove();
        l.handleEl?.remove(); l.handleFromEl?.remove();
    });
    State.bubbles = [];
    State.dotNodes = [];
    State.lines = [];
    State.selected = null;
    State.connectSrc = null;
}
