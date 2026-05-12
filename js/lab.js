'use strict';

(function () {
    function getHub() { return document.getElementById('labHub'); }
    function getSubviews() { return document.querySelectorAll('.lab-subview'); }

    function showSubview(id) {
        const hub = getHub();
        const subviews = getSubviews();
        if (hub) hub.style.setProperty('display', 'none', 'important');
        subviews.forEach(sv => sv.style.setProperty('display', 'none', 'important'));
        const target = document.getElementById(`lab-${id}`);
        if (target) {
            target.style.setProperty('display', 'block', 'important');
            if (id === 'simulator') initSimulator();
            if (id === 'sankey') initSankey();
            if (id === 'wrapped') initWrapped();
        }
    }

    function backToHub() {
        const hub = getHub();
        const subviews = getSubviews();
        if (hub) hub.style.setProperty('display', 'block', 'important');
        subviews.forEach(sv => sv.style.setProperty('display', 'none', 'important'));
    }

    // --- WHAT-IF SIMULATOR ---
    function initSimulator() {
        const container = document.getElementById('simSliders');
        const resultEl = document.getElementById('simResult');
        const tipEl = document.getElementById('simTip');
        const store = window.MT.db.loadStore();
        
        // Look back up to 90 days to get realistic averages
        const today = new Date();
        const ninetyDaysAgo = new Date(today - 90 * 24 * 60 * 60 * 1000);
        const catAverages = {};
        
        Object.keys(store.days).forEach(date => {
            if (new Date(date) >= ninetyDaysAgo) {
                store.days[date].forEach(e => {
                    if (e.type === 'Expense') {
                        catAverages[e.category] = (catAverages[e.category] || 0) + parseFloat(e.amount || 0);
                    }
                });
            }
        });

        // Normalize to monthly average
        Object.keys(catAverages).forEach(c => {
            catAverages[c] = catAverages[c] / 3; // 90 days = 3 months
        });

        container.innerHTML = '';
        const activeCats = Object.keys(catAverages).sort((a,b) => catAverages[b] - catAverages[a]).slice(0, 6);
        
        if (activeCats.length === 0) {
            container.innerHTML = '<div class="info" style="text-align:center; padding:20px;">No expense data found in the last 90 days. Start logging to use the simulator!</div>';
            resultEl.textContent = '₹0.00';
            tipEl.textContent = 'Add some expenses to see your potential savings.';
            return;
        }

        activeCats.forEach(cat => {
            const avg = catAverages[cat] || 0;
            const div = document.createElement('div');
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                    <span>${cat} (Avg: ${window.MT.db.currencyFmt(avg)}/mo)</span>
                    <span id="val-${cat}" style="color:var(--accent-1); font-weight:700;">0% cut</span>
                </div>
                <input type="range" class="sim-slider" data-cat="${cat}" data-avg="${avg}" min="0" max="100" value="0" style="width:100%; height:6px; accent-color:var(--accent-1);" />
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
                const valDisp = document.getElementById(`val-${cat}`);
                if(valDisp) valDisp.textContent = `${cutPercent}% cut`;
                totalMonthlySaving += (avg * cutPercent) / 100;
            });

            const yearly = totalMonthlySaving * 12;
            resultEl.textContent = window.MT.db.currencyFmt(yearly);
            
            if (yearly > 0) {
                tipEl.textContent = `By cutting these expenses, you'll save ${window.MT.db.currencyFmt(yearly)} in just one year!`;
            } else {
                tipEl.textContent = `Slide the bars to see how much you could save!`;
            }
        };

        sliders.forEach(s => s.oninput = updateSim);
        updateSim();
    }

    // --- CASH FLOW MAP (Last 30 Days) ---
    function initSankey() {
        const container = document.getElementById('sankeyContainer');
        const store = window.MT.db.loadStore();
        
        // Use last 30 days instead of just current month (better for start-of-month)
        const today = new Date();
        const thirtyDaysAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
        let income = 0, expense = 0;
        const catTotals = {};

        Object.keys(store.days).forEach(date => {
            if (new Date(date) >= thirtyDaysAgo) {
                store.days[date].forEach(e => {
                    if (e.type === 'Income') income += parseFloat(e.amount || 0);
                    if (e.type === 'Expense') {
                        expense += parseFloat(e.amount || 0);
                        catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount || 0);
                    }
                });
            }
        });

        if (income === 0 && expense === 0) {
            container.innerHTML = '<div class="info" style="text-align:center; padding:40px;">No cash flow detected in the last 30 days.</div>';
            return;
        }

        const max = Math.max(income, expense, 1);
        const sortedCats = Object.entries(catTotals).sort((a,b) => b[1] - a[1]).slice(0, 6);

        container.innerHTML = `
            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:5px;">
                    <span>Monthly Income</span>
                    <span>${window.MT.db.currencyFmt(income)}</span>
                </div>
                <div style="height:20px; background:var(--success); width:${Math.max(2, (income/max)*100)}%; border-radius:10px; opacity:0.8; transition: width 0.5s ease;"></div>
            </div>
            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:5px;">
                    <span>Monthly Expenses</span>
                    <span>${window.MT.db.currencyFmt(expense)}</span>
                </div>
                <div style="height:20px; background:var(--danger); width:${Math.max(2, (expense/max)*100)}%; border-radius:10px; opacity:0.8; transition: width 0.5s ease;"></div>
            </div>
            <div style="margin-top:20px; padding-top:20px; border-top:1px dashed var(--card-border);">
                <div style="font-size:12px; font-weight:800; margin-bottom:15px; color:var(--accent);">Where your money went (Last 30 Days):</div>
                ${sortedCats.length > 0 ? sortedCats.map(([cat, amt]) => `
                    <div style="margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                            <span style="color:var(--text-secondary);">${cat}</span>
                            <span style="font-weight:700;">${window.MT.db.currencyFmt(amt)}</span>
                        </div>
                        <div style="height:6px; background:linear-gradient(90deg, var(--accent-1), var(--accent-2)); width:${(amt/expense)*100}%; border-radius:3px; opacity:0.6;"></div>
                    </div>
                `).join('') : '<div class="info">No categorized expenses found.</div>'}
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
                    totalExp += parseFloat(e.amount || 0);
                    cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount || 0);
                    count++;
                }
            });
        });

        const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
        if (sorted.length > 0) {
            topCat = sorted[0][0];
            topCatAmt = sorted[0][1];
        }

        const slides = count > 0 ? [
            `<h1>Hi ${window.MT.db.loadUser()?.name || 'Friend'}!</h1><p style="opacity:0.7;">Ready to see your LUDARP journey so far?</p>`,
            `<h3 style="color:var(--accent-1); letter-spacing:1px; text-transform:uppercase; font-size:12px;">You've been busy...</h3><h1 style="font-size:64px;">${count}</h1><p style="opacity:0.7;">Total transactions logged!</p>`,
            `<h3 style="color:var(--danger); letter-spacing:1px; text-transform:uppercase; font-size:12px;">Total Movement</h3><h1 style="font-size:42px;">${window.MT.db.currencyFmt(totalExp)}</h1><p style="opacity:0.7;">successfully tracked and managed.</p>`,
            `<h3 style="color:var(--accent-3); letter-spacing:1px; text-transform:uppercase; font-size:12px;">Your #1 Category</h3><h1 style="font-size:42px;">${topCat}</h1><p style="opacity:0.7;">You dedicated ${window.MT.db.currencyFmt(topCatAmt)} to this.</p>`,
            `<h1 style="background:linear-gradient(135deg, #fff, #8fa3c0); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Financial Legend.</h1><p style="opacity:0.7;">Keep tracking. Stay sharp. Stay LUDARP.</p>`
        ] : [
            `<h1>Welcome to Wrapped!</h1><p>It looks like you haven't logged many transactions yet.</p>`,
            `<p>Start tracking your daily expenses to see your personalized <strong>Financial Story</strong> here!</p>`
        ];

        let currentSlide = 0;
        const showSlide = () => {
            container.style.opacity = '0';
            container.style.transform = 'translateY(10px)';
            setTimeout(() => {
                container.innerHTML = `
                    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:10px;">
                        ${slides[currentSlide]}
                    </div>
                    <button class="btn-primary" style="width:100%; padding:15px; margin-top:30px; border-radius:15px;" id="nextWrapped">
                        ${currentSlide === slides.length - 1 ? 'Back to Hub' : 'Next Story →'}
                    </button>
                `;
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
                document.getElementById('nextWrapped').onclick = () => {
                    currentSlide++;
                    if (currentSlide < slides.length) showSlide();
                    else backToHub();
                };
            }, 300);
        };
        container.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        showSlide();
    }

    window.MT = window.MT || {};
    window.MT.lab = {
        show: showSubview,
        back: backToHub
    };

})();
