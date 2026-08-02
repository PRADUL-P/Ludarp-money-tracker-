'use strict';

(function () {
    window.MT = window.MT || {};

    function parseText(text) {
        if (!text) return null;

        const normalized = text.toLowerCase().replace(/\s+/g, ' ');

        // 1. Determine Transaction Type
        let type = 'Expense';
        const incomeKeywords = ['credited', 'received', 'refunded', 'added', 'deposited', 'income', 'salary', 'cashback'];
        const expenseKeywords = ['debited', 'spent', 'sent', 'paid', 'withdrawn', 'charge', 'fee', 'declined', 'payment'];

        let isIncome = incomeKeywords.some(k => normalized.includes(k));
        let isExpense = expenseKeywords.some(k => normalized.includes(k));

        if (isIncome && !isExpense) {
            type = 'Income';
        } else if (isIncome && isExpense) {
            const incomePos = Math.min(...incomeKeywords.map(k => normalized.indexOf(k)).filter(p => p !== -1));
            const expensePos = Math.min(...expenseKeywords.map(k => normalized.indexOf(k)).filter(p => p !== -1));
            if (incomePos < expensePos) {
                type = 'Income';
            } else {
                type = 'Expense';
            }
        }

        // 2. Extract Amount
        let amount = null;
        
        const actionAmtPatterns = [
            /(?:debited|spent|sent|paid|credited|received|refund|withdrawn|transaction of|charge of|transfer of)\s*(?:for\s*)?(?:rs\.?|inr|₹|usd|\$)?\s*([0-9,]+(?:\.\d{1,2})?)/i,
            /(?:rs\.?|inr|₹|usd|\$)\s*([0-9,]+(?:\.\d{1,2})?)\s*(?:debited|credited|spent|sent|paid|received|refunded|withdrawn)/i
        ];

        for (const pattern of actionAmtPatterns) {
            const match = normalized.match(pattern);
            if (match && match[1]) {
                amount = parseFloat(match[1].replace(/,/g, ''));
                break;
            }
        }

        if (!amount) {
            const currencyPattern = /(?:rs\.?|inr|₹|usd|\$)\s*([0-9,]+(?:\.\d{1,2})?)/gi;
            let match;
            while ((match = currencyPattern.exec(normalized)) !== null) {
                const startIdx = Math.max(0, match.index - 15);
                const endIdx = Math.min(normalized.length, match.index + match[0].length + 15);
                const context = normalized.substring(startIdx, endIdx);
                
                if (!context.includes('bal') && !context.includes('balance') && !context.includes('avail')) {
                    amount = parseFloat(match[1].replace(/,/g, ''));
                    break;
                }
            }
        }

        if (!amount) {
            const numberMatch = normalized.match(/\b([0-9]{1,5}(?:\.\d{1,2})?)\b/);
            if (numberMatch && numberMatch[1]) {
                amount = parseFloat(numberMatch[1]);
            }
        }

        // 3. Extract Description / Merchant / Person
        let description = '';
        
        const merchantPatterns = [
            /\btowards\s+([a-z0-9\s&'\.-]+?)(?:\s+(?:on|using|via|from|vpa|bal|balance|avbl|available)\b|\.(?:\s|$)|$)/i,
            /\bat\s+([a-z0-9\s&'\.-]+?)(?:\s+(?:on|using|via|from|vpa|bal|balance|avbl|available)\b|\.(?:\s|$)|$)/i,
            /\bto\s+([a-z0-9\s&'\.-]+?)(?:\s+(?:on|using|via|from|vpa|bal|balance|avbl|available)\b|\.(?:\s|$)|$)/i,
            /\bspent on\s+([a-z0-9\s&'\.-]+?)(?:\s+(?:on|using|via|from|vpa|bal|balance|avbl|available)\b|\.(?:\s|$)|$)/i,
            /\bby\s+([a-z0-9\s&'\.-]+?)(?:\s+(?:on|using|via|from|vpa|bal|balance|avbl|available)\b|\.(?:\s|$)|$)/i
        ];

        for (const pattern of merchantPatterns) {
            const match = text.match(pattern); // Original case
            if (match && match[1]) {
                const rawMatch = match[1].trim();
                const cleaned = rawMatch
                    .replace(/\b(?:ref|upi|no|xx+|ac|a\/c|card|ending)\b.*/i, '')
                    .replace(/[\.\-\/]+$/, '')
                    .trim();
                
                description = cleaned || rawMatch;
                break;
            }
        }

        if (!description) {
            if (normalized.includes('salary')) description = 'Salary';
            else if (normalized.includes('rent')) description = 'Rent';
            else if (normalized.includes('refund')) description = 'Refund';
            else description = type === 'Income' ? 'Received Funds' : 'Expense';
        } else {
            const acronyms = ['upi', 'atm', 'hdfc', 'sbi', 'icici', 'axis', 'canara', 'gst', 'inr', 'usd', 'id'];
            description = description.split(' ')
                .map(w => {
                    const low = w.toLowerCase();
                    if (acronyms.includes(low)) return w.toUpperCase();
                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                })
                .join(' ');
        }

        // 4. Extract Payment Method
        let payMethod = 'UPI'; // Default
        if (normalized.includes('upi') || normalized.includes('vpa') || normalized.includes('gpay') || normalized.includes('phonepe') || normalized.includes('paytm')) {
            payMethod = 'UPI';
        } else if (normalized.includes('card') || normalized.includes('visa') || normalized.includes('mastercard') || normalized.includes('amex') || normalized.includes('rupay') || normalized.includes('spent on your credit')) {
            payMethod = 'Card';
        } else if (normalized.includes('a/c') || normalized.includes('account') || normalized.includes('bank') || normalized.includes('netbanking') || normalized.includes('imps') || normalized.includes('neft') || normalized.includes('rtgs')) {
            payMethod = 'Bank';
        } else if (normalized.includes('cash')) {
            payMethod = 'Cash';
        }

        // 5. Extract Payment Subtype (dynamic bank / account detection)
        let paySubType = '';
        const store = window.MT.db?.loadStore() || {};
        const settings = store.settings || {};
        
        let searchList = [];
        if (payMethod === 'UPI') searchList = settings.upiApps || [];
        else if (payMethod === 'Card') searchList = settings.cards || [];
        else if (payMethod === 'Bank') searchList = settings.banks || [];

        if (searchList.length === 0) {
            searchList = [...(settings.upiApps || []), ...(settings.cards || []), ...(settings.banks || [])];
        }

        for (const option of searchList) {
            if (normalized.includes(option.toLowerCase())) {
                paySubType = option;
                if (settings.upiApps?.includes(option)) payMethod = 'UPI';
                else if (settings.cards?.includes(option)) payMethod = 'Card';
                else if (settings.banks?.includes(option)) payMethod = 'Bank';
                break;
            }
        }

        if (!paySubType) {
            const commonBanks = ['sbi', 'hdfc', 'icici', 'axis', 'canara', 'paytm', 'gpay', 'phonepe'];
            
            let allOptions = [];
            if (payMethod === 'Card') {
                allOptions = [...(settings.cards || []), ...(settings.banks || []), ...(settings.upiApps || [])];
            } else {
                allOptions = [...(settings.banks || []), ...(settings.upiApps || []), ...(settings.cards || [])];
            }

            for (const b of commonBanks) {
                if (normalized.includes(b)) {
                    const matched = allOptions.find(opt => opt.toLowerCase().includes(b));
                    if (matched) {
                        paySubType = matched;
                        break;
                    }
                }
            }
        }

        if (payMethod === 'Card' && !paySubType && settings.cards && settings.cards.length > 0) {
            paySubType = settings.cards[0];
        }

        return {
            amount: amount ? amount.toFixed(2) : null,
            type,
            description,
            payMethod,
            paySubType
        };
    }

    window.MT.parser = {
        parseText
    };

})();
