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
            await new Promise(r => setTimeout(r, 500));

            // Find the row with this application number and click its DETAY button
            const detayClicked = await page.evaluate((appNo: string) => {
                const rows = Array.from(document.querySelectorAll('tr.MuiTableRow-root, table tbody tr'));

                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 0) continue;

                    // Check if this row has the matching application number
                    let rowAppNo = '';
                    const appNoCell = row.querySelector('td[role="applicationNo"]');
                    if (appNoCell) {
                        rowAppNo = appNoCell.textContent?.trim() || '';
                    } else if (cells[1]) {
                        rowAppNo = cells[1].textContent?.trim() || '';
                    }

                    // Normalize comparison (remove spaces, slashes)
                    const normalize = (s: string) => s.replace(/[\s\/]/g, '');
                    if (normalize(rowAppNo) === normalize(appNo)) {
                        // Find the DETAY button in this row
                        const buttons = row.querySelectorAll('button');
                        for (const btn of buttons) {
                            const text = btn.textContent?.trim().toUpperCase() || '';
                            if (text.includes('DETAY')) {
                                // Scroll row into view
                                row.scrollIntoView({ behavior: 'instant', block: 'center' });
                                (btn as HTMLElement).click();
                                return true;
                            }
                        }
                    }
                }
                return false;
            }, applicationNo);

            if (!detayClicked) {
                throw new Error(`Başvuru No ${applicationNo} için DETAY butonu bulunamadı. Lütfen önce arama yapın.`);
            }

            log("DETAY button clicked, waiting for popup...");
            await new Promise(r => setTimeout(r, 3000));

            // Scrape detail popup content
            const detailData = await page.evaluate(() => {
                const result: any = {
                    markaBilgileri: {} as Record<string, string>,
                    malHizmetBilgileri: [] as { sinif: string; aciklama: string }[],
                    islemBilgileri: [] as { tarih: string; tebligTarihi: string; islem: string; aciklama: string }[]
                };

                // Find the popup/dialog
                const dialog = document.querySelector('[role="dialog"], [role="presentation"], .MuiDialog-root, .MuiModal-root');
                if (!dialog) return result;

                const dialogContent = dialog.querySelector('.MuiDialogContent-root, .MuiCardContent-root, [class*="content"]') || dialog;

                // ---- MARKA BİLGİLERİ ----
                // Look for table with key-value pairs
                const tables = dialogContent.querySelectorAll('table');
                for (const table of tables) {
                    const rows = table.querySelectorAll('tr');
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent?.trim() || '';
                            const value = cells[1].textContent?.trim() || '';
                            if (key && value && key.length < 50) {
                                result.markaBilgileri[key] = value;
                            }
                            // Some rows have 4 cells (2 key-value pairs)
                            if (cells.length >= 4) {
                                const key2 = cells[2].textContent?.trim() || '';
                                const value2 = cells[3].textContent?.trim() || '';
                                if (key2 && value2 && key2.length < 50) {
                                    result.markaBilgileri[key2] = value2;
                                }
                            }
                        }
                    }
                }

                // ---- MAL VE HİZMET BİLGİLERİ ----
                // Look for the section with class descriptions
                const allText = dialogContent.innerHTML;
                const malHizmetSectionIndex = allText.indexOf('Mal ve Hizmet');
                if (malHizmetSectionIndex > -1) {
                    // Find tables after "Mal ve Hizmet"
                    const sections = dialogContent.querySelectorAll('table, [class*="TabPanel"], [role="tabpanel"]');
                    for (const section of sections) {
                        const sectionText = section.textContent || '';
                        if (sectionText.includes('Sınıf') || sectionText.includes('Mal ve Hizmet')) {
                            const sRows = section.querySelectorAll('tr');
                            for (const sRow of sRows) {
                                const sCells = sRow.querySelectorAll('td');
                                if (sCells.length >= 2) {
                                    const sinif = sCells[0].textContent?.trim() || '';
                                    const aciklama = sCells[1].textContent?.trim() || '';
                                    if (sinif && aciklama && /^\d+$/.test(sinif)) {
                                        result.malHizmetBilgileri.push({ sinif, aciklama });
                                    }
                                }
                            }
                        }
                    }
                }

                // ---- BAŞVURU İŞLEM BİLGİLERİ ----
                const islemSectionIndex = allText.indexOf('Başvuru İşlem');
                if (islemSectionIndex > -1) {
                    // Find the last table(s) which should be the process history
                    const allTables = Array.from(dialogContent.querySelectorAll('table'));
                    // Process history table is typically the last one
                    for (const table of allTables) {
                        const headerText = table.textContent || '';
                        if (headerText.includes('Tarih') && headerText.includes('İşlem')) {
                            const tRows = table.querySelectorAll('tbody tr, tr');
                            for (const tRow of tRows) {
                                const tCells = tRow.querySelectorAll('td');
                                if (tCells.length >= 3) {
                                    result.islemBilgileri.push({
                                        tarih: tCells[0].textContent?.trim() || '-',
                                        tebligTarihi: tCells[1].textContent?.trim() || '-',
                                        islem: tCells[2].textContent?.trim() || '-',
                                        aciklama: tCells.length >= 4 ? tCells[3].textContent?.trim() || '-' : '-'
                                    });
                                }
                            }
                        }
                    }
                }

                // Also try to get the logo/image from the modal
                const modalImg = dialog.querySelector('img');
                if (modalImg && modalImg.src) {
                    result.markaBilgileri['Şekil'] = modalImg.src;
                }

                return result;
            });

            log(`Detail scraped: ${Object.keys(detailData.markaBilgileri).length} fields, ${detailData.malHizmetBilgileri.length} classes, ${detailData.islemBilgileri.length} process steps`);

            // Close the popup
            await page.evaluate(() => {
                // Try multiple close strategies
                const closeBtn = document.querySelector('[role="dialog"] button[aria-label="close"], [role="presentation"] button svg[data-testid="CloseIcon"]');
                if (closeBtn) {
                    const btn = closeBtn.closest('button') || closeBtn;
                    (btn as HTMLElement).click();
                    return;
                }

                // Find X or close button in dialog
                const dialogButtons = document.querySelectorAll('[role="dialog"] button, [role="presentation"] button, .MuiDialog-root button');
                for (const btn of dialogButtons) {
                    const text = btn.textContent?.trim() || '';
                    if (text === '×' || text === 'X' || text === 'x' || text === '') {
                        const svg = btn.querySelector('svg');
                        if (svg || text === '×' || text === 'X') {
                            (btn as HTMLElement).click();
                            return;
                        }
                    }
                }

                // Fallback: press Escape
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
            });

            await new Promise(r => setTimeout(r, 1000));
            log("Detail popup closed.");

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
