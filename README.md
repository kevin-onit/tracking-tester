# Tracking Tester Tool

Een web-based tool om tracking (Google Analytics, Google Ads, Facebook Pixel) te testen op websites.

## 🚀 Installatie

### Vereisten
- PHP 7.4 of hoger
- Node.js 16+ en npm
- Een lokale webserver (MAMP, XAMPP, of `php -S`)

### Stap 1: Installeer Node.js dependencies
```bash
cd /Users/kevin/Development/tracking-tester
npm install
```

### Stap 2: Start lokale PHP server
```bash
php -S localhost:8000
```

### Stap 3: Open in browser
```
http://localhost:8000
```

## 📖 Gebruik

1. **URL invoeren**: Vul de URL van de website in die je wilt testen
2. **Formulier velden toevoegen**: 
   - Vul CSS selectors in (bijv. `input[name="email"]`)
   - Vul test waardes in
3. **Submit selector**: CSS selector voor de submit button
4. **Start test**: Klik op de knop en wacht op resultaten

## 🎯 Wat wordt getest?

- ✅ Google Tag Manager (GTM)
- ✅ Google Analytics 4 (GA4)
- ✅ Google Ads Conversies
- ✅ Facebook Pixel
- ✅ Enhanced Conversions

## 📁 Bestanden

- `index.php` - Frontend interface
- `api.php` - PHP backend die Node.js aanroept
- `tester.js` - Puppeteer script voor browser automation
- `package.json` - Node.js dependencies

## 🔧 Technologie

- **Frontend**: HTML, TailwindCSS, Vanilla JavaScript
- **Backend**: PHP
- **Browser Automation**: Puppeteer (Node.js)

## 📝 CSS Selector Voorbeelden

```css
/* Voor input velden */
input[name="email"]
#email
.email-field

/* Voor buttons */
button[type="submit"]
.submit-btn
#submit

/* Voor text areas */
textarea[name="message"]
```

## 🐛 Troubleshooting

### "node: command not found"
Zorg dat Node.js geïnstalleerd is en in je PATH staat.

### Puppeteer installatie problemen
```bash
npm install puppeteer --force
```

### PHP kan Node.js niet vinden
Check het pad in `api.php` en pas aan indien nodig.

## 🚀 Deployment

Voor productie gebruik:
1. Upload naar je webserver
2. Zorg dat Node.js beschikbaar is
3. Run `npm install --production`
4. Configureer je webserver (Apache/Nginx) om PHP te draaien

## 📧 Contact

Kevin - kevin@weareon-it.nl
