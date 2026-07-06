// dashboard.js — AJAX delete handler for project cards
// Called from dashboard.html via <script src="...">

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', async function (e) {
        var btn = e.target.closest('.delete-project-btn');
        if (!btn) return;
        var title = btn.dataset.projectTitle;
        var url   = btn.dataset.deleteUrl;
        if (!confirm('Delete "' + title + '"?')) return;
        try {
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            var data = await resp.json();
            if (data.success) {
                var wrapper = btn.closest('.project-card-wrapper');
                if (wrapper) {
                    wrapper.style.transition = 'opacity 0.2s, transform 0.2s';
                    wrapper.style.opacity = '0';
                    wrapper.style.transform = 'translateX(10px)';
                    setTimeout(function () {
                        wrapper.remove();
                        var list = document.querySelector('.space-y-3');
                        if (list && list.children.length === 0) {
                            list.outerHTML =
                                '<div class="bg-lb-surface border border-lb-border rounded-2xl px-8 py-16 text-center">' +
                                '<p class="text-[var(--lb-text-muted)] mb-4">No saved projects yet.</p>' +
                                '<a href="/editor" class="bg-lb-accent text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-lb-accent2 transition">Create your first project</a>' +
                                '</div>';
                        }
                    }, 220);
                }
                if (typeof showSiteToast !== 'undefined') showSiteToast(data.message, 'success');
            } else {
                if (typeof showSiteToast !== 'undefined') showSiteToast(data.message || 'Delete failed', 'error');
            }
        } catch {
            if (typeof showSiteToast !== 'undefined') showSiteToast('Network error', 'error');
        }
    });
});
