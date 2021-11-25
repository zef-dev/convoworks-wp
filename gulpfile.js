/**
 * Yarn [https://yarnpkg.com/] and gulp [https://gulpjs.com/] are used to manage dev dependencies.
 *
 * Once yarn and gulp are installed on your system
 * (instructions on their respective websites),
 * run 'yarn' in theme dir to install
 * all development dependencies
 *
 * Available gulp tasks:
 * gulp version -> changes the theme version in various files throught the project (prompt asks for new version)
 * gulp clean -> deletes the dist folder
 * gulp copy -> copies all files to the dist folder (minifies resources and cleans the dist folder beforhand)
 * gulp zip -> creates the zip file for the theme from dist folder (runs gulp copy as a dependend task)
 */

const gulp = require('gulp');
const pjson = require('./package.json');
const replace = require('gulp-replace');
const prompt = require('gulp-prompt');
const del = require('del');
const zip = require('gulp-zip');
const runSequence = require('run-sequence');
const lec = require('gulp-line-ending-corrector');

const padNumber = (num) => num < 10 ? `0${num}` : num;

const version = (tagAsRc) => {
    gulp.src(['package.json'])
        .pipe(
            prompt.prompt(
                {
                    type: 'input',
                    name: 'version',
                    message: 'Enter the new version (current version is ' + pjson.version + '):',
                },
                (res) => {
                    // If user doesn't input the version, don't change it)
                    if (!res.version) {
                        console.warn('Version has not been changed.');
                        return;
                    }

                    const ver = tagAsRc && !res.version.includes('-RC') ? `${res.version}-RC01` : res.version;

                    gulp.src(['package.json', 'convo-plugin.php'])

                        // package.json
                        .pipe(replace(/\"version\": \".+\",/g, '"version": "' + ver + '",'))

                        // convo-plugin.php
                        .pipe(replace(/Version:\s.+/g, 'Version: ' + ver))
                        .pipe(replace(/define\(\'CONVOWP_VERSION\'\,\s\'.+\'\)\;/g, "define('CONVOWP_VERSION', '" + ver + "');"))

                        .pipe(gulp.dest('./'));

                    console.log('Version set to "' + ver + '".');
                }
            )
        )
};

/**
 * Changes the version of the theme based
 * on user input in various files
 */
gulp.task('version', () => version(false));

gulp.task('bumpRcVersion', () => {
    const current_version = pjson.version;

    if (!current_version.includes('-RC')) {
        console.log(`Current version ${pjson.version} is not a release candidate. Enter new version to be deemed RC01.`);
        return version(true);
    }

    const rctest = /(-RC)(\d{2,})/gm;
    const matches = rctest.exec(pjson.version);

    let new_version;

    if (matches && matches.length && matches.length === 3) {
        new_version = pjson.version.replace(matches[0], `${matches[1]}${padNumber((matches[2] * 1) + 1)}`);
    }

    console.log('Version set to "' + new_version + '".');

    return gulp.src(['package.json', 'convo-plugin.php'])
        // package.json
        .pipe(replace(/\"version\": \".+\",/g, '"version": "' + new_version + '",'))

        // convo-plugin.php
        .pipe(replace(/Version:\s.+/g, 'Version: ' + new_version))
        .pipe(replace(/define\(\'CONVOWP_VERSION\'\,\s\'.+\'\)\;/g, "define('CONVOWP_VERSION', '" + new_version + "');"))

        .pipe(gulp.dest('./'));
});

/**
 * Deletes the dist folder
 */
gulp.task('clean', function () {
    return del(['dist/']);
});

/**
 * Copies all files to the dist folder
 */
gulp.task('copy', gulp.series('clean', function () {
    return gulp.src([
        '**/*.*',
        '!.gitignore',
        '!package.json',
        '!package-lock.json',
        '!composer-marky.json',
        '!composer-marky.lock',
        '!composer-dev.json',
        '!composer-dev.lock',
        '!composer-dev.json.BKP',
        '!fix-autoloader.php',
        '!*.sh',
        '!scoper.inc.php',
        '!scoper.inc.dev.php',
        '!npm-shrinkwrap.json',
        '!build/**/*.*',
        '!README.md',
        '!{bower_components,bower_components/**}',
        '!{_docs,_docs/**}',
        '!_css.include.php',
        '!_js.include.php',
        '!gulpfile.js',
        '!yarn.lock',
        '!bower.json',
        '!composer.json',
        '!composer.lock',
        '!webpack.mix.js',
        '!webpack.config.wp.js',
        '!dist/**/*.*',
        '!gulpfile.js',
        '!{node_modules,node_modules/**/*.*}',
        '!{env,env/**/*.*}',
        '!{app,app/**/*.*}',
        '!storage/logs/**/*.*',
        '!{webpack,webpack/**/*.*}',
        '!resources/assets/sass/**/*.*',
    ])
        .pipe(gulp.dest('./dist/convoworks-wp'));
}));

gulp.task('fixLineEndings', gulp.series('copy', function () {
    return gulp.src([
        '{lib,lib/**/*.*}',
        '{public,public/assets/*.json}',
        '{public,public/assets/css/*.*}',
        '{public,public/assets/js/}',
        '{public,public/assets/fonts/*.svg}',
        '{resources,resources/assets/css/*.*}',
        '{resources,resources/assets/external/*.*}',
        '{resources,resources/assets/fonts/*.svg}',
        '{resources,resources/assets/js/*.svg}',
        '{resources,resources/views/**/*.*}',
        '{routes,routes/**/*.*}',
        '{src,src/**/*.*}',
        'convo-plugin.php',
        'readme.txt'
    ])
        .pipe(lec({ eolc: 'LF', encoding: 'utf8' }))
        .pipe(gulp.dest('./dist/convoworks-wp'));
}));

/**
 * Creates the zip file for the theme from dist folder
 * (has task that copies all required theme files
 * to dist folder)
 */
gulp.task('zip', function () {
    return gulp.src('dist/**/*.*')
        .pipe(zip(`convoworks-wp-v${pjson.version}.zip`))
        .pipe(gulp.dest('dist'))
});

/**
 * Changes the version, copies all files to
 * dist folder (cleaning it up beforehand),
 * and finally creates a new plugin zip
 */
gulp.task('prod', function (callback) {
    return runSequence('version', 'zip', callback);
});
