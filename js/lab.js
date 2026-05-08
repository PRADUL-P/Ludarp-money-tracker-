'use strict';

(function () {
    const hub = document.getElementById('labHub');
    const subviews = document.querySelectorAll('.lab-subview');

    function showSubview(id) {
        hub.style.display = 'none';
        subviews.forEach(sv => sv.style.display = 'none');
        const target = document.getElementById(`lab-${id}`);
        if (target) {
            target.style.display = 'block';
            if (id === 'simulator') initSimulator();
            if (id === 'sankey') initSankey();
            if (id === 'wrapped') initWrapped();
        }
    }

    function backToHub() {
        hub.style.display = 'block';
        subviews.forEach(sv => sv.style.display = 'none');
    }

    // --- WHAT-IF SIMULATOR ---
    function initSimulator() {
        const container = document.getElementById('simSliders');
        const resultEl = document.getElementById('simResult');
        const tipEl = document.getElementById('simTip');
        const store = window.MT.db.loadStore();
        const cats = store.settings.categories || [];
        
        // Let's take last 30 days of data to get average spend per category
        const today = new Date();
        const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
        const catAverages = {};
        
        Object.keys(store.days).forEach(date => {
            if (new Date(date) >= thirtyDaysAgo) {
                store.days[date].forEach(e => {
                    if (e.type === 'Expense') {
                        catAverages[e.category] = (catAverages[e.category] || 0) + parseFloat(e.amount || 0);
                    }
                });
            }
        });

        container.innerHTML = '';
        const activeCats = Object.keys(catAverages).sort((a,b) => catAverages[b] - catAverages[a]).slice(0, 5);
        
        activeCats.forEach(cat => {
            const avg = catAverages[cat] || 0;
            const div = document.createElement('div');
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                    <span>${cat} (Monthly: ${window.MT.db.currencyFmt(avg)})</span>
                    <span id="val-${cat}">0% cut</span>
                </div>
                <input type="range" class="sim-slider" data-cat="${cat}" data-avg="${avg}" min="0" max="100" value="0" style="width:100%;" />
            `;
            container.appendChild(div);
        });

        const sliders = container.querySelectorAll('.sim-slider');
        const updateSim = () => {
            let totalMonthlySaving = 0;
            sliders.forEach(s => {
                const cat = s.getAttribute('data-cat');
                const avg = parseFloat(s.getAttribute('data-avg'));
                const cutPercent = parseInt(s.value);
                document.getElementById(`val-${cat}`).textContent = `${cutPercent}% cut`;
                totalMonthlySaving += (avg * cutPercent) / 100;
            });

            const yearly = totalMonthlySaving * 12;
            resultEl.textContent = window.MT.db.currencyFmt(yearly);
            
            if (yearly > 0) {
                const goals = JSON.parse(localStorage.getItem('mt_goals_v1') || '[]');
                const pending = goals.reduce((a, b) => a + (b.targetAmount - b.currentAmount), 0);
                if (pending > 0 && totalMonthlySaving > 0) {
                    const monthsEarlier = Math.round(pending / totalMonthlySaving);
                    tipEl.textContent = `You could achieve your goals ${monthsEarlier} months earlier!`;
                } else {
                    tipEl.textContent = `That's enough to buy a flagship phone every year!`;
                }
            }
        };

        sliders.forEach(s => s.oninput = updateSim);
        updateSim();
    }

    // --- CASH FLOW MAP (SANKEY-ISH) ---
    function initSankey() {
        const container = document.getElementById('sankeyContainer');
        const store = window.MT.db.loadStore();
        
        // Totals for current month
        const currentMonth = window.MT.db.todayISO().slice(0,7);
        let income = 0, expense = 0;
        const catTotals = {};

        Object.keys(store.days).forEach(date => {
            if (date.startsWith(currentMonth)) {
                store.days[date].forEach(e => {
                    if (e.type === 'Income') income += parseFloat(e.amount);
                    if (e.type === 'Expense') {
                        expense += parseFloat(e.amount);
                        catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount);
                    }
                });
            }
        });

        const max = Math.max(income, expense, 1);
        const sortedCats = Object.entries(catTotals).sort((a,b) => b[1] - a[1]).slice(0, 5);

        container.innerHTML = `
            <div style="margin-bottom:20px;">
                <div style="font-size:11px; margin-bottom:5px;">Monthly Income: ${window.MT.db.currencyFmt(income)}</div>
                <div style="height:20px; background:var(--success); width:${(income/max)*100}%; border-radius:10px; opacity:0.8;"></div>
            </div>
            <div style="margin-bottom:20px;">
                <div style="font-size:11px; margin-bottom:5px;">Monthly Expense: ${window.MT.db.currencyFmt(expense)}</div>
                <div style="height:20px; background:var(--danger); width:${(expense/max)*100}%; border-radius:10px; opacity:0.8;"></div>
            </div>
            <div style="margin-top:10px;">
                <div style="font-size:11px; font-weight:700; margin-bottom:10px;">Where the money goes:</div>
                ${sortedCats.map(([cat, amt]) => `
                    <div style="margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
                            <span>${cat}</span>
                            <span>${window.MT.db.currencyFmt(amt)}</span>
                        </div>
                        <div style="height:8px; background:var(--accent-1); width:${(amt/expense)*100}%; border-radius:4px; opacity:0.5;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // --- LUDARP WRAPPED ---
    function initWrapped() {
        const container = document.getElementById('wrappedContainer');
        const store = window.MT.db.loadStore();
        
        let totalExp = 0, topCat = '', topCatAmt = 0;
        const cats = {};
        let count = 0;

        Object.keys(store.days).forEach(date => {
            store.days[date].forEach(e => {
                if (e.type === 'Expense') {
                    totalExp += parseFloat(e.amount);
                    cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount);
                    count++;
                }
            });
        });

        const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
        if (sorted.length > 0) {
            topCat = sorted[0][0];
            topCatAmt = sorted[0][1];
        }

        const slides = [
            `<h1>Hi ${window.MT.db.loadUser()?.name || 'User'}!</h1><p>Ready to see your year in review?</p>`,
            `<h3>You logged</h3><h1>${count}</h1><p>transactions so far!</p>`,
            `<h3>You spent a total of</h3><h1>${window.MT.db.currencyFmt(totalExp)}</h1><p>on your journey.</p>`,
            `<h3>Your biggest crush was</h3><h1>${topCat}</h1><p>You spent ${window.MT.db.currencyFmt(topCatAmt)} here!</p>`,
            `<h1>You're a Legend!</h1><p>Keep tracking and stay financially sharp with LUDARP.</p>`
        ];

        let currentSlide = 0;
        const showSlide = () => {
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = slides[currentSlide] + `<button class="btn-primary" style="margin-top:30px;" id="nextWrapped">${currentSlide === slides.length - 1 ? 'Finish' : 'Next →'}</button>`;
                container.style.opacity = '1';
                document.getElementById('nextWrapped').onclick = () => {
                    currentSlide++;
                    if (currentSlide < slides.length) showSlide();
                    else backToHub();
                };
            }, 300);
        };
        container.style.transition = 'opacity 0.3s ease';
        showSlide();
    }

    window.MT = window.MT || {};
    window.MT.lab = {
        show: showSubview,
        back: backToHub
    };

})();
