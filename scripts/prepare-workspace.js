// scripts/prepare-workspace.js
// Prepares a clean .workspace/convoworks-wp directory with only the required plugin files

const fs = require('fs');
const path = require('path');
const del = require('del');
const glob = require('glob');

const BASE_DIR = path.resolve(__dirname, '..');
const WORKSPACE = path.join(BASE_DIR, '.workspace');
const PLUGIN_ROOT = path.join(WORKSPACE, 'convoworks-wp');

// Globs matching the Gulp copy task (negated patterns are exclusions)
const INCLUDE = [
    '**/*.*'
];
const EXCLUDE = [
    // Repo / VCS noise
    '.gitignore',
    '.git/**',

    // Node / JS tooling metadata (not needed for php-scoper)
    'package.json',
    'package-lock.json',
    'webpack.config.wp.js',
    'webpack.config.chat.js',

    // Build outputs and working dirs
    'build/**/*.*',
    'dist/**/*.*',

    // Docs and backup/dev-only material
    'README.md',
    '_docs/**',
    '_bak/**',

    // Gulp build script (workspace is for PHP tooling only)
    'gulpfile.js',

    // Dependency trees and legacy frontend sources
    'node_modules/**/*.*',
    'vendor/**/*.*', // re-added selectively for vendor/zef-dev below
    'app/**/*.*',
    'webpack/**/*.*',
];

// Clean WORKSPACE
del.sync([WORKSPACE], { force: true });
fs.mkdirSync(PLUGIN_ROOT, { recursive: true });

// Copy files into .workspace/convoworks-wp
const files = glob.sync(INCLUDE[0], {
    cwd: BASE_DIR,
    dot: true,
    nodir: true,
    follow: true,
    ignore: EXCLUDE
});

for (const file of files) {
    const src = path.join(BASE_DIR, file);
    const dest = path.join(PLUGIN_ROOT, file);
    const destDir = path.dirname(dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
}

// Ensure vendor/zef-dev subtree is fully present (including src directories)
function copyRecursive(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) return;
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        const lstat = fs.lstatSync(srcPath);
        if (lstat.isSymbolicLink()) {
            const realPath = fs.realpathSync(srcPath);
            const stat = fs.statSync(realPath);
            if (stat.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyRecursive(realPath, destPath);
            } else {
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.copyFileSync(realPath, destPath);
            }
        } else if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const srcZef = path.join(BASE_DIR, 'vendor', 'zef-dev');
const wsZef = path.join(PLUGIN_ROOT, 'vendor', 'zef-dev');
if (fs.existsSync(srcZef)) {
    fs.mkdirSync(path.join(PLUGIN_ROOT, 'vendor'), { recursive: true });

    // Copy only needed parts from each zef-dev package to avoid .git and heavy files:
    // - src directory (required for autoload)
    // - optional metadata files (composer.json, LICENSE, README.md)
    const pkgs = fs.readdirSync(srcZef, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);

    for (const pkg of pkgs) {
        const pkgRoot = path.join(srcZef, pkg);
        const pkgSrc = path.join(pkgRoot, 'src');
        const destPkgRoot = path.join(wsZef, pkg);
        const destPkgSrc = path.join(destPkgRoot, 'src');

        if (fs.existsSync(pkgSrc)) {
            fs.mkdirSync(destPkgSrc, { recursive: true });
            copyRecursive(pkgSrc, destPkgSrc);
        }

        // Copy a few small metadata files if present
        for (const meta of ['composer.json', 'LICENSE', 'README.md']) {
            const metaSrc = path.join(pkgRoot, meta);
            if (fs.existsSync(metaSrc) && fs.statSync(metaSrc).isFile()) {
                const metaDest = path.join(destPkgRoot, meta);
                fs.mkdirSync(path.dirname(metaDest), { recursive: true });
                fs.copyFileSync(metaSrc, metaDest);
            }
        }
    }

    console.log('Copied vendor/zef-dev package src directories into workspace.');
}

console.log(`Prepared ${files.length} files in ${PLUGIN_ROOT} for build workspace.`);
