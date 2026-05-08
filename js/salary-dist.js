'use strict';

(function () {
    const modal = document.getElementById('salaryDistModal');
    const list = document.getElementById('salaryDistList');
    const totalDisp = document.getElementById('salaryTotalDisp');
    const remainingDisp = document.getElementById('salaryRemainingDisp');
    const confirmBtn = document.getElementById('salaryDistConfirm');
    const cancelBtn = document.getElementById('salaryDistCancel');

    let salaryAmount = 0;
    let distributions = {};

    function showDistributor(amount) {
        salaryAmount = amount;
        distributions = {};
        const goals = JSON.parse(localStorage.getItem('mt_goals_v1') || '[]');
        
        if (goals.length === 0) return; // Nothing to distribute to

        totalDisp.textContent = window.MT.db.currencyFmt(salaryAmount);
        updateRemaining();

        list.innerHTML = goals.map(g => `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:12px;">
                    <div style="font-weight:700;">${g.title}</div>
                    <div style="font-size:10px; opacity:0.6;">Target: ${window.MT.db.currencyFmt(g.targetAmount)}</div>
                </div>
                <input type="number" class="salary-dist-input" data-id="${g.id}" placeholder="₹0" style="width:80px; padding:6px; font-size:12px;" />
            </div>
        `).join('');

        modal.style.display = 'flex';

        list.querySelectorAll('.salary-dist-input').forEach(input => {
            input.oninput = () => {
                const id = input.getAttribute('data-id');
                distributions[id] = parseFloat(input.value) || 0;
                updateRemaining();
            };
        });
    }

    function updateRemaining() {
        const spent = Object.values(distributions).reduce((a, b) => a + b, 0);
        const rem = salaryAmount - spent;
        remainingDisp.textContent = window.MT.db.currencyFmt(rem);
        remainingDisp.style.color = rem < 0 ? 'var(--danger)' : 'var(--muted)';
    }

    confirmBtn.onclick = () => {
        const spent = Object.values(distributions).reduce((a, b) => a + b, 0);
        if (spent > salaryAmount) {
            alert('Distribution exceeds salary amount!');
            return;
        }

        const goals = JSON.parse(localStorage.getItem('mt_goals_v1') || '[]');
        Object.entries(distributions).forEach(([id, amt]) => {
            if (amt <= 0) return;
            const goal = goals.find(g => g.id === id);
            if (goal) {
                goal.currentAmount = (parseFloat(goal.currentAmount) || 0) + amt;
                
                // Also log a transaction for each distribution?
                // For now, just update goal.
            }
        });

        localStorage.setItem('mt_goals_v1', JSON.stringify(goals));
        modal.style.display = 'none';
        window.MT.ui?.showToast('Salary distributed to goals!', 'success');
        
        // Refresh finance view if active
        window.dispatchEvent(new CustomEvent('mt:view-changed', { detail: { viewName: 'accounts' } }));
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.MT = window.MT || {};
    window.MT.salaryDist = { show: showDistributor };

})();
