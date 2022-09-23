#!/usr/bin/env/node

const pjson = require("./package.json");

const readline = require("readline");
const { spawn, spawnSync } = require("node:child_process");
const { copyFileSync, readFileSync, writeFile, existsSync, statSync, mkdirSync, readdirSync, writeFileSync, renameSync, rmSync } = require("node:fs");
const path = require("node:path");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { readdir } = require("fs");

const noop = (...args) => {};
const pad_number = (num) => num < 10 ? `0${num}` : num;

const fullpath = (p) => path.resolve(path.normalize(p));

const YARN_LOCK_PRESET = "graceful-fs@^4.2.2:\n  version \"4.2.2\"\n  resolved \"https://registry.yarnpkg.com/graceful-fs/-/graceful-fs-4.2.2.tgz#6f0952605d0140c1cfdb138ed005775b92d67b02\"\n  integrity sha512-IItsdsea19BoLC7ELy13q1iJFNmd7ofZH5+X/pJr90/nRoPEX0DJo1dHDbgtYWOhJhcCgMDTOw84RZ72q6lB+Q==";

const argv = yargs(hideBin(process.argv))
    // composer file
    .alias('composer-file', 'cf')
    .default('composer-file', 'composer.json')

    // release candidate?
    .boolean('release-candidate')
    .alias('release-candidate', 'rc')
    .default('release-candidate', false)

    // install yarn?
    .boolean('yarn')
    .default('yarn', true)

    // install composer?
    .boolean('composer')
    .default('composer', true)
    
    // if so, which composer packages to install
    .option('composer-packages', {
        array: true
    })
    
    // logging on/off
    .boolean('v')
    .alias('v', 'verbose')
    .default('v', false)
    .argv;

let verbose = argv.verbose;
let composer_file = argv.cf;
let composer_lock = composer_file.replace('.json', '.lock');
let is_release_candidate = argv.releaseCandidate;
let install_composer = argv.composer;
let install_yarn = argv.yarn;

const is_partial_build = ensureWorkspaceFolder();

if (!is_partial_build)
{
    doFullBuild();
}
else
{
    process.chdir("./.workspace");
}

// MAIN BUILD

function doFullBuild()
{
    ensureRequiredFiles();

    // create yarn lock
    writeFileSync("./.workspace/yarn.lock", YARN_LOCK_PRESET);

    process.chdir("./.workspace");

    const updates = Promise.all([
        task(
            'composer',
            ['update'],
            { env: { ...process.env, 'COMPOSER': composer_file } }
        ),
        task(
            'yarn',
            ['install']
        )
    ]);

    updates
        .then(([composer_result, yarn_result]) => {
            console.log(`composer finished with code ${composer_result}, yarn finished with code ${yarn_result}`);

            // run yarn build:wp
            taskSync(
                'yarn', ['build:wp'],
                {},
                ({ code, output }) => {
                    console.log(`yarn build:wp finished with code ${code}\n${output}`);
                },
                (err) => {
                    console.error('yarn build:wp errored, error', err);
                }
            )

            copyFileSync(fullpath("./dist/www/main.js"),   fullpath("./public/assets/js/main.js"));
            copyFileSync(fullpath("./dist/www/vendor.js"), fullpath("./public/assets/js/vendor.js"));

            taskSync(
                'yarn',
                ['run', 'gulp', 'fixLineEndings'],
                {},
                ({ code, output }) => {
                    console.log(`yarn run gulp fixLineEndings finished with code ${code}, output ${output}`);
                },
                (err) => {
                    console.error('yarn run gulp fixLineEndings errored, error', err);
                }
            )

            is_release_candidate ? setVersion() : bumpReleaseCandidate();

            const php_scoper = task(
                'php-scoper',
                ['add-prefix', '--config', 'scoper.inc.php', composer_file, composer_lock, 'convo-plugin.php'],
                {},
                "yes"
            );

            php_scoper.then((result) => {
                console.log(`php-scoper is done prefixing files with result ${result}`);
                
                // change to ./build to fix composer autoloaders
                process.chdir(fullpath('./build'));
                
                console.log('Renaming composer files to dump autoloader');

                renameSync(fullpath(`./${composer_file}`), fullpath('./composer.json'));
                renameSync(fullpath(`./${composer_lock}`), fullpath('./composer.lock'));

                taskSync(
                    'composer',
                    ['dump-autoload'],
                    {},
                    ({ code, output }) => {
                        console.log(`Succefully dumped autoload, code ${code}, output ${output}`);
                    },
                    (err) => {
                        console.error('Failed to dump autoload files', err);
                        process.exit(1);
                    }
                );

                _renameAutoloader(fullpath('./convo-plugin.php'));

                rmSync(fullpath('./composer.json'));
                rmSync(fullpath('./composer.lock'));
                
                // move out of the build directory
                process.chdir(path.normalize('../'));

                // fix autoloader script
                taskSync(
                    'php',
                    ['fix-autoloader.php', `--working-dir=${fullpath('./build/vendor/composer')}`],
                    {},
                    ({ code, output }) => {
                        console.log(`fix-autoloader has finished with code ${code}\n${output}`);
                    },
                    (err) => {
                        console.error('fix-autoloader failed with error', err);
                        process.exit(1);
                    }
                );

                // readdir(fullpath('./build'), (err, files) => {
                //     if (err) {
                //         console.log('Failed to read contents of build directory, error', err);
                //         process.exit(1);
                //     }

                //     for (const file of files) {
                //         copyRecursiveSync(fullpath(file), fullpath(`./dist/convoworks-wp/${file}`))
                //     }
                // });

                taskSync(
                    'cp',
                    ['-rp', 'build/*', 'dist/convoworks-wp/'],
                    {},
                    ({ code, output }) => {
                        console.log('Done copying files with code', code, output);
                    },
                    (err) => {
                        console.log('Failed to copy files from build dir, error', err);
                        process.exit(1);
                    }
                )

                taskSync(
                    'yarn',
                    ['run', 'gulp', 'zip'],
                    {},
                    ({ code, output }) => {
                        console.log(`yarn run gulp zip successfully zipped files\n${code}\n${output}`);
                    },
                    (err) => {
                        console.error('yarn run gulp zip failed, error', err);
                        process.exit(1);
                    }
                )
            }).catch((err) => {
                console.error('php-scoper failed to prefix, error', err);
                process.exit(1);
            })
        })
        .catch((reason) => {
            console.error('Dependency updates failed with reason', reason);
            process.exit(1);
        })
}

// UTIL
/**
 * Ensures that the `.workspace` directory exists. If it doesn't, it will be created with the structure
 * `.workspace/dist/convoworks-wp` for future builds.
 * @returns {boolean} Returns `true` if the `.workspace` folder is present
 * and a full build is not required, `false` otherwise.
 */
function ensureWorkspaceFolder() {
    if (!existsSync("./.workspace")) {
        console.warn("Workspace directory does not exist, going to create it.");
        mkdirSync(".workspace/dist/convoworks-wp", { recursive: true });
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
        if (!existsSync(file)) {
            console.error(`Missing required file: ${file}! Aborting build.`);
            process.exit(1);
        }
        copyFileSync(file, `.workspace/${file}`);
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
 * @param {string} passToStdin If the process opens its STDIN, what to pass through. @TODO TEMPORARY
 * @return {Promise<number>} Returns a `Promise` containing the code with which the process exited
 */
function task(cmd, args, opts, passToStdin = null)
{
    opts = { shell: process.platform === 'win32', ...opts };

    const p = new Promise(function (resolve, reject) {
        const spawned_process = spawn(cmd, args, opts);

        console.log('Spawned', cmd, args);

        spawned_process.on('exit', (output) => {
            console.log(cmd, args, 'exited');
            resolve(output);
        });

        spawned_process.stdout.on('data', (data) => {
            console.log(data.toString());
        })
        
        spawned_process.on('error', (err) => {
            console.log(cmd, args, 'errored');
            reject(err);
        })
        
        if (passToStdin) {
            console.log('Writing', passToStdin, 'to', cmd);
            spawned_process.stdin.setDefaultEncoding('utf-8');
            spawned_process.stdin.write(`${passToStdin}\n`);
            spawned_process.stdin.end();
        }
    });

    return p;
}

/**
 * Spawn a synchronous process and wait for it to finish, calling the provided `done` callback upon completion.
 * @param {string} cmd Command to pass to the `spawnSync` function
 * @param {Array<string>} args List of arguments to pass to the `spawnSync` function
 * @param {object} opts Map of options to pass to `spawnSync`
 * @param {(results: { code: number, output: string }) => void} done Callback to trigger once the process is complete
 * @param {(err: Error) => void} onError Optional, callback to trigger if the process outputs to `stderr` or errors in any other way.
 */
function taskSync(cmd, args, opts, done = null, onError = null)
{
    done = done || noop;
    onError = onError || noop;
    opts = { shell: process.platform === 'win32', ...opts };

    const spawned_process = spawnSync(cmd, args, opts);

    console.log('Sync spawned', cmd, args);

    if (spawned_process.status !== 0) {
        if (spawned_process.error) {
            onError(spawned_process.error);
            return;
        }

        if (spawned_process.stderr) {
            onError(new Error(spawned_process.stderr.toString()));
            return;
        }
    }
    
    console.log('Sync task', cmd, args, 'finished');

    done({ code: spawned_process.status, output: spawned_process.stdout.toString() });
}

/**
 * Copies files from `src` to `dest`, and if `src` is a directory, it will be resursively traversed and copied, essentially behaving like `cp -r`.
 * @param {string} src Source file to copy. If `src` is a directory, it will be recursively copied to `dest`
 * @param {string} dest Destination path to copy `src` to.
 */
function copyRecursiveSync(src, dest)
{
    const exists = existsSync(src);
    const stats = exists && statSync(src);
    const is_directory = exists && stats.isDirectory();
    if (is_directory) {
        if (!existsSync(dest)) {
            mkdirSync(dest);
        }
        readdirSync(src).forEach(function (childItemName) {
            copyRecursiveSync(fullpath(path.join(src, childItemName)), fullpath(path.join(dest, childItemName)));
        });
    } else {
        copyFileSync(src, dest);
    }
};

function setVersion(isReleaseCandidate = false) {

    const ver_rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    ver_rl.question(`Enter the new version (current: ${pjson.version}):`, (version) => {
        new_version = isReleaseCandidate && !version.includes('-RC') ? `${version}-RC01` : version;
        _writeVersionToFiles(new_version);
        ver_rl.close();
    });
}

function bumpReleaseCandidate() {
    const current_version = pjson.version;

    if (!current_version.includes('-RC')) {
        console.log(`Current version ${pjson.version} is not a release candidate. Enter new version to be deemed RC01.`);
        return setVersion(true);
    }

    const rctest = /(-RC)(\d{2,})/gm;
    const matches = rctest.exec(pjson.version);

    let new_version;

    if (matches && matches.length && matches.length === 3) {
        new_version = current_version.replace(matches[0], `${matches[1]}${pad_number((matches[2] * 1) + 1)}`);
    }

    console.log(`Version set to ${new_version}`);

    _writeVersionToFiles(new_version);
}

function _writeVersionToFiles(version)
{
    const php_plugin_file_path = fullpath("./convo-plugin.php");
    let php_plugin_file = readFileSync(php_plugin_file_path);

    const new_pjson = JSON.parse(JSON.stringify(pjson, null, 2));
    new_pjson.version = version;

    php_plugin_file = php_plugin_file.toString()
        .replace(/Version:\s.+/g, `Version: ${version}`)
        .replace(/define\('CONVOWP_VERSION',\s'.+'\);/g, `define('CONVOWP_VERSION', "${version}");`)

    writeFileSync(
        fullpath("./package.json"),
        JSON.stringify(new_pjson, null, 2)
    );
    writeFileSync(
        php_plugin_file_path,
        php_plugin_file
    );
}

function _renameAutoloader(filepath)
{
    const contents = readFileSync(filepath);
    let fixed = contents.toString().replace(
        /require_once __DIR__\.'\/vendor\/autoload\.php';/,
        "require_once __DIR__.'/vendor/scoper-autoload.php';"
    );
    return writeFileSync(filepath, fixed);
}