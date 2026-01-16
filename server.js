const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API endpoint
app.post('/api/test', async (req, res) => {
    try {
        const { url, mode, headless } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is verplicht' });
        }

        // Create temp config
        const configFile = `/tmp/tracking-test-${Date.now()}.json`;
        const config = {
            url,
            mode: mode || 'auto',
            headless: headless !== false,
            fields: req.body.fields || [],
            submitSelector: req.body.submit_selector || 'button[type="submit"]'
        };

        fs.writeFileSync(configFile, JSON.stringify(config));

        // Run tester script
        const testerProcess = spawn('node', [path.join(__dirname, 'tester.js'), configFile]);

        let output = '';
        let errorOutput = '';

        testerProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        testerProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        testerProcess.on('close', (code) => {
            // Clean up
            try {
                fs.unlinkSync(configFile);
            } catch (e) {}

            if (code !== 0) {
                console.error('Tester failed:', errorOutput);
                return res.json({
                    success: false,
                    error: 'Test failed: ' + errorOutput
                });
            }

            try {
                const result = JSON.parse(output);
                res.json({
                    success: true,
                    data: result
                });
            } catch (e) {
                res.json({
                    success: false,
                    error: 'Could not parse results',
                    raw: output
                });
            }
        });

        // Timeout after 2 minutes
        setTimeout(() => {
            testerProcess.kill();
            res.json({
                success: false,
                error: 'Test timeout'
            });
        }, 120000);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Tracking Tester server running on port ${PORT}`);
});
