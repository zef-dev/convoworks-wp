#!/usr/bin/env/node

const readline = require("readline");
const { spawn, spawnSync } = require("node:child_process");
const { copyFileSync, readFileSync, existsSync, statSync, mkdirSync, readdirSync, writeFileSync, renameSync, rmSync } = require("node:fs");
const path = require("node:path");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const noop = (...args) => {};
const pad_number = (num) => num < 10 ? `0${num}` : num;

const fullpath = (p) => path.resolve(path.normalize(p));

// haha
const empty_promise = (fail = false) => new Promise((resolve, reject) => !fail ? resolve(null) : reject(new Error('Empty promise')));

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
    
    // logging on/off
    .boolean('v')
    .alias('v', 'verbose')
    .default('v', false)
    .argv;

const BASE_DIR = fullpath('.');
const WORKSPACE = fullpath(path.join(BASE_DIR, '.workspace'));
const BUILD_DIR = fullpath(path.join(WORKSPACE, 'build'));
const DIST_DIR = fullpath( path.join( WORKSPACE, 'dist/convoworks-wp'));

const pjson = require(fullpath(path.join(BASE_DIR, 'package.json')));

let verbose = argv.verbose;
let composer_file = argv.cf;
let composer_lock = composer_file.replace('.json', '.lock');
let is_release_candidate = argv.releaseCandidate;
let install_composer = argv.composer;
let install_yarn = argv.yarn;

const LOG = (...args) => verbose && console.log(...args);

LOG(`Build started\nComposer file to use:\t${composer_file}\nRelease candidate?:\t${is_release_candidate}\nUpdate composer?:\t${install_composer}\nUpdate yarn?:\t\t${install_yarn}\n\n`);
LOG(`Resolved paths\n==========================================================\nBase dir:\t${BASE_DIR}\nWorkspace:\t${WORKSPACE}\nBuild dir:\t${BUILD_DIR}`);

const is_partial_build = ensureWorkspaceFolder();

if (!is_partial_build)
{
    LOG('Doing full build.');
    doFullBuild();
}
else
{
    LOG('Doing partial build.');
    ensureRequiredFiles();
    process.chdir(WORKSPACE);

    if (existsSync(fullpath(composer_lock))) {
        LOG(`Removing prior ${composer_lock} to ensure proper composer update`);
        rmSync(fullpath(composer_lock));
    }

    const updates = Promise.all([
        install_composer ? task(
            'composer',
            ['update', '--prefer-source'],
            { env: { ...process.env, 'COMPOSER': composer_file } }
        ) : empty_promise(),
        install_yarn ? task(
            'yarn',
            ['--cwd', WORKSPACE, 'install'],
        ) : empty_promise()
    ]);

    updates.then(([composer_result, yarn_results]) => {
        LOG(`composer update ${composer_file} exited with ${composer_result}, yarn install exited with status ${yarn_results}`);
       
        if (install_yarn) _buildJS();
        
        is_release_candidate ? bumpReleaseCandidate() : setVersion();
        
        removeNestedVendorFiles();
        
        if (install_composer) {
            _buildPHP(() => {
                process.exit(_wrapUp("Partial build"));
            })
        } else {
            process.exit(_wrapUp("Partial build"));
        }
    }).catch((reason) => {
        console.error('Dependency updates failed in partial build, reason:');
        console.error(reason);
        process.exit(1);
    });
}

function removeNestedVendorFiles()
{
    LOG(`Removing nested vendor files`);
    
    taskSync(
        'find',
        ['-type', 'd', '-wholename', '"*/vendor/zef-dev/*/vendor"', '-exec', 'rm', '-rf', '{}', '+'],
        {},
        ({ code, output }) => {
            LOG('Done removing nested vendor files with code', code, output);
        },
        (err) => {
            console.error('Failed to remove nested vendor files from build dir, error', err);
            process.exit(1);
        }
    )
    
   LOG(`Removing nested tests files`);
    
    taskSync(
        'find',
        ['-type', 'd', '-wholename', '"*/vendor/zef-dev/*/tests"', '-exec', 'rm', '-rf', '{}', '+'],
        {},
        ({ code, output }) => {
            LOG('Done removing nested tests files with code', code, output);
        },
        (err) => {
            console.error('Failed to remove nested tests files from build dir, error', err);
            process.exit(1);
        }
    )
}


// MAIN BUILD
/**
 * Runs the build script updating both yarn and composer dependencies.
 */
function doFullBuild()
{
    console.time("Full build");
    ensureRequiredFiles();

    process.chdir(WORKSPACE);

    const updates = Promise.all([
        task(
            'composer',
            ['update'],
            { env: { ...process.env, 'COMPOSER': composer_file } }
        ),
        task(
            'yarn',
            ['--cwd', WORKSPACE, 'install'],
        )
    ]);

    updates
        .then(([composer_result, yarn_result]) => {
            LOG(`composer finished with code ${composer_result}, yarn finished with code ${yarn_result}`);

            _buildJS();

            is_release_candidate ? bumpReleaseCandidate() : setVersion();
            
            removeNestedVendorFiles();

            _buildPHP(() => {
                _wrapUp("Full build");
                process.exit(0);
            });
            
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
    if (!existsSync( DIST_DIR)) {
        console.warn("Dist directory does not exist, going to create it.");
        mkdirSync( DIST_DIR, { recursive: true });
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
        'app', 'lib', 'public', 'resources', 'routes', 'src', 'webpack', 'env', '.yalc'
    ];

    for (const file of required_files) {
        let file_path = fullpath(file);
        let workspace_path = fullpath(`.workspace/${file}`);

        if (!existsSync(file_path)) {
            console.error(`Missing required file: ${file_path}! Aborting build.`);
            process.exit(1);
        }

        copyFileSync(file_path, workspace_path);
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

        LOG('Spawned', cmd, args);

        spawned_process.on('exit', (output) => {
            if (output !== 0) {
                LOG(cmd, 'exited with non 0');
                return reject(output);
            }

            LOG(cmd, 'exited with output', output);
            return resolve(output);
        });

        spawned_process.stdout.on('data', (data) => {
            LOG(data.toString());
        })
        
        spawned_process.on('error', (err) => {
            LOG(cmd, 'errored');
            return reject(err);
        })
        
        if (passToStdin) {
            LOG('Writing', passToStdin, 'to', cmd);
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

    LOG('Sync spawned', cmd, args);

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
    
    LOG('Sync task', cmd, 'finished');

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

/**
 * Accepts input from the user to set the new plugin version.
 * @param {boolean} [isReleaseCandidate=false] Whether the version is a release candidate and should be suffixed with `-RC01`.
 */
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

/**
 * Takes the current version of the package and increments the `-RC` suffix by 1. If the current version is not a release candidate, {@link setVersion} will be called with the `isReleaseCandidate` argument set to `true`.
 * This will prompt the user to enter a new version, which will then become `version-RC01`.
 */
function bumpReleaseCandidate() {
    const current_version = pjson.version;

    if (!current_version.includes('-RC')) {
        console.info(`Current version ${pjson.version} is not a release candidate. Enter new version to be deemed RC01.`);
        return setVersion(true);
    }

    const rctest = /(-RC)(\d{2,})/gm;
    const matches = rctest.exec(pjson.version);

    let new_version;

    if (matches && matches.length && matches.length === 3) {
        new_version = current_version.replace(matches[0], `${matches[1]}${pad_number((matches[2] * 1) + 1)}`);
    }

    LOG(`Version set to ${new_version}`);

    _writeVersionToFiles(new_version);
}

/**
 * Takes a new version and writes them to the necessary files.
 * @param {string} version Version to write to `package.json` and `convo-plugin.php`
 */
function _writeVersionToFiles(version)
{
    const php_plugin_file_path = fullpath(path.join(WORKSPACE, "convo-plugin.php"));
    let php_plugin_file = readFileSync(php_plugin_file_path, { encoding: "utf-8", flag: "r+" });

    const new_pjson = JSON.parse(JSON.stringify(pjson, null, 4));
    new_pjson.version = version;

    php_plugin_file = php_plugin_file
        .replace(/Version:\s.+/g, `Version: ${version}`)
        .replace(/define\('CONVOWP_VERSION',\s'.+'\);/g, `define('CONVOWP_VERSION', '${version}');`)

    writeFileSync(
        fullpath(path.join(WORKSPACE, "package.json")),
        JSON.stringify(new_pjson, null, 4)
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

/**
 * Builds the frontend part of the plugin. In order, this function will
 * 1. Update the `yarn.lock` file to ensure packages are updated.
 * 2. Run `yarn run build:wp` to clean up, copy, and bundle the required JS files.
 * 3. Copy over `main.js` and `vendor.js` that were just built from `dist/www` to `public/assets/js` in the workspace directory.
 * 4. Run `yarn run gulp fixLineEndings`, which will correct line endings from `CRLF` to just `LF`.
 * 
 * NOTE: since this function is synchronous, unlike {@link _buildPHP}, there is no callback to be executed once all the steps are done.
 * Simply call whatever you need after this function.
 */
function _buildJS()
{
    // Ensure full build by setting up yarn lockfile
    writeFileSync(fullpath(path.join(WORKSPACE, "yarn.lock")), YARN_LOCK_PRESET);

    // run yarn build:wp
    taskSync(
        'yarn', ['--cwd', WORKSPACE, 'build:wp'],
        {},
        ({ code, output }) => {
            LOG(`yarn build:wp finished with code ${code}\n${output}`);
        },
        (err) => {
            console.error('yarn build:wp errored, error', err);
        }
    )

    copyFileSync(fullpath("./dist/www/main.js"),   fullpath("./public/assets/js/main.js"));
    copyFileSync(fullpath("./dist/www/vendor.js"), fullpath("./public/assets/js/vendor.js"));

    taskSync(
        'yarn',
        ['--cwd', WORKSPACE, 'run', 'gulp', 'fixLineEndings'],
        {},
        ({ code, output }) => {
            LOG(`yarn run gulp fixLineEndings finished with code ${code}, output ${output}`);
        },
        (err) => {
            console.error('yarn run gulp fixLineEndings errored, error', err);
        }
    )
}

/**
 * Builds the server-side part of the plugin. In order, this will
 * 1. Execute PHP Scoper to prefix files to avoid vendor collision.
 * 2. Dump new autoloader files inside the newly generated `build` directory in the workspace
 * 3. Fix included autoloaders.
 * 4. Copy over files from `build` to `../dist`.
 * 5. (Optional) Call the `done` callback once all the previous steps have been completed.
 * @param {CallableFunction} [done=noop] Callback to execute once PHP scoper is done prefixing, composer autoloads have been fixed, and all the necessary files have been copied over. If not provided, `noop` is used.
 */
function _buildPHP(done)
{
    done = done || noop;

    const php_scoper = task(
        'php-scoper',
        ['add-prefix', '--config', 'scoper.inc.php', composer_file, composer_lock, 'convo-plugin.php'],
        {},
        "yes"
    );

    php_scoper.then((result) => {
        LOG(`php-scoper is done prefixing files with result ${result}`);
        
        // change to ./build to fix composer autoloaders
        process.chdir(BUILD_DIR);
        
        LOG('Renaming composer files to dump autoloader');

        renameSync(fullpath(`./${composer_file}`), fullpath('./composer.json'));
        renameSync(fullpath(`./${composer_lock}`), fullpath('./composer.lock'));

        taskSync(
            'composer',
            ['dump-autoload'],
            {},
            ({ code, output }) => {
                LOG(`Succefully dumped autoload, code ${code}, output ${output}`);
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
        process.chdir(WORKSPACE);

        // fix autoloader script
        taskSync(
            'php',
            ['fix-autoloader.php', `--working-dir=${fullpath('./build/vendor/composer')}`],
            {},
            ({ code, output }) => {
                LOG(`fix-autoloader has finished with code ${code}\n${output}`);
            },
            (err) => {
                console.error('fix-autoloader failed with error', err);
                process.exit(1);
            }
        );
        
        taskSync(
            'find',
            ['-type', 'f', '-wholename', '"./dist/*.zip"', '-delete'],
            {},
            ({ code, output }) => {
                LOG('Done removing old zip files with code', code, output);
            },
            (err) => {
                console.error('Failed to remove old zip files, error', err);
                process.exit(1);
            }
        )

        
        taskSync(
            'cp',
            ['-rp', 'build/*', 'dist/convoworks-wp/'],
            {},
            ({ code, output }) => {
                LOG('Done copying files with code', code, output);
            },
            (err) => {
                console.error('Failed to copy files from build dir, error', err);
                process.exit(1);
            }
        )

        done();
    }).catch((err) => {
        console.error('php-scoper failed to prefix, error', err);
        process.exit(1);
    })
}

/**
 * Changes CWD to the root of the project, and copies `package.json` and `convo-plugin.php` over from the workspace directory to keep the newly updated version between builds.
 * @returns {number} 0 on success, 1 on failure.
 */
function _solidifyVersion()
{
    try {
        copyFileSync(fullpath(path.join(WORKSPACE, "package.json")),     fullpath(path.join(BASE_DIR, "package.json")));
        copyFileSync(fullpath(path.join(WORKSPACE, "convo-plugin.php")), fullpath(path.join(BASE_DIR, "convo-plugin.php")));
        return 0;
    } catch (err) {
        console.error('Failed to solidify version by copying package.json and convo-plugin.php back to root.');
        console.error(err);
        return 1;
    }
}

/**
 * Runs `yarn run gulp zip` in the workspace directory to zip all the files from `dist`. After that, calls `_solidifyVersion` to ensure new version updates between builds.
 * Finally, logs out the time elapsed since the build started based on the `timeLabel` provided.
 * @param {string} timeLabel Timer label to end and log out.
 * @see {@link _solidifyVersion}
 */
function _wrapUp(timeLabel)
{
    taskSync(
        'yarn',
        ['--cwd', WORKSPACE, 'run', 'gulp', 'zip'],
        {},
        ({ code, output }) => {
            LOG(`yarn run gulp zip successfully zipped files\n${code}\n${output}`);
        },
        (err) => {
            console.error('yarn run gulp zip failed, error', err);
            process.exit(1);
        }
    );

    const res = _solidifyVersion();
    LOG(`Build finished with code ${res}`);
    console.timeEnd(timeLabel);

    return res;
}