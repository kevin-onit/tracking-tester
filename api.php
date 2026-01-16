<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['url'])) {
    echo json_encode(['success' => false, 'error' => 'URL is verplicht']);
    exit;
}

$url = $input['url'];
$mode = $input['mode'] ?? 'auto';
$fields = $input['fields'] ?? [];
$submitSelector = $input['submit_selector'] ?? 'button[type="submit"]';
$headless = $input['headless'] ?? true;

// Create test configuration
$testConfig = [
    'url' => $url,
    'mode' => $mode,
    'fields' => $fields,
    'submitSelector' => $submitSelector,
    'headless' => $headless
];

// Save config to temp file
$configFile = sys_get_temp_dir() . '/tracking-test-' . uniqid() . '.json';
file_put_contents($configFile, json_encode($testConfig));

// Execute Node.js script
$nodeScript = __DIR__ . '/tester.js';
$command = "node " . escapeshellarg($nodeScript) . " " . escapeshellarg($configFile) . " 2>&1";

exec($command, $output, $returnCode);

// Clean up
if (file_exists($configFile)) {
    unlink($configFile);
}

if ($returnCode !== 0) {
    echo json_encode([
        'success' => false, 
        'error' => 'Test failed: ' . implode("\n", $output)
    ]);
    exit;
}

// Parse result
$resultJson = implode("\n", $output);
$result = json_decode($resultJson, true);

if (!$result) {
    echo json_encode([
        'success' => false, 
        'error' => 'Could not parse test results',
        'raw' => $resultJson
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => $result
]);
