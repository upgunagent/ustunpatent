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

        // Fix: If sessionId was nested in params, lift it up
        if (!sessionId && (params as any).sessionId) {
            sessionId = (params as any).sessionId;
        }

        log(`API Request: ${action}, Session: ${sessionId || 'new'}`);

        const launchBrowser = async () => {
            const isLocal = process.env.NODE_ENV === 'development';

            if (isLocal) {
                // Local development - verify chrome path
                const result = require('child_process').spawnSync('where', ['chrome']);
                const chromePath = result.stdout?.toString().trim().split('\n')[0];

                log(`Local Chrome Path: ${chromePath}`);

                return await require('puppeteer').launch({
                    executablePath: chromePath,
                    headless: true, // Hideless mode
                    defaultViewport: { width: 1920, height: 1080 }, // Set content size
                    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
                    protocolTimeout: 240000 // Increase timeout
                });
            } else {
                // Production (Vercel)
                return await puppeteer.launch({
                    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
                    // @ts-ignore
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(
                        `https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar`
                    ),
                    // @ts-ignore
                    headless: chromium.headless,
                    // @ts-ignore - known issue with types
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
            // Close old browser if exists
            if (globalBrowser) {
                try {
                    await globalBrowser.close();
                } catch (e) { log(`Error closing old browser: ${e}`); }
                globalBrowser = null;
                globalSessionId = null;
            }

            // Launch new browser
            browser = await launchBrowser();

            if (!browser) {
                throw new Error("Browser başlatılamadı.");
            }

            globalBrowser = browser;
            globalSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            log(`Created new browser session: ${globalSessionId}`);

            // Set up page
            page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            // Viewport handled by start-maximized or set explicit if needed
            if (process.env.NODE_ENV !== 'development') {
                await page.setViewport({ width: 1920, height: 1080 });
            }

            // Ensure we are at the search page
            log("Navigating...");
            await page.goto('https://www.turkpatent.gov.tr/arastirma-yap?form=trademark', { waitUntil: 'domcontentloaded', timeout: 60000 });

            GlobalSession.update(globalSessionId);
        }

        // Get fresh page ref if we reused browser
        if (!page && browser) {
            const pages = await browser.pages();
            // Find the tab with TurkPatent open
            page = pages.find(p => p.url().includes('turkpatent')) || null;

            // If not found, try the last open tab (usually the active one)
            if (!page && pages.length > 0) {
                page = pages[pages.length - 1];
            }

            // Fallback to new page
            if (!page) {
                page = await browser.newPage();
            }

            const currentUrl = page.url();
            log(`Using page: ${currentUrl} (Title: ${await page.title().catch(() => 'Unknown')})`);
        }

        if (!page) throw new Error("Ensure Page failed");

        if (action === 'search') {
            const { searchText, niceClasses } = params;
            log(`Search Action: text=${searchText}, classes=${niceClasses}`);

            // 1. Wait for Search Input and Clear/Type
            const inputSelector = 'input[placeholder="Marka Adı"]';
            try {
                // Wait for input to be ready
                await page.waitForSelector(inputSelector, { visible: true, timeout: 20000 });

                // Focus and Clear using a more robust method
                await page.focus(inputSelector);

                // Clear existing value via evaluation (fast and reliable)
                await page.$eval(inputSelector, (el: any) => el.value = '');

                // Type the new text
                await page.type(inputSelector, searchText, { delay: 100 });
                log(`Typed search text: ${searchText}`);

                // Small pause to ensure UI updates
                await new Promise(r => setTimeout(r, 500));
            } catch (e: any) {
                log(`Input error: ${e.message}`);
                throw e;
            }

            // 2. Class Selection - DISABLED (Client-side filtering enabled)
            if (niceClasses) {
                log(`Skipping server-side class selection for: ${niceClasses} (Client-side handling)`);
            }

            // Click Search Button - Improved Logic
            log("Attempting to click search button...");
            try {
                // Try specific semantic selector first
                const btnSelector = 'button.MuiButton-containedSecondary';
                if (await page.$(btnSelector)) {
                    await page.click(btnSelector);
                    log("Clicked button via class selector");
                } else {
                    // Timer-based fallback to find button by text
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const searchBtn = buttons.find(b => b.textContent?.trim().includes('Sorgula'));
                        if (searchBtn && (searchBtn as HTMLElement).click) {
                            (searchBtn as HTMLElement).click();
                        } else {
                            throw new Error("Sorgula button not found in DOM");
                        }
                    });
                    log("Clicked button via text content");
                }
            } catch (e: any) {
                log(`Button click error: ${e.message}`);
                throw new Error("Failed to click Search button: " + e.message);
            }

            // Wait for EITHER results table OR "No Results" message
            // This prevents "Execution context destroyed" errors from long timeouts
            try {
                log("Waiting for (Results OR 'Not Found')...");

                await page.waitForFunction(() => {
                    // Case A: Results found
                    const rows = document.querySelectorAll('tr.MuiTableRow-root');
                    if (rows.length > 0) return true;

                    // Case B: No results found (Text or Alert)
                    const bodyText = document.body.innerText;
                    if (bodyText.includes('0 kayıt') || bodyText.includes('Sonuç bulunamadı')) return true;

                    const alerts = document.querySelectorAll('.MuiAlert-message, .MuiPaper-root');
                    for (const el of alerts) {
                        if (el.textContent && el.textContent.includes('Sonuç bulunamadı')) return true;
                    }

                    return false;
                }, { timeout: 30000 });

                // Determine which one happened
                const noResults = await page.evaluate(() => {
                    const bodyText = document.body.innerText;
                    if (bodyText.includes('0 kayıt') || bodyText.includes('Sonuç bulunamadı')) return true;
                    const alerts = Array.from(document.querySelectorAll('.MuiAlert-message, .MuiPaper-root'));
                    return alerts.some(el => el.textContent?.includes('Sonuç bulunamadı'));
                });

                if (noResults) {
                    log("Detected 'No Results' state immediately.");
                    return NextResponse.json({ success: true, count: 0, data: [], sessionId: globalSessionId, debugLogs: logs });
                }

                // Proceed to scraping as we assume rows are present
            } catch (e: any) {
                // Handle specific Puppeteer errors
                log(`Wait Result Error: ${e.message}`);
                if (e.message.includes('Execution context was destroyed')) {
                    throw new Error("Sayfa bağlantısı yenilendi, lütfen tekrar deneyin.");
                }
                throw new Error("Sonuçlar veya 'bulunamadı' mesajı 30 saniye içinde gelmedi.");
            }

            // --- INFINITE SCROLL LOGIC ---
            try {
                log("Checking 'Sonsuz Liste' status...");
                const infiniteSwitchSelector = 'input.MuiSwitch-input';

                // 1. Enable Infinite Scroll if OFF
                const enabled = await page.evaluate((sel) => {
                    const el = document.querySelector(sel) as HTMLInputElement;
                    if (el && !el.checked) {
                        el.click(); // Enable it
                        return true; // We changed it
                    }
                    return false; // Already enabled or not found
                }, infiniteSwitchSelector);

                if (enabled) {
                    log("Enabled 'Sonsuz Liste' mode.");
                    await new Promise(r => setTimeout(r, 2000)); // Wait for mode switch
                } else {
                    log("'Sonsuz Liste' already active or not found.");
                }

                // 2. Auto-Scroll Loop
                log("Starting auto-scroll to load all records...");
                let previousHeight = 0;
                let scrollAttempts = 0;
                const maxAttempts = 60; // Safety limit for larger lists

                while (scrollAttempts < maxAttempts) {
                    previousHeight = await page.evaluate('document.body.scrollHeight') as number;

                    // Scroll down in steps to trigger lazy loading better
                    await page.evaluate(async () => {
                        // Scroll to bottom
                        window.scrollTo(0, document.body.scrollHeight);
                    });

                    // Wait longer for network and rendering in headless mode
                    await new Promise(r => setTimeout(r, 2500));

                    const newHeight = await page.evaluate('document.body.scrollHeight') as number;

                    if (newHeight === previousHeight) {
                        // Double check with a longer wait
                        await new Promise(r => setTimeout(r, 1500));
                        const checkHeightAgain = await page.evaluate('document.body.scrollHeight');
                        if (checkHeightAgain === newHeight) break;
                    }
                    scrollAttempts++;
                }
                log(`Auto-scroll finished after ${scrollAttempts} attempts.`);

            } catch (e: any) {
                log(`Infinite scroll warning: ${e.message}`);
            }
            // -----------------------------

            // Scrape results using page.evaluate for better performance and stability
            const data = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('tr.MuiTableRow-root'));
                const results: any[] = [];

                rows.forEach((row) => {
                    // Skip header rows (usually contain th, not td)
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
                    // Registration Number (Tescil No)
                    const registrationNo = getTextByRole('registrationNo') || getTextByIndex(5);
                    const niceClasses = getTextByRole('niceClasses') || getTextByIndex(7);

                    // Extract Image Source
                    let imagePath = null;
                    const imageCell = row.querySelector('td[role="image"]') || row.querySelectorAll('td')[8];
                    if (imageCell) {
                        const img = imageCell.querySelector('img');
                        if (img && img.src) {
                            imagePath = img.src;
                        }
                    }

                    if (applicationNo) {
                        results.push({
                            id: applicationNo,
                            applicationNo,
                            markName,
                            holderName,
                            applicationDate,
                            registrationNo, // Include Tescil No
                            niceClasses,
                            imagePath // Return the extracted image src
                        });
                    }
                });
                return results;
            });

            // Total Count
            let totalCount = data.length; // Default to scraped count
            try {
                // Try to get total count specifically if pagination exists
                const countText = await page.$eval('.MuiTablePagination-displayedRows', el => el.textContent);
                if (countText) {
                    const match = countText.match(/(\d+)$/); // "1-10 of 100" -> 100
                    if (match) totalCount = parseInt(match[1]); // More reliable regex
                }
            } catch (e) { log("Pagination count error (ignorable)"); }

            log(`Found ${data.length} records. Total estimated: ${totalCount}`);

            // Log first result for debugging
            if (data.length > 0) {
                log(`First result sample: ${JSON.stringify(data[0])}`);
            }

            GlobalSession.update(globalSessionId);

            return NextResponse.json({
                success: true,
                data: data, // Frontend expects 'data', not 'results'
                count: totalCount,
                sessionId: globalSessionId,
                debugLogs: logs
            });
        } else if (action === 'navigate_page') {
            if (!page) throw new Error("Sayfa oturumu bulunamadı. Lütfen tekrar arama yapın.");

            const { direction } = params;
            log(`Navigating page: ${direction}`);

            try {
                // 1. Ensure Infinite Scroll is OFF
                // Scroll to top to ensure control is "visible" logic-wise (though evaluate ignores visibility, good practice)
                await page.evaluate(() => window.scrollTo(0, 0));
                await new Promise(r => setTimeout(r, 500));

                const infiniteSwitchSelector = 'input.MuiSwitch-input';
                // Use evaluate to avoid "element not visible" errors with Puppeteer click
                const wasInfinite = await page.evaluate((sel) => {
                    const el = document.querySelector(sel) as HTMLInputElement;
                    if (el && el.checked) {
                        el.click(); // Programmatic click
                        return true;
                    }
                    return false;
                }, infiniteSwitchSelector);

                if (wasInfinite) {
                    log("Infinite list mode detected and disabled via JS.");
                    await new Promise(r => setTimeout(r, 2000)); // Wait for render
                }

                // 2. Scroll to bottom to ensure pagination controls are rendered
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await new Promise(r => setTimeout(r, 1000));

                // 3. Find and Click the Button
                const label = direction === 'next' ? 'Sonraki' : 'Önceki';
                const ariaSelector = `button[aria-label="${label}"]`;

                log(`Looking for button: ${ariaSelector}`);

                // Wait for the button to appear in DOM
                try {
                    await page.waitForSelector(ariaSelector, { timeout: 5000 });
                } catch (e) {
                    log(`Wait failed, trying text search fallback...`);
                }

                let buttonClicked = false;

                // Attempt 1: Standard Aria Label with Puppeteer Click
                const btnHandle = await page.$(ariaSelector);
                if (btnHandle) {
                    const isDisabled = await page.evaluate(el => (el as HTMLButtonElement).disabled, btnHandle);
                    if (isDisabled) throw new Error(`${label} sayfa butonu pasif (son sayfada olabilirsiniz).`);

                    await btnHandle.click();
                    buttonClicked = true;
                    log(`Clicked ${label} using aria-label selector`);
                }

                // Attempt 2: JS Click via Evaluate (Fallback)
                if (!buttonClicked) {
                    log(`Standard click failed/not found, trying JS Text Search click...`);
                    buttonClicked = await page.evaluate((targetLabel) => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        // Flexible match: Exact text, includes text, or aria-label includes text
                        const targetBtn = buttons.find(b =>
                            b.textContent?.trim() === targetLabel ||
                            b.textContent?.includes(targetLabel) ||
                            b.getAttribute('aria-label')?.includes(targetLabel)
                        );

                        if (targetBtn) {
                            if ((targetBtn as HTMLButtonElement).disabled) return false;
                            (targetBtn as HTMLElement).click();
                            return true;
                        }
                        return false;
                    }, label);

                    if (!buttonClicked) {
                        // Debug: Log all buttons found
                        const allButtons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.innerText || b.getAttribute('aria-label') || 'unnamed'));
                        log(`Available buttons: ${allButtons.join(', ')}`);
                        throw new Error(`${label} butonu bulunamadı. Lütfen "Sonsuz Liste" modunun kapalı olduğundan emin olun.`);
                    }
                    log(`Clicked ${label} using JS text search`);
                }

                // Wait for table update
                await new Promise(r => setTimeout(r, 3000));

                // Scrape results (Reusing logic)
                const data = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('tr.MuiTableRow-root'));
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
                                registrationNo, // Include Tescil No
                                niceClasses,
                                imagePath // Return the extracted image src
                            });
                        }
                    });
                    return results;
                });

                // Total Count Extraction (Reuse robust logic)
                const totalCount = await page.evaluate((currentCount) => {
                    // Method 1: Standard Pagination Footer "1-20 of 145"
                    const caption = document.querySelector('.MuiTablePagination-caption');
                    if (caption && caption.textContent) {
                        const match = caption.textContent.match(/of\s+(\d+)/);
                        if (match) return parseInt(match[1]);
                    }

                    // Method 2: Specific Header Text found by analysis
                    // Selector: #search-results p (or generic p containing the text)
                    const headerCounts = Array.from(document.querySelectorAll('div#search-results p, p.MuiTypography-body2'));
                    for (const el of headerCounts) {
                        const text = el.textContent || '';
                        if (text.includes('kayıt bulundu')) {
                            // Text is like "145 kayıt bulundu. Sayfa 1 / 8"
                            const match = text.match(/(\d+)\s+kayıt bulundu/);
                            if (match) return parseInt(match[1]);
                        }
                    }

                    return currentCount; // Fallback to current page count
                }, data.length);

                GlobalSession.update(globalSessionId);

                return NextResponse.json({
                    success: true,
                    data: data,
                    count: totalCount, // Include total count
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
        // Ensure logs are returned
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
