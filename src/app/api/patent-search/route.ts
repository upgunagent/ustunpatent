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
            try {
                const pages = await browser.pages();
                page = pages.find(p => {
                    try { return p.url().includes('turkpatent'); } catch { return false; }
                }) || null;
                if (!page && pages.length > 0) {
                    // Test if the last page is still valid
                    try {
                        pages[pages.length - 1].url();
                        page = pages[pages.length - 1];
                    } catch {
                        page = null;
                    }
                }
                if (!page) page = await browser.newPage();
                
                // Verify page is still usable by testing a simple operation
                try {
                    await page.evaluate(() => document.title);
                    log(`Using page: ${page.url()}`);
                } catch (frameError: any) {
                    log(`Page frame detached: ${frameError.message}. Creating fresh session...`);
                    // Close the broken browser and start fresh
                    try { await browser.close(); } catch (e) { /* ignore */ }
                    globalBrowser = null;
                    globalSessionId = null;
                    
                    browser = await launchBrowser();
                    if (!browser) throw new Error("Browser başlatılamadı.");
                    
                    globalBrowser = browser;
                    globalSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                    log(`Created fresh browser session after detached frame: ${globalSessionId}`);
                    
                    page = await browser.newPage();
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    if (process.env.NODE_ENV !== 'development') {
                        await page.setViewport({ width: 1920, height: 1080 });
                    }
                    
                    log("Navigating to Türk Patent (fresh)...");
                    await page.goto('https://www.turkpatent.gov.tr/arastirma-yap?form=trademark', { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await dismissPopup(page, log);
                    GlobalSession.update(globalSessionId);
                }
            } catch (e: any) {
                log(`Session recovery error: ${e.message}. Starting completely fresh...`);
                if (globalBrowser) {
                    try { await globalBrowser.close(); } catch { /* ignore */ }
                }
                globalBrowser = null;
                globalSessionId = null;
                
                browser = await launchBrowser();
                if (!browser) throw new Error("Browser başlatılamadı.");
                
                globalBrowser = browser;
                globalSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                
                page = await browser.newPage();
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                if (process.env.NODE_ENV !== 'development') {
                    await page.setViewport({ width: 1920, height: 1080 });
                }
                
                await page.goto('https://www.turkpatent.gov.tr/arastirma-yap?form=trademark', { waitUntil: 'domcontentloaded', timeout: 60000 });
                await dismissPopup(page, log);
                GlobalSession.update(globalSessionId);
            }
        }

        if (!page) throw new Error("Sayfa bulunamadı.");

        // ========================
        // ACTION: SEARCH
        // ========================
        if (action === 'search') {
            const { searchText, niceClasses } = params;
            log(`Search Action: text=${searchText}, classes=${niceClasses}`);

            // Ensure we're on the search page
            let needsNavigation = true;
            try {
                const currentUrl = page.url();
                needsNavigation = !currentUrl.includes('turkpatent.gov.tr') || !currentUrl.includes('arastirma');
            } catch {
                needsNavigation = true;
            }
            
            if (needsNavigation) {
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
            const { applicationNo, rowIndex, searchText } = params;
            log(`Detail Action: applicationNo=${applicationNo}, rowIndex=${rowIndex}, searchText=${searchText}`);

            if (!applicationNo) throw new Error("Başvuru numarası belirtilmedi.");

            // Helper function to find and click DETAY button
            const tryClickDetay = async (appNo: string, idx: number): Promise<string | null> => {
                await page!.evaluate(() => window.scrollTo(0, 0));
                await new Promise(r => setTimeout(r, 500));

                return await page!.evaluate((appNo: string, idx: number) => {
                    // Strategy 1: Try by ID-based action cells
                    const actionCells = document.querySelectorAll('td[id^="_actions-"]');
                    for (const cell of actionCells) {
                        const btn = cell.querySelector('button');
                        if (btn) {
                            const text = btn.textContent?.trim().toUpperCase() || '';
                            if (text.includes('DETAY')) {
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

                    // Strategy 2: Search all rows for matching applicationNo
                    const rows = Array.from(document.querySelectorAll('tr'));
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 3) continue;
                        let found = false;
                        for (const cell of cells) {
                            const cellText = cell.textContent?.trim() || '';
                            const normalize = (s: string) => s.replace(/[\s\/]/g, '');
                            if (normalize(cellText) === normalize(appNo)) { found = true; break; }
                        }
                        if (found) {
                            const buttons = row.querySelectorAll('button');
                            for (const btn of buttons) {
                                if (btn.textContent?.trim().toUpperCase().includes('DETAY')) {
                                    row.scrollIntoView({ behavior: 'instant', block: 'center' });
                                    btn.click();
                                    return 'found-by-text';
                                }
                            }
                        }
                    }

                    // Strategy 3: Single result
                    const allDetayBtns = Array.from(document.querySelectorAll('button')).filter(
                        b => b.textContent?.trim().toUpperCase().includes('DETAY')
                    );
                    if (allDetayBtns.length === 1) {
                        allDetayBtns[0].scrollIntoView({ behavior: 'instant', block: 'center' });
                        allDetayBtns[0].click();
                        return 'found-single';
                    }

                    // Strategy 4: Use rowIndex
                    if (idx >= 0 && allDetayBtns.length > idx) {
                        allDetayBtns[idx].scrollIntoView({ behavior: 'instant', block: 'center' });
                        allDetayBtns[idx].click();
                        return 'found-by-index';
                    }

                    return null;
                }, appNo, idx);
            };

            // First attempt to click DETAY
            let detayClicked = await tryClickDetay(applicationNo, rowIndex || 0);

            // If DETAY not found and we have searchText, re-do the search and try again
            if (!detayClicked && searchText) {
                log(`DETAY not found on current page. Re-searching for: ${searchText}`);
                
                // Navigate to search page
                try {
                    await page.goto('https://www.turkpatent.gov.tr/arastirma-yap?form=trademark', { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await dismissPopup(page, log);
                    
                    // Do the search
                    await findAndTypeSearchInput(page, searchText, log);
                    await clickSearchButton(page, log);
                    
                    // Wait for results
                    await page.waitForFunction(() => {
                        const rows = document.querySelectorAll('tr.MuiTableRow-root, table tbody tr');
                        return rows.length > 0;
                    }, { timeout: 30000 });
                    
                    log("Re-search completed. Waiting for results to stabilize...");
                    await new Promise(r => setTimeout(r, 2000));

                    // Try clicking DETAY again
                    detayClicked = await tryClickDetay(applicationNo, rowIndex || 0);
                    
                    if (detayClicked) {
                        log(`DETAY found after re-search via: ${detayClicked}`);
                    }
                } catch (reSearchErr: any) {
                    log(`Re-search failed: ${reSearchErr.message}`);
                }
            }

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

            // Scrape detail popup content - handles both TABLE and DIV-based (MUI JSS) structures
            const detailData = await page.evaluate(() => {
                const result: any = {
                    markaBilgileri: {} as Record<string, string>,
                    malHizmetBilgileri: [] as { sinif: string; aciklama: string }[],
                    islemBilgileri: [] as { tarih: string; tebligTarihi: string; islem: string; aciklama: string }[]
                };

                // Find the popup container
                const dialogs = document.querySelectorAll('[role="presentation"], [role="dialog"], .MuiDialog-root, .MuiModal-root');
                if (dialogs.length === 0) return result;
                
                const dialog = dialogs[dialogs.length - 1]; // Last dialog is the detail popup
                const contentArea = dialog.querySelector('.MuiCardContent-root, .MuiDialogContent-root') || dialog;

                // Helper: Extract key-value pairs from any element (works with both table and div structures)
                const extractKeyValuePairs = (container: Element): Record<string, string> => {
                    const pairs: Record<string, string> = {};
                    
                    // Strategy 1: Try table-based extraction
                    const tables = container.querySelectorAll('table');
                    for (const table of tables) {
                        const rows = table.querySelectorAll('tr');
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td, th');
                            if (cells.length >= 2) {
                                const key = cells[0].textContent?.trim() || '';
                                const value = cells[1].textContent?.trim() || '';
                                if (key && value && key.length < 80) {
                                    pairs[key] = value;
                                }
                                if (cells.length >= 4) {
                                    const key2 = cells[2].textContent?.trim() || '';
                                    const value2 = cells[3].textContent?.trim() || '';
                                    if (key2 && value2 && key2.length < 80) {
                                        pairs[key2] = value2;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Strategy 2: Div-based MUI JSS structure - look for label:value patterns
                    if (Object.keys(pairs).length === 0) {
                        // Get all text nodes and their structure
                        const fullText = (container as HTMLElement).innerText || container.textContent || '';
                        const lines = fullText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                        
                        // Known label patterns for Marka Bilgileri
                        const knownLabels = [
                            'Başvuru Numarası', 'Başvuru Tarihi', 'Tescil Numarası', 'Tescil Tarihi',
                            'Marka Adı', 'Marka Tipi', 'Marka Türü', 'Durumu', 'Durum',
                            'Vekil Bilgileri', 'Sahip Bilgileri', 'Referans No',
                            'Marka İlan Bülten No', 'Marka İlan Bülten Tarihi',
                            'Tescil Yayın Bülten No', 'Tescil Yayın Bülten Tarihi',
                            'Nice Sınıfları', 'Koruma Bitiş Tarihi',
                            'Uluslararası Tescil Numarası', 'Uluslararası Başvuru Tarihi',
                            'Menşe Ofis', 'Başvuru Sahibi', 'Vekil'
                        ];
                        
                        // Try to find label:value patterns in adjacent lines
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            
                            // Check if this line matches a known label
                            for (const label of knownLabels) {
                                if (line === label || line === label + ':' || line.startsWith(label + ':')) {
                                    // Value might be the rest of this line or the next line
                                    if (line.includes(':') && line.length > label.length + 1) {
                                        const value = line.substring(line.indexOf(':') + 1).trim();
                                        if (value) pairs[label] = value;
                                    } else if (i + 1 < lines.length) {
                                        const nextLine = lines[i + 1];
                                        // Make sure next line isn't another label
                                        const isLabel = knownLabels.some(l => nextLine === l || nextLine === l + ':');
                                        if (!isLabel && nextLine.length > 0) {
                                            pairs[label] = nextLine;
                                        }
                                    }
                                    break;
                                }
                            }
                            
                            // Also try colon-separated key:value on same line
                            const colonIdx = line.indexOf(':');
                            if (colonIdx > 2 && colonIdx < 40) {
                                const key = line.substring(0, colonIdx).trim();
                                const value = line.substring(colonIdx + 1).trim();
                                if (key && value && key.length < 50 && !pairs[key]) {
                                    pairs[key] = value;
                                }
                            }
                        }
                        
                        // Strategy 3: Look for div pairs - label div followed by value div
                        const allDivs = container.querySelectorAll('div');
                        for (let i = 0; i < allDivs.length; i++) {
                            const div = allDivs[i];
                            const text = div.textContent?.trim() || '';
                            
                            if (text && knownLabels.includes(text)) {
                                // Look at next sibling or parent's next child
                                const nextSibling = div.nextElementSibling;
                                if (nextSibling) {
                                    const sibText = nextSibling.textContent?.trim() || '';
                                    if (sibText && sibText !== text && !knownLabels.includes(sibText)) {
                                        pairs[text] = sibText;
                                    }
                                }
                            }
                        }
                    }
                    
                    return pairs;
                };

                // Helper: Extract table data (works with both table and div grid)
                const extractTableRows = (container: Element, minCols: number): string[][] => {
                    const rows: string[][] = [];
                    
                    // Strategy 1: Standard table
                    const tables = container.querySelectorAll('table');
                    for (const table of tables) {
                        const trs = table.querySelectorAll('tbody tr, tr');
                        for (const tr of trs) {
                            const cells = tr.querySelectorAll('td');
                            if (cells.length >= minCols) {
                                const row = Array.from(cells).map(c => c.textContent?.trim() || '-');
                                rows.push(row);
                            }
                        }
                    }
                    
                    // Strategy 2: If no table rows found, parse from text
                    if (rows.length === 0) {
                        const fullText = (container as HTMLElement).innerText || container.textContent || '';
                        const lines = fullText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                        
                        // Skip header lines
                        const legendText = container.querySelector('legend')?.textContent?.trim() || '';
                        const headerKeywords = ['Sınıf', 'Mal ve Hizmet', 'Tarih', 'Tebliğ', 'İşlem', 'Açıklama'];
                        
                        let dataStarted = false;
                        let currentRow: string[] = [];
                        
                        for (const line of lines) {
                            if (line === legendText) continue;
                            if (headerKeywords.some(k => line.includes(k)) && !dataStarted) {
                                dataStarted = true;
                                continue;
                            }
                            if (dataStarted) {
                                currentRow.push(line);
                                if (currentRow.length >= minCols) {
                                    rows.push([...currentRow]);
                                    currentRow = [];
                                }
                            }
                        }
                    }
                    
                    return rows;
                };

                // Find all fieldset sections
                const fieldsets = contentArea.querySelectorAll('fieldset');

                for (const fieldset of fieldsets) {
                    const legend = fieldset.querySelector('legend');
                    const sectionTitle = legend?.textContent?.trim() || '';

                    if (sectionTitle.includes('Marka Bilgileri')) {
                        // ---- MARKA BİLGİLERİ ----
                        const pairs = extractKeyValuePairs(fieldset);
                        // Filter out the legend text itself
                        for (const [key, value] of Object.entries(pairs)) {
                            if (key !== 'Marka Bilgileri' && key.length > 1 && value.length > 0) {
                                result.markaBilgileri[key] = value;
                            }
                        }

                        // Get logo image
                        const img = fieldset.querySelector('img');
                        if (img && img.src) {
                            result.markaBilgileri['Şekil'] = img.src;
                        }

                    } else if (sectionTitle.includes('Mal ve Hizmet')) {
                        // ---- MAL VE HİZMET BİLGİLERİ ----
                        const tableRows = extractTableRows(fieldset, 2);
                        for (const row of tableRows) {
                            const sinif = row[0]?.trim() || '';
                            const aciklama = row.slice(1).join(' ').trim();
                            if (sinif && aciklama && /^\d+$/.test(sinif)) {
                                result.malHizmetBilgileri.push({ sinif, aciklama });
                            }
                        }
                        
                        // Fallback: Parse from text if no table rows
                        if (result.malHizmetBilgileri.length === 0) {
                            const text = (fieldset as HTMLElement).innerText || fieldset.textContent || '';
                            const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                            let currentClass = '';
                            
                            for (const line of lines) {
                                if (line === sectionTitle || line === 'Sınıf' || line === 'Mal ve Hizmetler') continue;
                                if (/^\d{1,2}$/.test(line)) {
                                    currentClass = line;
                                } else if (currentClass && line.length > 10) {
                                    result.malHizmetBilgileri.push({ sinif: currentClass, aciklama: line });
                                    currentClass = '';
                                }
                            }
                        }

                    } else if (sectionTitle.includes('İşlem') || sectionTitle.includes('Başvuru İşlem')) {
                        // ---- BAŞVURU İŞLEM BİLGİLERİ ----
                        const tableRows = extractTableRows(fieldset, 3);
                        for (const row of tableRows) {
                            result.islemBilgileri.push({
                                tarih: row[0] || '-',
                                tebligTarihi: row[1] || '-',
                                islem: row[2] || '-',
                                aciklama: row[3] || '-'
                            });
                        }
                        
                        // Fallback: Parse from text
                        if (result.islemBilgileri.length === 0) {
                            const text = (fieldset as HTMLElement).innerText || fieldset.textContent || '';
                            const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                            const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;
                            
                            let i = 0;
                            while (i < lines.length) {
                                if (datePattern.test(lines[i])) {
                                    const tarih = lines[i];
                                    const teblig = (i + 1 < lines.length && (datePattern.test(lines[i+1]) || lines[i+1] === '-')) ? lines[i+1] : '-';
                                    const islemIdx = teblig !== '-' ? i + 2 : i + 1;
                                    const islem = islemIdx < lines.length ? lines[islemIdx] : '-';
                                    const aciklama = islemIdx + 1 < lines.length && !datePattern.test(lines[islemIdx + 1]) ? lines[islemIdx + 1] : '-';
                                    
                                    result.islemBilgileri.push({ tarih, tebligTarihi: teblig, islem, aciklama });
                                    i = aciklama !== '-' ? islemIdx + 2 : islemIdx + 1;
                                } else {
                                    i++;
                                }
                            }
                        }
                    }
                }

                // Ultimate fallback: Just get the full text content organized by sections
                if (Object.keys(result.markaBilgileri).length === 0 && fieldsets.length > 0) {
                    // Get the full text of each section
                    for (const fieldset of fieldsets) {
                        const legend = fieldset.querySelector('legend');
                        const sectionTitle = legend?.textContent?.trim() || '';
                        const sectionText = (fieldset as HTMLElement).innerText || fieldset.textContent || '';
                        
                        if (sectionTitle.includes('Marka Bilgileri')) {
                            result.markaBilgileri['_rawText'] = sectionText.substring(0, 2000);
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
