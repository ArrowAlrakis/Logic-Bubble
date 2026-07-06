// ═══════════════════════════════════════════════════
//  zoom.js — Canvas zoom and pan (v04)
//  Exposes transform state so other modules can convert
//  between screen-space and canvas-space coordinates.
// ═══════════════════════════════════════════════════

let _scale = 1;
let _tx    = 0;
let _ty    = 0;

/** Read-only snapshot of the current transform. */
export function getTransform() {
    return { scale: _scale, tx: _tx, ty: _ty };
}

/** Convert a screen-space point (e.g. clientX - rect.left) to canvas-space. */
export function screenToCanvas(sx, sy) {
    return { x: (sx - _tx) / _scale, y: (sy - _ty) / _scale };
}

/** Reset zoom to 1× and pan to origin. */
export function resetView() {
    _scale = 1; _tx = 0; _ty = 0;
    _applyTransform();
}

function _applyTransform() {
    const root = document.getElementById('canvas-root');
    if (root) root.style.transform = `translate(${_tx}px,${_ty}px) scale(${_scale})`;
}

export function initZoom() {
    const ws = document.getElementById('workspace');
    if (!ws) return;

    // ── Wheel zoom ──────────────────────────────────
    ws.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = ws.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newScale = Math.max(0.2, Math.min(3, _scale * factor));
        _tx = mx - (mx - _tx) * (newScale / _scale);
        _ty = my - (my - _ty) * (newScale / _scale);
        _scale = newScale;
        _applyTransform();
    }, { passive: false });

    // ── Space-drag / middle-mouse pan ───────────────
    let _panning = false;
    let _panX0, _panY0, _panTx0, _panTy0;
    let _spaceDown = false;

    document.addEventListener('keydown', e => {
        if (e.code !== 'Space') return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        if (!_spaceDown) { _spaceDown = true; ws.style.cursor = 'grab'; }
    });

    document.addEventListener('keyup', e => {
        if (e.code !== 'Space') return;
        _spaceDown = false;
        if (!_panning) ws.style.cursor = '';
    });

    ws.addEventListener('mousedown', e => {
        if (e.button !== 1 && !(e.button === 0 && _spaceDown)) return;
        e.preventDefault();
        e.stopPropagation();
        _panning = true;
        _panX0 = e.clientX; _panY0 = e.clientY;
        _panTx0 = _tx; _panTy0 = _ty;
        ws.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
        if (!_panning) return;
        _tx = _panTx0 + e.clientX - _panX0;
        _ty = _panTy0 + e.clientY - _panY0;
        _applyTransform();
    });

    document.addEventListener('mouseup', () => {
        if (!_panning) return;
        _panning = false;
        ws.style.cursor = _spaceDown ? 'grab' : '';
    });
}
