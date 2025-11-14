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
let sass;
try {
    sass = require('gulp-sass')(require('dart-sass'));
} catch (e) {
    console.warn('Warning: dart-sass is not installed. SCSS compilation will be skipped. To enable SCSS, install dart-sass in this directory.');
    sass = null;
}
const del = require('del');
const zip = require('gulp-zip');
const runSequence = require('run-sequence');
const lec = require('gulp-line-ending-corrector');
const sourcemaps = require('gulp-sourcemaps');

/**
 * Deletes the dist folder
 */
gulp.task('clean', function () {
    return del(['dist/']);
});

gulp.task('scss', () => {
    if (!sass) {
        console.warn('Skipping SCSS compilation because dart-sass is not installed.');
        return Promise.resolve();
    }
    return gulp.src(['./resources/assets/sass/framework.scss', './resources/assets/sass/app.scss'])
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('public/assets/css'));
});

/**
 * Generates and embeds sourcemaps into external JS and CSS dependencies.
 * @TODO might not be necessary for each build, and could only be run manually when needed.
 */
gulp.task('sourcemaps', () => {
    return gulp.src('./resources/assets/external/**/*.*')
        .pipe(sourcemaps.init({ loadMaps: true }))
        // .pipe(sourcemaps.identityMap())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./resources/assets/external'));
});

/**
 * Copies all files to the dist folder.
 * @TODO might not need to run sourcemaps for each run of copy.
 */
gulp.task('copy', gulp.series('clean', 'scss', 'sourcemaps', function () {
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
    return gulp.src('convoworks-wp/**', { cwd: 'dist', base: 'dist', dot: true })
        .pipe(zip(`convoworks-wp-v${pjson.version}.zip`))
        .pipe(gulp.dest('dist'));
});

/**
 * Changes the version, copies all files to
 * dist folder (cleaning it up beforehand),
 * and finally creates a new plugin zip
 */
gulp.task('prod', function (callback) {
    return runSequence('version', 'zip', callback);
});
