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
const del = require('del');
const zip = require('gulp-zip');
const lec = require('gulp-line-ending-corrector');

/**
 * Deletes the dist folder
 */
gulp.task('clean', function () {
    return del(['dist/']);
});

/**
 * Copies all files to the dist folder.
 * @TODO might not need to run sourcemaps for each run of copy.
 */
gulp.task('copy', gulp.series('clean', function () {
    return gulp.src([
        '**/*.*',
        '!.gitignore',
        '!package.json',
        '!package-lock.json',
        '!composer-dev.json',
        '!composer-dev.lock',
        '!fix-autoloader.php',
        '!scoper.inc.php',
        '!README.md',
        '!{_docs,_docs/**}',
        '!gulpfile.js',
        '!yarn.lock',
        '!composer.json',
        '!composer.lock',
        '!webpack.config.wp.js',
        '!dist/**/*.*',
        '!gulpfile.js',
        '!{node_modules,node_modules/**/*.*}',
        '!{app,app/**/*.*}',
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
    return gulp.src('convoworks-wp/**', { cwd: 'dist', base: 'dist', dot: true })
        .pipe(zip(`convoworks-wp-v${pjson.version}.zip`))
        .pipe(gulp.dest('dist'));
});
