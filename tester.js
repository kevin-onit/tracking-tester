const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const OpenAI = require('openai');

// Initialize OpenAI (optional - only if API key provided)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;

// Get config file from command line
const configFile = process.argv[2];

if (!configFile || !fs.existsSync(configFile)) {
    console.error('Config file not found');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Test data generator
function generateTestData(inputType, inputName) {
    const lowerName = (inputName || '').toLowerCase();
    
    if (lowerName.includes('email') || lowerName.includes('e-mail')) {
        return 'kevin@weareon-it.nl';
    }
    if (lowerName.includes('phone') || lowerName.includes('tel') || lowerName.includes('mobile')) {
        return '0612345678';
    }
    if (lowerName.includes('name') || lowerName.includes('naam')) {
        if (lowerName.includes('first') || lowerName.includes('voor')) {
            return 'Kevin';
        }
        if (lowerName.includes('last') || lowerName.includes('achter')) {
            return 'de Vette';
        }
        return 'Kevin de Vette';
    }
    if (lowerName.includes('address') || lowerName.includes('adres') || lowerName.includes('street')) {
        return 'Teststraat 123';
    }
    if (lowerName.includes('city') || lowerName.includes('stad') || lowerName.includes('plaats')) {
        return 'Amsterdam';
    }
    if (lowerName.includes('zip') || lowerName.includes('postal') || lowerName.includes('postcode')) {
        return '1234AB';
    }
    if (lowerName.includes('company') || lowerName.includes('bedrijf')) {
        return 'WeAreOn IT';
    }
    if (lowerName.includes('message') || lowerName.includes('bericht') || lowerName.includes('comment')) {
        return 'Dit is een automatische test van de tracking tester tool.';
    }
    
    // Default based on input type
    if (inputType === 'email') return 'kevin@weareon-it.nl';
    if (inputType === 'tel') return '0612345678';
    if (inputType === 'number') return '1';
    
    return 'Test data';
}

// AI-powered navigation to find contact forms
async function findContactFormWithAI(page, formActions) {
    if (!openai) {
        formActions.push('ℹ️ AI navigation disabled (no API key)');
        return false;
    }

    try {
        formActions.push('🤖 AI: Analyzing page for contact links...');
        
        // Get all links on the page
        const links = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            return allLinks.map(link => ({
                text: link.textContent.trim(),
                href: link.href,
                title: link.title || ''
            })).filter(l => l.text.length > 0 && l.text.length < 100);
        });

        if (links.length === 0) return false;

        // Ask AI which link is most likely to lead to a contact form
        const prompt = `Je bent een website navigator. Welke van deze links leidt waarschijnlijk naar een contactformulier of offerte aanvraagpagina?

Links:
${links.slice(0, 20).map((l, i) => `${i + 1}. "${l.text}" (${l.href})`).join('\n')}

Antwoord ALLEEN met het nummer van de beste link, of "0" als geen goede optie. Geen uitleg.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 10
        });

        const answer = completion.choices[0].message.content.trim();
        const linkIndex = parseInt(answer) - 1;

        if (linkIndex >= 0 && linkIndex < links.length) {
            const selectedLink = links[linkIndex];
            formActions.push(`🤖 AI: Found contact link: "${selectedLink.text}"`);
            formActions.push(`🔗 Navigating to: ${selectedLink.href}`);
            
            await page.goto(selectedLink.href, { waitUntil: 'networkidle0', timeout: 30000 });
            return true;
        }
    } catch (error) {
        formActions.push(`⚠️ AI navigation failed: ${error.message}`);
    }
    
    return false;
}

// Detect which tools are being used
function getDetectedTools(trackingEvents) {
    const tools = new Set();
    
    trackingEvents.forEach(event => {
        if (event.platform.includes('Google Tag Manager')) {
            tools.add('Google Tag Manager');
        }
        if (event.platform.includes('Google Analytics')) {
            tools.add('Google Analytics 4');
        }
        if (event.platform.includes('Google Ads')) {
            tools.add('Google Ads');
        }
        if (event.platform.includes('Facebook')) {
            tools.add('Meta Pixel');
        }
    });
    
    return Array.from(tools);
}

// Detect if redirected to thank you page
async function detectThankYouPage(page, originalUrl) {
    const currentUrl = page.url();
    const pageTitle = await page.title();
    const pageText = await page.evaluate(() => document.body.textContent || '').then(t => t.toLowerCase());
    
    // Check URL change
    const urlChanged = currentUrl !== originalUrl;
    
    // Check for thank you indicators
    const thankYouKeywords = [
        'bedankt', 'thank you', 'thanks', 'dank u', 'dank je',
        'gelukt', 'succes', 'ontvangen', 'received', 'confirmation',
        'bevestiging', 'verzonden', 'submitted'
    ];
    
    const hasThankYouUrl = thankYouKeywords.some(keyword => 
        currentUrl.toLowerCase().includes(keyword)
    );
    
    const hasThankYouTitle = thankYouKeywords.some(keyword => 
        pageTitle.toLowerCase().includes(keyword)
    );
    
    const hasThankYouText = thankYouKeywords.some(keyword => 
        pageText.includes(keyword)
    );
    
    if (urlChanged || hasThankYouUrl || hasThankYouTitle || hasThankYouText) {
        return {
            detected: true,
            url: currentUrl,
            title: pageTitle,
            urlChanged: urlChanged,
            indicators: {
                thankYouUrl: hasThankYouUrl,
                thankYouTitle: hasThankYouTitle,
                thankYouContent: hasThankYouText
            }
        };
    }
    
    return { detected: false };
}

(async () => {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
    
    const browser = await puppeteer.launch({
        headless: config.headless !== false ? 'new' : false,
        args: isProduction ? chromium.args : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: isProduction ? await chromium.executablePath() : puppeteer.executablePath(),
        slowMo: config.headless === false ? 100 : 0
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1512, height: 982 });

    // Collect network requests
    const requests = [];
    const trackingEvents = [];
    const formActions = [];

    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers()
        });
    });

    page.on('response', async response => {
        const url = response.url();
        const status = response.status();
        
        // Detect tracking requests
        if (url.includes('google-analytics.com') || 
            url.includes('googletagmanager.com') ||
            url.includes('googleadservices.com') ||
            url.includes('facebook.com/tr') ||
            url.includes('doubleclick.net')) {
            
            let platform = 'Unknown';
            let eventName = '';
            let details = '';
            let sentData = {};

            if (url.includes('google-analytics.com/g/collect')) {
                platform = 'Google Analytics 4';
                const urlParams = new URL(url);
                eventName = urlParams.searchParams.get('en') || 'page_view';
                details = `Event ID: ${urlParams.searchParams.get('_s')}`;
                
                // Extract sent data
                sentData = {
                    event_name: eventName,
                    measurement_id: urlParams.searchParams.get('tid'),
                    client_id: urlParams.searchParams.get('cid'),
                    session_id: urlParams.searchParams.get('sid'),
                    user_id: urlParams.searchParams.get('uid'),
                    currency: urlParams.searchParams.get('cu'),
                    value: urlParams.searchParams.get('ev'),
                    // Enhanced conversions data
                    email: urlParams.searchParams.get('ep.sha256_email_address'),
                    phone: urlParams.searchParams.get('ep.sha256_phone_number')
                };
            } else if (url.includes('googletagmanager.com/gtm.js')) {
                platform = 'Google Tag Manager';
                eventName = 'GTM Container Loaded';
                const match = url.match(/id=(GTM-[A-Z0-9]+)/);
                if (match) {
                    details = match[1];
                    sentData = { container_id: match[1] };
                }
            } else if (url.includes('googleadservices.com/pagead/conversion')) {
                platform = 'Google Ads';
                eventName = 'Conversion';
                const urlParams = new URL(url);
                const label = urlParams.searchParams.get('label');
                const conversionId = urlParams.searchParams.get('id');
                if (label) details = `Label: ${label}`;
                
                sentData = {
                    conversion_id: conversionId,
                    conversion_label: label,
                    value: urlParams.searchParams.get('value'),
                    currency: urlParams.searchParams.get('currency_code')
                };
            } else if (url.includes('facebook.com/tr')) {
                platform = 'Facebook Pixel';
                const urlParams = new URL(url);
                const match = urlParams.searchParams.get('ev');
                eventName = match || 'PageView';
                const idMatch = urlParams.searchParams.get('id');
                if (idMatch) details = `Pixel ID: ${idMatch}`;
                
                sentData = {
                    pixel_id: idMatch,
                    event: eventName,
                    // User data (hashed)
                    em: urlParams.searchParams.get('ud[em]'),
                    ph: urlParams.searchParams.get('ud[ph]'),
                    fn: urlParams.searchParams.get('ud[fn]'),
                    ln: urlParams.searchParams.get('ud[ln]')
                };
            }

            trackingEvents.push({
                platform,
                event_name: eventName,
                details,
                url: url.substring(0, 100),
                status: status < 400 ? 'success' : 'failed',
                data: sentData
            });
        }
    });

    try {
        // Navigate to page
        await page.goto(config.url, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Check for captcha/challenge pages
        let pageTitle = await page.title();
        let pageUrl = page.url();
        let originalPageUrl = pageUrl;
        
        if (pageTitle.toLowerCase().includes('robot') || 
            pageTitle.toLowerCase().includes('challenge') ||
            pageTitle.toLowerCase().includes('captcha') ||
            pageUrl.includes('sgcaptcha') ||
            pageUrl.includes('challenge')) {
            formActions.push(`⚠️ Captcha detected: ${pageTitle}`);
            formActions.push(`🔄 Waiting 5 seconds and refreshing...`);
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
            
            pageTitle = await page.title();
            pageUrl = page.url();
            originalPageUrl = pageUrl;
            formActions.push(`📄 After refresh: ${pageTitle}`);
            formActions.push(`🌐 URL: ${pageUrl}`);
        } else {
            formActions.push(`📄 Loaded: ${pageTitle}`);
            formActions.push(`🌐 URL: ${pageUrl}`);
        }
        
        // Take screenshot before
        const screenshotBefore = await page.screenshot({ encoding: 'base64', fullPage: false });

        // AUTO-DETECT AND FILL ALL FORMS
        let forms = await page.$$('form');
        formActions.push(`Found ${forms.length} form(s) on the page`);

        // If no forms found, try AI navigation to find contact page
        if (forms.length === 0 && config.useAI !== false) {
            formActions.push(`🤖 No forms found, trying AI navigation...`);
            const navigated = await findContactFormWithAI(page, formActions);
            
            if (navigated) {
                // Update page info after navigation
                const newPageTitle = await page.title();
                const newPageUrl = page.url();
                formActions.push(`📄 New page: ${newPageTitle}`);
                formActions.push(`🌐 New URL: ${newPageUrl}`);
                
                // Check for forms again
                forms = await page.$$('form');
                formActions.push(`Found ${forms.length} form(s) on new page`);
            }
        }

        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            
            // Get form details
            const formInfo = await form.evaluate(el => ({
                id: el.id || '',
                name: el.name || '',
                action: el.action || '',
                class: el.className || '',
                visible: el.offsetParent !== null && el.offsetHeight > 0
            }));
            
            // Skip hidden forms
            if (!formInfo.visible) {
                formActions.push(`⏭️ Skipping hidden form ${i + 1}`);
                continue;
            }
            
            // Detect newsletter forms
            const formText = await form.evaluate(el => {
                const allText = el.textContent || '';
                return allText.toLowerCase();
            });
            
            const isNewsletter = formText.includes('nieuwsbrief') || 
                                formText.includes('newsletter') || 
                                formText.includes('inschrijven') ||
                                formText.includes('subscribe') ||
                                (formInfo.id && formInfo.id.toLowerCase().includes('newsletter')) ||
                                (formInfo.class && formInfo.class.toLowerCase().includes('newsletter'));
            
            if (isNewsletter && config.skipNewsletters) {
                formActions.push(`📰 Skipping newsletter form ${i + 1}`);
                continue;
            }
            
            let formLabel = `Form ${i + 1}`;
            if (isNewsletter) formLabel += ` 📰 (Newsletter)`;
            if (formInfo.id) formLabel += ` (id: ${formInfo.id})`;
            if (formInfo.name) formLabel += ` (name: ${formInfo.name})`;
            
            // Get all input fields in this form
            const inputs = await form.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
            
            // Skip forms with no visible inputs
            if (inputs.length === 0) {
                formActions.push(`⏭️ Skipping ${formLabel}: No fillable fields`);
                continue;
            }
            
            formActions.push(`${formLabel}: Found ${inputs.length} fillable field(s)`);

            // Fill each input
            for (const input of inputs) {
                try {
                    const inputType = await input.evaluate(el => el.type || el.tagName.toLowerCase());
                    const inputName = await input.evaluate(el => el.name || el.id || el.placeholder || '');
                    const isVisible = await input.isVisible();

                    if (!isVisible) continue;

                    // Skip honeypot fields
                    const label = await input.evaluate(el => {
                        const labelEl = el.labels?.[0] || document.querySelector(`label[for="${el.id}"]`);
                        return labelEl?.textContent || '';
                    });
                    if (label.toLowerCase().includes('mens bent') || 
                        label.toLowerCase().includes('human') ||
                        label.toLowerCase().includes('leave this field blank')) {
                        formActions.push(`⏭️ Skipping honeypot field: ${inputName}`);
                        continue;
                    }

                    const testData = generateTestData(inputType, inputName);
                    
                    if (inputType === 'checkbox' || inputType === 'radio') {
                        await input.click();
                        formActions.push(`✓ Checked: ${inputName || inputType}`);
                    } else if (inputType === 'select' || inputType === 'select-one') {
                        await input.select(await input.evaluate(el => {
                            const options = Array.from(el.options);
                            return options.length > 1 ? options[1].value : options[0].value;
                        }));
                        formActions.push(`✓ Selected option in: ${inputName}`);
                    } else {
                        await input.click();
                        await input.type(testData, { delay: 50 });
                        formActions.push(`✓ Filled: ${inputName || inputType} = ${testData}`);
                    }

                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (e) {
                    formActions.push(`✗ Error filling field: ${e.message}`);
                }
            }

            // Find and click submit button with better detection
            let submitButton = await form.$('button[type="submit"], input[type="submit"]');
            
            // Fallback: look for button without type
            if (!submitButton) {
                submitButton = await form.$('button:not([type="button"]):not([type="reset"])');
            }
            
            // Fallback: look for any button with submit-like text
            if (!submitButton) {
                const buttons = await form.$$('button, input[type="button"]');
                for (const btn of buttons) {
                    const text = await btn.evaluate(el => (el.textContent || el.value || '').toLowerCase());
                    if (text.includes('submit') || text.includes('send') || text.includes('verzend') || 
                        text.includes('verstuur') || text.includes('aanvragen') || text.includes('contact')) {
                        submitButton = btn;
                        break;
                    }
                }
            }
            
            if (submitButton) {
                try {
                    const buttonText = await submitButton.evaluate(el => el.textContent || el.value || 'Submit');
                    const isVisible = await submitButton.isVisible();
                    const isDisabled = await submitButton.evaluate(el => el.disabled);
                    
                    if (!isVisible) {
                        formActions.push(`⚠ Submit button found but not visible: "${buttonText}"`);
                    } else if (isDisabled) {
                        formActions.push(`⚠️ Submit button disabled: "${buttonText}", enabling...`);
                        
                        // Try to enable the button
                        await submitButton.evaluate(el => {
                            el.disabled = false;
                            el.removeAttribute('disabled');
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        formActions.push(`🚀 Clicking submit button: "${buttonText}"`);
                        await submitButton.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        formActions.push(`✓ Form ${i + 1} submitted successfully`);
                    } else {
                        formActions.push(`🚀 Clicking submit button: "${buttonText}"`);
                        
                        await submitButton.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        formActions.push(`✓ Form ${i + 1} submitted successfully`);
                    }
                } catch (e) {
                    formActions.push(`✗ Could not submit form ${i + 1}: ${e.message}`);
                }
            } else {
                // Debug: show what buttons are available
                const allButtons = await form.$$('button, input[type="submit"], input[type="button"]');
                formActions.push(`⚠ No submit button found in form ${i + 1} (found ${allButtons.length} button(s) total)`);
                
                // Try to list button texts for debugging
                for (let j = 0; j < Math.min(allButtons.length, 3); j++) {
                    const btnText = await allButtons[j].evaluate(el => {
                        return `${el.tagName} type="${el.type || 'none'}" text="${(el.textContent || el.value || '').trim().substring(0, 30)}"`;
                    });
                    formActions.push(`  Button ${j + 1}: ${btnText}`);
                }
            }

            // Only submit first form for now
            break;
        }

        // Take screenshot after
        await new Promise(resolve => setTimeout(resolve, 2000));
        const screenshotAfter = await page.screenshot({ encoding: 'base64', fullPage: false });

        // Compile results
        const result = {
            screenshots: [
                `data:image/png;base64,${screenshotBefore}`,
                `data:image/png;base64,${screenshotAfter}`
            ],
            events: trackingEvents,
            actions: formActions,
            requests: requests.map(r => ({
                method: r.method,
                url: r.url,
                status: 200
            })).slice(-50),
            detectedTools: getDetectedTools(trackingEvents),
            thankYouPage: await detectThankYouPage(page, originalPageUrl)
        };

        console.log(JSON.stringify(result));

    } catch (error) {
        console.error(JSON.stringify({
            error: error.message || 'Unknown error',
            stack: error.stack,
            screenshots: [],
            events: [],
            actions: [`❌ Error: ${error.message || 'Unknown error'}`],
            requests: []
        }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
