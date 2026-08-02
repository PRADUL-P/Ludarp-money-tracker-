'use strict';

(function () {
    function showWhatsNew() {
        const hasSeen = localStorage.getItem('ludarp_v6_2_whatsnew_seen');
        if (hasSeen) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.4s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            padding: 30px;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            text-align: center;
            color: #fff;
            transform: translateY(20px);
            animation: slideUp 0.5s forwards ease;
        `;

        modal.innerHTML = `
            <div style="font-size: 50px; margin-bottom: 20px;">⚡</div>
            <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 10px; background: linear-gradient(to right, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">LUDARP v6.2.0 Autonomic</h2>
            <p style="font-size: 14px; opacity: 0.8; margin-bottom: 25px;">Powerful new logging automation and offline capabilities have arrived!</p>
            
            <div style="text-align: left; background: rgba(255,255,255,0.05); border-radius: 16px; padding: 15px; margin-bottom: 25px;">
                <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start;">
                    <span style="font-size: 20px;">📋</span>
                    <div>
                        <div style="font-weight: 700; font-size: 13px;">Smart SMS / Text Parser</div>
                        <div style="font-size: 11px; opacity: 0.6;">Copy bank/UPI SMS notifications and paste them to instantly auto-populate transaction entries.</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start;">
                    <span style="font-size: 20px;">🔄</span>
                    <div>
                        <div style="font-weight: 700; font-size: 13px;">Offline Auto-Sync to Sheets</div>
                        <div style="font-size: 11px; opacity: 0.6;">Log transactions while offline. The app queues updates and auto-syncs to Google Sheets as soon as connection is restored.</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start;">
                    <span style="font-size: 20px;">📌</span>
                    <div>
                        <div style="font-weight: 700; font-size: 13px;">Sticky Payment Defaults</div>
                        <div style="font-size: 11px; opacity: 0.6;">Remembers your last used payment method and account bank, eliminating repetitive form selections.</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <span style="font-size: 20px;">📶</span>
                    <div>
                        <div style="font-weight: 700; font-size: 13px;">100% Offline Loading (Fixed)</div>
                        <div style="font-size: 11px; opacity: 0.6;">Service worker cache and external scripts caching have been fully patched. The app loads offline without errors.</div>
                    </div>
                </div>
            </div>

            <button id="closeWhatsNew" style="
                width: 100%;
                padding: 14px;
                border-radius: 12px;
                border: none;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                font-weight: 800;
                font-size: 15px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                transition: transform 0.2s;
            ">Explore Version 6.2.0</button>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modal);

        // Add animations to style
        if (!document.getElementById('whatsNewStyles')) {
            const style = document.createElement('style');
            style.id = 'whatsNewStyles';
            style.innerHTML = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `;
            document.head.appendChild(style);
        }

        document.getElementById('closeWhatsNew').onclick = () => {
            localStorage.setItem('ludarp_v6_2_whatsnew_seen', 'true');
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        };
    }

    // Trigger after authentication
    window.addEventListener('mt:auth-entered', () => {
        setTimeout(showWhatsNew, 1000);
    });
})();
