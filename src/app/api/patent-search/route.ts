import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Page, Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// Global browser instance
let globalBrowser: Browser | null = null;
let globalSessionId: string | null = null;
let lastUsedTime: number = 0;
const SESSION_TIMEOUT = 1000 * 60 * 5; // 5 minutes

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper: Dismiss announcement popup if present
async function dismissPopup(page: Page, log: (msg: string) => void) {
    try {
        // Wait a bit for popup to appear
        await new Promise(r => setTimeout(r, 2000));

        // Try multiple strategies to close the popup
        const dismissed = await page.evaluate(() => {
            // Strategy 1: Click the X close button (top-right of popup)
            const closeButtons = Array.from(document.querySelectorAll('button, .close, [aria-label="close"], [class*="close"]'));
            for (const btn of closeButtons) {
                const text = btn.textContent?.trim() || '';
                const ariaLabel = btn.getAttribute('aria-label') || '';
                // Look for X button or close button near the popup
                if (text === '×' || text === 'X' || text === 'x' || ariaLabel.toLowerCase() === 'close') {
                    (btn as HTMLElement).click();
                    return 'closed-x';
                }
            }

            // Strategy 2: Click "Devamı" button
            const allButtons = Array.from(document.querySelectorAll('button'));
            const devamBtn = allButtons.find(b => b.textContent?.trim().includes('Devam'));
            if (devamBtn) {
                (devamBtn as HTMLElement).click();
                return 'closed-devami';
            }

            // Strategy 3: Click overlay/backdrop
            const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal-backdrop"]');
            if (overlays.length > 0) {
                (overlays[0] as HTMLElement).click();
                return 'closed-overlay';
            }

            // Strategy 4: Press Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
            return 'escape-sent';
        });

        log(`Popup dismiss attempt: ${dismissed}`);
        await new Promise(r => setTimeout(r, 1000));

        // Double check - try clicking any remaining close/X buttons
        await page.evaluate(() => {
            // Look for any modal/dialog close buttons that might still be open
            const svgCloseIcons = document.querySelectorAll('svg[data-testid="CloseIcon"]');
            svgCloseIcons.forEach(icon => {
                const btn = icon.closest('button');
                if (btn) (btn as HTMLElement).click();
            });

            // Also try MUI dialog close
            const muiDialogClose = document.querySelectorAll('.MuiDialog-root button, [role="dialog"] button');
            muiDialogClose.forEach(btn => {
                const text = btn.textContent?.trim() || '';
                if (text === '×' || text === 'X' || text === 'x' || text === '') {
                    // Empty text button with SVG close icon
                    const svg = btn.querySelector('svg');
                    if (svg || text === '×' || text === 'X') {
                        (btn as HTMLElement).click();
                    }
                }
            });
        });

        await new Promise(r => setTimeout(r, 500));
    } catch (e: any) {
        log(`Popup dismiss warning: ${e.message}`);
    }
}

// Helper: Find and interact with the search input
async function findAndTypeSearchInput(page: Page, searchText: string, log: (msg: string) => void) {
    // Strategy 1: placeholder-based
    let inputFound = false;

    const strategies = [
        'input[placeholder="Marka Adı"]',
        'input[placeholder*="Marka"]',
        'input[aria-label*="Marka"]',
    ];

    for (const selector of strategies) {
        try {
            const el = await page.$(selector);
            if (el) {
                await el.click({ clickCount: 3 }); // Select all
                await el.type(searchText, { delay: 80 });
                log(`Typed via selector: ${selector}`);
                inputFound = true;
                break;
            }
        } catch (e) { /* try next */ }
    }

    // Strategy 2: Find by label text via evaluate
    if (!inputFound) {
        inputFound = await page.evaluate((text) => {
            // Find all labels containing "Marka"
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
                if (label.textContent?.includes('Marka') && label.textContent?.includes('Adı')) {
                    const forId = label.getAttribute('for');
                    let input: HTMLInputElement | null = null;
                    if (forId) {
                        input = document.getElementById(forId) as HTMLInputElement;
                    }
                    if (!input) {
                        // Try sibling or parent-child relationship
                        const parent = label.closest('.MuiFormControl-root, .MuiTextField-root, div');
                        if (parent) {
                            input = parent.querySelector('input') as HTMLInputElement;
                        }
                    }
                    if (input) {
                        input.focus();
                        // Set value via native setter to trigger React state
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                        if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(input, text);
                        } else {
                            input.value = text;
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
            }

            // Strategy 3: Find any visible text input in the form area
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
            for (const inp of inputs) {
                const rect = (inp as HTMLElement).getBoundingClientRect();
                if (rect.width > 100 && rect.height > 20 && rect.top > 0 && rect.top < 600) {
                    (inp as HTMLInputElement).focus();
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                    if (nativeInputValueSetter) {
                        nativeInputValueSetter.call(inp, text);
                    } else {
                        (inp as HTMLInputElement).value = text;
                    }
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
            }

            return false;
        }, searchText);

        if (inputFound) {
            log(`Typed via DOM evaluation strategy`);
        }
    }

    if (!inputFound) {
        throw new Error("Marka Adı input alanı bulunamadı. Türk Patent sitesinin yapısı değişmiş olabilir.");
    }

    await new Promise(r => setTimeout(r, 500));
}

// Helper: Click the Sorgula button
async function clickSearchButton(page: Page, log: (msg: string) => void) {
    // Try multiple strategies
    const clicked = await page.evaluate(() => {
        // Strategy 1: Button with class
        const btnByClass = document.querySelector('button.MuiButton-containedSecondary') as HTMLElement;
        if (btnByClass) { btnByClass.click(); return 'class'; }

        // Strategy 2: Button containing "Sorgula" or "SORGULA" text
        const buttons = Array.from(document.querySelectorAll('button'));
        const searchBtn = buttons.find(b => {
            const text = b.textContent?.trim().toUpperCase() || '';
            return text.includes('SORGULA');
        });
        if (searchBtn) { (searchBtn as HTMLElement).click(); return 'text'; }

        // Strategy 3: Button with Search icon
        const iconBtn = buttons.find(b => b.querySelector('svg') && b.textContent?.includes('orgula'));
        if (iconBtn) { (iconBtn as HTMLElement).click(); return 'icon'; }

        return null;
    });

    if (!clicked) {
        throw new Error("Sorgula butonu bulunamadı.");
    }

    log(`Clicked search button via: ${clicked}`);
}

// Helper: Scrape table rows
async function scrapeResults(page: Page) {
    return await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr.MuiTableRow-root, table tbody tr'));
        const results: any[] = [];

        rows.forEach((row) => {
            if (!row.querySelector('td')) return;

            const getTextByRole = (role: string) => {
                const el = row.querySelector(`td[role="${role}"]`);
                return el ? el.textContent?.trim() || '' : '';
            };

            const getTextByIndex = (index: number) => {
                const cells = row.querySelectorAll('td');
                return cells[index] ? cells[index].textContent?.trim() || '' : '';
            };

            const applicationNo = getTextByRole('applicationNo') || getTextByIndex(1);
            const markName = getTextByRole('markName') || getTextByIndex(2);
            const holderName = getTextByRole('holdName') || getTextByIndex(3);
            const applicationDate = getTextByRole('applicationDate') || getTextByIndex(4);
            const registrationNo = getTextByRole('registrationNo') || getTextByIndex(5);
            const status = getTextByRole('status') || getTextByIndex(6);
            const niceClasses = getTextByRole('niceClasses') || getTextByIndex(7);

            let imagePath = null;
            const imageCell = row.querySelector('td[role="image"]') || row.querySelectorAll('td')[8];
            if (imageCell) {
                const img = imageCell.querySelector('img');
                if (img && img.src) imagePath = img.src;
            }

            if (applicationNo) {
                results.push({
                    id: applicationNo,
                    applicationNo,
                    markName,
                    holderName,
                    applicationDate,
                    registrationNo,
                    status,
                    niceClasses,
                    imagePath
                });
            }
        });
        return results;
    });
}

export async function POST(req: NextRequest) {
    let browser: Browser | null = null;
    let page: Page | null = null;
    const logs: string[] = [];

    const log = (msg: string) => {
        const timestamp = new Date().toISOString();
        const logMsg = `${timestamp}: ${msg}`;
        console.log(logMsg);
        logs.push(logMsg);
    };

    try {
        const body = await req.json();
        let { action, sessionId, ...params } = body;

        // Normalize nested params from frontend
        if ((params as any).params) {
            params = { ...params, ...(params as any).params };
        }

        if (!sessionId && (params as any).sessionId) {
            sessionId = (params as any).sessionId;
        }

        log(`API Request: ${action}, Session: ${sessionId || 'new'}`);

        const launchBrowser = async () => {
            const isLocal = process.env.NODE_ENV === 'development';

            if (isLocal) {
                const result = require('child_process').spawnSync('where', ['chrome']);
                const chromePath = result.stdout?.toString().trim().split('\n')[0];
                log(`Local Chrome Path: ${chromePath}`);

                return await require('puppeteer').launch({
                    executablePath: chromePath,
                    headless: true,
                    defaultViewport: { width: 1920, height: 1080 },
                    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
                    protocolTimeout: 240000
                });
            } else {
                return await puppeteer.launch({
                    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
                    // @ts-ignore
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(
                        `https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar`
                    ),
                    // @ts-ignore
                    headless: chromium.headless,
                    // @ts-ignore
                    ignoreHTTPSErrors: true,
                    protocolTimeout: 240000
                });
            }
        };

        // Reuse or create session
        if (GlobalSession.isValid(sessionId)) {
            browser = globalBrowser;
            log(`Reusing global browser session: ${sessionId}`);
        } else {
            if (globalBrowser) {
                try { await globalBrowser.close(); } catch (e) { log(`Error closing old browser: ${e}`); }
                globalBrowser = null;
                globalSessionId = null;
            }

            browser = await launchBrowser();
            if (!browser) throw new Error("Browser başlatılamadı.");

            globalBrowser = browser;
            globalSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            log(`Created new browser session: ${globalSessionId}`);

            page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            if (process.env.NODE_ENV !== 'development') {
                await page.setViewport({ width: 1920, height: 1080 });
            }

            log("Navigating to Türk Patent...");
            await page.goto('https://www.turkpatent.gov.tr/arastirma-yap?form=trademark', { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Dismiss announcement popup
            await dismissPopup(page, log);

            GlobalSession.update(globalSessionId);
        }

        // Get fresh page ref if we reused browser
        if (!page && browser) {
            const pages = await browser.pages();
            page = pages.find(p => p.url().includes('turkpatent')) || null;
            if (!page && pages.length > 0) page = pages[pages.length - 1];
            if (!page) page = await browser.newPage();
            log(`Using page: ${page.url()}`);
        }

        if (!page) throw new Error("Sayfa bulunamadı.");

        // ========================
        // ACTION: SEARCH
        // ========================
        if (action === 'search') {
            const { searchText, niceClasses } = params;
            log(`Search Action: text=${searchText}, classes=${niceClasses}`);

            // Ensure we're on the search page
            const currentUrl = page.url();
            if (!currentUrl.includes('turkpatent.gov.tr') || !currentUrl.includes('arastirma')) {
                log("Not on search page, navigating...");
                await page.goto('https://www.turkpatent.gov.tr/arastirma-yap?form=trademark', { waitUntil: 'domcontentloaded', timeout: 60000 });
                await dismissPopup(page, log);
            }

            // Find and type in the search input
            await findAndTypeSearchInput(page, searchText, log);

            // Click Search Button
            await clickSearchButton(page, log);

            // Wait for results or no-results
            try {
                log("Waiting for results...");
                await page.waitForFunction(() => {
                    const rows = document.querySelectorAll('tr.MuiTableRow-root, table tbody tr');
                    if (rows.length > 0) return true;

                    const bodyText = document.body.innerText;
                    if (bodyText.includes('0 kayıt') || bodyText.includes('Sonuç bulunamadı') || bodyText.includes('kayıt bulundu')) return true;

                    return false;
                }, { timeout: 30000 });

                const noResults = await page.evaluate(() => {
                    const bodyText = document.body.innerText;
                    return bodyText.includes('0 kayıt bulundu') || bodyText.includes('Sonuç bulunamadı');
                });

                if (noResults) {
                    log("No results found.");
                    return NextResponse.json({ success: true, count: 0, data: [], sessionId: globalSessionId, debugLogs: logs });
                }
            } catch (e: any) {
                log(`Wait error: ${e.message}`);
                if (e.message.includes('Execution context was destroyed')) {
                    throw new Error("Sayfa bağlantısı yenilendi, lütfen tekrar deneyin.");
                }
                throw new Error("Sonuçlar veya 'bulunamadı' mesajı 30 saniye içinde gelmedi.");
            }

            // --- INFINITE SCROLL ---
            try {
                log("Enabling infinite scroll...");
                const infiniteSwitchSelector = 'input.MuiSwitch-input';

                const enabled = await page.evaluate((sel) => {
                    const el = document.querySelector(sel) as HTMLInputElement;
                    if (el && !el.checked) { el.click(); return true; }
                    return false;
                }, infiniteSwitchSelector);

                if (enabled) {
                    log("Enabled 'Sonsuz Liste' mode.");
                    await new Promise(r => setTimeout(r, 2000));
                }

                log("Starting auto-scroll...");
                let previousHeight = 0;
                let scrollAttempts = 0;
                const maxAttempts = 60;

                while (scrollAttempts < maxAttempts) {
                    previousHeight = await page.evaluate('document.body.scrollHeight') as number;
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await new Promise(r => setTimeout(r, 2500));

                    const newHeight = await page.evaluate('document.body.scrollHeight') as number;
                    if (newHeight === previousHeight) {
                        await new Promise(r => setTimeout(r, 1500));
                        const checkAgain = await page.evaluate('document.body.scrollHeight');
                        if (checkAgain === newHeight) break;
                    }
                    scrollAttempts++;
                }
                log(`Auto-scroll finished after ${scrollAttempts} attempts.`);
            } catch (e: any) {
                log(`Infinite scroll warning: ${e.message}`);
            }

            // Scrape results
            const data = await scrapeResults(page);

            // Total Count
            let totalCount = data.length;
            try {
                const countText = await page.evaluate(() => {
                    const el = document.querySelector('.MuiTablePagination-displayedRows, p');
                    if (el) {
                        const text = el.textContent || '';
                        const match = text.match(/(\d+)\s*kayıt bulundu/);
                        if (match) return match[1];
                    }
                    // Try body text
                    const bodyMatch = document.body.innerText.match(/(\d+)\s*kayıt bulundu/);
                    if (bodyMatch) return bodyMatch[1];
                    return null;
                });
                if (countText) totalCount = parseInt(countText);
            } catch (e) { log("Count extraction warning (ignorable)"); }

            log(`Found ${data.length} records. Total: ${totalCount}`);
            if (data.length > 0) log(`First result: ${JSON.stringify(data[0])}`);

            GlobalSession.update(globalSessionId);

            return NextResponse.json({
                success: true,
                data,
                count: totalCount,
                sessionId: globalSessionId,
                debugLogs: logs
            });

        // ========================
        // ACTION: GET DETAIL
        // ========================
        } else if (action === 'get_detail') {
            const { applicationNo, rowIndex } = params;
            log(`Detail Action: applicationNo=${applicationNo}, rowIndex=${rowIndex}`);

            if (!applicationNo) throw new Error("Başvuru numarası belirtilmedi.");

            // Scroll to top first
            await page.evaluate(() => window.scrollTo(0, 0));
            await new Promise(r => setTimeout(r, 1000));

            // Strategy 1: Use _actions-N ID selector (most reliable)
            // Strategy 2: Search by applicationNo text in cells
            // Strategy 3: Use generic button search
            const detayClicked = await page.evaluate((appNo: string, idx: number) => {
                // Strategy 1: Try by ID-based action cells
                const actionCells = document.querySelectorAll('td[id^="_actions-"]');
                for (const cell of actionCells) {
                    const btn = cell.querySelector('button');
                    if (btn) {
                        const text = btn.textContent?.trim().toUpperCase() || '';
                        if (text.includes('DETAY')) {
                            // Verify this is the right row by checking applicationNo in same row
                            const row = cell.closest('tr');
                            if (row) {
                                const appNoCell = row.querySelector('td[id^="applicationNo-"]');
                                const cellText = appNoCell?.textContent?.trim() || '';
                                const normalize = (s: string) => s.replace(/[\s\/]/g, '');
                                if (normalize(cellText) === normalize(appNo)) {
                                    row.scrollIntoView({ behavior: 'instant', block: 'center' });
                                    btn.click();
                                    return 'found-by-id';
                                }
                            }
                        }
                    }
                }

                // Strategy 2: Fallback - search all rows for matching applicationNo
                const rows = Array.from(document.querySelectorAll('tr'));
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 3) continue;

                    // Check each cell for matching application number
                    let found = false;
                    for (const cell of cells) {
                        const cellText = cell.textContent?.trim() || '';
                        const normalize = (s: string) => s.replace(/[\s\/]/g, '');
                        if (normalize(cellText) === normalize(appNo)) {
                            found = true;
                            break;
                        }
                    }

                    if (found) {
                        // Find DETAY button in this row
                        const buttons = row.querySelectorAll('button');
                        for (const btn of buttons) {
                            const btnText = btn.textContent?.trim().toUpperCase() || '';
                            if (btnText.includes('DETAY')) {
                                row.scrollIntoView({ behavior: 'instant', block: 'center' });
                                btn.click();
                                return 'found-by-text';
                            }
                        }
                    }
                }

                // Strategy 3: If only one result, click the first DETAY button
                const allDetayBtns = Array.from(document.querySelectorAll('button')).filter(
                    b => b.textContent?.trim().toUpperCase().includes('DETAY')
                );
                if (allDetayBtns.length === 1) {
                    allDetayBtns[0].scrollIntoView({ behavior: 'instant', block: 'center' });
                    allDetayBtns[0].click();
                    return 'found-single';
                }

                // Strategy 4: Use rowIndex if provided
                if (idx >= 0 && allDetayBtns.length > idx) {
                    allDetayBtns[idx].scrollIntoView({ behavior: 'instant', block: 'center' });
                    allDetayBtns[idx].click();
                    return 'found-by-index';
                }

                return null;
            }, applicationNo, rowIndex || 0);

            if (!detayClicked) {
                // Debug: log what's on the page
                const pageInfo = await page.evaluate(() => {
                    const url = window.location.href;
                    const actionCells = document.querySelectorAll('td[id^="_actions-"]').length;
                    const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean);
                    const tableRows = document.querySelectorAll('tr').length;
                    return { url, actionCells, buttonCount: allButtons.length, tableRows, sampleButtons: allButtons.slice(0, 10) };
                });
                log(`Debug page state: ${JSON.stringify(pageInfo)}`);
                throw new Error(`Başvuru No ${applicationNo} için DETAY butonu bulunamadı. Sayfa üzerinde ${pageInfo.tableRows} satır, ${pageInfo.actionCells} aksiyon hücresi var.`);
            }

            log(`DETAY button clicked via: ${detayClicked}. Waiting for popup...`);

            // Wait for the dialog/modal to appear
            try {
                await page.waitForFunction(() => {
                    return document.querySelector('[role="dialog"], [role="presentation"], .MuiDialog-root, .MuiModal-root, .MuiCardContent-root') !== null;
                }, { timeout: 10000 });
                log("Detail popup detected in DOM.");
            } catch (e) {
                log("Popup detection timed out, continuing with scraping attempt...");
            }

            await new Promise(r => setTimeout(r, 2000));

            // DEBUG: Get popup structure info before scraping
            const popupDebug = await page.evaluate(() => {
                const dialogs = document.querySelectorAll('[role="presentation"], [role="dialog"], .MuiDialog-root, .MuiModal-root');
                const info: any = {
                    dialogCount: dialogs.length,
                    dialogClasses: [] as string[],
                    contentAreaFound: false,
                    fieldsetCount: 0,
                    legendTexts: [] as string[],
                    tableCount: 0,
                    firstDialogChildTags: [] as string[],
                    htmlSnippet: '',
                };

                if (dialogs.length > 0) {
                    const dialog = dialogs[dialogs.length - 1]; // Take the last one (most likely the detail popup)
                    info.dialogClasses = Array.from(dialog.classList || []);
                    
                    const contentArea = dialog.querySelector('.MuiCardContent-root, .MuiDialogContent-root');
                    info.contentAreaFound = !!contentArea;
                    
                    const searchArea = contentArea || dialog;
                    const fieldsets = searchArea.querySelectorAll('fieldset');
                    info.fieldsetCount = fieldsets.length;
                    
                    fieldsets.forEach(fs => {
                        const legend = fs.querySelector('legend');
                        if (legend) info.legendTexts.push(legend.textContent?.trim() || '(empty)');
                    });
                    
                    info.tableCount = searchArea.querySelectorAll('table').length;

                    // Get child element tags
                    const firstLevel = searchArea.children;
                    for (let i = 0; i < Math.min(firstLevel.length, 20); i++) {
                        const child = firstLevel[i];
                        info.firstDialogChildTags.push(`${child.tagName}.${child.className?.toString().substring(0, 50)}`);
                    }

                    // Get a snippet of the inner HTML to understand the structure
                    info.htmlSnippet = searchArea.innerHTML?.substring(0, 1500) || '';
                }

                return info;
            });

            log(`Popup Debug: dialogs=${popupDebug.dialogCount}, contentArea=${popupDebug.contentAreaFound}, fieldsets=${popupDebug.fieldsetCount}, tables=${popupDebug.tableCount}`);
            log(`Legend texts: ${JSON.stringify(popupDebug.legendTexts)}`);
            log(`Child tags: ${JSON.stringify(popupDebug.firstDialogChildTags)}`);
            log(`HTML snippet (first 500): ${popupDebug.htmlSnippet.substring(0, 500)}`);

            // Scrape detail popup content using FIELDSET/LEGEND structure
            const detailData = await page.evaluate(() => {
                const result: any = {
                    markaBilgileri: {} as Record<string, string>,
                    malHizmetBilgileri: [] as { sinif: string; aciklama: string }[],
                    islemBilgileri: [] as { tarih: string; tebligTarihi: string; islem: string; aciklama: string }[]
                };

                // Find the popup container
                const dialog = document.querySelector('[role="presentation"], [role="dialog"], .MuiDialog-root, .MuiModal-root');
                if (!dialog) return result;

                const contentArea = dialog.querySelector('.MuiCardContent-root, .MuiDialogContent-root') || dialog;

                // Find all fieldset sections
                const fieldsets = contentArea.querySelectorAll('fieldset');

                for (const fieldset of fieldsets) {
                    const legend = fieldset.querySelector('legend');
                    const sectionTitle = legend?.textContent?.trim() || '';

                    if (sectionTitle.includes('Marka Bilgileri')) {
                        // ---- MARKA BİLGİLERİ ----
                        const table = fieldset.querySelector('table');
                        if (table) {
                            const rows = table.querySelectorAll('tr');
                            for (const row of rows) {
                                const cells = row.querySelectorAll('td, th');
                                // Handle rows with 2 cells (key-value)
                                if (cells.length >= 2) {
                                    const key = cells[0].textContent?.trim() || '';
                                    const value = cells[1].textContent?.trim() || '';
                                    if (key && key.length < 60 && !key.includes('Marka Bilgileri')) {
                                        result.markaBilgileri[key] = value;
                                    }
                                    // Handle rows with 4 cells (2 key-value pairs side by side)
                                    if (cells.length >= 4) {
                                        const key2 = cells[2].textContent?.trim() || '';
                                        const value2 = cells[3].textContent?.trim() || '';
                                        if (key2 && key2.length < 60) {
                                            result.markaBilgileri[key2] = value2;
                                        }
                                    }
                                }
                            }
                        }

                        // Also try to get logo image
                        const img = fieldset.querySelector('img');
                        if (img && img.src) {
                            result.markaBilgileri['Şekil'] = img.src;
                        }

                    } else if (sectionTitle.includes('Mal ve Hizmet')) {
                        // ---- MAL VE HİZMET BİLGİLERİ ----
                        const table = fieldset.querySelector('table');
                        if (table) {
                            const rows = table.querySelectorAll('tbody tr, tr');
                            for (const row of rows) {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 2) {
                                    const sinif = cells[0].textContent?.trim() || '';
                                    const aciklama = cells[1].textContent?.trim() || '';
                                    // Class number is typically a number (25, 35, etc.)
                                    if (sinif && aciklama && /^\d+$/.test(sinif)) {
                                        result.malHizmetBilgileri.push({ sinif, aciklama });
                                    }
                                }
                            }
                        }

                    } else if (sectionTitle.includes('İşlem Bilgileri') || sectionTitle.includes('Başvuru İşlem')) {
                        // ---- BAŞVURU İŞLEM BİLGİLERİ ----
                        const tables = fieldset.querySelectorAll('table');
                        for (const table of tables) {
                            const rows = table.querySelectorAll('tbody tr, tr');
                            for (const row of rows) {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 3) {
                                    result.islemBilgileri.push({
                                        tarih: cells[0].textContent?.trim() || '-',
                                        tebligTarihi: cells[1].textContent?.trim() || '-',
                                        islem: cells[2].textContent?.trim() || '-',
                                        aciklama: cells.length >= 4 ? cells[3].textContent?.trim() || '-' : '-'
                                    });
                                }
                            }
                        }
                    }
                }

                // Fallback: If no fieldsets found, try generic table scraping
                if (Object.keys(result.markaBilgileri).length === 0 && fieldsets.length === 0) {
                    const allTables = contentArea.querySelectorAll('table');
                    for (const table of allTables) {
                        const rows = table.querySelectorAll('tr');
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td, th');
                            if (cells.length >= 2) {
                                const key = cells[0].textContent?.trim() || '';
                                const value = cells[1].textContent?.trim() || '';
                                if (key && value && key.length < 60) {
                                    result.markaBilgileri[key] = value;
                                }
                                if (cells.length >= 4) {
                                    const key2 = cells[2].textContent?.trim() || '';
                                    const value2 = cells[3].textContent?.trim() || '';
                                    if (key2 && value2 && key2.length < 60) {
                                        result.markaBilgileri[key2] = value2;
                                    }
                                }
                            }
                        }
                    }
                }

                return result;
            });

            log(`Detail scraped: ${Object.keys(detailData.markaBilgileri).length} marka fields, ${detailData.malHizmetBilgileri.length} classes, ${detailData.islemBilgileri.length} process steps`);

            // Close the popup
            try {
                await page.evaluate(() => {
                    // Strategy 1: Find close button by SVG icon
                    const svgIcons = document.querySelectorAll('svg[data-testid="CloseIcon"], svg.MuiSvgIcon-root');
                    for (const icon of svgIcons) {
                        const btn = icon.closest('button');
                        if (btn) {
                            const dialog = btn.closest('[role="presentation"], [role="dialog"], .MuiDialog-root, .MuiModal-root');
                            if (dialog) {
                                btn.click();
                                return;
                            }
                        }
                    }

                    // Strategy 2: Find MuiIconButton close button in dialog
                    const dialogBtns = document.querySelectorAll('[role="presentation"] button, [role="dialog"] button, .MuiDialog-root button');
                    for (const btn of dialogBtns) {
                        const classes = btn.className || '';
                        if (classes.includes('IconButton') || btn.querySelector('svg')) {
                            // Likely the close button (usually top-right)
                            const rect = (btn as HTMLElement).getBoundingClientRect();
                            if (rect.right > 600 && rect.top < 100) { // Top-right position
                                (btn as HTMLElement).click();
                                return;
                            }
                        }
                    }

                    // Strategy 3: Press Escape
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

                    // Strategy 4: Click backdrop
                    const backdrop = document.querySelector('.MuiBackdrop-root, [class*="backdrop"]');
                    if (backdrop) (backdrop as HTMLElement).click();
                });

                // Also try keyboard Escape via Puppeteer
                // await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 1000));
                log("Detail popup close attempted.");
            } catch (e: any) {
                log(`Popup close warning: ${e.message}`);
            }

            GlobalSession.update(globalSessionId);

            return NextResponse.json({
                success: true,
                detail: detailData,
                sessionId: globalSessionId,
                debugLogs: logs
            });

        // ========================
        // ACTION: NAVIGATE PAGE
        // ========================
        } else if (action === 'navigate_page') {
            if (!page) throw new Error("Sayfa oturumu bulunamadı. Lütfen tekrar arama yapın.");

            const { direction } = params;
            log(`Navigating page: ${direction}`);

            try {
                await page.evaluate(() => window.scrollTo(0, 0));
                await new Promise(r => setTimeout(r, 500));

                const infiniteSwitchSelector = 'input.MuiSwitch-input';
                const wasInfinite = await page.evaluate((sel) => {
                    const el = document.querySelector(sel) as HTMLInputElement;
                    if (el && el.checked) { el.click(); return true; }
                    return false;
                }, infiniteSwitchSelector);

                if (wasInfinite) {
                    log("Disabled infinite list mode.");
                    await new Promise(r => setTimeout(r, 2000));
                }

                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await new Promise(r => setTimeout(r, 1000));

                const label = direction === 'next' ? 'Sonraki' : 'Önceki';
                const ariaSelector = `button[aria-label="${label}"]`;

                let buttonClicked = false;
                const btnHandle = await page.$(ariaSelector);
                if (btnHandle) {
                    const isDisabled = await page.evaluate(el => (el as HTMLButtonElement).disabled, btnHandle);
                    if (isDisabled) throw new Error(`${label} sayfa butonu pasif.`);
                    await btnHandle.click();
                    buttonClicked = true;
                    log(`Clicked ${label} via aria-label`);
                }

                if (!buttonClicked) {
                    buttonClicked = await page.evaluate((targetLabel) => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const targetBtn = buttons.find(b =>
                            b.textContent?.trim() === targetLabel ||
                            b.getAttribute('aria-label')?.includes(targetLabel)
                        );
                        if (targetBtn && !(targetBtn as HTMLButtonElement).disabled) {
                            (targetBtn as HTMLElement).click();
                            return true;
                        }
                        return false;
                    }, label);
                }

                if (!buttonClicked) throw new Error(`${label} butonu bulunamadı.`);

                await new Promise(r => setTimeout(r, 3000));

                const data = await scrapeResults(page);

                let totalCount = data.length;
                try {
                    const countText = await page.evaluate(() => {
                        const bodyMatch = document.body.innerText.match(/(\d+)\s*kayıt bulundu/);
                        return bodyMatch ? bodyMatch[1] : null;
                    });
                    if (countText) totalCount = parseInt(countText);
                } catch (e) { /* ignore */ }

                GlobalSession.update(globalSessionId);

                return NextResponse.json({
                    success: true,
                    data,
                    count: totalCount,
                    sessionId: globalSessionId,
                    debugLogs: logs
                });
            } catch (e: any) {
                log(`Navigation error: ${e.message}`);
                throw e;
            }
        }

    } catch (error: any) {
        log(`Fatal Error: ${error.message}`);
        return NextResponse.json({
            success: false,
            error: error.message,
            debugLogs: logs
        }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// Session Management
const GlobalSession = {
    isValid: (id: string) => {
        if (!id || !globalBrowser || !globalSessionId) return false;
        if (id !== globalSessionId) return false;
        if (Date.now() - lastUsedTime > SESSION_TIMEOUT) return false;
        return true;
    },
    update: (id: string | null) => {
        if (id && id === globalSessionId) {
            lastUsedTime = Date.now();
        }
    }
};
