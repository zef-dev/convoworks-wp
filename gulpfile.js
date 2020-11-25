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

var gulp = require('gulp');
var pjson = require('./package.json');
var replace = require('gulp-replace');
var prompt = require('gulp-prompt');
var del = require('del');
var zip = require('gulp-zip');
var runSequence = require('run-sequence');

/**
 * Changes the version of the theme based
 * on user input in various files
 */
gulp.task('version', function() {
    return gulp.src(['package.json'])
        .pipe(prompt.prompt({
            type: 'input',
            name: 'version',
            message: 'Enter the new version (current version is ' + pjson.version + '):',
        }, function(res){

            // If user doesn't input the version, don't change it)
            if (!res.version) {
                console.warn('Version has not been changed.');
                return;
            }

            gulp.src(['package.json', 'convo-plugin.php'])

                // package.json
                .pipe(replace(/\"version\": \".+\",/g, '"version": "' + res.version + '",'))

                // convo-plugin.php
                .pipe(replace(/Version:\s.+/g, 'Version: ' + res.version))
                .pipe(replace(/define\(\'CONVOWP_VERSION\'\,\s\'.+\'\)\;/g, "define('CONVOWP_VERSION', '" + res.version + "');"))

                .pipe(gulp.dest('./'));

            console.log('Version set to "' + res.version + '".');
        }));
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
gulp.task('copy', ['clean'], function () {
    return gulp.src([
        '**/*',
        '!.gitignore',
        '!package.json',
        '!package-lock.json',
        '!bower_components/**/*',
        '!_docs/**/*',
        '!_css.include.php',
        '!_js.include.php',
        '!gulpfile.js',
        '!yarn.lock',
        '!bower.json',
        '!composer.json',
        '!composer.lock',
        '!webpack.mix.js',
        '!dist/**/*',
        '!gulpfile.js',
        '!node_modules/**/*'
    ])
        .pipe(gulp.dest('./dist/convoworks-wp'));
});

/**
 * Creates the zip file for the theme from dist folder
 * (has task that copies all required theme files
 * to dist folder)
 */
gulp.task('zip', ['copy'], function () {
    return gulp.src('dist/**/*')
        .pipe(zip('convoworks-wp.zip'))
        .pipe(gulp.dest('dist'))
});

/**
 * Changes the version, copies all files to
 * dist folder (cleaning it up beforehand),
 * and finally creates a new plugin zip
 */
gulp.task('prod', function(callback) {
    return runSequence('version', 'zip', callback);
});