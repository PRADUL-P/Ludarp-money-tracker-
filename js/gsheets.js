'use strict';
/* gsheets.js
   Instructions and logic for Google Sheets Integration.
   
   To use this integration, follow these steps:
   
   1. Create a Google Sheet.
   2. Click Extensions > Apps Script.
   3. Paste the following Apps Script code:
   
   --- START APPS SCRIPT ---
   function doGet(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var data = sheet.getDataRange().getValues();
     return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
   }

   function doPost(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var entry = JSON.parse(e.postData.contents);
     sheet.appendRow([entry.date, entry.type, entry.category, entry.description, entry.amount, entry.payMethod]);
     return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
   }
   --- END APPS SCRIPT ---
   
   4. Deploy as a Web App (Anyone can access).
   5. Copy the Deployment URL and paste it into the Settings page below.
*/

(function () {
    const STORAGE_KEY = 'mt_gsheet_url';

    function loadURL() {
        return localStorage.getItem(STORAGE_KEY) || '';
    }

    function saveURL(url) {
        localStorage.setItem(STORAGE_KEY, url);
    }

    async function syncToSheet(entry) {
        const url = loadURL();
        if (!url) return;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    date: entry.dateStr || new Date().toISOString().slice(0, 10),
                    type: entry.type,
                    category: entry.category,
                    description: entry.description,
                    amount: entry.amount,
                    payMethod: entry.payMethod
                })
            });
            if (response.ok) {
                window.MT.ui?.showToast('Synced to Google Sheets!', 'success');
            }
        } catch (e) {
            console.error('Sheet sync failed', e);
        }
    }

    function initUI() {
        const urlInput = document.getElementById('gsheetUrl');
        const saveBtn = document.getElementById('saveGsheetBtn');
        const setupBtn = document.getElementById('gsheetSetupBtn');
        const instructions = document.getElementById('gsheetInstructions');

        if (!urlInput) return;

        urlInput.value = loadURL();

        if (setupBtn && instructions) {
            setupBtn.onclick = () => {
                const isHidden = instructions.style.display === 'none';
                instructions.style.display = isHidden ? 'block' : 'none';
                setupBtn.textContent = isHidden ? 'Hide Setup Guide' : 'View Setup Guide';
            };
        }

        saveBtn.onclick = () => {
            saveURL(urlInput.value);
            window.MT.ui?.showToast('Google Sheet URL saved');
        };

        const downloadBtn = document.getElementById('downloadManualBtn');
        if (downloadBtn) {
            downloadBtn.onclick = () => exportManualPDF();
        }
    }

    function exportManualPDF() {
        if (!window.jspdf) return alert('PDF library not loaded');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235);
        doc.text('Money Tracker - User Manual', 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Google Sheets Integration Guide', 14, 32);

        doc.setFontSize(10);
        const instructions = [
            "1. Create a new Google Sheet at sheets.new",
            "2. Go to Extensions > Apps Script",
            "3. Delete any existing code and paste the code block below",
            "4. Click Deploy > New Deployment",
            "5. Select type 'Web App', execute as 'Me', access 'Anyone'",
            "6. Copy the Web App URL and paste it into the App Settings"
        ];
        doc.text(instructions, 14, 42);

        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text('Apps Script Code (Copy this):', 14, 80);

        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const code = [
            "function doGet(e) {",
            "  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();",
            "  var data = sheet.getDataRange().getValues();",
            "  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);",
            "}",
            "",
            "function doPost(e) {",
            "  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();",
            "  var entry = JSON.parse(e.postData.contents);",
            "  sheet.appendRow([entry.date, entry.type, entry.category, entry.description, entry.amount, entry.payMethod]);",
            "  return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);",
            "}"
        ];
        doc.text(code, 14, 90);

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Developer Support: WhatsApp +91 9497766902', 14, 160);

        doc.save('Money_Tracker_User_Manual.pdf');
    }

    window.MT = window.MT || {};
    window.MT.gsheets = {
        syncToSheet,
        initUI
    };

    window.addEventListener('mt:auth-entered', initUI);
    // Listen for new entries to sync
    document.addEventListener('mt:entry-added', (e) => {
        syncToSheet(e.detail);
    });

})();
