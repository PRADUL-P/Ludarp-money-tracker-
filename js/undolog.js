'use strict';

(function () {
    const STORAGE_KEY = window.MT.db.STORAGE_KEY;
    const UNDO_KEY = 'ludarp_undo_stack';
    const undoList = document.getElementById('undoList');

    function renderUndoList() {
        if (!undoList) return;
        const stack = JSON.parse(localStorage.getItem(UNDO_KEY) || '[]');
        undoList.innerHTML = '';

        if (stack.length === 0) {
            undoList.innerHTML = '<div class="info" style="font-size:11px; text-align:center;">No previous states recorded yet.</div>';
            return;
        }

        stack.forEach((item, index) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(255,255,255,0.03);
                border-radius: 10px;
                border: 1px solid var(--card-border);
            `;

            const time = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(item.time).toLocaleDateString([], { day: '2-digit', month: 'short' });

            row.innerHTML = `
                <div style="font-size: 12px;">
                    <div style="font-weight: 700; color: var(--text);">Backup ${index + 1}</div>
                    <div style="font-size: 10px; color: var(--muted);">${date} at ${time}</div>
                </div>
                <button class="btn-secondary undo-restore-btn" data-index="${index}" style="font-size: 11px; padding: 6px 12px;">Rollback</button>
            `;
            undoList.appendChild(row);
        });

        undoList.querySelectorAll('.undo-restore-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                if (confirm('Are you sure you want to rollback to this state? Current data will be replaced.')) {
                    const item = stack[idx];
                    // Save current as a "redo" or just swap?
                    // For now, simple restore
                    localStorage.setItem(STORAGE_KEY, item.data);
                    
                    // Remove this and all states above it from stack?
                    // Actually, let's just keep the stack as is for safety.
                    
                    alert('Database restored successfully! The app will now reload.');
                    window.location.reload();
                }
            };
        });
    }

    window.addEventListener('mt:undo-updated', renderUndoList);
    window.addEventListener('mt:view-changed', (e) => {
        if (e.detail?.viewName === 'settings') {
            renderUndoList();
        }
    });

    // Initial render if view is settings
    renderUndoList();
})();
