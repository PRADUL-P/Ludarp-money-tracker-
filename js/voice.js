'use strict';
/* voice.js
   Voice commands for logging transactions.
   Example: "Spent fifty rupees on pizza" or "Received two thousand salary"
*/

(function () {

    const recognition = window.SpeechRecognition || window.webkitSpeechRecognition
        ? new (window.SpeechRecognition || window.webkitSpeechRecognition)()
        : null;

    if (!recognition) {
        const btn = document.getElementById('voiceBtn');
        if (btn) btn.style.display = 'none';
        return;
    }

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    const voiceBtn = document.getElementById('voiceBtn');
    const descInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const typeSelect = document.getElementById('type');

    let isListening = false;

    function parseVoiceText(text) {
        text = text.toLowerCase();

        // Basic extraction of amount
        const amountMatch = text.match(/(\d+)/);
        const amount = amountMatch ? amountMatch[1] : null;

        // Determination of type
        let type = 'Expense';
        if (text.includes('received') || text.includes('income') || text.includes('salary') || text.includes('got')) {
            type = 'Income';
        }

        // Description (remove common keywords)
        let desc = text
            .replace(/spent|received|on|for|from|got|rupees|dollars|amount|of/g, '')
            .replace(/\d+/, '') // remove the number
            .replace(/\s+/g, ' ')
            .trim();

        if (desc) {
            // Capitalize first letter
            desc = desc.charAt(0).toUpperCase() + desc.slice(1);
        }

        return { amount, type, desc };
    }

    recognition.onstart = () => {
        isListening = true;
        voiceBtn.textContent = '🛑';
        voiceBtn.style.background = 'var(--danger-dim)';
        voiceBtn.style.color = 'var(--danger)';
        window.MT.ui?.showToast('Listening... Speak naturally (e.g., "Spent 50 on coffee")', 'warning', true);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const { amount, type, desc } = parseVoiceText(transcript);

        if (amount) amountInput.value = amount;
        if (type) typeSelect.value = type;
        if (desc) descInput.value = desc;

        window.MT.ui?.showToast(`Recognized: "${transcript}"`, 'success');

        // Trigger UI updates if needed (like transfer UI)
        typeSelect.dispatchEvent(new Event('change'));
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        window.MT.ui?.showToast('Voice error: ' + event.error, 'error');
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.textContent = '🎤';
        voiceBtn.style.background = '';
        voiceBtn.style.color = '';
    };

    voiceBtn.onclick = () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

})();
