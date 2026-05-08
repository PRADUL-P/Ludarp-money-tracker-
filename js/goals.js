'use strict';
/* goals.js - Financial Goals & Savings Planner */

(function () {
    const STORAGE_KEY = 'mt_goals_v1';
    
    // DOM Elements
    let DOM = {};

    function loadGoals() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error loading goals', e);
            return [];
        }
    }

    function saveGoals(goals) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    }

    function renderGoals() {
        if (!DOM.container) DOM.container = document.getElementById('goalsContainer');
        if (!DOM.container) return;

        const goals = loadGoals();
        DOM.container.innerHTML = '';

        if (goals.length === 0) {
            DOM.container.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:var(--muted); font-size:13px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed var(--card-border);">
                    <div style="font-size:30px; margin-bottom:10px; opacity:0.5;">🎯</div>
                    <div>No goals set yet. Start saving for your next big thing!</div>
                </div>`;
            return;
        }

        goals.forEach(goal => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            
            const card = document.createElement('div');
            card.className = 'card mini-card';
            card.style.margin = '0';
            card.style.position = 'relative';
            card.style.overflow = 'hidden';
            if (isCompleted) {
                card.style.border = '1px solid var(--success)';
                card.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.1)';
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="font-size:24px;">${goal.icon || '🎯'}</div>
                        <div>
                            <div style="font-weight:700; font-size:15px; color:var(--text-main);">${goal.name}</div>
                            <div style="font-size:11px; color:var(--muted);">${goal.deadline ? 'Target: ' + window.MT.db.formatDateLabel(goal.deadline) : 'No deadline'}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; color:var(--accent); font-size:14px;">${window.MT.db.currencyFmt(goal.currentAmount)}</div>
                        <div style="font-size:11px; color:var(--text-secondary);">of ${window.MT.db.currencyFmt(goal.targetAmount)}</div>
                    </div>
                </div>
                
                <div style="background:rgba(255,255,255,0.05); height:8px; border-radius:10px; overflow:hidden; margin-bottom:12px; border:1px solid var(--card-border);">
                    <div style="width:${pct}%; height:100%; background:var(${isCompleted ? '--success' : '--accent'}); transition:width 0.4s ease;"></div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:11px; font-weight:700; color:${isCompleted ? 'var(--success)' : 'var(--text-secondary)'};">
                        ${isCompleted ? '🎉 Goal Achieved!' : pct + '% completed'}
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-small btn-fund" style="background:rgba(56,189,248,0.1); color:#38bdf8;">+ Add Funds</button>
                        <button class="btn-small btn-edit">✏️</button>
                    </div>
                </div>
            `;

            card.querySelector('.btn-fund').onclick = () => openFundModal(goal);
            card.querySelector('.btn-edit').onclick = () => openGoalModal(goal);

            DOM.container.appendChild(card);
        });
    }

    function openGoalModal(goal = null) {
        const isEdit = !!goal;
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        
        const card = document.createElement('div');
        card.className = 'export-card';
        card.style.maxWidth = '400px';
        
        card.innerHTML = `
            <h3 style="margin-bottom:15px;">${isEdit ? 'Edit Goal' : 'Create New Goal'}</h3>
            <div style="display:grid; gap:12px;">
                <div>
                    <label>Icon (Emoji)</label>
                    <input id="goalIcon" value="${isEdit ? (goal.icon||'🎯') : '🎯'}" style="font-size:20px; width:60px; text-align:center;" maxlength="2" />
                </div>
                <div>
                    <label>Goal Name</label>
                    <input id="goalName" value="${isEdit ? goal.name : ''}" placeholder="e.g. New Laptop" />
                </div>
                <div>
                    <label>Target Amount</label>
                    <input id="goalTarget" type="number" step="1" value="${isEdit ? goal.targetAmount : ''}" placeholder="0.00" />
                </div>
                <div style="display:${isEdit ? 'block' : 'none'};">
                    <label>Current Saved Amount</label>
                    <input id="goalCurrent" type="number" step="1" value="${isEdit ? goal.currentAmount : '0'}" />
                </div>
                <div>
                    <label>Target Date (Optional)</label>
                    <input id="goalDate" type="date" value="${isEdit && goal.deadline ? goal.deadline : ''}" />
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
                ${isEdit ? '<button class="btn-small btn-del" style="color:var(--danger); background:rgba(244,63,94,0.1);">Delete</button>' : '<div></div>'}
                <div style="display:flex; gap:10px;">
                    <button class="btn-secondary btn-cancel">Cancel</button>
                    <button class="btn-primary btn-save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.appendChild(card);

        if (isEdit) {
            card.querySelector('.btn-del').onclick = () => {
                if (!confirm('Are you sure you want to delete this goal?')) return;
                const goals = loadGoals().filter(g => g.id !== goal.id);
                saveGoals(goals);
                modal.remove();
                renderGoals();
                window.MT.ui?.showToast('Goal deleted');
            };
        }

        card.querySelector('.btn-cancel').onclick = () => modal.remove();
        card.querySelector('.btn-save').onclick = () => {
            const name = card.querySelector('#goalName').value.trim();
            const target = Number(card.querySelector('#goalTarget').value);
            if (!name || target <= 0) {
                alert('Please enter a valid name and target amount.');
                return;
            }

            const newGoal = {
                id: isEdit ? goal.id : Date.now().toString(),
                icon: card.querySelector('#goalIcon').value.trim() || '🎯',
                name: name,
                targetAmount: target,
                currentAmount: isEdit ? Number(card.querySelector('#goalCurrent').value) || 0 : 0,
                deadline: card.querySelector('#goalDate').value || null
            };

            const goals = loadGoals();
            if (isEdit) {
                const idx = goals.findIndex(g => g.id === goal.id);
                if (idx !== -1) goals[idx] = newGoal;
            } else {
                goals.push(newGoal);
            }

            saveGoals(goals);
            modal.remove();
            renderGoals();
            window.MT.ui?.showToast(isEdit ? 'Goal updated' : 'Goal created');
        };
    }

    function openFundModal(goal) {
        const amountStr = prompt(`How much would you like to add to "${goal.name}"?`);
        if (amountStr === null) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid positive number.');
            return;
        }

        const goals = loadGoals();
        const g = goals.find(x => x.id === goal.id);
        if (g) {
            g.currentAmount += amount;
            saveGoals(goals);
            renderGoals();
            if (g.currentAmount >= g.targetAmount) {
                window.MT.ui?.showToast('🎉 Congratulations! Goal reached!');
            } else {
                window.MT.ui?.showToast(`Added ${window.MT.db.currencyFmt(amount)} to goal`);
            }
        }
    }

    function init() {
        const addBtn = document.getElementById('addGoalBtn');
        if (addBtn) addBtn.addEventListener('click', () => openGoalModal(null));
        window.addEventListener('mt:auth-entered', renderGoals);
    }

    // Export module
    window.MT = window.MT || {};
    window.MT.goals = { renderGoals };

    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'interactive' || document.readyState === 'complete') init();
})();
