// scripts/bump-rc-version.js
// Bumps the -RC suffix in package.json version (e.g. 0.24.00-RC23 -> 0.24.00-RC24)

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.resolve(__dirname, '../package.json');

function bumpRc(version) {
    const match = version.match(/^(\d+\.\d+\.\d+)(?:-RC(\d+))?$/);
    if (!match) {
        throw new Error(
            `Version "${version}" is not in expected format <major>.<minor>.<patch>-RC<number>`
        );
    }

    const base = match[1];
    const currentRc = match[2] ? parseInt(match[2], 10) : 0;
    const nextRc = currentRc + 1;

    return `${base}-RC${nextRc}`;
}

function main() {
    const pkgRaw = fs.readFileSync(PACKAGE_JSON, 'utf-8');
    const pkg = JSON.parse(pkgRaw);

    if (!pkg.version) {
        console.error('No version found in package.json');
        process.exit(1);
    }

    const oldVersion = pkg.version;
    let newVersion;

    try {
        newVersion = bumpRc(oldVersion);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }

    if (newVersion === oldVersion) {
        console.log(`Version unchanged (${oldVersion})`);
        return;
    }

    pkg.version = newVersion;
    fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 4) + '\n', 'utf-8');

    console.log(`Bumped RC version: ${oldVersion} -> ${newVersion}`);
}

main();
