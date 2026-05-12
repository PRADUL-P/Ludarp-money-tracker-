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
            if (id === 'rule') initRule();
            if (id === 'newspaper') initNewspaper();
            if (id === 'privacy') initPrivacy();
            if (id === 'waitlist') initWaitList();
            if (id === 'runway') initRunway();
            if (id === 'timeismoney') initTimeIsMoney();
            if (id === 'velocity') initVelocity();
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

        Object.keys(catAverages).forEach(c => {
            catAverages[c] = catAverages[c] / 3;
        });

        container.innerHTML = '';
        const activeCats = Object.keys(catAverages).sort((a,b) => catAverages[b] - catAverages[a]).slice(0, 6);
        
        if (activeCats.length === 0) {
            container.innerHTML = '<div class="info" style="text-align:center; padding:20px;">No data.</div>';
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
                const valDisp = document.getElementById(`val-${cat}`);
                if(valDisp) valDisp.textContent = `${cutPercent}% cut`;
                totalMonthlySaving += (avg * cutPercent) / 100;
            });
            const yearly = totalMonthlySaving * 12;
            resultEl.textContent = window.MT.db.currencyFmt(yearly);
        };
        sliders.forEach(s => s.oninput = updateSim);
        updateSim();
    }

    // --- CASH FLOW MAP ---
    function initSankey() {
        const container = document.getElementById('sankeyContainer');
        const store = window.MT.db.loadStore();
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

        const max = Math.max(income, expense, 1);
        const sortedCats = Object.entries(catTotals).sort((a,b) => b[1] - a[1]).slice(0, 6);

        container.innerHTML = `
            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; font-size:11px;"><span>Income</span><span>${window.MT.db.currencyFmt(income)}</span></div>
                <div style="height:20px; background:var(--success); width:${(income/max)*100}%; border-radius:10px;"></div>
            </div>
            <div style="margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; font-size:11px;"><span>Expenses</span><span>${window.MT.db.currencyFmt(expense)}</span></div>
                <div style="height:20px; background:var(--danger); width:${(expense/max)*100}%; border-radius:10px;"></div>
            </div>
            <div style="margin-top:20px;">
                ${sortedCats.map(([cat, amt]) => `
                    <div style="margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px;"><span>${cat}</span><span>${window.MT.db.currencyFmt(amt)}</span></div>
                        <div style="height:6px; background:var(--accent-1); width:${(amt/expense)*100}%; border-radius:3px;"></div>
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
                    totalExp += parseFloat(e.amount || 0);
                    cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount || 0);
                    count++;
                }
            });
        });

        const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
        if (sorted.length > 0) { topCat = sorted[0][0]; topCatAmt = sorted[0][1]; }

        const slides = [
            `<h1>Hi!</h1><p>Ready for your journey?</p>`,
            `<h1>${count}</h1><p>Transactions logged!</p>`,
            `<h1>${window.MT.db.currencyFmt(totalExp)}</h1><p>Managed successfully.</p>`,
            `<h1>${topCat}</h1><p>Top category at ${window.MT.db.currencyFmt(topCatAmt)}.</p>`,
            `<h1>Stay LUDARP.</h1>`
        ];

        let currentSlide = 0;
        const showSlide = () => {
            container.innerHTML = `
                <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">${slides[currentSlide]}</div>
                <button class="btn-primary" style="width:100%;" id="nextWrapped">${currentSlide === slides.length - 1 ? 'Finish' : 'Next →'}</button>
            `;
            document.getElementById('nextWrapped').onclick = () => {
                currentSlide++;
                if (currentSlide < slides.length) showSlide();
                else backToHub();
            };
        };
        showSlide();
    }

    // --- 📊 50/30/20 RULE ---
    function initRule() {
        const container = document.getElementById('ruleContainer');
        const store = window.MT.db.loadStore();
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let needs = 0, wants = 0, savings = 0;
        
        const bucketMap = {
            needs: ['Rent', 'Grocery', 'Bills', 'Petrol', 'Travel', 'Medical', 'Insurance'],
            wants: ['Dining', 'Food', 'Movies', 'Shopping', 'Others', 'Luxury', 'Entertainment'],
            savings: ['Savings', 'Investment', 'Dues', 'Debt']
        };

        Object.keys(store.days).forEach(date => {
            if (date.startsWith(monthKey)) {
                store.days[date].forEach(e => {
                    const cat = e.category || '';
                    if (bucketMap.needs.includes(cat)) needs += e.amount;
                    else if (bucketMap.wants.includes(cat)) wants += e.amount;
                    else if (bucketMap.savings.includes(cat) || (e.type === 'Income' && cat === 'Savings')) savings += e.amount;
                    else if (e.type === 'Expense') wants += e.amount;
                });
            }
        });

        const total = needs + wants + savings || 1;
        const pNeeds = (needs / total) * 100;
        const pWants = (wants / total) * 100;
        const pSavings = (savings / total) * 100;

        container.innerHTML = `
            <div>
                <div style="display:flex; justify-content:space-between;"><span>Needs (50%)</span><span>${pNeeds.toFixed(1)}%</span></div>
                <div style="height:10px; background:var(--bg2);"><div style="height:100%; width:${pNeeds}%; background:var(--accent-1);"></div></div>
            </div>
            <div>
                <div style="display:flex; justify-content:space-between;"><span>Wants (30%)</span><span>${pWants.toFixed(1)}%</span></div>
                <div style="height:10px; background:var(--bg2);"><div style="height:100%; width:${pWants}%; background:var(--accent-2);"></div></div>
            </div>
            <div>
                <div style="display:flex; justify-content:space-between;"><span>Savings (20%)</span><span>${pSavings.toFixed(1)}%</span></div>
                <div style="height:10px; background:var(--bg2);"><div style="height:100%; width:${pSavings}%; background:var(--accent-3);"></div></div>
            </div>
        `;
    }

    // --- 🗞️ WEEKLY NEWSPAPER ---
    function initNewspaper() {
        const container = document.getElementById('newspaperContainer');
        const store = window.MT.db.loadStore();
        const now = new Date();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        let weekExp = 0, count = 0;
        const cats = {};

        Object.keys(store.days).forEach(date => {
            if (new Date(date) >= sevenDaysAgo) {
                store.days[date].forEach(e => {
                    if (e.type === 'Expense') {
                        weekExp += e.amount; count++;
                        cats[e.category] = (cats[e.category] || 0) + e.amount;
                    }
                });
            }
        });

        const sorted = Object.entries(cats).sort((a,b) => b[1] - a[1]);
        const topCat = sorted.length > 0 ? sorted[0][0] : 'None';

        container.innerHTML = `
            <div style="text-align:center; border-bottom:2px solid #333; margin-bottom:15px;">
                <h1 style="margin:0;">THE LUDARP TIMES</h1>
                <p>${now.toDateString()}</p>
            </div>
            <h2>WEEKLY TOTAL: ${window.MT.db.currencyFmt(weekExp)}</h2>
            <p>${count} transactions recorded. <strong>${topCat}</strong> was the main expense.</p>
        `;
    }

    // --- 🌓 PRIVACY CURTAIN ---
    function initPrivacy() {
        const container = document.getElementById('privacyOptions');
        const store = window.MT.db.loadStore();
        const rules = (store.settings || {}).privacyRules || [];
        const allCats = new Set(['Salary', 'Investment', 'Savings']);
        Object.keys(store.days).forEach(d => {
            store.days[d].forEach(e => { if(e.category) allCats.add(e.category); });
        });

        container.innerHTML = Array.from(allCats).sort().map(cat => `
            <div style="display:flex; justify-content:space-between; padding:8px;">
                <span>${cat}</span>
                <input type="checkbox" class="privacy-toggle" data-cat="${cat}" ${rules.includes(cat) ? 'checked' : ''} />
            </div>
        `).join('');

        window.MT.lab.savePrivacy = () => {
            const newRules = Array.from(container.querySelectorAll('.privacy-toggle:checked')).map(c => c.getAttribute('data-cat'));
            const s = window.MT.db.loadStore();
            s.settings = s.settings || {};
            s.settings.privacyRules = newRules;
            window.MT.db.saveStore(s);
            window.MT.ui.showToast('Saved');
            if (window.MT.summary) window.MT.summary.renderHistoryList();
            if (window.MT.entry) window.MT.entry.renderEntries();
        };
    }

    // --- ⏳ WAIT-LIST ---
    function initWaitList() {
        const container = document.getElementById('waitContainer');
        const s = window.MT.db.loadStore();
        const list = s.waitlist || [];

        window.MT.lab.addWait = () => {
            const item = document.getElementById('waitItem').value;
            const price = parseFloat(document.getElementById('waitPrice').value) || 0;
            if (!item || price <= 0) return;
            const s2 = window.MT.db.loadStore();
            s2.waitlist = [...(s2.waitlist || []), { id: Date.now(), item, price, date: new Date().toISOString() }];
            window.MT.db.saveStore(s2);
            initWaitList();
        };

        container.innerHTML = list.map(i => {
            const hoursLeft = Math.max(0, 24 - (new Date() - new Date(i.date)) / 3600000);
            return `<div class="card" style="padding:10px;">${i.item} - ${window.MT.db.currencyFmt(i.price)} (${hoursLeft.toFixed(1)}h)</div>`;
        }).join('');
    }

    // --- 🚀 RUNWAY ---
    function initRunway() {
        const clock = document.getElementById('runwayClock');
        const details = document.getElementById('runwayDetails');
        const s = window.MT.db.loadStore();
        let totalCash = 0;
        if (window.MT.accounts) totalCash = window.MT.accounts.getTotalBalance();

        let totalExp = 0;
        const ninety = new Date(new Date() - 90 * 86400000);
        Object.keys(s.days).forEach(d => {
            if (new Date(d) >= ninety) s.days[d].forEach(e => { if(e.type === 'Expense') totalExp += e.amount; });
        });
        const runway = totalCash / (totalExp / 3 || 1);
        clock.textContent = runway.toFixed(1);
        details.innerHTML = `Cash: ${window.MT.db.currencyFmt(totalCash)} | Avg Exp: ${window.MT.db.currencyFmt(totalExp/3)}`;
    }

    // --- ⏱️ TIME IS MONEY ---
    function initTimeIsMoney() {
        const container = document.getElementById('timeIsMoneyContainer');
        const rate = parseFloat(document.getElementById('hourlyRate').value) || 1;
        const s = window.MT.db.loadStore();
        const all = [];
        Object.keys(s.days).forEach(d => s.days[d].forEach(e => { if(e.type === 'Expense') all.push(e); }));
        all.sort((a,b) => b.id - a.id);
        container.innerHTML = all.slice(0, 10).map(e => `
            <div class="card" style="padding:10px; display:flex; justify-content:space-between;">
                <span>${e.description}</span>
                <span>${(e.amount/rate).toFixed(1)} hrs</span>
            </div>
        `).join('');
        window.MT.lab.updateTimeIsMoney = initTimeIsMoney;
    }

    // --- ⚡ VELOCITY ---
    function initVelocity() {
        const chart = document.getElementById('velocityChart');
        const stats = document.getElementById('velocityStats');
        const s = window.MT.db.loadStore();
        const totals = [];
        for(let i=29; i>=0; i--) {
            const d = new Date(new Date() - i*86400000).toISOString().slice(0,10);
            let sum = 0; (s.days[d]||[]).forEach(e => { if(e.type==='Expense') sum += e.amount; });
            totals.push(sum);
        }
        const max = Math.max(...totals, 1);
        chart.innerHTML = totals.map(t => `<div style="flex:1; background:var(--accent-1); height:${(t/max)*100}%;"></div>`).join('');
        const avg = totals.reduce((a,b)=>a+b,0)/30;
        stats.innerHTML = `Avg Daily Velocity: ${window.MT.db.currencyFmt(avg)}`;
    }

    window.MT.lab = { show: showSubview, back: backToHub };
})();
