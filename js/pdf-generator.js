'use strict';
/* pdf-generator.js - Generates beautiful PDF statements entirely offline */

(function () {
    function generatePDF() {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF Library is still loading. Please try again in a few seconds.');
            return;
        }

        // Show loading state
        const btn = document.getElementById('summaryPdfBtn');
        const oldText = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '⏳ Generating...';

        setTimeout(() => {
            try {
                const mode = document.getElementById('dateMode')?.value || 'month';
                const monthVal = document.getElementById('monthPicker')?.value;
                const dayVal = document.getElementById('dayPicker')?.value;
                
                let titleDate = 'Custom Period';
                if (mode === 'month' && monthVal) {
                    const d = new Date(monthVal + '-01');
                    titleDate = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                } else if (mode === 'day' && dayVal) {
                    titleDate = window.MT.db.formatDateLabel(dayVal);
                } else if (mode === 'all') {
                    titleDate = 'All Time History';
                } else if (mode === 'year') {
                    const yearVal = document.getElementById('yearPicker')?.value;
                    titleDate = yearVal ? `Year ${yearVal}` : 'Annual Report';
                }

                // Safely get text and replace Rupee symbol with 'Rs.' to avoid jsPDF encoding issues
                const safeCurrency = (str) => {
                    return (str || '').replace(/₹/g, 'Rs. ').replace(/[^\x00-\x7F]/g, '').trim();
                };

                const exp = safeCurrency(document.getElementById('monthSumExpense')?.textContent);
                const inc = safeCurrency(document.getElementById('monthSumIncome')?.textContent);
                const bal = safeCurrency(document.getElementById('trueBalanceValue')?.textContent);

                const doc = new window.jspdf.jsPDF();
                
                // Header Background
                const c = window.MT.db.loadCustom();
                const hexColor = c.accent || '#38bdf8';
                
                // Convert hex to RGB for jsPDF
                let r = 56, g = 189, b = 248; // default fallback
                const hexMatch = hexColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
                if (hexMatch) {
                    r = parseInt(hexMatch[1], 16);
                    g = parseInt(hexMatch[2], 16);
                    b = parseInt(hexMatch[3], 16);
                }

                doc.setFillColor(r, g, b); 
                doc.rect(0, 0, 210, 40, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.text('LUDARP Money Tracker', 14, 20);
                
                doc.setFontSize(12);
                doc.text(`Financial Statement - ${titleDate}`, 14, 30);
                
                // Summary Cards
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.text(`Total Expense: ${exp}`, 14, 50);
                doc.text(`Total Income: ${inc}`, 80, 50);
                doc.text(`True Balance: ${bal}`, 140, 50);
                
                doc.setDrawColor(200, 200, 200);
                doc.line(14, 55, 196, 55); // Divider

                // Parse History from DOM
                const historyEl = document.getElementById('summaryHistory');
                const rows = [];
                let currentDateGroup = 'N/A';
                
                if (historyEl) {
                    Array.from(historyEl.children).forEach(el => {
                        if (el.classList.contains('history-group-header')) {
                            const groupText = el.querySelector('span')?.textContent || '';
                            currentDateGroup = safeCurrency(groupText);
                        } else if (el.classList.contains('entry')) {
                            const titleText = el.querySelector('.entry-title')?.textContent || '';
                            // Strip emojis and non-ascii
                            const cleanedTitle = titleText.replace(/[^\x00-\x7F]/g, "").replace(/^\d+\.\s*/, '').trim() || 'Entry';
                            
                            const metaText = el.querySelector('.entry-meta')?.textContent || '';
                            const cleanedMeta = metaText.replace(/[^\x00-\x7F]/g, "").trim();

                            const amtNode = el.querySelector('.entry-amount');
                            const amtText = safeCurrency(amtNode?.textContent);
                            
                            rows.push([
                                currentDateGroup,
                                cleanedTitle,
                                cleanedMeta,
                                amtText
                            ]);
                        }
                    });
                }

                if (rows.length === 0) {
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text("No transactions found for this period.", 14, 65);
                } else {
                    // Add table using autotable plugin
                    doc.autoTable({
                        startY: 65,
                        head: [['Date / Group', 'Description', 'Category & Method', 'Amount']],
                        body: rows,
                        theme: 'striped',
                        headStyles: { fillColor: [r, g, b] },
                        styles: { fontSize: 9, cellPadding: 4, textColor: [40, 40, 40] },
                        columnStyles: {
                            3: { halign: 'right', fontStyle: 'bold' }
                        }
                    });
                }

                // Footer
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Generated securely offline by LUDARP \u2022 Page ${i} of ${pageCount}`, 105, 290, null, null, 'center');
                }

                const fileName = `LUDARP_Statement_${titleDate.replace(/ /g, '_')}.pdf`;
                doc.save(fileName);
                
                if (window.MT && window.MT.ui) {
                    window.MT.ui.showToast('PDF Generated Successfully!');
                }
            } catch (err) {
                console.error("PDF Gen Error:", err);
                alert("Failed to generate PDF. Make sure you have some data to export.");
            } finally {
                if (btn) btn.innerHTML = oldText;
            }
        }, 100);
    }

    window.PDFGenerator = { generatePDF };
})();
