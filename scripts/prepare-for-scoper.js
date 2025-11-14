// scripts/prepare-for-scoper.js
// Prepares a clean temp directory for PHP Scoper by copying only plugin files

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const del = require('del');
const glob = require('glob');

const BASE_DIR = path.resolve(__dirname, '..');
const TMP_DIR = path.join(BASE_DIR, '.scoper-tmp');

// Globs matching the Gulp copy task (negated patterns are exclusions)
const INCLUDE = [
    '**/*.*'
];
const EXCLUDE = [
    '.gitignore',
    'package.json',
    'package-lock.json',
    'composer-marky.json',
    'composer-marky.lock',
    'composer-dev.json',
    'composer-dev.lock',
    'composer-dev.json.BKP',
    'fix-autoloader.php',
    '*.sh',
    'scoper.inc.php',
    'scoper.inc.dev.php',
    'npm-shrinkwrap.json',
    'build/**/*.*',
    'README.md',
    'bower_components/**',
    '_docs/**',
    '_css.include.php',
    '_js.include.php',
    'gulpfile.js',
    'yarn.lock',
    'bower.json',
    'composer.json',
    'composer.lock',
    'webpack.mix.js',
    'webpack.config.wp.js',
    'dist/**/*.*',
    'gulpfile.js',
    'node_modules/**/*.*',
    'env/**/*.*',
    'app/**/*.*',
    'storage/logs/**/*.*',
    'webpack/**/*.*',
    'resources/assets/sass/**/*.*'
];

// Clean TMP_DIR
del.sync([TMP_DIR], { force: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

// Copy files
const files = glob.sync(INCLUDE[0], {
    cwd: BASE_DIR,
    dot: true,
    nodir: true,
    ignore: EXCLUDE
});

for (const file of files) {
    const src = path.join(BASE_DIR, file);
    const dest = path.join(TMP_DIR, file);
    const destDir = path.dirname(dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
}

console.log(`Prepared ${files.length} files in ${TMP_DIR} for PHP Scoper.`);
