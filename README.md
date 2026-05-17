# 📊 LUDARP Money Tracker — Version 6.1.5 (Stable Release)

[![v6.1.5 Release](https://img.shields.io/badge/Release-v6.1.5_Stable-10b981?style=for-the-badge&logo=rocket)](https://github.com/PRADUL-P/Ludarp-money-tracker-)
[![Offline First](https://img.shields.io/badge/PWA-Technologically_Offline-38bdf8?style=for-the-badge&logo=pwa)](https://github.com/PRADUL-P/Ludarp-money-tracker-)
[![Privacy Protected](https://img.shields.io/badge/Privacy-100%25_On_Device-34d399?style=for-the-badge&logo=shield)](https://github.com/PRADUL-P/Ludarp-money-tracker-)

> **The ultimate personal financial operating system.** 
> LUDARP is a professional-grade, privacy-first financial companion. Every byte of your data stays on your device—no cloud prying, no ads, just pure management.

---

## 🚀 Live Application

👉 [https://pradul-p.github.io/Ludarp-money-tracker-/](https://pradul-p.github.io/Ludarp-money-tracker-/)

---

## ✨ New v6.1.5 Stable Enhancements
*   🏦 **Dedicated Bank Account Column**: Upgraded Google Sheets integration with a new 13-column layout that syncs the exact mapped bank name (e.g. SBI, HDFC, or Cash) next to the payment app/type.
*   🛡️ **Double Self-Healing Columns**: Upgraded the Apps Script to automatically insert BOTH missing "Account" and "Bank" columns in existing sheets without data loss.
*   🚀 **One-Time Upgrade Release Notes popup**: Integrated a premium, one-time popup that displays key new features and celebrates updates with dynamic confetti!
*   🏷️ **Dynamic version synchronization**: Standardized index.html version parameters and global configurations to update all version displays dynamically.
*   🏦 **Real-time Finance Dropdowns**: Fixed a synchronization issue where newly added bank accounts in Settings were not dynamically populated in the Finance/Accounts initial balance selector until page refresh.
*   💳 **Card Balance mapping fix**: Corrected card transaction bank account mapping in `accounts.js` balance calculation, ensuring card purchases now perfectly update mapped bank ledger balances in real-time.
*   📊 **Google Sheets Template integration**: Embedded a pre-configured Google Sheets template directly in the in-app setup guide with a helpful warning note to copy before setup.
*   🔄 **True Bi-directional Deletion Sync**: Completely fixed Google Sheets deletion sync by resolving a local storage URL lookup bug. 
*   ⚡ **Prevent Duplicate Records**: Corrected state unticking event-propagation so checking/unchecking split bills dynamically deletes and adds rows in Google Sheets in real-time, preventing double entries.
*   📱 **Responsive Mobile FAB**: Rebuilt the middle "Entry" icon with improved touch-hit areas and capture-phase delegation for 100% reliability on mobile.
*   ⏰ **Time Visibility**: Transactions now display entry time in both the Home and Summary views for better precision.
*   🔄 **True Hard Refresh**: The "Update" button now forcefully clears Service Worker caches and unregisters old workers to ensure immediate updates.
*   🧪 **Lab Accessibility**: Added "Lab Features" directly to the main menu for faster navigation to experimental tools.
*   📅 **Subscription Sync**: Improved the Finance tab switching logic to ensure Subscription data renders correctly upon opening.

---

## 💎 Major v6.0 Official Release Features
*   🧪 **LUDARP Lab (Full Access)**: Advanced analytical hub with:
    *   *What-If Simulator*: Predict future net worth by testing hypothetical spending cuts.
    *   *Cash Flow Map*: Highly visual mapping of money movement (Rolling 30-Day View).
    *   *LUDARP Wrapped*: Animated, cinematic year-in-review financial presentation.
*   🛡️ **Navigation v2 Engine**: 100% stable capture-phase event delegation. No more broken tabs or hidden menus.
*   ⏪ **Global Undo Time-Machine**: A master log to instantly roll back accidental database changes.
*   ✨ **Premium PWA Experience**: Direct "One-Click" install shortcuts and App Status tracking.
*   💰 **Salary & Splitwise Framework**: Preliminary logic added for automated salary routing and bill splitting.
*   🔄 **Smart Refresh System**: Manual "Check for Updates" button to ensure you always have the latest code.

---

## 🚀 Major v5.9 Titanium+ Release
*   🎯 **Goals & Savings Planner**: Fixed progress bar rendering and UI sync issues for custom savings goals.
*   ✨ **Safe-to-Spend Calculator**: Updated widget logic to correctly calculate surplus after reserved goals.
*   ⚙️ **Streamlined UI Settings**: Consolidated Payments & Recurring tab directly into General Settings.

---

## 🔥 Legacy v5.0 Titanium Upgrades

*   🧾 **100% Offline OCR Scanner**: WebAssembly AI instantly reads your physical receipts to extract total amounts automatically.
*   👁️ **Liquid Wave Zen Mode**: Double-tap anywhere on the screen to blur all sensitive numbers into an unreadable liquid wave.
*   🎬 **Cinematic Depth-of-Field**: Highly performant CSS `blur` filters automatically adjust focus on active history transactions as you scroll.
*   👆 **"Tinder" Swipe-to-Settle**: Touch and swipe dues left to immediately mark them settled, or swipe right to draft a WhatsApp reminder.
*   📱 **Apple Wallet Gyro Cards**: Premium 3D-tilt physics applied to your Net Worth hero cards using the device compass/gyroscope.
*   📡 **P2P Offline Data Beam**: Pair your phone and laptop natively, and synchronize local storage arrays using an animated QR Sequence.

---

## 🛡️ Core Philosophy

> Your data belongs to you — not to servers.

- **100% Local Storage**: Everything stays in your browser's IndexedDB/LocalStorage.
- **No Login Required**: Start tracking immediately—no tracking, no ads.
- **Offline First**: Works completely offline.
- **Optional Cloud Sync**: Connect your private Google Sheets for cross-device sync.
- **Encrypted Backups**: Export manual JSON backups for peace of mind.

---

## 🧭 App Structure

- ➕ **Entry** – Add and manage transactions  
- 📊 **Summary** – Analytics and reports  
- 🤝 **Dues** – Track money you owe or are owed  
- 🏦 **Finance** – Manage bank accounts and balances  
- 🧪 **Lab** – Experimental analytics & Wrapped  
- ⚙️ **Settings** – Full customization  

---

## 👨‍💻 Author
**Pradul P**  
*Civil Engineer | Developer*  

Built with ❤️ for a better financial future.  
*Need custom updates? Reach out on [WhatsApp](https://wa.me/919497766902)*

---

## ⭐ Support
If you like this project:
- Give it a star ⭐ on GitHub  
- Share it with others  
- Use it daily to master your money  

---

## 🏁 Final Note

This is not just a tracker — it is your personal financial operating system.
