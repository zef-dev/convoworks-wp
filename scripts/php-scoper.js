// scripts/php-scoper.js
// Runs PHP Scoper to prefix vendor for WordPress plugin compatibility, using .workspace/convoworks-wp as input and dist/convoworks-wp as output
// Then runs composer dump-autoload, fix-autoloader.php, and cleans up

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const del = require('del');

const BASE_DIR = path.resolve(__dirname, '..');
const WORKSPACE = path.join(BASE_DIR, '.workspace', 'convoworks-wp');
const SCOPER_CONFIG = path.join(BASE_DIR, 'scoper.inc.php');
const OUTPUT_DIR = path.join(BASE_DIR, 'dist', 'convoworks-wp');
const BUILD_DIR = path.join(BASE_DIR, '.workspace', 'build');
const COMPOSER_FILE = 'composer-dev.json';
const COMPOSER_LOCK = 'composer-dev.lock';

function tryPhpScoper(bin) {
    if (!bin) return { status: 1, error: new Error('No binary specified') };
    if (!fs.existsSync(bin) && !isGlobal(bin)) return { status: 1, error: new Error(`php-scoper binary not found: ${bin}`) };

    const args = [
        'add-prefix',
        '--force',
        '--config', 'scoper.inc.php',
        '--output-dir', BUILD_DIR,
        COMPOSER_FILE, COMPOSER_LOCK, 'convo-plugin.php'
    ];
    return spawnSync(bin, args, { stdio: 'inherit', shell: process.platform === 'win32', cwd: WORKSPACE });
}

function isGlobal(bin) {
    // If just "php-scoper", let the shell resolve it
    return bin === 'php-scoper';
}

function assertWorkspaceInputs() {
    const mustHave = ['scoper.inc.php', 'convo-plugin.php'];
    const missingMust = mustHave.filter(f => !fs.existsSync(path.join(WORKSPACE, f)));
    const hasComposerJson = fs.existsSync(path.join(WORKSPACE, 'composer.json'));
    const hasComposerDev = fs.existsSync(path.join(WORKSPACE, COMPOSER_FILE));

    if (missingMust.length || (!hasComposerJson && !hasComposerDev)) {
        const msg = [
            ...missingMust,
            (!hasComposerJson && !hasComposerDev) ? `one of: composer.json or ${COMPOSER_FILE}` : null
        ].filter(Boolean).join(', ');
        console.error('Workspace missing required files:', msg);
        process.exit(1);
    }
}

function runWorkspaceComposer() {
    // Use composer-dev.json to materialize zef-dev packages as copies (no symlinks)
    const composerPath = path.join(WORKSPACE, COMPOSER_FILE);
    const compFileToUse = fs.existsSync(composerPath) ? COMPOSER_FILE : 'composer.json';

    const result = spawnSync('composer', ['update', '--no-dev'], {
        cwd: WORKSPACE,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, COMPOSER: compFileToUse }
    });

    if (result.status !== 0) {
        console.error(`composer update failed in workspace using ${compFileToUse}`);
        process.exit(result.status);
    }
    console.log(`composer update completed in workspace using ${compFileToUse}`);
}

function syncBuildToDist() {
    // Clean OUTPUT_DIR
    del.sync([OUTPUT_DIR], { force: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const copyRecursive = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath);
            } else if (entry.isFile()) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    };

    // 1) Prime dist with non-PHP assets/files from the workspace
    const primePaths = ['assets', 'public', 'resources', 'routes', 'readme.txt', 'readme.md'];
    for (const p of primePaths) {
        const wsPath = path.join(WORKSPACE, p);
        const outPath = path.join(OUTPUT_DIR, p);
        if (fs.existsSync(wsPath)) {
            const stat = fs.statSync(wsPath);
            if (stat.isDirectory()) {
                fs.mkdirSync(outPath, { recursive: true });
                copyRecursive(wsPath, outPath);
            } else if (stat.isFile()) {
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.copyFileSync(wsPath, outPath);
            }
        }
    }

    // 2) Overlay scoped build (vendor, src, modified plugin file, etc.)
    copyRecursive(BUILD_DIR, OUTPUT_DIR);


    console.log('Synced build and non-PHP assets to dist:', OUTPUT_DIR);
}

function runPhpScoper() {
    // Ensure clean build directory inside the workspace
    del.sync([BUILD_DIR], { force: true });
    fs.mkdirSync(BUILD_DIR, { recursive: true });

    let tried = [];
    let result;

    // 1. Try global php-scoper
    result = tryPhpScoper('php-scoper');
    tried.push('php-scoper');
    if (result.status === 0) {
        console.log('php-scoper (global) completed successfully.');
        return true;
    }

    // 2. Try vendor/bin/php-scoper.bat (Windows)
    const vendorBat = path.join(BASE_DIR, 'vendor', 'bin', 'php-scoper.bat');
    result = tryPhpScoper(vendorBat);
    tried.push(vendorBat);
    if (result.status === 0) {
        console.log('php-scoper (vendor/bin/php-scoper.bat) completed successfully.');
        return true;
    }

    // 3. Try vendor/bin/php-scoper (Unix)
    const vendorBin = path.join(BASE_DIR, 'vendor', 'bin', 'php-scoper');
    result = tryPhpScoper(vendorBin);
    tried.push(vendorBin);
    if (result.status === 0) {
        console.log('php-scoper (vendor/bin/php-scoper) completed successfully.');
        return true;
    }

    // If all failed, print error
    console.error('Failed to run php-scoper. Tried:', tried.join(', '));
    if (result.error) {
        console.error(result.error);
    }
    process.exit(1);
}

function runComposerDumpAutoload() {
    // Dump autoloaders inside the workspace build directory
    const composerJson = path.join(BUILD_DIR, 'composer.json');
    const composerLock = path.join(BUILD_DIR, 'composer.lock');
    const devJson = path.join(BUILD_DIR, COMPOSER_FILE);
    const devLock = path.join(BUILD_DIR, COMPOSER_LOCK);

    // If php-scoper copied composer-dev.* into BUILD_DIR, rename to standard names
    if (fs.existsSync(devJson)) {
        fs.renameSync(devJson, composerJson);
    }
    if (fs.existsSync(devLock)) {
        fs.renameSync(devLock, composerLock);
    }

    if (fs.existsSync(composerJson) && fs.existsSync(composerLock)) {
        const result = spawnSync('composer', ['dump-autoload'], {
            cwd: BUILD_DIR,
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });
        if (result.status !== 0) {
            console.error('composer dump-autoload failed');
            process.exit(result.status);
        }
        // Remove composer.json and composer.lock from BUILD_DIR (like old build)
        fs.unlinkSync(composerJson);
        fs.unlinkSync(composerLock);
        console.log('composer.json and composer.lock removed from build directory');
    }
}

function runFixAutoloader() {
    // Run fix-autoloader.php in BUILD_DIR/vendor/composer
    const vendorComposer = path.join(BUILD_DIR, 'vendor', 'composer');
    const fixAutoloader = path.join(BASE_DIR, 'fix-autoloader.php');
    if (fs.existsSync(fixAutoloader) && fs.existsSync(vendorComposer)) {
        const result = spawnSync('php', [fixAutoloader, `--working-dir=${vendorComposer}`], {
            stdio: 'inherit',
            shell: process.platform === 'win32'
        });
        if (result.status !== 0) {
            console.error('fix-autoloader.php failed');
            process.exit(result.status);
        }
        console.log('fix-autoloader.php completed');
    }
}

function fixPluginAutoloadReference() {
    // Replace require_once __DIR__.'/vendor/autoload.php'; with require_once __DIR__.'/vendor/scoper-autoload.php';
    const pluginPhp = path.join(BUILD_DIR, 'convo-plugin.php');
    if (fs.existsSync(pluginPhp)) {
        let content = fs.readFileSync(pluginPhp, 'utf-8');
        content = content.replace(
            /require_once\s*__DIR__\s*\.\s*'\/vendor\/autoload\.php';/,
            "require_once __DIR__.'/vendor/scoper-autoload.php';"
        );
        fs.writeFileSync(pluginPhp, content, 'utf-8');
        console.log('Updated convo-plugin.php to use scoper-autoload.php');
    }
}

assertWorkspaceInputs();
runWorkspaceComposer();
runPhpScoper();
runComposerDumpAutoload();
runFixAutoloader();
fixPluginAutoloadReference();
syncBuildToDist();

// Clean up workspace after scoping
const WORKSPACE_ROOT = path.join(BASE_DIR, '.workspace');
del.sync([WORKSPACE_ROOT], { force: true });
console.log('Cleaned up workspace directory:', WORKSPACE_ROOT);
