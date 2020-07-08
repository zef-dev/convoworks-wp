let gulp = require("gulp");
let angularTemplateCache = require('gulp-angular-templatecache');
let minifyHtml = require("gulp-minify-html");
let angularFileSort = require("gulp-angular-filesort");
let sourcemaps = require("gulp-sourcemaps");
let concat = require("gulp-concat");
let replace = require("gulp-replace");

let DESTINATION_CLIENT  =   'public/assets/js';
let DESTINATION = 'resources/views/legacy'

// Angular template cache
gulp.task('partials-wp', function () {

    return gulp
        .src(["resources/assets/js/convoworks/app/**/*.html", "!resources/assets/js/convoworks/app/proto/**/*"])
        .pipe( minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(angularTemplateCache('templateCacheHtml.js', {
            module: 'convo.editor',
            root: 'app'
        }))
        .pipe(gulp.dest(DESTINATION_CLIENT));
});

//Build JS
gulp.task("build-wp", function() {
    return gulp
        .src(["resources/assets/js/convoworks/app/convoworks/**/*.js", "resources/assets/js/convoworks/app/wp/**/*.js"])
        .pipe(angularFileSort())
        .pipe(sourcemaps.init())
        .pipe(concat("convo-all.js"))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(DESTINATION_CLIENT));
});

gulp.task("fix-cached-wp", function() {
    let now = Date.now();
    return gulp
        .src([DESTINATION + "/index.php"])
        .pipe(replace('js/templateCacheHtml.js', 'js/templateCacheHtml.js?v=' + now))
        .pipe(replace('js/ng-all.js', 'js/ng-all.js?v=' + now))
        .pipe(replace('js/convo-all.js', 'js/convo-all.js?v=' + now))
        .pipe(replace('css/convo-all.css', 'css/convo-all.css?v='+now))
        .pipe(gulp.dest(DESTINATION))
        ;
});

exports.build = gulp.series('partials-wp', 'build-wp');