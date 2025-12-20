// Project Links
const GITHUB_URL = 'https://github.com/2005czq/AAssistant';
const DEMO_URL = 'https://2005czq.github.io/AAssistant';

const i18n = {
    en: {
        page_title: "AAssistant - Bill Splitter",
        members_title: "Members",
        demo: "Example",
        clear: "Clear",
        details: "Details",
        bills_title: "Bills",
        add: "+",
        payer: "Payer",
        reason: "Reason",
        type: "Type",
        amount: "Amount",
        result_title: "Settlement",
        transfer: "{from} → {amount} → {to}",
        error_fix_first: "Please complete the red-circled items first~",
        placeholder_new_member: "+ Add",
        confirm_clear_title: "Clear All?",
        confirm_clear_body: "All members and bills will be deleted.",
        btn_yes: "Yes",
        btn_no: "Cancel",
        details_title: "Bill Details",
        btn_copy: "Copy",
        btn_close: "Close",
        btn_download_image: "Download Image",
        copied: "Copied!",
        bill_pays_for: "{payer} pays for {reason}:",
        should_pay: "  {name} owes {amount}",
        settlement_title: "Settlement",
        should_transfer: "{from} should transfer {amount} to {to}",
        details_bill_title: "Bill Details",
        footer_made_with: "Made with ❤️ by AAssistant",
        footer_qr_text: "Create your bill",
        type_AA: "Split Equally",
        type_Join: "Only Selected",
        type_Remove: "Except Selected",
        type_Distribution: "By Amount",
        type_Ratio: "By Shares",
        scroll_hint: "Scroll for more",
        edit: "Edit",
        done: "Done",
        no_transfer: "No transfers needed, all settled!"
    },
    zh: {
        page_title: "AAssistant - 账单分摊",
        members_title: "成员",
        demo: "示例",
        clear: "清空",
        details: "详情",
        bills_title: "账单",
        add: "+",
        payer: "付款人",
        reason: "原因",
        type: "类型",
        amount: "金额",
        result_title: "结算方案",
        transfer: "{from} → {amount} → {to}",
        error_fix_first: "请先完成红圈标记的内容哦~",
        placeholder_new_member: "+ 添加",
        confirm_clear_title: "确认清空？",
        confirm_clear_body: "所有成员和账单都将被删除。",
        btn_yes: "确认",
        btn_no: "取消",
        details_title: "账单详情",
        btn_copy: "复制",
        btn_close: "关闭",
        btn_download_image: "下载图片",
        copied: "已复制！",
        bill_pays_for: "{payer} 支付了 {reason}：",
        should_pay: "  {name} 应付 {amount}",
        settlement_title: "结算方案",
        should_transfer: "{from} 应转账 {amount} 给 {to}",
        details_bill_title: "账单详情",
        footer_made_with: "由 AAssistant 用 ❤️ 生成",
        footer_qr_text: "创作你的账单",
        type_AA: "平均分摊",
        type_Join: "仅选中平摊",
        type_Remove: "排除选中平摊",
        type_Distribution: "自定义分摊",
        type_Ratio: "按比例分摊",
        scroll_hint: "下滑查看更多",
        edit: "编辑",
        done: "完成",
        no_transfer: "无需转账，已全部结清！"
    }
};

let currentLang = 'en';
let currentTheme = 'light';
let members = [];
let bills = [];

const ICON_PENCIL = `<svg viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const ICON_GITHUB = `<svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
const ICON_BARS = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/></svg>`;

let isEditMode = false;

// Mobile detection - check for touchscreen devices
function isMobileDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

// DOM Elements
const langToggle = document.getElementById('lang-toggle');
const themeToggle = document.getElementById('theme-toggle');
const githubBtn = document.getElementById('github-btn');
const memberListContainer = document.getElementById('member-list-container');
const addMemberInput = document.getElementById('add-member-input');
const billList = document.getElementById('bill-list');
const resultContainer = document.getElementById('result-container');
const demoBtn = document.getElementById('demo-btn');
const clearBtn = document.getElementById('clear-btn');
const detailsBtn = document.getElementById('details-btn');
const addBillBtn = document.getElementById('add-bill-btn');
const editBtn = document.getElementById('edit-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');

// Hidden element for measuring text width
let textMeasurer = null;

function getTextWidth(text) {
    if (!textMeasurer) {
        textMeasurer = document.createElement('span');
        textMeasurer.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--font-main);font-size:1.1rem;';
        document.body.appendChild(textMeasurer);
    }
    textMeasurer.textContent = text;
    return textMeasurer.offsetWidth + 4; // +4px padding
}

// Detect system language (Chinese regions use zh)
function detectSystemLanguage() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const lower = lang.toLowerCase();
    // Mainland China, Hong Kong, Macau, Taiwan
    if (lower.startsWith('zh') || lower === 'zh-cn' || lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') {
        return 'zh';
    }
    return 'en';
}

// Detect system theme
function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function init() {
    loadFromStorage();
    applyTheme();
    updateLang();
    renderMembers();
    renderBillList();
    renderNewBillRow();
    calculate();

    addMemberInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addMember(e.target.value);
            e.target.value = '';
        }
    });

    addBillBtn.addEventListener('click', addNewBill);
    demoBtn.addEventListener('click', loadDemoData);
    clearBtn.addEventListener('click', showClearConfirmModal);
    detailsBtn.addEventListener('click', showDetailsModal);
    if (editBtn) editBtn.addEventListener('click', toggleEditMode);

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveToStorage();
    });

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'zh' : 'en';
        langToggle.querySelector('.lang-text').textContent = currentLang === 'en' ? '中' : 'En';
        updateLang();
        renderNewBillRow();
        renderBillList();
        calculate();
        saveToStorage();
    });

    githubBtn.addEventListener('click', () => {
        window.open(GITHUB_URL, '_blank');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });

    setupDragAndDrop();
}

function applyTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    const iconMoon = themeToggle.querySelector('.icon-moon');
    const iconSun = themeToggle.querySelector('.icon-sun');
    if (currentTheme === 'light') {
        iconMoon.classList.remove('hidden');
        iconSun.classList.add('hidden');
    } else {
        iconMoon.classList.add('hidden');
        iconSun.classList.remove('hidden');
    }
}

function updateLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.id === 'edit-btn') {
            el.textContent = isEditMode ? t('done') : t('edit');
        } else if (i18n[currentLang][key]) {
            el.textContent = i18n[currentLang][key];
        }
    });
    addMemberInput.placeholder = t('placeholder_new_member');
    const newReason = document.getElementById('new-reason');
    if (newReason) newReason.placeholder = currentLang === 'zh' ? '事由' : 'Reason';

    // Update page title
    document.title = t('page_title');

    // Update data-label attributes for responsive design (e.g. in new bill row)
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-label');
        el.dataset.label = t(key);
    });
}

function t(key, params = {}) {
    let str = i18n[currentLang][key] || key;
    for (const [k, v] of Object.entries(params)) str = str.replace(`{${k}}`, v);
    return str;
}

// Get type labels for dropdown
function getTypeOptions() {
    return [
        { value: 'AA', label: t('type_AA') },
        { value: 'Join', label: t('type_Join') },
        { value: 'Remove', label: t('type_Remove') },
        { value: 'Ratio', label: t('type_Ratio') },
        { value: 'Distribution', label: t('type_Distribution') }
    ];
}

function getTypeLabel(type) {
    return t('type_' + type);
}

// Get current time formatted
function getCurrentTimeFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

// --- Modal System ---
function showModal(title, bodyHtml, actions, isLarge = false) {
    modalContent.className = 'modal-content' + (isLarge ? ' modal-large' : '');

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.textContent = action.text;
        btn.className = action.className || '';
        btn.onclick = action.onclick;
        actionsContainer.appendChild(btn);
    });

    requestAnimationFrame(() => {
        modalOverlay.classList.add('active');
    });
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

function showClearConfirmModal() {
    showModal(
        t('confirm_clear_title'),
        `<p>${t('confirm_clear_body')}</p>`,
        [
            { text: t('btn_yes'), className: 'btn-danger', onclick: () => { clearAll(); closeModal(); } },
            { text: t('btn_no'), onclick: closeModal }
        ],
        false
    );
}

function showDetailsModal() {
    const currentTime = getCurrentTimeFormatted();
    const { billSection, settlementSection } = generateBillTextSections();

    // Construct full text matching the display exactly
    const titleBill = t('details_bill_title');
    const titleSettlement = t('settlement_title');

    let fullText = `${currentTime}\n\n${titleBill}\n${billSection}`;
    if (settlementSection && settlementSection !== t('type_AA')) { // Basic check, actually we want to check if it's the "No transfers" message?
        // Usage logic: The text box shows "Settlement" title if settlementSection exists.
        // We should follow the display logic (Lines 313-314)
        fullText += `\n\n${titleSettlement}\n${settlementSection}`;
    }

    const bodyHtml = `
        <div class="bill-text-output" id="bill-text-output">
<div class="details-time">${currentTime}</div>
<div class="details-section-title">${t('details_bill_title')}</div>
${escapeHtml(billSection)}
${settlementSection ? `<div class="details-section-title" style="margin-top:1rem;">${t('settlement_title')}</div>
${escapeHtml(settlementSection)}` : ''}
        </div>
        <div class="scroll-hint" id="scroll-hint">↓ ${t('scroll_hint')}</div>
        <div class="modal-actions">
            <button id="copy-btn">${t('btn_copy')}</button>
            <button id="download-image-btn">${t('btn_download_image')}</button>
            <button onclick="closeModal()">${t('btn_close')}</button>
        </div>
    `;

    showModal(t('details_title'), bodyHtml, [], true);

    const textOutput = document.getElementById('bill-text-output');
    const scrollHint = document.getElementById('scroll-hint');

    const checkScroll = () => {
        if (textOutput.scrollHeight > textOutput.clientHeight) {
            scrollHint.style.visibility = 'visible';
            if (textOutput.scrollTop + textOutput.clientHeight >= textOutput.scrollHeight - 5) {
                scrollHint.style.visibility = 'hidden';
            }
        } else {
            scrollHint.style.visibility = 'hidden';
        }
    };

    textOutput.addEventListener('scroll', checkScroll);
    setTimeout(checkScroll, 0); // Check initially

    // Setup copy button - changes text and color
    const copyBtn = document.getElementById('copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(fullText).then(() => {
            copyBtn.textContent = t('copied');
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 500);
        });
    };

    // Setup download image button
    document.getElementById('download-image-btn').onclick = () => {
        generateAndDownloadImage(currentTime, billSection, settlementSection);
    };
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

// Generate bill details text sections (bill details and settlement separately)
// Helper to truncate numbers to 7 digits with ellipsis
function formatNumberDisplay(num) {
    const str = num.toFixed(2);
    if (str.length > 7) {
        return str.substring(0, 7) + '…';
    }
    return str;
}

function generateBillTextSections() {
    let billSection = '';
    let hasAnyBill = false;

    // Bill details
    bills.forEach(bill => {
        if (!bill.payer || !members.includes(bill.payer)) return;
        if (!bill.amount || bill.amount <= 0) return;

        let shouldPayLines = '';

        let involved = [];
        if (bill.type === 'AA') involved = [...members];
        else if (bill.type === 'Join') involved = bill.involved.filter(m => members.includes(m));
        else if (bill.type === 'Remove') involved = members.filter(m => !(bill.involved || []).includes(m));

        if (bill.type === 'Distribution') {
            for (const [name, val] of Object.entries(bill.distribution)) {
                if (name === bill.payer || !members.includes(name) || val <= 0) continue;
                shouldPayLines += `    · ${t('should_pay', { name, amount: val.toFixed(2) }).trim()}\n`;
            }
        } else if (bill.type === 'Ratio') {
            const shares = calculateRatioShares(bill);
            for (const [name, val] of Object.entries(shares)) {
                if (val <= 0) continue;
                shouldPayLines += `    · ${t('should_pay', { name, amount: val.toFixed(2) }).trim()}\n`;
            }
        } else {
            const count = involved.length;
            if (count > 0) {
                const share = Math.ceil(bill.amount * 100 / count) / 100;
                involved.forEach(name => {
                    if (name === bill.payer) return;
                    shouldPayLines += `    · ${t('should_pay', { name, amount: share.toFixed(2) }).trim()}\n`;
                });
            }
        }

        // Only add this bill if there are debts to show
        if (shouldPayLines) {
            billSection += t('bill_pays_for', { payer: bill.payer, reason: bill.reason }) + '\n';
            billSection += shouldPayLines;
            hasAnyBill = true;
        }
    });

    if (!hasAnyBill) {
        billSection = currentLang === 'zh' ? '没有产生账单' : 'No bills generated';
    }

    // Settlement (transfers)
    let settlementSection = '';
    const transfers = calculateTransfers();
    if (transfers.length > 0) {
        transfers.forEach(tr => {
            settlementSection += `· ${t('should_transfer', { from: tr.from, to: tr.to, amount: tr.amount })}\n`;
        });
    } else {
        settlementSection = t('no_transfer');
    }

    return { billSection: billSection.trim(), settlementSection: settlementSection.trim() };
}

// Generate image with bill details
function generateAndDownloadImage(currentTime, billSection, settlementSection) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate text lines
    const titleBill = t('details_bill_title');
    const titleSettlement = t('settlement_title');
    const footer = t('footer_made_with');

    // Canvas sizing
    const padding = 40;
    const lineHeight = 26;
    const titleLineHeight = 36;
    const footerHeight = 140;
    const qrSize = 60;
    const width = 500;
    const maxTextWidth = width - padding * 2;

    // Helper function to wrap text with optional indent for continuation lines
    function wrapText(text, font, maxWidth, indentContinuation = '') {
        ctx.font = font;
        const words = text.split('');
        const lines = [];
        let currentLine = '';
        let isFirstLine = true;

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                // For continuation lines, add indent
                currentLine = isFirstLine ? indentContinuation + words[i] : indentContinuation + words[i];
                isFirstLine = false;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    // Prepare lines with type info for layout
    const allLines = [];

    // Time
    allLines.push({ text: currentTime, type: 'time' });
    allLines.push({ text: '', type: 'gap' });

    // Bill section title
    allLines.push({ text: titleBill, type: 'title' });
    billSection.split('\n').forEach(line => {
        if (line.trim()) {
            // Check if line starts with spaces and bullet - bill section uses 6-space indent
            allLines.push({ text: line, type: line.trim().startsWith('·') ? 'bullet-bill' : 'normal' });
        }
    });

    // Settlement section
    if (settlementSection) {
        allLines.push({ text: '', type: 'gap' });
        allLines.push({ text: titleSettlement, type: 'title' });
        settlementSection.split('\n').forEach(line => {
            if (line.trim()) {
                // Settlement uses 2-space indent for wrap
                allLines.push({ text: line, type: line.trim().startsWith('·') ? 'bullet-settle' : 'normal' });
            }
        });
    }

    // First pass: calculate total height with text wrapping
    ctx.font = '18px "CustomHandwriting", cursive, sans-serif';
    let totalHeight = padding;
    const wrappedLines = [];

    allLines.forEach(item => {
        if (item.type === 'gap') {
            wrappedLines.push({ lines: [''], type: 'gap', lineHeight: 16 });
        } else if (item.type === 'time') {
            wrappedLines.push({ lines: [item.text], type: 'time', lineHeight: 30 });
        } else if (item.type === 'title') {
            wrappedLines.push({ lines: [item.text], type: 'title', lineHeight: titleLineHeight });
        } else {
            const font = '18px "CustomHandwriting", cursive, sans-serif';
            // Different indent for bill vs settlement bullets
            let indent = '';
            if (item.type === 'bullet-bill') {
                indent = '      '; // 6 spaces for bill section (4 leading + bullet alignment)
            } else if (item.type === 'bullet-settle') {
                indent = '  '; // 2 spaces for settlement (just bullet alignment)
            }
            const wrapped = wrapText(item.text, font, maxTextWidth, indent);
            wrappedLines.push({ lines: wrapped, type: item.type, lineHeight: lineHeight });
        }
    });

    wrappedLines.forEach(item => {
        totalHeight += item.lineHeight * item.lines.length;
    });
    totalHeight += footerHeight + padding;

    // Scale for high resolution (2x)
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, width, totalHeight);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < totalHeight; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, totalHeight);
        ctx.stroke();
    }

    // Draw text
    ctx.fillStyle = '#3a3026';
    let y = padding + 20;

    wrappedLines.forEach(item => {
        item.lines.forEach((line, lineIdx) => {
            if (item.type === 'time') {
                ctx.font = '16px "CustomHandwriting", cursive, sans-serif';
                ctx.fillStyle = '#888';
                ctx.fillText(line, padding, y);
                ctx.fillStyle = '#3a3026';
                // Dashed separator under time
                // ctx.beginPath();
                // ctx.setLineDash([5, 5]);
                // ctx.strokeStyle = '#ccc';
                // ctx.moveTo(padding, y + 8);
                // ctx.lineTo(width - padding, y + 8);
                // ctx.stroke();
                // ctx.setLineDash([]);
            } else if (item.type === 'title') {
                ctx.font = 'bold 20px "CustomHandwriting", cursive, sans-serif';
                ctx.fillStyle = '#3a3026';
                ctx.fillText(line, padding, y);
                // Dashed underline for title - moved down a bit
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = '#c8b8a0';
                ctx.moveTo(padding, y + 10);
                ctx.lineTo(width - padding, y + 10);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (item.type === 'gap') {
                // Just advance Y
            } else {
                ctx.font = '18px "CustomHandwriting", cursive, sans-serif';
                ctx.fillStyle = '#3a3026';
                ctx.fillText(line, padding, y);
            }
            y += item.lineHeight;
        });
    });

    // Footer line
    const footerY = totalHeight - footerHeight + 20;
    ctx.strokeStyle = '#a08060';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padding, footerY);
    ctx.lineTo(width - padding, footerY);
    ctx.stroke();

    // Footer text
    ctx.font = '14px "CustomHandwriting", cursive, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(footer, padding, footerY + 30);

    // Draw QR code for demo link at bottom right
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        const qrCanvas = document.createElement('canvas');
        QRCode.toCanvas(qrCanvas, DEMO_URL, {
            width: qrSize,
            margin: 0,
            color: { dark: '#3a3026', light: '#fdfbf7' }
        }, function(error) {
            if (!error) {
                ctx.drawImage(qrCanvas, width - padding - qrSize - 30, footerY + 20, qrSize, qrSize);

                // QR label
                ctx.font = '12px "CustomHandwriting", cursive, sans-serif';
                ctx.fillStyle = '#888';
                ctx.textAlign = 'center';
                const qrCenterX = width - padding - qrSize - 30 + qrSize / 2;
                ctx.fillText(t('footer_qr_text'), qrCenterX, footerY + qrSize + 35);
                ctx.textAlign = 'left';

                downloadCanvas(canvas);
            } else {
                downloadCanvas(canvas);
            }
        });
    } else {
        downloadCanvas(canvas);
    }
}

function downloadCanvas(canvas) {
    const link = document.createElement('a');
    link.download = 'bill-details.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Calculate transfers (extracted from calculate() for reuse)
function calculateTransfers() {
    // Check for errors first
    let hasErrors = false;
    bills.forEach(bill => {
        if (!bill.payer || !members.includes(bill.payer)) hasErrors = true;
        if (!bill.amount || bill.amount <= 0) hasErrors = true;
        if (bill.type === 'Distribution') {
            for (const val of Object.values(bill.distribution)) {
                if (val < 0) hasErrors = true;
            }
        }
        if ((bill.type === 'Join' || bill.type === 'Remove') && (!bill.involved || bill.involved.length === 0)) {
            hasErrors = true;
        }
    });

    if (hasErrors || members.length === 0 || bills.length === 0) {
        return [];
    }

    let balances = {};
    members.forEach(m => balances[m] = 0);

    bills.forEach(bill => {
        const payer = bill.payer;
        const amountCents = Math.round(bill.amount * 100);

        if (bill.type === 'Distribution') {
            for (const [name, val] of Object.entries(bill.distribution)) {
                if (name === bill.payer || !members.includes(name)) continue;
                const shareCents = Math.ceil(val * 100);
                balances[name] -= shareCents;
                balances[payer] += shareCents;
            }
        } else if (bill.type === 'Ratio') {
            const shares = calculateRatioShares(bill);
            for (const [name, val] of Object.entries(shares)) {
                const shareCents = Math.ceil(val * 100);
                balances[name] -= shareCents;
                balances[payer] += shareCents;
            }
        } else {
            let involved = [];
            if (bill.type === 'AA') involved = [...members];
            else if (bill.type === 'Join') involved = bill.involved.filter(m => members.includes(m));
            else if (bill.type === 'Remove') involved = members.filter(m => !(bill.involved || []).includes(m));

            const count = involved.length;
            if (count > 0) {
                const shareCents = Math.ceil(amountCents / count);
                involved.forEach(name => {
                    if (name === payer) return;
                    balances[name] -= shareCents;
                    balances[payer] += shareCents;
                });
            }
        }
    });

    let sortedMembers = Object.keys(balances)
        .map(name => ({ name, balance: balances[name] }))
        .filter(m => m.balance !== 0)
        .sort((a, b) => a.balance - b.balance);

    let transfers = [];
    let sum = 0;

    for (let i = 0; i < sortedMembers.length - 1; i++) {
        sum -= sortedMembers[i].balance;
        if (Math.abs(sum) < 0.01) continue;
        transfers.push({
            from: sortedMembers[i].name,
            to: sortedMembers[i + 1].name,
            amount: (sum / 100).toFixed(2)
        });
    }

    return transfers;
}

// --- Storage ---
function saveToStorage() {
    localStorage.setItem('aassistant_data', JSON.stringify({ members, bills, currentLang, currentTheme }));
}

function loadFromStorage() {
    try {
        const data = JSON.parse(localStorage.getItem('aassistant_data'));
        if (data) {
            members = data.members || [];
            bills = data.bills || [];
            currentLang = data.currentLang || detectSystemLanguage();
            currentTheme = data.currentTheme || detectSystemTheme();
            langToggle.querySelector('.lang-text').textContent = currentLang === 'en' ? '中' : 'En';
        } else {
            // First time - detect system settings
            currentLang = detectSystemLanguage();
            currentTheme = detectSystemTheme();
            langToggle.querySelector('.lang-text').textContent = currentLang === 'en' ? '中' : 'En';
        }
    } catch (e) {
        console.error('Load error:', e);
        // Fallback to system detection
        currentLang = detectSystemLanguage();
        currentTheme = detectSystemTheme();
    }
}

function clearAll() {
    members = [];
    bills = [];
    localStorage.removeItem('aassistant_data');
    renderMembers();
    renderBillList();
    renderNewBillRow();
    calculate();
}

// --- Members Logic ---
const MAX_MEMBER_NAME_LENGTH = 8;

function addMember(name) {
    name = name.trim();
    if (!name || members.includes(name)) return;
    // Limit name length
    if (name.length > MAX_MEMBER_NAME_LENGTH) {
        name = name.substring(0, MAX_MEMBER_NAME_LENGTH);
    }
    if (members.includes(name)) return; // Check again after truncation
    members.push(name);
    renderMembers();
    renderNewBillRow();
    renderBillList();
    calculate();
    saveToStorage();
}

function removeMember(name) {
    members = members.filter(m => m !== name);
    bills.forEach(bill => {
        if (bill.payer === name) bill.payer = '';
        if (bill.involved) bill.involved = bill.involved.filter(m => m !== name);
        if (bill.distribution) delete bill.distribution[name];
    });
    renderMembers();
    renderNewBillRow();
    renderBillList();
    calculate();
    saveToStorage();
}

// --- Demo Data ---
function loadDemoData() {
    if (currentLang === 'zh') {
        members = ['崔芷琪', '温慧雯', '聂梦冉', '刘苏珍'];
        bills = [
            { id: 1, payer: '崔芷琪', reason: '火锅', type: 'Join', amount: 139, involved: ['崔芷琪', '温慧雯', '聂梦冉'], distribution: {}, ratios: {} },
            { id: 2, payer: '温慧雯', reason: '甜点', type: 'Distribution', amount: 33, involved: [], distribution: {'崔芷琪': 15, '温慧雯': 18, '聂梦冉': 0, '刘苏珍': 0}, ratios: {} },
            { id: 3, payer: '聂梦冉', reason: '网约车', type: 'AA', amount: 17.72, involved: [], distribution: {}, ratios: {} },
            { id: 4, payer: '温慧雯', reason: '饮品', type: 'Remove', amount: 25.8, involved: ['聂梦冉'], distribution: {}, ratios: {} },
            { id: 5, payer: '刘苏珍', reason: '烧烤', type: 'Ratio', amount: 200, involved: [], distribution: {}, ratios: {'崔芷琪': 1, '温慧雯': 2, '聂梦冉': 1, '刘苏珍': 1} }
        ];
    } else {
        members = ['Alice', 'Bob', 'Charlie', 'David'];
        bills = [
            { id: 1, payer: 'Alice', reason: 'Hotpot', type: 'Join', amount: 139, involved: ['Alice', 'Bob', 'Charlie'], distribution: {}, ratios: {} },
            { id: 2, payer: 'Bob', reason: 'Dessert', type: 'Distribution', amount: 33, involved: [], distribution: {'Alice': 15, 'Bob': 18, 'Charlie': 0, 'David': 0}, ratios: {} },
            { id: 3, payer: 'Charlie', reason: 'Taxi', type: 'AA', amount: 17.72, involved: [], distribution: {}, ratios: {} },
            { id: 4, payer: 'Bob', reason: 'Drinks', type: 'Remove', amount: 25.8, involved: ['Charlie'], distribution: {}, ratios: {} },
            { id: 5, payer: 'David', reason: 'Barbecue', type: 'Ratio', amount: 200, involved: [], distribution: {}, ratios: {'Alice': 1, 'Bob': 2, 'Charlie': 1, 'David': 1} }
        ];
    }
    renderMembers();
    renderNewBillRow();
    renderBillList();
    calculate();
    saveToStorage();
}

function addNewBill() {
    const payerDropdown = document.getElementById('new-payer-dropdown');
    const payer = payerDropdown ? payerDropdown.dataset.value : '';
    const reason = document.getElementById('new-reason').value.trim();
    const typeDropdown = document.getElementById('new-type-dropdown');
    const type = typeDropdown ? typeDropdown.dataset.value : 'AA';
    if (!payer) return;

    let amount = parseFloat(document.getElementById('new-amount').value) || 0;
    let involved = [];
    let distribution = {};
    let ratios = {};

    if (type === 'Join' || type === 'Remove') {
        document.querySelectorAll('#new-bill-members input:checked').forEach(cb => involved.push(cb.value));
    } else if (type === 'Distribution') {
        let sum = 0;
        document.querySelectorAll('#new-bill-dist input').forEach(inp => {
            const val = parseFloat(inp.value) || 0;
            distribution[inp.dataset.name] = val;
            sum += val;
        });
        amount = sum;
    } else if (type === 'Ratio') {
        document.querySelectorAll('#new-bill-dist input').forEach(inp => {
            ratios[inp.dataset.name] = parseFloat(inp.value) || 0;
        });
    }

    bills.push({ id: Date.now(), payer, reason: reason || '-', type, amount, involved, distribution, ratios });

    // Reset inputs for new bill
    document.getElementById('new-reason').value = '';
    document.getElementById('new-amount').value = '';

    renderBillList();
    calculate();
    saveToStorage();
    renderNewBillRow(); // Re-render the new bill row to reset/update state
}

// --- Custom Dropdown Component ---
// skipEmpty: if true, don't show the "--" empty option (for type dropdown)
function createCustomDropdown(options, selectedValue, onChange, id = null, skipEmpty = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-dropdown';
    if (id) {
        wrapper.id = id;
        wrapper.dataset.value = selectedValue;
    }

    const trigger = document.createElement('div');
    trigger.className = 'custom-dropdown-trigger';

    const text = document.createElement('span');
    text.className = 'dropdown-text';
    // Find label for selected value
    let displayText = selectedValue || '--';
    if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object') {
        const found = options.find(o => o.value === selectedValue);
        if (found) displayText = found.label;
    }
    text.textContent = displayText;

    const arrow = document.createElement('span');
    arrow.className = 'custom-dropdown-arrow';
    arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

    trigger.appendChild(text);
    trigger.appendChild(arrow);

    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';

    // Empty option (only if not skipped)
    if (!skipEmpty) {
        const emptyOpt = document.createElement('div');
        emptyOpt.className = 'custom-dropdown-option' + (!selectedValue ? ' selected' : '');
        emptyOpt.textContent = '--';
        emptyOpt.onclick = (e) => {
            e.stopPropagation();
            text.textContent = '--';
            wrapper.classList.remove('open');
            if (id) wrapper.dataset.value = '';
            onChange('');
        };
        menu.appendChild(emptyOpt);
    }

    // Check if options are objects with value/label or simple strings
    const isObjectOptions = Array.isArray(options) && options.length > 0 && typeof options[0] === 'object';

    if (isObjectOptions) {
        options.forEach(opt => {
            const optEl = document.createElement('div');
            optEl.className = 'custom-dropdown-option' + (opt.value === selectedValue ? ' selected' : '');
            optEl.textContent = opt.label;
            optEl.onclick = (e) => {
                e.stopPropagation();
                text.textContent = opt.label;
                wrapper.classList.remove('open');
                if (id) wrapper.dataset.value = opt.value;
                onChange(opt.value);
            };
            menu.appendChild(optEl);
        });
    } else {
        options.forEach(opt => {
            const optEl = document.createElement('div');
            optEl.className = 'custom-dropdown-option' + (opt === selectedValue ? ' selected' : '');
            optEl.textContent = opt;
            optEl.onclick = (e) => {
                e.stopPropagation();
                text.textContent = opt;
                wrapper.classList.remove('open');
                if (id) wrapper.dataset.value = opt;
                onChange(opt);
            };
            menu.appendChild(optEl);
        });
    }

    trigger.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown.open').forEach(d => {
            if (d !== wrapper) d.classList.remove('open');
        });
        wrapper.classList.toggle('open');

        // Update bolding EVERY time dropdown opens
        const currentText = text.textContent;
        const optionsEl = menu.querySelectorAll('.custom-dropdown-option');
        optionsEl.forEach(opt => {
            if (opt.textContent === currentText) {
                opt.style.fontWeight = 'bold';
            } else {
                opt.style.fontWeight = 'normal';
            }
        });
    };

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    return wrapper;
}

// --- Renderers ---
function renderMembers() {
    const children = Array.from(memberListContainer.children);
    children.forEach(child => {
        if (child.id !== 'add-member-input') memberListContainer.removeChild(child);
    });

    members.forEach((m, idx) => {
        const chip = document.createElement('div');
        chip.className = 'member-chip';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'member-name-input';
        nameInput.value = m;
        // Use pixel width based on actual text rendering
        nameInput.style.width = getTextWidth(m) + 'px';

        nameInput.oninput = () => {
            // Only allow deletion, not adding new characters
            const currentLen = nameInput.value.length;
            const originalLen = members[idx].length;
            if (currentLen > originalLen) {
                // Prevent adding new characters
                nameInput.value = members[idx];
                return;
            }

            // Auto-resize based on actual rendered text width
            nameInput.style.width = getTextWidth(nameInput.value || 'M') + 'px';

            const newName = nameInput.value.trim();
            const oldName = members[idx];

            if (newName && newName !== oldName && !members.includes(newName)) {
                members[idx] = newName;

                // Update bills in real-time
                bills.forEach(bill => {
                    if (bill.payer === oldName) bill.payer = newName;
                    if (bill.involved) bill.involved = bill.involved.map(x => x === oldName ? newName : x);
                    if (bill.distribution && bill.distribution[oldName] !== undefined) {
                        bill.distribution[newName] = bill.distribution[oldName];
                        delete bill.distribution[oldName];
                    }
                    if (bill.ratios && bill.ratios[oldName] !== undefined) {
                        bill.ratios[newName] = bill.ratios[oldName];
                        delete bill.ratios[oldName];
                    }
                });

                renderNewBillRow();
                renderBillList();
                calculate();
                saveToStorage();
            }
        };

        nameInput.onblur = () => {
            if (!nameInput.value.trim()) removeMember(m);
        };

        const delSpan = document.createElement('span');
        delSpan.className = 'delete-member';
        delSpan.textContent = '×';
        delSpan.onclick = () => removeMember(members[idx]);

        chip.appendChild(nameInput);
        chip.appendChild(delSpan);
        memberListContainer.insertBefore(chip, addMemberInput);
    });

    // Add error circle to add-member input if no members
    const addMemberEl = document.getElementById('member-list-container');
    if (addMemberEl) {
        if (members.length === 0) {
            addMemberEl.classList.add('error-circle');
        } else {
            addMemberEl.classList.remove('error-circle');
        }
    }
}

function renderBillList() {
    billList.innerHTML = '';
    bills.forEach((bill, idx) => {
        const row = document.createElement('div');
        row.className = 'bill-row';
        row.dataset.id = bill.id;

        // Payer - Custom Dropdown
        const payerCell = document.createElement('div');
        payerCell.className = 'cell';
        payerCell.dataset.label = t('payer');
        const payerDropdown = createCustomDropdown(members, bill.payer, (val) => {
            bill.payer = val;
            renderBillList();
            calculate();
            saveToStorage();
        });
        if (!bill.payer || !members.includes(bill.payer)) payerCell.classList.add('error-circle');
        payerCell.appendChild(payerDropdown);

        // Reason
        const reasonCell = document.createElement('div');
        reasonCell.className = 'cell';
        reasonCell.dataset.label = t('reason');
        const reasonInput = document.createElement('input');
        reasonInput.type = 'text';
        reasonInput.value = bill.reason;
        reasonInput.oninput = (e) => { bill.reason = e.target.value; saveToStorage(); };
        reasonCell.appendChild(reasonInput);

        // Type - Custom Dropdown with labels (NO empty option)
        const typeCell = document.createElement('div');
        typeCell.className = 'cell';
        typeCell.dataset.label = t('type');
        const typeDropdown = createCustomDropdown(
            getTypeOptions(),
            bill.type,
            (val) => {
                const oldType = bill.type;
                bill.type = val || 'AA';
                // Clear amount when switching TO Distribution
                if (bill.type === 'Distribution' && oldType !== 'Distribution') {
                    bill.amount = 0;
                    bill.distribution = {};
                }
                if (bill.type === 'AA') { bill.involved = []; bill.distribution = {}; bill.ratios = {}; }

                // Initialize ratios if new
                if (bill.type === 'Ratio' && (!bill.ratios || Object.keys(bill.ratios).length === 0)) {
                    bill.ratios = {};
                    members.forEach(m => bill.ratios[m] = 1);
                }

                renderBillList();
                calculate();
                saveToStorage();
            },
            null,
            true // skipEmpty = true for type dropdown
        );
        typeCell.appendChild(typeDropdown);

        // Amount
        const amountCell = document.createElement('div');
        amountCell.className = 'cell';
        amountCell.dataset.label = t('amount');
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.step = '0.01';
        amountInput.value = bill.amount;

        // Remove leading zeros on blur
        amountInput.onblur = () => {
            const val = parseFloat(amountInput.value) || 0;
            amountInput.value = val;
        };

        amountInput.oninput = (e) => {
            bill.amount = parseFloat(e.target.value) || 0;
            if (bill.amount <= 0) amountCell.classList.add('error-circle');
            else amountCell.classList.remove('error-circle');
            // Update ratio displays without full re-render (to keep focus)
            if (bill.type === 'Ratio') {
                const container = row.querySelector('.details-grid');
                if (container) {
                    const totalRatio = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);
                    container.querySelectorAll('.details-item').forEach(item => {
                        const itemSpan = item.querySelector('span');
                        const memName = itemSpan.dataset.memberProp;
                        const rVal = bill.ratios[memName] || 0;
                        let sDisp = '0.00';
                        if (totalRatio > 0 && rVal > 0) {
                            sDisp = formatNumberDisplay((rVal / totalRatio) * bill.amount);
                        }
                        itemSpan.textContent = `${memName} (${sDisp})`;
                    });
                }
            }
            calculate();
            saveToStorage();
        };
        if (bill.type === 'Distribution') {
            amountInput.disabled = true;
            // Don't show error circle on disabled Distribution amount field
        } else {
            if (!bill.amount || bill.amount <= 0) amountCell.classList.add('error-circle');
        }
        amountCell.appendChild(amountInput);

        // Actions Cell - Drag Handle (default) or Delete Button (Edit Mode)
        const actionsCell = document.createElement('div');
        actionsCell.className = 'cell actions-cell';

        if (isEditMode) {
            // Edit Mode: show Delete button
            row.draggable = false;
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-delete';
            delBtn.innerHTML = ICON_TRASH;
            delBtn.onclick = () => {
                bills.splice(idx, 1);
                renderBillList();
                calculate();
                saveToStorage();
            };
            actionsCell.appendChild(delBtn);
        } else {
            // Default: show Drag Handle only on non-mobile devices
            const isMobile = isMobileDevice();
            if (isMobile) {
                // On mobile, don't show drag handle even in non-edit mode
                row.draggable = false;
                actionsCell.innerHTML = ''; // Empty cell
            } else {
                // Desktop: show drag handle, enable drag on row but use flag to restrict to handle
                row.draggable = true;
                actionsCell.className = 'cell drag-handle';
                actionsCell.innerHTML = ICON_BARS;
            }
        }

        row.appendChild(payerCell);
        row.appendChild(reasonCell);
        row.appendChild(typeCell);
        row.appendChild(amountCell);
        row.appendChild(actionsCell);

        // Detail Row for Join/Remove/Distribution/Ratio
        if (bill.type === 'Join' || bill.type === 'Remove' || bill.type === 'Distribution' || bill.type === 'Ratio') {
            const detailRow = document.createElement('div');
            detailRow.className = 'bill-details-row';

            if (bill.type === 'Join' || bill.type === 'Remove') {
                const container = document.createElement('div');
                container.className = 'checkbox-grid';

                // Check if all checkboxes are empty - show error only if members exist
                const hasChecked = bill.involved && bill.involved.length > 0;
                if (!hasChecked && members.length > 0) {
                    container.classList.add('error-circle');
                }

                members.forEach(m => {
                    const label = document.createElement('label');
                    label.className = 'custom-checkbox';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = bill.involved.includes(m);
                    cb.onclick = () => {
                        if (cb.checked) bill.involved.push(m);
                        else bill.involved = bill.involved.filter(x => x !== m);
                        renderBillList();
                        calculate();
                        saveToStorage();
                    };
                    label.innerHTML = `<span class="checkmark"></span><span class="label-text">${m}</span>`;
                    label.insertBefore(cb, label.firstChild);
                    container.appendChild(label);
                });
                detailRow.appendChild(container);
            } else if (bill.type === 'Distribution') {
                const container = document.createElement('div');
                container.className = 'details-grid';
                members.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'details-item';
                    const span = document.createElement('span');
                    span.className = 'details-item-label';
                    span.textContent = m;
                    const inp = document.createElement('input');
                    inp.className = 'details-input';
                    inp.type = 'number';
                    inp.value = bill.distribution[m] || 0;

                    // Remove leading zeros on blur
                    inp.onblur = () => {
                        const val = parseFloat(inp.value) || 0;
                        inp.value = val;
                    };

                    // Check for negative - add error class
                    const val = parseFloat(bill.distribution[m]) || 0;
                    if (val < 0) div.classList.add('error-circle');

                    inp.oninput = () => {
                        const newVal = parseFloat(inp.value) || 0;
                        bill.distribution[m] = newVal;

                        // Validation for negative
                        if (newVal < 0) div.classList.add('error-circle');
                        else div.classList.remove('error-circle');

                        let sum = 0;
                        let hasNegative = false;
                        let allZero = true;
                        Object.values(bill.distribution).forEach(v => {
                            sum += v;
                            if (v < 0) hasNegative = true;
                            if (v !== 0) allZero = false;
                        });
                        bill.amount = sum;
                        amountInput.value = sum;

                        // Mark container with error if all are zero
                        if (allZero) {
                            container.classList.add('error-circle');
                        } else {
                            container.classList.remove('error-circle');
                        }

                        calculate();
                        saveToStorage();
                    };
                    div.appendChild(span);
                    div.appendChild(inp);
                    container.appendChild(div);
                });

                // Initial all-zero check - apply to container, not individual items
                const allZeroInitial = Object.values(bill.distribution).every(v => v === 0 || v === undefined);
                if (allZeroInitial) {
                    container.classList.add('error-circle');
                }

                detailRow.appendChild(container);
            } else if (bill.type === 'Ratio') {
                // Ratio uses same layout as Distribution
                const container = document.createElement('div');
                container.className = 'details-grid';

                const totalRatio = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);

                members.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'details-item';

                    const ratioVal = bill.ratios?.[m] || 0;
                    let shareDisp = '0.00';
                    if (totalRatio > 0 && ratioVal > 0) {
                        const shareNum = (ratioVal / totalRatio) * bill.amount;
                        shareDisp = formatNumberDisplay(shareNum);
                    }

                    const span = document.createElement('span');
                    span.className = 'details-item-label';
                    span.textContent = `${m} (${shareDisp})`;
                    span.dataset.memberProp = m;

                    const inp = document.createElement('input');
                    inp.className = 'details-input';
                    inp.type = 'number';
                    inp.min = '0';
                    inp.value = ratioVal;

                    inp.onblur = () => { inp.value = parseFloat(inp.value) || 0; };

                    inp.oninput = () => {
                        if (!bill.ratios) bill.ratios = {};
                        const newVal = parseFloat(inp.value) || 0;
                        bill.ratios[m] = newVal;

                        const newTotal = Object.values(bill.ratios).reduce((a, b) => a + b, 0);
                        const allZero = newTotal === 0;

                        // Update all spans with new amounts
                        const allItems = container.querySelectorAll('.details-item');
                        allItems.forEach(item => {
                            const itemSpan = item.querySelector('span');
                            const memName = itemSpan.dataset.memberProp;
                            const rVal = bill.ratios[memName] || 0;
                            let sDisp = '0.00';
                            if (newTotal > 0 && rVal > 0) {
                                const shareNum = (rVal / newTotal) * bill.amount;
                                sDisp = formatNumberDisplay(shareNum);
                            }
                            itemSpan.textContent = `${memName} (${sDisp})`;
                        });

                        // Mark container with error if all are zero
                        if (allZero) {
                            container.classList.add('error-circle');
                        } else {
                            container.classList.remove('error-circle');
                        }

                        calculate();
                        saveToStorage();
                    };

                    div.appendChild(span);
                    div.appendChild(inp);
                    container.appendChild(div);
                });

                // Initial all-zero check for Ratio - apply to container
                const totalRatioCheck = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);
                if (totalRatioCheck === 0) {
                    container.classList.add('error-circle');
                }

                detailRow.appendChild(container);
            }
            row.appendChild(detailRow);
        }

        billList.appendChild(row);
    });
}

function renderNewBillRow() {
    const newBillRow = document.getElementById('new-bill-row');

    // Replace payer select with custom dropdown
    const payerCell = newBillRow.querySelector('.cell:nth-child(1)');
    payerCell.innerHTML = '';
    const payerDropdown = createCustomDropdown(members, '', () => {}, 'new-payer-dropdown');
    payerCell.appendChild(payerDropdown);

    // Replace type select with custom dropdown (NO empty option)
    const typeCell = newBillRow.querySelector('.cell:nth-child(3)');
    typeCell.innerHTML = '';
    const typeDropdown = createCustomDropdown(getTypeOptions(), 'AA', (val) => {
        renderNewBillDetails(val || 'AA');
    }, 'new-type-dropdown', true); // skipEmpty = true
    typeCell.appendChild(typeDropdown);

    // Set placeholder for reason
    const newReason = document.getElementById('new-reason');
    if (newReason) newReason.placeholder = currentLang === 'zh' ? '事由' : 'Reason';

    // Render details based on current type
    const currentType = 'AA';
    renderNewBillDetails(currentType);
}

function renderNewBillDetails(type) {
    const detailsContainer = document.getElementById('new-bill-details');
    const membersContainer = document.getElementById('new-bill-members');
    const distContainer = document.getElementById('new-bill-dist');

    detailsContainer.classList.add('hidden');
    membersContainer.classList.add('hidden');
    distContainer.classList.add('hidden');

    if (type === 'AA') return;

    detailsContainer.classList.remove('hidden');

    if (type === 'Join' || type === 'Remove') {
        membersContainer.classList.remove('hidden');
        membersContainer.innerHTML = '';
        members.forEach(m => {
            const label = document.createElement('label');
            label.className = 'custom-checkbox';
            label.innerHTML = `<input type="checkbox" value="${m}"><span class="checkmark"></span><span class="label-text">${m}</span>`;
            membersContainer.appendChild(label);
        });
    } else if (type === 'Ratio') {
        distContainer.classList.remove('hidden');
        distContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'details-grid';

        members.forEach(m => {
            const div = document.createElement('div');
            div.className = 'details-item';
            div.innerHTML = `<span class="details-item-label">${m}</span><input type="number" class="details-input" data-name="${m}" value="1">`;
            container.appendChild(div);
        });
        distContainer.appendChild(container);
    } else if (type === 'Distribution') {
        distContainer.classList.remove('hidden');
        distContainer.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'details-grid';
        members.forEach(m => {
            const div = document.createElement('div');
            div.className = 'details-item';
            div.innerHTML = `<span class="details-item-label">${m}</span><input type="number" class="details-input" data-name="${m}"value="0">`;
            container.appendChild(div);
        });
        distContainer.appendChild(container);
    }
}

// --- Calculation ---

function calculateRatioShares(bill) {
    const totalRatio = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);
    if (totalRatio <= 0) return {};

    const shares = {};
    for (const [name, ratio] of Object.entries(bill.ratios || {})) {
        if (name !== bill.payer && members.includes(name) && ratio > 0) {
            shares[name] = (ratio / totalRatio) * bill.amount;
        }
    }
    return shares;
}

function calculate() {
    let hasErrors = false;
    bills.forEach(bill => {
        if (!bill.payer || !members.includes(bill.payer)) hasErrors = true;
        if (!bill.amount || bill.amount <= 0) hasErrors = true;
        // Check for negative distribution values
        if (bill.type === 'Distribution') {
            for (const val of Object.values(bill.distribution)) {
                if (val < 0) hasErrors = true;
            }
        }
        // Check for zero total ratio
        if (bill.type === 'Ratio') {
            const totalRatio = Object.values(bill.ratios || {}).reduce((a, b) => a + b, 0);
            if (totalRatio <= 0) hasErrors = true;
        }
        // Check for empty checkboxes in Join/Remove
        if ((bill.type === 'Join' || bill.type === 'Remove') && (!bill.involved || bill.involved.length === 0)) {
            hasErrors = true;
        }
    });

    // Also check if members is empty (error condition)
    if (members.length === 0) {
        hasErrors = true;
    }

    if (hasErrors) {
        resultContainer.innerHTML = `<div class="error-message">${ICON_PENCIL}<span>${t('error_fix_first')}</span></div>`;
        if (detailsBtn) detailsBtn.style.display = 'none';
        return;
    }
    if (detailsBtn) detailsBtn.style.display = 'block';

    if (bills.length === 0) {
        resultContainer.innerHTML = '<p style="text-align:center;opacity:0.6;">...</p>';
        return;
    }

    const transfers = calculateTransfers();

    resultContainer.innerHTML = '';
    if (transfers.length === 0) {
        resultContainer.innerHTML = `<p style="text-align:center;color:var(--success-color);">${t('no_transfer')}</p>`;
    } else {
        transfers.forEach(tr => {
            const row = document.createElement('div');
            row.className = 'transfer-line';
            row.textContent = t('transfer', { from: tr.from, to: tr.to, amount: tr.amount });
            resultContainer.appendChild(row);
        });
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    if (editBtn) {
        editBtn.textContent = isEditMode ? t('done') : t('edit');
    }
    renderBillList();
}

init();

// --- Drag and Drop ---
// --- Drag and Drop ---
function setupDragAndDrop() {
    // Only set up bill list DnD (removed member DnD)
    setupListDnD('bill-list', (fromIndex, toIndex) => {
        const item = bills.splice(fromIndex, 1)[0];
        bills.splice(toIndex, 0, item);
        saveToStorage();
        renderBillList();
    });
}

// Global flag to track if drag started from handle
let dragFromHandle = false;

function setupListDnD(containerId, onReorder) {
    const container = document.getElementById(containerId);
    let draggedItem = null;

    // Track mousedown on drag handles
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.drag-handle')) {
            dragFromHandle = true;
        } else {
            dragFromHandle = false;
        }
    });

    container.addEventListener('dragstart', (e) => {
        // Only allow drag if it started from handle
        if (!dragFromHandle) {
            e.preventDefault();
            return;
        }

        const row = e.target.closest('.bill-row');
        if (!row) {
            e.preventDefault();
            return;
        }

        draggedItem = row;

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        setTimeout(() => draggedItem.classList.add('dragging'), 0);
    });

    container.addEventListener('dragend', () => {
        dragFromHandle = false; // Reset flag after drag
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            // Don't reset draggable here - it's managed by Edit mode in renderBillList
        }

        // Determine new order based on DOM
        const newOrder = [];
        if (containerId === 'member-list-container') {
             Array.from(container.children).forEach(child => {
                 if (child.id === 'add-member-input') return;
                 const name = child.querySelector('.member-name')?.textContent; // Assuming text content
                 // Actually we used input value in one version, but let's check
                 // In renderMembers we use <span class="member-name">${member}</span>
                 if (name) newOrder.push(name);
             });
             // Update members based on this new order
             members.splice(0, members.length, ...newOrder);
             saveToStorage();
             // renderAll(); // Already rendered by drag? No, need to sync
        } else if (containerId === 'bill-list') {
             Array.from(container.children).forEach(child => {
                 if (child.id === 'new-bill-row') return;
                 const id = parseInt(child.dataset.id);
                 const bill = bills.find(b => b.id === id);
                 if (bill) newOrder.push(bill);
             });
             bills.splice(0, bills.length, ...newOrder);
             saveToStorage();
             // renderBillList();
        }

        draggedItem = null;
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (!draggable) return;

        if (afterElement == null) {
            // Append before add-member-input or new-bill-row if they exist
            if (containerId === 'member-list-container') {
                container.insertBefore(draggable, document.getElementById('add-member-input'));
            } else if (containerId === 'bill-list') {
                 container.insertBefore(draggable, document.getElementById('new-bill-row'));
                 // Only if new-bill-row is actually in the list (it is)
            } else {
                container.appendChild(draggable);
            }
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
