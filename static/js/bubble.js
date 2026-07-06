// ═══════════════════════════════════════════════════
//  bubble.js — Bubble nodes  (v04)
//  v04: removed duplicate handleNodeClick (consolidated in lines.js),
//       snap align with guide lines, zoom-aware drag coords.
// ═══════════════════════════════════════════════════

import { State, saveState } from './state.js';
import { escHtml, wsEl, showToast } from './utils.js';
import { updateLines, deleteConnectedLines, handleNodeClick } from './lines.js';
// Circular import — safe (showCtxMenu only called inside event handlers):
import { showCtxMenu } from './ui.js';
import { getTransform } from './zoom.js';

// ── Radius ────────────────────────────────────────
// Width of a text segment in character-units (CJK chars count as 2).
function _segWidth(seg) {
    let w = 0;
    for (const ch of seg) {
        const cp = ch.codePointAt(0);
        // CJK Unified, Hiragana, Katakana, Hangul, full-width ranges
        w += (cp >= 0x1100 && cp <= 0xFFEF) || (cp >= 0x20000 && cp <= 0x2FA1F) ? 2 : 1;
    }
    return w || 1;
}

export function computeRadius(text, fontSize) {
    const fz     = fontSize || 12;
    const charW  = fz * 0.62;
    const lineH  = fz * 1.65;
    const pad    = 20; // padding per side (matches .bubble-text padding)
    const MAX_COLS = 25;

    // Support hard line breaks (\n) — each segment wraps independently.
    // Use aspect ratio target cols/rows ≈ lineH/charW ≈ 2.66 for near-square layout.
    const segments = text.split('\n');
    let totalLines = 0;
    let maxCols    = 0;

    for (const seg of segments) {
        const len  = _segWidth(seg);
        const cols = Math.min(MAX_COLS, Math.ceil(Math.sqrt(len * (lineH / charW))));
        const rows = Math.ceil(len / cols);
        totalLines += rows;
        if (cols > maxCols) maxCols = cols;
    }

    const tw = maxCols    * charW + pad * 2;
    const th = totalLines * lineH + pad * 2;
    return Math.max(50, Math.ceil(Math.hypot(tw, th) / 2) + 6);
}

// ── Create ────────────────────────────────────────
export function spawnBubble(text, x, y) {
    saveState('before extract');
    const id = ++State.bubbleCtr;
    const r  = computeRadius(text);
    const ws = wsEl();
    const bx = (x !== undefined) ? x : 90 + Math.random() * Math.max(120, ws.clientWidth  - 200);
    const by = (y !== undefined) ? y : 90 + Math.random() * Math.max(120, ws.clientHeight - 200);
    const b  = { id, x: bx, y: by, r, text, color: null, opacity: 25 };
    b.el = makeBubbleEl(b);
    State.bubbles.push(b);
    saveState('extract bubble');
    return b;
}

export function createBubbleFromSnap(snap) {
    const b = { ...snap };
    if (b.opacity === undefined) b.opacity = 25;
    b.el = makeBubbleEl(b);
    State.bubbles.push(b);
    return b;
}

// ── DOM ───────────────────────────────────────────
export function makeBubbleEl(b) {
    const el = document.createElement('div');
    el.className = 'bubble';
    el.dataset.bid = b.id;
    repositionBubbleEl(el, b);
    el.innerHTML = `<div class="bubble-text">${escHtml(b.text)}</div><div class="bubble-id">#${b.id}</div>`;

    applyBubbleColor(el, b.color, b.opacity);

    document.getElementById('bubbles-layer').appendChild(el);
    attachBubbleEvents(el, b);

    // entry pop animation
    el.style.transform = 'scale(0)'; el.style.opacity = '0';
    requestAnimationFrame(() => {
        el.style.transition = 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s';
        el.style.transform  = 'scale(1)'; el.style.opacity = '1';
        setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 320);
    });
    return el;
}

export function repositionBubbleEl(el, b) {
    const d = b.r * 2;
    el.style.width  = d + 'px';
    el.style.height = d + 'px';
    el.style.left   = (b.x - b.r) + 'px';
    el.style.top    = (b.y - b.r) + 'px';
}

export function refreshBubbleEl(b) {
    repositionBubbleEl(b.el, b);
    const tEl = b.el.querySelector('.bubble-text');
    if (tEl) tEl.innerHTML = escHtml(b.text);
    applyBubbleColor(b.el, b.color, b.opacity);
}

/**
 * Apply a colour string as the bubble's semi-transparent fill.
 * Pass null / '' to clear back to the CSS default background.
 * opacity: 0–100 percentage, defaults to 25.
 */
export function applyBubbleColor(el, color, opacity) {
    if (color) {
        const op = (opacity !== undefined && opacity !== null) ? opacity : 25;
        const hexOp = Math.round(op / 100 * 255).toString(16).padStart(2, '0');
        el.style.backgroundColor = color + hexOp;
    } else {
        el.style.backgroundColor = '';
    }
}

// ── Drag + events ─────────────────────────────────
const SNAP_THRESHOLD = 8;

function attachBubbleEvents(el, b) {
    let ox, oy, sbx, sby, moved = false;
    let vx = 0, vy = 0, lx, ly, lt;
    let inertiaId;

    el.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        if (el.querySelector('.bubble-edit-ta')) return;
        e.stopPropagation();
        cancelAnimationFrame(inertiaId);
        ox = e.clientX; oy = e.clientY;
        sbx = b.x; sby = b.y; moved = false;
        vx = 0; vy = 0; lx = e.clientX; ly = e.clientY; lt = Date.now();

        const onMove = ev => {
            const { scale } = getTransform();
            const dx = (ev.clientX - ox) / scale;
            const dy = (ev.clientY - oy) / scale;
            if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) moved = true;
            if (!moved) return;
            const now = Date.now(); const dt = Math.max(now - lt, 1);
            vx = (ev.clientX - lx) / dt / scale;
            vy = (ev.clientY - ly) / dt / scale;
            lx = ev.clientX; ly = ev.clientY; lt = now;
            b.x = sbx + dx; b.y = sby + dy;

            // Snap align (v04)
            let snappedX = false, snappedY = false;
            for (const ob of State.bubbles) {
                if (ob.id === b.id) continue;
                if (Math.abs(ob.x - b.x) < SNAP_THRESHOLD) { b.x = ob.x; snappedX = true; }
                if (Math.abs(ob.y - b.y) < SNAP_THRESHOLD) { b.y = ob.y; snappedY = true; }
            }
            _setSnapGuides(snappedX ? b.x : null, snappedY ? b.y : null);

            repositionBubbleEl(el, b);
            updateLines();
            State.bubbles.forEach(ob => {
                if (ob.id === b.id) return;
                ob.el.classList.toggle('merge-target', Math.hypot(ob.x - b.x, ob.y - b.y) < ob.r + b.r);
            });
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            State.bubbles.forEach(ob => ob.el.classList.remove('merge-target'));
            _setSnapGuides(null, null);

            if (!moved) { handleNodeClick({ id: b.id, type: 'bubble' }); return; }

            let merged = false;
            for (const ob of State.bubbles) {
                if (ob.id === b.id) continue;
                if (Math.hypot(ob.x - b.x, ob.y - b.y) < ob.r + b.r) {
                    mergeBubbles(b.id, ob.id); merged = true; break;
                }
            }
            if (!merged) {
                if (Math.hypot(vx, vy) > 0.12) startInertia(b, vx * 16, vy * 16);
                else saveState('move bubble');
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    el.addEventListener('dblclick', e => { e.stopPropagation(); editBubble(b); });
    el.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        selectNode({ id: b.id, type: 'bubble' });
        showCtxMenu(e.clientX, e.clientY, 'bubble', b.id);
    });
}

/** Show/hide snap guide lines in the canvas. */
function _setSnapGuides(snapX, snapY) {
    const guideV = document.getElementById('snap-guide-v');
    const guideH = document.getElementById('snap-guide-h');
    if (guideV) {
        if (snapX !== null) {
            guideV.setAttribute('x1', snapX); guideV.setAttribute('x2', snapX);
            guideV.style.display = '';
        } else { guideV.style.display = 'none'; }
    }
    if (guideH) {
        if (snapY !== null) {
            guideH.setAttribute('y1', snapY); guideH.setAttribute('y2', snapY);
            guideH.style.display = '';
        } else { guideH.style.display = 'none'; }
    }
}

function startInertia(b, ivx, ivy) {
    const friction = 0.87;
    const step = () => {
        ivx *= friction; ivy *= friction;
        b.x += ivx; b.y += ivy;
        repositionBubbleEl(b.el, b);
        updateLines();
        if (Math.abs(ivx) > 0.3 || Math.abs(ivy) > 0.3) requestAnimationFrame(step);
        else saveState('move bubble');
    };
    requestAnimationFrame(step);
}

// ── Selection ─────────────────────────────────────
export function selectNode(node) {
    clearSelection();
    State.selected = node;
    if (node.type === 'bubble') {
        const b = State.bubbles.find(b => b.id === node.id);
        if (b) b.el.classList.add('selected');
    } else if (node.type === 'dot') {
        const d = State.dotNodes.find(d => d.id === node.id);
        if (d) d.el.classList.add('selected');
    } else if (node.type === 'line') {
        const l = State.lines.find(l => l.id === node.id);
        if (l) { l.el.classList.add('selected'); l.el.classList.remove('hovered'); }
    }
}

export function clearSelection() {
    State.bubbles.forEach(b => b.el.classList.remove('selected', 'connect-source'));
    State.dotNodes.forEach(d => d.el.classList.remove('selected', 'connect-source'));
    State.lines.forEach(l => l.el.classList.remove('selected', 'hovered'));
    State.selected = null;
}

export function clearConnectSrc() {
    if (State.connectSrc) {
        const { id, type } = State.connectSrc;
        if (type === 'bubble') { const b = State.bubbles.find(b => b.id === id); b?.el.classList.remove('connect-source'); }
        if (type === 'dot')    { const d = State.dotNodes.find(d => d.id === id); d?.el.classList.remove('connect-source'); }
        State.connectSrc = null;
    }
}

// ── Edit / Delete / Merge ─────────────────────────
export function editBubble(b) {
    clearSelection();
    const textDiv = b.el.querySelector('.bubble-text');
    const idDiv   = b.el.querySelector('.bubble-id');
    if (!textDiv) return;
    textDiv.style.display = 'none';
    idDiv.style.display   = 'none';
    const ta = document.createElement('textarea');
    ta.className = 'bubble-edit-ta';
    ta.value = b.text;
    b.el.appendChild(ta);
    ta.focus(); ta.select();

    const finish = () => {
        const nv = ta.value.trim() || b.text;
        ta.remove();
        textDiv.style.display = '';
        idDiv.style.display   = '';
        if (nv !== b.text) {
            b.text = nv;
            b.r = computeRadius(nv);
            refreshBubbleEl(b);
            updateLines();
            saveState('edit bubble');
        }
    };
    ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(); }
        if (e.key === 'Escape') { ta.value = b.text; finish(); }
        e.stopPropagation();
    });
    ta.addEventListener('blur', finish);
}

export function deleteBubble(id) {
    saveState('before delete bubble');
    const idx = State.bubbles.findIndex(b => b.id === id);
    if (idx === -1) return;
    const b = State.bubbles[idx];
    b.el.style.transition = 'transform 0.18s, opacity 0.18s';
    b.el.style.transform  = 'scale(0)'; b.el.style.opacity = '0';
    setTimeout(() => b.el.remove(), 200);
    State.bubbles.splice(idx, 1);
    deleteConnectedLines(id, 'bubble');
    if (State.selected?.id === id) State.selected = null;
    saveState('delete bubble');
}

export function mergeBubbles(srcId, tgtId) {
    saveState('before merge');
    const src = State.bubbles.find(b => b.id === srcId);
    const tgt = State.bubbles.find(b => b.id === tgtId);
    if (!src || !tgt) return;
    tgt.text = tgt.text + '\n' + src.text;
    tgt.r = computeRadius(tgt.text);
    refreshBubbleEl(tgt);
    State.lines.forEach(l => {
        if (l.fromId === srcId && l.fromType === 'bubble') l.fromId = tgtId;
        if (l.toId   === srcId && l.toType   === 'bubble') l.toId   = tgtId;
    });
    State.lines = State.lines.filter(l => !(l.fromId === l.toId && l.fromType === l.toType));
    src.el.remove();
    State.bubbles = State.bubbles.filter(b => b.id !== srcId);
    updateLines();
    saveState('merge');
    showToast('Bubbles merged');
}
