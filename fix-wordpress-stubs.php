<?php

/**
 * Script to remove PHP 8.2+ attributes from WordPress stubs file
 * to make it compatible with PHP 7.4 for PHPStan analysis.
 * 
 * Run this script before running PHPStan if you're using PHP 7.4.
 */

$stubsFile = __DIR__ . '/vendor/php-stubs/wordpress-stubs/wordpress-stubs.php';

if (!file_exists($stubsFile)) {
    echo "WordPress stubs file not found: $stubsFile\n";
    exit(1);
}

echo "Reading WordPress stubs file...\n";
$content = file_get_contents($stubsFile);

if ($content === false) {
    echo "Failed to read stubs file.\n";
    exit(1);
}

// Remove #[\SensitiveParameter] attributes
// Pattern matches: #[\SensitiveParameter] followed by optional whitespace before a parameter
$originalContent = $content;
$content = preg_replace('/#\\\\?\[\\\SensitiveParameter\]\s*/', '', $content);

if ($content === $originalContent) {
    echo "No SensitiveParameter attributes found. File may already be processed.\n";
    exit(0);
}

// Backup original file
$backupFile = $stubsFile . '.backup';
if (!file_exists($backupFile)) {
    echo "Creating backup: $backupFile\n";
    copy($stubsFile, $backupFile);
}

echo "Removing PHP 8.2+ attributes from stubs file...\n";
$result = file_put_contents($stubsFile, $content);

if ($result === false) {
    echo "Failed to write modified stubs file.\n";
    exit(1);
}

$removedCount = substr_count($originalContent, 'SensitiveParameter') - substr_count($content, 'SensitiveParameter');
echo "Successfully removed $removedCount SensitiveParameter attribute(s).\n";
echo "Original file backed up to: $backupFile\n";

