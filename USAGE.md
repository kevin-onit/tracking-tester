# 🎯 Tracking Tester - Gebruiksinstructies

## 🚀 Snelstart

### Automatische Modus (NIEUW!)

```bash
# Upload naar server
# Unzip het bestand
# Installeer dependencies
npm install

# Test met automatische formulier detectie
```

Voeg in de interface alleen een URL toe en klik op "Start Test". De tool doet de rest!

## 🤖 Wat doet de Automatische Modus?

De tool:
1. ✅ Opent de opgegeven website
2. ✅ Zoekt ALLE `<form>` elementen op de pagina
3. ✅ Detecteert automatisch welke velden er zijn
4. ✅ Vult slim in op basis van veldnamen:
   - Email velden → `kevin@weareon-it.nl`
   - Telefoon → `0612345678`
   - Voor/achternaam → `Kevin` / `de Vries`
   - Adres → `Teststraat 123`
   - Postcode → `1234AB`
   - Plaats → `Amsterdam`
   - Bedrijf → `WeAreOn IT`
   - Message/Comment → Test tekst
5. ✅ Vindt en klikt op submit button
6. ✅ Monitort alle tracking (GTM, GA4, Google Ads, Facebook)
7. ✅ Maakt screenshots voor/na
8. ✅ Toont welke acties zijn uitgevoerd

## 📋 Voorbeeld Output

```
Found 1 form(s) on the page
Form 1: Found 3 fillable field(s)
✓ Filled: your-name = Kevin
✓ Filled: your-email = kevin@weareon-it.nl
✓ Filled: your-phone = 0612345678
🚀 Clicking submit button: "Verzenden"
✓ Form 1 submitted successfully

TRACKING EVENTS:
✅ Google Tag Manager - GTM-53PZ27SD
✅ Google Analytics 4 - form_start
✅ Google Analytics 4 - offerte_aanvraag_landingspagina
✅ Google Ads Conversion - Label: LN3wCNmJ-aIaEPDN6boC
✅ Facebook Pixel - form_conversie (Pixel ID: 928618372480723)
```

## 🎬 Live Browser Modus

Wil je ZIen wat er gebeurt? Zet in de JavaScript:
```javascript
headless: false
```

Dan zie je de browser live aan het werk! Perfect voor debugging.

## 🎯 Use Cases

### ✅ Lead Websites
Test contact formulieren, offerte aanvragen, callback verzoeken

### ✅ Newsletter Signup
Test of email signup tracking werkt

### ✅ Multi-page Forms
Kan uitgebreid worden voor meerdere stappen

### ✅ E-commerce
Kan uitgebreid worden met product kopen flows

## 🔧 Handmatige Modus

Voor specifieke scenarios kun je nog steeds handmatig velden opgeven:

```javascript
{
  "url": "https://example.com",
  "mode": "manual",
  "fields": [
    {"selector": "#email", "value": "test@test.nl"},
    {"selector": "#name", "value": "Test User"}
  ],
  "submitSelector": "button[type='submit']"
}
```

## 📊 Welke Tracking wordt Gedetecteerd?

- ✅ **Google Tag Manager** - Container ID
- ✅ **Google Analytics 4** - Events (pageview, form_start, conversions)
- ✅ **Google Ads** - Conversie tracking + labels
- ✅ **Facebook Pixel** - Events + Pixel ID
- ✅ **Enhanced Conversions** - Email hashing detectie
- ✅ **Advanced Matching** - FB user data hashing

## 🐛 Debugging

Als het niet werkt:
1. Controleer of Node.js en npm geïnstalleerd zijn
2. Run `npm install` in de directory
3. Check of de URL bereikbaar is
4. Zet `headless: false` om te zien wat er gebeurt
5. Check de actions log voor errors

## 🚀 Server Requirements

- PHP 7.4+
- Node.js 16+
- ~500MB vrije ruimte (voor Puppeteer Chrome binary)

## 💡 Tips

- Test eerst met bekende websites zoals je eigen sites
- Check of formulieren geen CAPTCHA hebben (anders manual bypass nodig)
- Voor productie: zet headless op `true` voor snelheid
- Voor development: zet headless op `false` om te debuggen
