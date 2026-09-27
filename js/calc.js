'use strict';
/* calc.js — Enhanced Mini Calculator logic with live 5+6 expression display */
(function () {
  let calcInput = '0';
  let calcOp = null;
  let calcPrev = null;
  let exprStr = '';
  let isEvaluated = false;
  let calcError = false;

  function getOpSymbol(op) {
    if (op === '/') return '÷';
    if (op === '*') return '×';
    if (op === '-') return '−';
    if (op === '+') return '+';
    return '';
  }

  function updateCalc() {
    const dispEl = document.getElementById('calcDisplay');
    const exprEl = document.getElementById('calcExpr');

    let currentExpr = exprStr;
    if (!isEvaluated && calcPrev !== null && calcOp) {
      if (calcInput !== '0') {
        currentExpr = `${calcPrev} ${getOpSymbol(calcOp)} ${calcInput}`;
      } else {
        currentExpr = `${calcPrev} ${getOpSymbol(calcOp)}`;
      }
    }

    if (dispEl) {
      dispEl.textContent = calcInput || '0';
    }
    if (exprEl) {
      exprEl.textContent = currentExpr;
    }
  }

  function executeCalc() {
    if (calcPrev === null || !calcOp) return false;
    const cur = parseFloat(calcInput) || 0;
    let res = 0;
    if (calcOp === '+') res = calcPrev + cur;
    if (calcOp === '-') res = calcPrev - cur;
    if (calcOp === '*') res = calcPrev * cur;
    if (calcOp === '/') {
      if (cur === 0) return false;
      res = calcPrev / cur;
    }

    calcInput = parseFloat(res.toFixed(2)).toString();
    return true;
  }

  window.MT = window.MT || {};
  window.MT.calc = {
    append: (v) => {
      if (isEvaluated) {
        calcInput = '0';
        calcPrev = null;
        calcOp = null;
        exprStr = '';
        isEvaluated = false;
        calcError = false;
      }
      if (v === '00') {
        if (calcInput === '0') calcInput = '0';
        else calcInput += '00';
      } else if (v === '.') {
        if (!calcInput.includes('.')) {
          calcInput += '.';
        }
      } else {
        if (calcInput === '0') calcInput = v;
        else calcInput += v;
      }
      updateCalc();
    },

    setOp: (op) => {
      if (isEvaluated) {
        isEvaluated = false;
        exprStr = '';
        calcError = false;
      }
      if (calcOp && calcPrev !== null) {
        if (!executeCalc()) {
          exprStr = 'Cannot divide by zero';
          calcPrev = null;
          calcOp = null;
          calcInput = '0';
          isEvaluated = true;
          calcError = true;
          updateCalc();
          return;
        }
        calcPrev = parseFloat(calcInput) || 0;
      } else if (calcPrev === null) {
        calcPrev = parseFloat(calcInput) || 0;
      }
      calcOp = op;
      exprStr = `${calcPrev} ${getOpSymbol(op)}`;
      calcInput = '0';
      updateCalc();
    },

    backspace: () => {
      if (isEvaluated) {
        exprStr = '';
        isEvaluated = false;
        calcError = false;
        calcPrev = null;
        calcOp = null;
      }
      if (calcInput.length > 1) {
        calcInput = calcInput.slice(0, -1);
        if (calcInput === '-' || calcInput === '') calcInput = '0';
      } else {
        calcInput = '0';
      }
      updateCalc();
    },

    percent: () => {
      let cur = parseFloat(calcInput) || 0;
      if (calcPrev !== null && calcOp) {
        let pVal = 0;
        if (calcOp === '+' || calcOp === '-') {
          pVal = calcPrev * (cur / 100);
        } else {
          pVal = cur / 100;
        }
        calcInput = parseFloat(pVal.toFixed(2)).toString();
      } else {
        calcInput = parseFloat((cur / 100).toFixed(2)).toString();
      }
      updateCalc();
    },

    clear: () => {
      calcInput = '0';
      calcOp = null;
      calcPrev = null;
      exprStr = '';
      isEvaluated = false;
      calcError = false;
      updateCalc();
    },

    calculate: () => {
      if (calcPrev !== null && calcOp) {
        const prev = calcPrev;
        const op = calcOp;
        const cur = calcInput;
        if (executeCalc()) {
          exprStr = `${prev} ${getOpSymbol(op)} ${cur} =`;
          calcPrev = null;
          calcOp = null;
          isEvaluated = true;
          calcError = false;
          updateCalc();
        } else if (op === '/' && (parseFloat(cur) || 0) === 0) {
          exprStr = 'Cannot divide by zero';
          calcPrev = null;
          calcOp = null;
          calcInput = '0';
          isEvaluated = true;
          calcError = true;
          updateCalc();
        }
      }
    },

    apply: () => {
      if (calcError) {
        if (window.MT?.ui?.showToast) window.MT.ui.showToast('Cannot apply an invalid calculation', 'error');
        return;
      }
      if (calcOp && calcPrev !== null) {
        window.MT.calc.calculate();
      }
      const amountEl = document.getElementById('amount');
      if (amountEl) {
        amountEl.value = calcInput;
        amountEl.dispatchEvent(new Event('input', { bubbles: true }));
        if (window.MT && window.MT.ui && typeof window.MT.ui.showToast === 'function') {
          window.MT.ui.showToast(`Applied ₹${calcInput}`, 'success');
        }
      }
    },

    round: () => {
      let val = parseFloat(calcInput) || 0;
      calcInput = Math.round(val).toString();
      updateCalc();
    },

    close: () => {
      const mCalc = document.getElementById('miniCalc');
      if (mCalc) mCalc.style.display = 'none';
    },

    toggle: () => {
      const mCalc = document.getElementById('miniCalc');
      if (!mCalc) return;
      const isOff = mCalc.style.display === 'none' || mCalc.style.display === '';
      mCalc.style.display = isOff ? 'block' : 'none';
      if (isOff) {
        const amountEl = document.getElementById('amount');
        if (amountEl && amountEl.value) {
          calcInput = amountEl.value;
          calcPrev = null;
          calcOp = null;
          exprStr = '';
          isEvaluated = false;
          updateCalc();
        }
      }
    }
  };

  const btnCT = document.getElementById('btnCalcToggle');
  btnCT?.addEventListener('click', () => window.MT.calc.toggle());

  // Keyboard support for mini calculator
  document.addEventListener('keydown', (e) => {
    const panel = document.getElementById('miniCalc');
    if (!panel || panel.style.display === 'none') return;

    if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'amount') {
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      window.MT.calc.append(e.key);
      e.preventDefault();
    } else if (e.key === '.') {
      window.MT.calc.append('.');
      e.preventDefault();
    } else if (e.key === '+') {
      window.MT.calc.setOp('+');
      e.preventDefault();
    } else if (e.key === '-') {
      window.MT.calc.setOp('-');
      e.preventDefault();
    } else if (e.key === '*') {
      window.MT.calc.setOp('*');
      e.preventDefault();
    } else if (e.key === '/') {
      window.MT.calc.setOp('/');
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === '=') {
      window.MT.calc.calculate();
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      window.MT.calc.backspace();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      window.MT.calc.close();
      e.preventDefault();
    } else if (e.key === '%') {
      window.MT.calc.percent();
      e.preventDefault();
    }
  });
})();
