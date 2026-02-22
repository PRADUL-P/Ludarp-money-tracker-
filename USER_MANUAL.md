# LUDARP Money Tracker - User Manual & Developer Instruction

## 🌟 Introduction
LUDARP Money Tracker is a premium, offline-first personal finance application. It allows you to track expenses, manage budgets, split bills, and sync data to Google Sheets—all while keeping your data secured on your device.

## 🛠️ Google Sheets Integration Setup
To sync your transactions to a private Google Sheet automatically, follow these steps:

1.  **Create a Google Sheet**: Open [sheets.new](https://sheets.new) and create a new spreadsheet.
2.  **Open Apps Script**: Go to **Extensions > Apps Script**.
3.  **Paste the Code**: Delete any existing code and paste the following:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var entry = JSON.parse(e.postData.contents);
  // Date, Type, Category, Description, Amount, Payment Method
  sheet.appendRow([entry.date, entry.type, entry.category, entry.description, entry.amount, entry.payMethod]);
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
```

4.  **Deploy**: 
    - Click **Deploy > New Deployment**.
    - Select **Web App**.
    - Description: `Money Tracker Sync`.
    - Execute as: **Me**.
    - Who has access: **Anyone** (This is required for the app to talk to the sheet).
5.  **Copy URL**: Copy the **Web App URL** provided after deployment.
6.  **Enter in App**: In the Money Tracker App, go to **Settings > Google Sheets Sync** and paste the URL.

---

## 📞 Support & Customization
If you need any of the following:
- Help setting up the Google Sheet.
- Custom features or updates to the app.
- Commercial usage or advanced reporting.

**Contact the Developer via WhatsApp:**
[Click here to Chat](https://wa.me/919497766902?text=Hello%20Developer%2C%20I%20am%20using%20the%20LUDARP%20Money%20Tracker.%20I%20need%20help%20with%20the%20Google%20Sheets%20setup%20/%20Custom%20updates.)
**WhatsApp Number:** +91 9497766902

---

## 🔒 Privacy Note
Your financial data is stored **locally** on your browser. It is only shared with Google Sheets if you explicitly provide a Web App URL. The developer does not have access to your data unless you share your sheet with them.
