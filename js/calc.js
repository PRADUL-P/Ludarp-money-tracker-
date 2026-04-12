'use strict';
/* calc.js — Mini Calculator logic */
(function () {
  let calcInput = '0';
  let calcOp = null;
  let calcPrev = null;

  const cDisp = document.getElementById('calcDisplay');
  const mCalc = document.getElementById('miniCalc');
  const amountEl = document.getElementById('amount');

  function updateCalc() {
    if (cDisp) cDisp.textContent = calcInput;
  }

  window.MT = window.MT || {};
  window.MT.calc = {
    append: (v) => {
      if (calcInput === '0' && v !== '.') calcInput = v;
      else calcInput += v;
      updateCalc();
    },
    setOp: (op) => {
      calcPrev = parseFloat(calcInput);
      calcOp = op;
      calcInput = '0';
      updateCalc();
    },
    clear: () => {
      calcInput = '0';
      calcOp = null;
      calcPrev = null;
      updateCalc();
    },
    calculate: () => {
      const cur = parseFloat(calcInput);
      if (calcPrev !== null && calcOp) {
        let res = 0;
        if (calcOp === '+') res = calcPrev + cur;
        if (calcOp === '-') res = calcPrev - cur;
        if (calcOp === '*') res = calcPrev * cur;
        if (calcOp === '/') res = calcPrev / (cur || 1);
        
        calcInput = parseFloat(res.toFixed(2)).toString();
        updateCalc();
        calcOp = null;
        calcPrev = null;
      }
    },
    apply: () => {
      // Execute pending calculation if any before applying
      if (calcOp && calcPrev !== null) {
        window.MT.calc.calculate();
      }
      if (amountEl) {
        amountEl.value = calcInput;
        // Trigger input event for fuel milage recalc if needed
        amountEl.dispatchEvent(new Event('input', { bubbles: true }));
        if (window.MT && window.MT.ui) window.MT.ui.showToast('Amount applied', 'success');
      }
    },
    addPercent: (p) => {
      let val = parseFloat(calcInput) || 0;
      val = val * (1 + p / 100);
      calcInput = parseFloat(val.toFixed(2)).toString();
      updateCalc();
    },
    round: () => {
      let val = parseFloat(calcInput) || 0;
      calcInput = Math.round(val).toString();
      updateCalc();
    },
    close: () => {
      if (mCalc) mCalc.style.display = 'none';
    },
    toggle: () => {
      if (!mCalc) return;
      const isOff = mCalc.style.display === 'none' || mCalc.style.display === '';
      mCalc.style.display = isOff ? 'block' : 'none';
      if (isOff && amountEl && amountEl.value) {
        calcInput = amountEl.value;
        updateCalc();
      }
    }
  };

  const btnCT = document.getElementById('btnCalcToggle');
  btnCT?.addEventListener('click', () => window.MT.calc.toggle());

})();
