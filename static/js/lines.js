// ═══════════════════════════════════════════════════
//  lines.js — SVG connection lines  (v04)
//  v04: straight/curve toggle, auto-delete on empty drop,
//       from-handle drag, consolidated handleNodeClick,
//       zoom-aware coordinate conversion.
// ═══════════════════════════════════════════════════

import { State, saveState } from './state.js';
import { showToast } from './utils.js';
import { getTransform } from './zoom.js';
// Circular imports — safe because calls are inside functions (runtime only):
import { insertDotOnLine } from './dot.js';
import { selectNode, clearConnectSrc, clearSelection } from './bubble.js';

// ── Geometry helpers ──────────────────────────────
export function getCenter(id, type) {
    if (type === 'bubble') {
        const b = State.bubbles.find(b => b.id === id);
        return b ? { x: b.x, y: b.y, r: b.r } : null;
    }
    const d = State.dotNodes.find(d => d.id === id);
    return d ? { x: d.x, y: d.y, r: 8 } : null;
}

export function edgePoint(cx, cy, r, tx, ty) {
    const a = Math.atan2(ty - cy, tx - cx);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Convert a mouse event to canvas-space coordinates (zoom-aware). */
export function svgPoint(e) {
    const ws = document.getElementById('workspace');
    const rect = ws.getBoundingClientRect();
    const { scale, tx, ty } = getTransform();
    return {
        x: (e.clientX - rect.left - tx) / scale,
        y: (e.clientY - rect.top  - ty) / scale,
    };
}

// ── Public: create line ───────────────────────────
export function createLine(fromNode, toNode) {
    if (State.lines.find(l =>
        l.fromId === fromNode.id && l.fromType === fromNode.type &&
        l.toId   === toNode.id   && l.toType   === toNode.type
    )) { showToast('Connection already exists'); return; }

    saveState('before connect');
    _addLine({
        id: ++State.lineCtr,
        fromId:   fromNode.id,   fromType: fromNode.type || 'bubble',
        toId:     toNode.id,     toType:   toNode.type   || 'bubble',
        straight: State.lineStyle === 'straight',
    });
    saveState('connect');
}

/** Internal: build line object + DOM, push to State.lines. */
export function _addLine(data) {
    const l = { ...data };
    if (l.straight === undefined) l.straight = (State.lineStyle === 'straight');
    const els = _makeLineEls(l);
    l.el           = els.pathEl;
    l.hitEl        = els.hitEl;
    l.handleEl     = els.handleEl;
    l.handleFromEl = els.handleFromEl;
    State.lines.push(l);
    updateSingleLine(l);
    return l;
}

export function createLineFromSnap(snap) {
    _addLine({ ...snap, straight: snap.straight || false });
}

// ── Toggle straight / curve (single) ─────────────
export function toggleLineStraight(id) {
    const l = State.lines.find(l => l.id === id);
    if (!l) return;
    saveState('before toggle line style');
    l.straight = !l.straight;
    updateSingleLine(l);
    saveState('toggle line style');
    showToast(l.straight ? 'Straight line' : 'Curved line');
}

// ── Toggle ALL lines straight / curve ────────────
export function toggleAllLines() {
    saveState('before toggle all lines');
    State.lineStyle = State.lineStyle === 'curve' ? 'straight' : 'curve';
    const straight = State.lineStyle === 'straight';
    State.lines.forEach(l => { l.straight = straight; updateSingleLine(l); });
    saveState('toggle all lines');
    showToast(`All lines: ${State.lineStyle}`);
}

// ── DOM ──────────────────────────────────────────
function _makeLineEls(l) {
    const svg = document.getElementById('svg-lines');

    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('class', 'logic-line');
    pathEl.setAttribute('marker-end', 'url(#arrowhead)');
    pathEl.dataset.lid = l.id;

    const hitEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitEl.setAttribute('class', 'logic-line-hit');
    hitEl.dataset.lid = l.id;

    // To-end handle (reroute destination)
    const handleEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handleEl.setAttribute('class', 'arrow-handle');
    handleEl.setAttribute('r', '5');
    handleEl.dataset.lid = l.id;

    // From-end handle (reroute source) — v04
    const handleFromEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handleFromEl.setAttribute('class', 'arrow-handle arrow-handle-from');
    handleFromEl.setAttribute('r', '4');
    handleFromEl.dataset.lid = l.id;

    svg.appendChild(hitEl);
    svg.appendChild(pathEl);
    svg.appendChild(handleEl);
    svg.appendChild(handleFromEl);

    const clickLine = ev => {
        ev.stopPropagation();
        if (State.connectSrc) {
            const pt = svgPoint(ev);
            const dot = insertDotOnLine(l.id, pt.x, pt.y);
            if (dot) selectNode({ id: dot.id, type: 'dot' });
            clearConnectSrc();
            return;
        }
        selectNode({ id: l.id, type: 'line' });
        pathEl.setAttribute('marker-end', 'url(#arrowhead-active)');
    };
    pathEl.addEventListener('click', clickLine);
    hitEl.addEventListener('click', clickLine);
    hitEl.addEventListener('mouseover', () => {
        if (State.selected?.id !== l.id) pathEl.classList.add('hovered');
    });
    hitEl.addEventListener('mouseout', () => pathEl.classList.remove('hovered'));

    _attachToHandleDrag(handleEl, l);
    _attachFromHandleDrag(handleFromEl, l);

    return { pathEl, hitEl, handleEl, handleFromEl };
}

// ── To-end handle drag (reroute destination) ──────
function _attachToHandleDrag(handleEl, l) {
    handleEl.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        saveState('before reroute');

        const svg = document.getElementById('svg-lines');
        const ghost = _makeGhost(svg);
        let hoveredTarget = null;

        const onMove = ev => {
            const pt = svgPoint(ev);
            const from = getCenter(l.fromId, l.fromType);
            if (!from) return;
            const fp = edgePoint(from.x, from.y, from.r + 2, pt.x, pt.y);
            ghost.setAttribute('d', _linePath(fp, pt, l.straight));
            hoveredTarget = _findTarget(pt, l.fromId, l.fromType);
            _highlightTargets(hoveredTarget);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            ghost.remove();
            _clearHighlights();

            if (!hoveredTarget) {
                // Drag ended on empty space → auto-delete (v04)
                _removeLine(l);
                saveState('delete line (drag to empty)');
                showToast('Connection removed');
                return;
            }
            if (hoveredTarget.id === l.fromId && hoveredTarget.type === l.fromType) {
                updateSingleLine(l); return;
            }
            const dup = State.lines.find(x =>
                x.id !== l.id &&
                x.fromId === l.fromId && x.fromType === l.fromType &&
                x.toId === hoveredTarget.id && x.toType === hoveredTarget.type
            );
            if (dup) { showToast('Connection already exists'); updateSingleLine(l); return; }
            l.toId = hoveredTarget.id;
            l.toType = hoveredTarget.type;
            updateSingleLine(l);
            saveState('reroute line end');
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// ── From-end handle drag (reroute source) ─────────
function _attachFromHandleDrag(handleFromEl, l) {
    handleFromEl.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.stopPropagation();
        saveState('before reroute from');

        const svg = document.getElementById('svg-lines');
        const ghost = _makeGhost(svg);
        let hoveredTarget = null;

        const onMove = ev => {
            const pt = svgPoint(ev);
            const to = getCenter(l.toId, l.toType);
            if (!to) return;
            const tp = edgePoint(to.x, to.y, to.r + 9, pt.x, pt.y);
            ghost.setAttribute('d', _linePath(pt, tp, l.straight));
            hoveredTarget = _findTarget(pt, l.toId, l.toType);
            _highlightTargets(hoveredTarget);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            ghost.remove();
            _clearHighlights();

            if (!hoveredTarget) {
                _removeLine(l);
                saveState('delete line (drag from to empty)');
                showToast('Connection removed');
                return;
            }
            if (hoveredTarget.id === l.toId && hoveredTarget.type === l.toType) {
                updateSingleLine(l); return;
            }
            const dup = State.lines.find(x =>
                x.id !== l.id &&
                x.fromId === hoveredTarget.id && x.fromType === hoveredTarget.type &&
                x.toId === l.toId && x.toType === l.toType
            );
            if (dup) { showToast('Connection already exists'); updateSingleLine(l); return; }
            l.fromId = hoveredTarget.id;
            l.fromType = hoveredTarget.type;
            updateSingleLine(l);
            saveState('reroute line start');
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// ── Path shape helpers ────────────────────────────
function _linePath(fp, tp, straight) {
    if (straight) return `M${fp.x},${fp.y} L${tp.x},${tp.y}`;
    const mx = (fp.x + tp.x) / 2 - (tp.y - fp.y) * 0.1;
    const my = (fp.y + tp.y) / 2 + (tp.x - fp.x) * 0.1;
    return `M${fp.x},${fp.y} Q${mx},${my} ${tp.x},${tp.y}`;
}

function _makeGhost(svg) {
    const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    ghost.setAttribute('stroke', 'var(--accent2)');
    ghost.setAttribute('stroke-width', '2');
    ghost.setAttribute('stroke-dasharray', '5,4');
    ghost.setAttribute('fill', 'none');
    ghost.setAttribute('marker-end', 'url(#arrowhead-active)');
    svg.appendChild(ghost);
    return ghost;
}

function _findTarget(pt, excludeId, excludeType) {
    let best = Infinity, target = null;
    State.bubbles.forEach(b => {
        if (b.id === excludeId && excludeType === 'bubble') return;
        const d = Math.hypot(b.x - pt.x, b.y - pt.y);
        if (d < b.r && d < best) { best = d; target = { id: b.id, type: 'bubble' }; }
    });
    State.dotNodes.forEach(d => {
        if (d.id === excludeId && excludeType === 'dot') return;
        const dist = Math.hypot(d.x - pt.x, d.y - pt.y);
        if (dist < 20 && dist < best) { best = dist; target = { id: d.id, type: 'dot' }; }
    });
    return target;
}

function _highlightTargets(target) {
    State.bubbles.forEach(b => b.el.classList.toggle('merge-target',
        target?.id === b.id && target?.type === 'bubble'));
    State.dotNodes.forEach(d => d.el.classList.toggle('selected',
        target?.id === d.id && target?.type === 'dot'));
}

function _clearHighlights() {
    State.bubbles.forEach(b => b.el.classList.remove('merge-target'));
    State.dotNodes.forEach(d => { if (State.selected?.id !== d.id) d.el.classList.remove('selected'); });
}

function _removeLine(l) {
    l.el.remove(); l.hitEl?.remove();
    l.handleEl?.remove(); l.handleFromEl?.remove();
    State.lines = State.lines.filter(x => x.id !== l.id);
    if (State.selected?.id === l.id) State.selected = null;
}

// ── Update geometry ──────────────────────────────
export function updateSingleLine(l) {
    const from = getCenter(l.fromId, l.fromType);
    const to   = getCenter(l.toId,   l.toType);
    if (!from || !to) {
        l.el.setAttribute('d', '');
        l.hitEl?.setAttribute('d', '');
        l.handleEl?.setAttribute('cx', '-9999');
        l.handleFromEl?.setAttribute('cx', '-9999');
        return;
    }
    const fp = edgePoint(from.x, from.y, from.r + 2, to.x, to.y);
    const tp = edgePoint(to.x,   to.y,   to.r   + 9, from.x, from.y);

    let d;
    if (l.straight) {
        d = `M${fp.x},${fp.y} L${tp.x},${tp.y}`;
    } else {
        const mx = (fp.x + tp.x) / 2 - (tp.y - fp.y) * 0.12;
        const my = (fp.y + tp.y) / 2 + (tp.x - fp.x) * 0.12;
        d = `M${fp.x},${fp.y} Q${mx},${my} ${tp.x},${tp.y}`;
    }

    l.el.setAttribute('d', d);
    l.hitEl?.setAttribute('d', d);

    // To-handle at arrow tip
    l.handleEl?.setAttribute('cx', tp.x);
    l.handleEl?.setAttribute('cy', tp.y);

    // From-handle at arrow tail
    l.handleFromEl?.setAttribute('cx', fp.x);
    l.handleFromEl?.setAttribute('cy', fp.y);

    l.el.setAttribute('marker-end',
        State.selected?.id === l.id ? 'url(#arrowhead-active)' : 'url(#arrowhead)'
    );
}

export function updateLines() {
    State.lines.forEach(l => updateSingleLine(l));
}

// ── Apply line style to all existing lines ─────────
export function applyAllLinesStyle(style) {
    State.lineStyle = style;
    const straight = style === 'straight';
    State.lines.forEach(l => { l.straight = straight; updateSingleLine(l); });
}

// ── Delete ───────────────────────────────────────
export function deleteLine(id) {
    saveState('before delete line');
    const l = State.lines.find(l => l.id === id);
    if (!l) return;
    _removeLine(l);
    saveState('delete line');
}

export function deleteConnectedLines(nodeId, nodeType) {
    const toRemove = State.lines.filter(l =>
        (l.fromId === nodeId && l.fromType === nodeType) ||
        (l.toId   === nodeId && l.toType   === nodeType)
    );
    toRemove.forEach(l => {
        l.el.remove(); l.hitEl?.remove();
        l.handleEl?.remove(); l.handleFromEl?.remove();
    });
    State.lines = State.lines.filter(l => !toRemove.includes(l));
}

// ── Connect flow (consolidated handler) ──────────
export function handleNodeClick(node) {
    if (State.connectSrc) {
        const src = State.connectSrc;
        if (src.id === node.id && src.type === node.type) {
            clearConnectSrc();
            clearSelection();
            return;
        }
        createLine(src, node);
        clearConnectSrc();
        clearSelection();
        return;
    }
    selectNode(node);
    if (State.connectMode) {
        // Connect mode: first click sets source
        State.connectSrc = { id: node.id, type: node.type };
        if (node.type === 'bubble') {
            const b = State.bubbles.find(b => b.id === node.id);
            b?.el.classList.add('connect-source');
        } else if (node.type === 'dot') {
            const d = State.dotNodes.find(d => d.id === node.id);
            d?.el.classList.add('connect-source');
        }
    }
}
