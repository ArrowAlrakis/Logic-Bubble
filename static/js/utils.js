// ═══════════════════════════════════════════════════
//  utils.js — Shared DOM + UI utilities
//  Priority 9: extracted from ui.js to break circular
//  import chains for the ES module refactor.
//  No imports — this is the leaf module.
// ═══════════════════════════════════════════════════

/** Returns the #workspace element. */
export function wsEl() {
    return document.getElementById('workspace');
}

/** Escapes HTML special characters for safe innerHTML insertion. */
export function escHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

// ── Toast notification ──────────────────────────────
let _toastTimer;

/**
 * Show a brief toast message at the bottom of the screen.
 * Auto-hides after 2.4 s.
 */
export function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
