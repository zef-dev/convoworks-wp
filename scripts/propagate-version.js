// scripts/propagate-version.js
// Propagates the version from package.json to convo-plugin.php

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.resolve(__dirname, '../package.json');
const PLUGIN_PHP = path.resolve(__dirname, '../convo-plugin.php');

function updatePhpVersion(version) {
    let content = fs.readFileSync(PLUGIN_PHP, 'utf-8');
    // Update Version: header
    content = content.replace(/(Version:\s*)([^\r\n]+)/, `$1${version}`);
    // Update CONVOWP_VERSION constant
    content = content.replace(/(define\(\s*'CONVOWP_VERSION',\s*')[^']*('\s*\);)/, `$1${version}$2`);
    fs.writeFileSync(PLUGIN_PHP, content, 'utf-8');
    console.log(`Updated convo-plugin.php to version ${version}`);
}

function main() {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
    if (!pkg.version) {
        console.error('No version found in package.json');
        process.exit(1);
    }
    updatePhpVersion(pkg.version);
}

main();
