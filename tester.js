const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

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

            if (url.includes('google-analytics.com/g/collect')) {
                platform = 'Google Analytics 4';
                const urlParams = new URL(url);
                eventName = urlParams.searchParams.get('en') || 'page_view';
                details = `Event ID: ${urlParams.searchParams.get('_s')}`;
            } else if (url.includes('googletagmanager.com/gtm.js')) {
                platform = 'Google Tag Manager';
                eventName = 'GTM Container Loaded';
                const match = url.match(/id=(GTM-[A-Z0-9]+)/);
                if (match) details = match[1];
            } else if (url.includes('googleadservices.com/pagead/conversion')) {
                platform = 'Google Ads';
                eventName = 'Conversion';
                const match = url.match(/label=([^&]+)/);
                if (match) details = `Label: ${match[1]}`;
            } else if (url.includes('facebook.com/tr')) {
                platform = 'Facebook Pixel';
                const match = url.match(/ev=([^&]+)/);
                eventName = match ? match[1] : 'PageView';
                const idMatch = url.match(/id=(\d+)/);
                if (idMatch) details = `Pixel ID: ${idMatch[1]}`;
            }

            trackingEvents.push({
                platform,
                event_name: eventName,
                details,
                url: url.substring(0, 100),
                status: status < 400 ? 'success' : 'failed'
            });
        }
    });

    try {
        // Navigate to page
        await page.goto(config.url, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Get page info
        const pageTitle = await page.title();
        const pageUrl = page.url();
        formActions.push(`📄 Loaded: ${pageTitle}`);
        formActions.push(`🌐 URL: ${pageUrl}`);
        
        // Take screenshot before
        const screenshotBefore = await page.screenshot({ encoding: 'base64', fullPage: false });

        // AUTO-DETECT AND FILL ALL FORMS
        const forms = await page.$$('form');
        formActions.push(`Found ${forms.length} form(s) on the page`);

        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            
            // Get form details
            const formInfo = await form.evaluate(el => ({
                id: el.id || '',
                name: el.name || '',
                action: el.action || '',
                class: el.className || ''
            }));
            
            let formLabel = `Form ${i + 1}`;
            if (formInfo.id) formLabel += ` (id: ${formInfo.id})`;
            if (formInfo.name) formLabel += ` (name: ${formInfo.name})`;
            
            // Get all input fields in this form
            const inputs = await form.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
            formActions.push(`${formLabel}: Found ${inputs.length} fillable field(s)`);

            // Fill each input
            for (const input of inputs) {
                try {
                    const inputType = await input.evaluate(el => el.type || el.tagName.toLowerCase());
                    const inputName = await input.evaluate(el => el.name || el.id || el.placeholder || '');
                    const isVisible = await input.isVisible();

                    if (!isVisible) continue;

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
                    
                    if (!isVisible) {
                        formActions.push(`⚠ Submit button found but not visible: "${buttonText}"`);
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
            })).slice(-50)
        };

        console.log(JSON.stringify(result));

    } catch (error) {
        console.error(JSON.stringify({
            error: error.message,
            screenshots: [],
            events: [],
            actions: [`Error: ${error.message}`],
            requests: []
        }));
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
