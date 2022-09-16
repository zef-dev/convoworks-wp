#!/usr/bin/env/node

const { spawn, spawnSync } = require("node:child_process");
const fs = require("fs");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const path = require("path");

const noop = (...args) => {};

const YARN_LOCK_PRESET = "graceful-fs@^4.2.2:\n  version \"4.2.2\"\n  resolved \"https://registry.yarnpkg.com/graceful-fs/-/graceful-fs-4.2.2.tgz#6f0952605d0140c1cfdb138ed005775b92d67b02\"\n  integrity sha512-IItsdsea19BoLC7ELy13q1iJFNmd7ofZH5+X/pJr90/nRoPEX0DJo1dHDbgtYWOhJhcCgMDTOw84RZ72q6lB+Q==";

const argv = yargs(hideBin(process.argv))
    // composer file
    .alias('cf', 'composer-file')
    .default('cf', 'composer.json')

    // release candidate?
    .boolean('rc')
    .alias('rc', 'release-candidate')
    .default('rc', false)
    
    // composer packages to install
    .option('packages', {
        array: true
    })
    
    // logging on/off
    .boolean('v')
    .alias('v', 'verbose')
    .default('v', false)
    .argv;

let verbose = argv.verbose;
let composer_file = argv.cf;

const is_partial_build = ensureWorkspaceFolder();

if (!is_partial_build)
{
    ensureRequiredFiles();

    // create yarn lock
    fs.writeFileSync("./.workspace/yarn.lock", YARN_LOCK_PRESET);

    process.chdir("./.workspace");

    const updates = Promise.all([
        task(
            'composer',
            ['update'],
            { shell: process.platform === 'win32', env: { ...process.env, 'COMPOSER': composer_file } }
        ),
        task(
            'yarn',
            ['install'],
            { shell: process.platform === 'win32' }
        )
    ]);

    updates
        .then(([composer_result, yarn_result]) => {
            console.log(`composer finished with code ${composer_result}, yarn finished with code ${yarn_result}`);

            taskSync(
                'yarn', ['build:wp'], { shell: process.platform === 'win32' },
                (code) => { console.log(`yarn build:wp finished with code ${code}`); },
                (data) => { verbose && console.log(data.toString()); },
                (err)  => { console.error(err); }
            )
        })
        .catch((reason) => {
            console.error('Dependency updates failed with reason', reason);
            process.exit(1);
        })
}
else
{
    process.chdir("./.workspace");
}


// UTIL
/**
 * Ensures that the `.workspace` directory exists. If it doesn't, it will be created with the structure
 * `.workspace/dist/convoworks-wp` for future builds.
 * @returns {boolean} Returns `true` if the `.workspace` folder is present
 * and a full build is not required, `false` otherwise.
 */
function ensureWorkspaceFolder() {
    if (!fs.existsSync("./.workspace")) {
        console.warn("Workspace directory does not exist, going to create it.");
        fs.mkdirSync(".workspace/dist/convoworks-wp", { recursive: true });
        return false;
    }

    return true;
}

/**
 * Make sure that all the files necessary for the build process to function are present
 * in the `.workspace` directory. If a file is missing, it will error and exit out of the process.
 */
function ensureRequiredFiles() {
    const required_files = [
        composer_file, 'scoper.inc.php', 'package.json', 'gulpfile.js', 'webpack.config.wp.js', 'fix-autoloader.php', 'convo-plugin.php', 'readme.txt'
    ];

    const required_folders = [
        'app', 'assets', 'lib', 'public', 'resources', 'routes', 'src', 'webpack', 'env'
    ];

    for (const file of required_files) {
        if (!fs.existsSync(file)) {
            console.error(`Missing required file: ${file}! Aborting build.`);
            process.exit(1);
        }
        fs.copyFileSync(file, `.workspace/${file}`);
    }

    for (const folder of required_folders) {
        copyRecursiveSync(folder, `.workspace/${folder}`);
    }
}

/**
 * Wrap a `spawn` call into a `Promise`.
 * @param {string} cmd Command to pass to the `spawn` function
 * @param {Array<string>} args Set of arguments for the `spawn` function
 * @param {object} opts A map of options for `spawn`
 * @return {Promise<number>} Returns a `Promise` containing the code with which the process exited
 */
function task(cmd, args, opts)
{
    const p = new Promise(function (resolve, reject) {
        const spawned_process = spawn(cmd, args, opts);
        spawned_process.on('exit', (output) => {
            resolve(output);
        });
        spawned_process.on('error', (err) => {
            reject(err);
        })
    });

    return p;
}

/**
 * Spawn a synchronous process and wait for it to finish, calling the provided `done` callback upon completion.
 * @param {string} cmd Command to pass to the `spawnSync` function
 * @param {Array<string>} args List of arguments to pass to the `spawnSync` function
 * @param {object} opts Map of options to pass to `spawnSync`
 * @param {CallableFunction} done Callback to trigger once the process is complete
 * @param {CallableFunction} onData Optional, callback to trigger every time the process outputs data to `stdout`
 * @param {CallableFunction} onError Optional, callback to trigger if the process outputs to `stderr` or errors in any other way.
 */
function taskSync(cmd, args, opts, done, onData = null, onError = null)
{
    onData = onData || noop;
    onError = onError || noop;

    const spawned_process = spawnSync(cmd, args, opts);
    
    spawned_process.on('error', (err) => { onError(err) });
    spawned_process.stdout.on('data', (data) => onData(data));

    spawned_process.on('close', (code) => done(code));
}

function copyRecursiveSync(src, dest)
{
    var exists = fs.existsSync(src);
    var stats = exists && fs.statSync(src);
    var isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(function (childItemName) {
            copyRecursiveSync(path.join(src, childItemName),
                path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
};