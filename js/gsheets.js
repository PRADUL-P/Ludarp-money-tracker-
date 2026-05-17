'use strict';
/* gsheets.js
   Instructions and logic for Google Sheets Integration.
   
   To use this integration, follow these steps:
   
   1. Create a Google Sheet.
   2. Click Extensions > Apps Script.
   3. Paste the following Apps Script code:
   
   --- START APPS SCRIPT ---
   function doGet(e) {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
     var data = sheet.getDataRange().getValues();
     return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
   }

   function doPost(e) {
     var ss = SpreadsheetApp.getActiveSpreadsheet();
     var entry = JSON.parse(e.postData.contents);
     var sheet = ss.getSheets()[0];
     
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Date', 'Module', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Account', 'ID', 'Status', 'Person', 'Note']);
        sheet.getRange(1, 1, 1, 12).setFontWeight("bold");
      }
      
      var data = sheet.getDataRange().getValues();
      var headers = data[0] || [];
      
      // Dynamic header mapping for backwards compatibility!
      var idColIdx = headers.indexOf('ID');
      if (idColIdx === -1) idColIdx = (headers.length >= 12) ? 8 : 7;
      
      var statusColIdx = headers.indexOf('Status');
      if (statusColIdx === -1) statusColIdx = (headers.length >= 12) ? 9 : 8;
      
      var accountColIdx = headers.indexOf('Account');
      
      if (entry.action === 'delete' && entry.id) {
        for (var i = data.length - 1; i > 0; i--) {
          if (String(data[i][idColIdx]).trim() == String(entry.id).trim()) {
            sheet.deleteRow(i + 1);
            return ContentService.createTextOutput("Success - Deleted").setMimeType(ContentService.MimeType.TEXT);
          }
        }
        return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
      }
      
      if (entry.module === 'Due Settlement' && entry.dueId) {
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][idColIdx]).trim() == String(entry.dueId).trim()) {
            sheet.getRange(i + 1, statusColIdx + 1).setValue('Settled on ' + entry.date);
            return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
          }
        }
      }
      
      var idToSave = entry.module === 'Due' ? entry.dueId : (entry.id || '');
      var status = entry.module === 'Due' ? 'Pending' : '';
      
      // Update if exists
      if (idToSave) {
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][idColIdx]).trim() == String(idToSave).trim()) {
            var rowData = [entry.date, entry.module || 'Entry', entry.type, entry.category, entry.description, entry.amount, entry.payMethod];
            if (headers.length >= 12 || accountColIdx !== -1) {
              rowData.push(entry.account || 'Cash');
            }
            rowData.push(idToSave, status, entry.person || '', entry.note || '');
            sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
            return ContentService.createTextOutput("Success - Updated").setMimeType(ContentService.MimeType.TEXT);
          }
        }
      }
      
      sheet.appendRow([entry.date, entry.module || 'Entry', entry.type, entry.category, entry.description, entry.amount, entry.payMethod, entry.account || '', idToSave, status, entry.person || '', entry.note || '']);
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
                    id: entry.id,
                    dueId: entry.dueId,
                    date: entry.dateStr || new Date().toISOString().slice(0, 10),
                    type: entry.type,
                    category: entry.category,
                    description: entry.description,
                    amount: entry.amount,
                    payMethod: entry.payMethod || '',
                    account: entry.paySubType || entry.mappedBank || 'Cash',
                    module: entry.module || 'Entry',
                    person: entry.duePerson || entry.splitRefPerson || (entry.split && entry.split.enabled ? entry.split.participants.map(p => p.name).join(', ') : ''),
                    note: entry.note || ''
                })
            });
            if (response.ok) {
                console.log('Synced to Google Sheets successfully.');
            } else {
                console.error('Failed to sync to Google Sheets.');
            }
        } catch (e) {
            console.error('Error syncing to Google Sheets:', e);
        }
    }

    async function syncDeleteToSheet(entryId) {
        const url = loadURL();
        if (!url) return;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'delete',
                    id: entryId
                })
            });
            if (response.ok) {
                console.log('Deleted from Google Sheets successfully.');
            } else {
                console.error('Failed to delete from Google Sheets.');
            }
        } catch (e) {
            console.error('Error syncing delete to Google Sheets:', e);
        }
    }

    function initUI() {
        const urlInput = document.getElementById('gsheetUrl');
        const saveBtn = document.getElementById('saveGsheetBtn');
        const setupBtn = document.getElementById('gsheetSetupBtn');
        const instructions = document.getElementById('gsheetInstructions');
        const syncAllBtn = document.getElementById('syncAllGsheetBtn');

        if (!urlInput) return;

        urlInput.value = loadURL();

        if (setupBtn && instructions) {
            setupBtn.onclick = () => {
                const isHidden = !instructions.style.display || instructions.style.display === 'none';
                instructions.style.display = isHidden ? 'block' : 'none';
                setupBtn.textContent = isHidden ? 'Hide Setup Guide' : 'Help';
            };
        }

        saveBtn.onclick = () => {
            saveURL(urlInput.value);
            window.MT.ui?.showToast('Google Sheet URL saved');
        };

        if (syncAllBtn) {
            syncAllBtn.onclick = async () => {
                const url = loadURL();
                if (!url) return alert('Please enter and save a Web App URL first!');

                const s = window.MT.db.loadStore();
                const allEntries = [];
                for (const dateK in s.days) {
                    (s.days[dateK] || []).forEach(e => {
                        allEntries.push(e);
                    });
                }

                if (allEntries.length === 0) return alert('No local entries to sync!');

                const confirmSync = confirm(`Are you sure you want to sync all ${allEntries.length} local entries to your Google Sheet?`);
                if (!confirmSync) return;

                syncAllBtn.disabled = true;
                syncAllBtn.textContent = 'Syncing...';

                let successCount = 0;
                for (let i = 0; i < allEntries.length; i++) {
                    const entry = allEntries[i];
                    syncAllBtn.textContent = `Syncing (${i + 1}/${allEntries.length})...`;
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            body: JSON.stringify({
                                id: entry.id,
                                dueId: entry.dueId,
                                date: entry.dateStr || new Date().toISOString().slice(0, 10),
                                type: entry.type,
                                category: entry.category,
                                description: entry.description,
                                amount: entry.amount,
                                payMethod: entry.payMethod || '',
                                account: entry.paySubType || entry.mappedBank || 'Cash',
                                module: entry.module || 'Entry',
                                person: entry.duePerson || entry.splitRefPerson || (entry.split && entry.split.enabled ? entry.split.participants.map(p => p.name).join(', ') : ''),
                                note: entry.note || ''
                            })
                        });
                        if (response.ok) successCount++;
                    } catch (err) {
                        console.error('Error syncing entry:', entry, err);
                    }
                }

                syncAllBtn.disabled = false;
                syncAllBtn.textContent = '📤 Sync All Existing Data';
                alert(`Successfully synced ${successCount} out of ${allEntries.length} entries to your Google Sheet!`);
            };
        }

        function showAppsScriptModal() {
            const codeText = `// Upgraded 12-Column Google Sheets Script with Deletion Sync
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var entry = JSON.parse(e.postData.contents);
  var sheet = ss.getSheets()[0];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'Module', 'Type', 'Category', 'Description', 'Amount', 'Method', 'Account', 'ID', 'Status', 'Person', 'Note']);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  
  // Automatically insert the 'Account' column if it is missing (self-healing!)
  var accountColIdx = headers.indexOf('Account');
  if (accountColIdx === -1 && headers.length > 0) {
    var methodColIdx = headers.indexOf('Method');
    var insertAtCol = (methodColIdx !== -1) ? (methodColIdx + 2) : 8; // 1-based column position
    sheet.insertColumnBefore(insertAtCol);
    sheet.getRange(1, insertAtCol).setValue('Account').setFontWeight('bold');
    
    // Reload headers and data
    data = sheet.getDataRange().getValues();
    headers = data[0] || [];
    accountColIdx = headers.indexOf('Account');
  }
  
  var idColIdx = headers.indexOf('ID');
  if (idColIdx === -1) idColIdx = 8; // Fallback to column 9 (0-indexed 8)
  
  var statusColIdx = headers.indexOf('Status');
  if (statusColIdx === -1) statusColIdx = 9; // Fallback to column 10 (0-indexed 9)
  
  // 1. Handle deletion
  if (entry.action === 'delete' && entry.id) {
    for (var i = data.length - 1; i > 0; i--) {
      if (String(data[i][idColIdx]).trim() == String(entry.id).trim()) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput('Success - Deleted').setMimeType(ContentService.MimeType.TEXT);
      }
    }
    return ContentService.createTextOutput('Success (Not found)').setMimeType(ContentService.MimeType.TEXT);
  }
  
  // 2. Handle due settlement status update
  if (entry.module === 'Due Settlement' && entry.dueId) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idColIdx]).trim() == String(entry.dueId).trim()) {
        sheet.getRange(i + 1, statusColIdx + 1).setValue('Settled on ' + entry.date);
        return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
      }
    }
  }
  
  var idToSave = entry.module === 'Due' ? entry.dueId : (entry.id || '');
  var status = entry.module === 'Due' ? 'Pending' : '';
  
  // 3. Handle edit/update
  if (idToSave) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idColIdx]).trim() == String(idToSave).trim()) {
        var rowData = [
          entry.date, 
          entry.module || 'Entry', 
          entry.type, 
          entry.category, 
          entry.description, 
          entry.amount, 
          entry.payMethod
        ];
        
        if (accountColIdx !== -1) {
          rowData.push(entry.account || 'Cash');
        }
        
        rowData.push(idToSave, status, entry.person || '', entry.note || '');
        sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
        return ContentService.createTextOutput('Success - Updated').setMimeType(ContentService.MimeType.TEXT);
      }
    }
  }
  
  // 4. Append new entry
  var newRow = [
    entry.date, 
    entry.module || 'Entry', 
    entry.type, 
    entry.category, 
    entry.description, 
    entry.amount, 
    entry.payMethod
  ];
  if (accountColIdx !== -1) {
    newRow.push(entry.account || 'Cash');
  }
  newRow.push(idToSave, status, entry.person || '', entry.note || '');
  
  sheet.appendRow(newRow);
  return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
}`;

            const backdrop = document.createElement('div');
            backdrop.style.cssText = `
              position: fixed; top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
              display: flex; align-items: center; justify-content: center;
              z-index: 100000; animation: mtFadeIn 0.3s ease;
            `;
            
            const modal = document.createElement('div');
            modal.style.cssText = `
              background: var(--card); border: 1px solid var(--card-border);
              width: 92%; max-width: 600px; border-radius: 24px;
              padding: 28px; position: relative; box-shadow: 0 25px 60px rgba(0,0,0,0.6);
              display: flex; flex-direction: column; gap: 16px;
            `;
            
            modal.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                  <span>📊</span> Google Apps Script Code
                </div>
                <button id="closeScriptModal" style="background:none; border:none; color:var(--text-secondary); font-size:22px; cursor:pointer;">&times;</button>
              </div>
              
              <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                Copy the upgraded script below and paste it into your Google Sheet's <strong>Extensions > Apps Script</strong> editor. It supports 12 columns, automatic deletion, and edit syncing!
              </div>
              
              <div style="position:relative; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid var(--card-border); padding:12px; overflow:hidden;">
                <textarea readonly id="appsScriptCodeArea" style="width:100%; height:250px; background:transparent; border:none; color:#a78bfa; font-family:Consolas, Monaco, monospace; font-size:11.5px; resize:none; outline:none; white-space:pre; overflow-x:auto; line-height:1.4;">${codeText}</textarea>
                <button id="copyScriptCodeBtn" class="btn-primary" style="position:absolute; right:12px; top:12px; padding:6px 12px; font-size:11px; width:auto; display:flex; align-items:center; gap:6px;">
                  📋 Copy Code
                </button>
              </div>
              
              <div style="font-size: 11px; color: var(--muted); text-align: center; margin-top: 4px;">
                After pasting, click <strong>Deploy > New Deployment</strong> in Google Sheets (Web App, Anyone access).
              </div>
              
              <button id="gotItScriptModal" class="btn-primary" style="width: 100%;">Got it!</button>
            `;
            
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);
            
            const closeBtn = modal.querySelector('#closeScriptModal');
            const gotItBtn = modal.querySelector('#gotItScriptModal');
            const copyBtn = modal.querySelector('#copyScriptCodeBtn');
            const codeArea = modal.querySelector('#appsScriptCodeArea');
            
            const close = () => backdrop.remove();
            closeBtn.onclick = close;
            gotItBtn.onclick = close;
            backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
            
            copyBtn.onclick = async () => {
                try {
                    codeArea.select();
                    await navigator.clipboard.writeText(codeText);
                    copyBtn.innerHTML = '✅ Code Copied!';
                    copyBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    window.MT.ui?.showToast('Apps Script copied to clipboard!');
                    setTimeout(() => {
                        copyBtn.innerHTML = '📋 Copy Code';
                        copyBtn.style.background = '';
                    }, 2500);
                } catch (err) {
                    console.error('Failed to copy', err);
                }
            };
        }

        const downloadBtn = document.getElementById('downloadManualBtn');
        if (downloadBtn) {
            downloadBtn.onclick = () => showAppsScriptModal();
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
            "  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];",
            "  var data = sheet.getDataRange().getValues();",
            "  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);",
            "}",
            "",
            "function doPost(e) {",
            "  var ss = SpreadsheetApp.getActiveSpreadsheet();",
            "  var entry = JSON.parse(e.postData.contents);",
            "  var sheet = ss.getSheets()[0];",
            "  if (sheet.getLastRow() === 0) {",
            "    sheet.appendRow(['Date', 'Module', 'Type', 'Category', 'Description', 'Amount', 'Method', 'Account', 'ID', 'Status', 'Person', 'Note']);",
            "    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');",
            "  }",
            "  if (entry.action === 'delete' && entry.id) {",
            "    var data = sheet.getDataRange().getValues();",
            "    for (var i = data.length - 1; i > 0; i--) {",
            "      if (data[i][8] == entry.id) {",
            "        sheet.deleteRow(i + 1);",
            "        return ContentService.createTextOutput('Success - Deleted').setMimeType(ContentService.MimeType.TEXT);",
            "      }",
            "    }",
            "    return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);",
            "  }",
            "  if (entry.module === 'Due Settlement' && entry.dueId) {",
            "    var data = sheet.getDataRange().getValues();",
            "    for (var i = 1; i < data.length; i++) {",
            "      if (data[i][8] === entry.dueId) {",
            "        sheet.getRange(i + 1, 10).setValue('Settled on ' + entry.date);",
            "        return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);",
            "      }",
            "    }",
            "  }",
            "  var idToSave = entry.module === 'Due' ? entry.dueId : (entry.id || '');",
            "  var status = entry.module === 'Due' ? 'Pending' : '';",
            "  if (idToSave) {",
            "    var data = sheet.getDataRange().getValues();",
            "    for (var i = 1; i < data.length; i++) {",
            "      if (data[i][8] == idToSave) {",
            "        sheet.getRange(i + 1, 1, 1, 12).setValues([[entry.date, entry.module || 'Entry', entry.type, entry.category, entry.description, entry.amount, entry.payMethod, entry.account || '', idToSave, status, entry.person || '', entry.note || '']]);",
            "        return ContentService.createTextOutput('Success - Updated').setMimeType(ContentService.MimeType.TEXT);",
            "      }",
            "    }",
            "  }",
            "  sheet.appendRow([entry.date, entry.module || 'Entry', entry.type, entry.category, entry.description, entry.amount, entry.payMethod, entry.account || '', idToSave, status, entry.person || '', entry.note || '']);",
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
    window.addEventListener('DOMContentLoaded', initUI);
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initUI();
    }
    // Listen for new entries to sync
    window.addEventListener('mt:entry-added', (e) => {
        syncToSheet(e.detail);
    });
    
    // Listen for deleted entries
    window.addEventListener('mt:entry-deleted', (e) => {
        if (e.detail && e.detail.id) {
            syncDeleteToSheet(e.detail.id);
        }
    });

})();
