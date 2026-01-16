# AI Navigation Setup (Optional)

## Enable AI-powered navigation to find contact forms

The tracking tester can use OpenAI GPT to intelligently navigate to contact pages when no forms are found on the initial page.

### Setup on Railway:

1. Go to your Railway project
2. Click on **Variables**
3. Add a new variable:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-...` (your OpenAI API key)
4. Redeploy

### Get an OpenAI API Key:

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Cost:

- Uses GPT-4o-mini model
- ~$0.0001 per test (very cheap!)
- Only called when no forms are found on initial page

### How it works:

```
1. Load website → No forms found
2. 🤖 AI analyzes all links on page
3. 🤖 AI selects most likely contact/form link
4. Navigate to that page
5. Check for forms again
```

### Example log:

```
Found 0 form(s) on the page
🤖 No forms found, trying AI navigation...
🤖 AI: Analyzing page for contact links...
🤖 AI: Found contact link: "Contact ons"
🔗 Navigating to: https://example.com/contact
📄 New page: Contact - Example Company
Found 1 form(s) on new page
```

### Disable AI:

If you don't want to use AI navigation, simply:
- Don't set the `OPENAI_API_KEY` environment variable, OR
- Uncheck the "AI Navigation" checkbox in the UI
