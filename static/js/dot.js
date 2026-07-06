// ═══════════════════════════════════════════════════
//  dot.js — Dot (junction) nodes
//  Priority 9: ES module with imports / exports.
// ═══════════════════════════════════════════════════

import { State, saveState } from './state.js';
import { wsEl, showToast } from './utils.js';
import { _addLine, getCenter, deleteConnectedLines, handleNodeClick } from './lines.js';
import { selectNode } from './bubble.js';
// Circular import — safe (showCtxMenu only called in event handlers):
import { showCtxMenu } from './ui.js';
import { getTransform } from './zoom.js';

/**
 * Insert a dot node onto an existing line at position (px, py).
 * Splits the original line into two: from→dot and dot→to.
 */
export function insertDotOnLine(lineId, px, py) {
    const l = State.lines.find(l => l.id === lineId);
    if (!l) return;
    saveState('before insert dot');

    const id = ++State.dotCtr;
    const d  = { id, x: px, y: py };
    d.el = makeDotEl(d);
    State.dotNodes.push(d);

    l.el.remove(); l.hitEl?.remove(); l.handleEl?.remove(); l.arrowEl?.remove();
    const fromId = l.fromId, fromType = l.fromType;
    const toId   = l.toId,   toType   = l.toType;
    State.lines = State.lines.filter(x => x.id !== lineId);

    _addLine({ id: ++State.lineCtr, fromId, fromType, toId: id, toType: 'dot' });
    _addLine({ id: ++State.lineCtr, fromId: id, fromType: 'dot', toId, toType });

    saveState('insert dot on line');
    showToast('Dot node inserted on line');
    return d;
}

/** Spawn a dot below a bubble and auto-connect. */
export function spawnDotBelowBubble(bubbleId) {
    const b = State.bubbles.find(b => b.id === bubbleId);
    if (!b) return;
    saveState('before dot from bubble');

    const id = ++State.dotCtr;
    const d  = { id, x: b.x, y: b.y + b.r + 50 };
    d.el = makeDotEl(d);
    State.dotNodes.push(d);

    _addLine({ id: ++State.lineCtr, fromId: b.id, fromType: 'bubble', toId: id, toType: 'dot' });

    saveState('dot from bubble');
    showToast('Dot node added below bubble');
    return d;
}

/** Freeform dot — topbar button, no selection context. */
export function spawnFreeDot() {
    saveState('before dot node');
    const ws = wsEl();
    const id = ++State.dotCtr;
    const d  = {
        id,
        x: 120 + Math.random() * (ws.clientWidth  - 240),
        y: 120 + Math.random() * (ws.clientHeight - 240),
    };
    d.el = makeDotEl(d);
    State.dotNodes.push(d);
    saveState('add dot node');
    return d;
}

export function createDotFromSnap(snap) {
    const d = { ...snap };
    d.el = makeDotEl(d);
    State.dotNodes.push(d);
    return d;
}

export function makeDotEl(d) {
    const el = document.createElement('div');
    el.className  = 'dot-node';
    el.dataset.did = d.id;
    el.style.left = d.x + 'px';
    el.style.top  = d.y + 'px';
    document.getElementById('bubbles-layer').appendChild(el);
    attachDotEvents(el, d);
    return el;
}

function attachDotEvents(el, d) {
    let ox, oy, sdx, sdy, moved = false;

    el.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        ox = e.clientX; oy = e.clientY;
        sdx = d.x; sdy = d.y; moved = false;

        const onMove = ev => {
            const { scale } = getTransform();
            const dx = (ev.clientX - ox) / scale;
            const dy = (ev.clientY - oy) / scale;
            if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) moved = true;
            d.x = sdx + dx; d.y = sdy + dy;
            el.style.left = d.x + 'px'; el.style.top = d.y + 'px';
            import('./lines.js').then(({ updateLines }) => updateLines());
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!moved) handleNodeClick({ id: d.id, type: 'dot' });
            else import('./lines.js').then(({ updateLines }) => {
                updateLines();
                saveState('move dot');
            });
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    el.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        selectNode({ id: d.id, type: 'dot' });
        showCtxMenu(e.clientX, e.clientY, 'dot', d.id);
    });
}

export function deleteDot(id) {
    saveState('before delete dot');
    const idx = State.dotNodes.findIndex(d => d.id === id);
    if (idx === -1) return;
    State.dotNodes[idx].el.remove();
    State.dotNodes.splice(idx, 1);
    deleteConnectedLines(id, 'dot');
    if (State.selected?.id === id) State.selected = null;
    saveState('delete dot');
}
