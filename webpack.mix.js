let mix = require('laravel-mix');

mix.webpackConfig({
    externals: {
        jquery: 'jQuery'
    },
});

// Define the public and resources paths
mix.setPublicPath('public/assets');
mix.setResourceRoot('../');

// Stylesheets
mix.sass('resources/assets/sass/framework.scss', 'public/assets/css').sourceMaps();
mix.sass('resources/assets/sass/app.scss', 'public/assets/css').sourceMaps();
mix.sass('resources/assets/sass/wp.scss', 'public/assets/css').sourceMaps();

// Scripts
mix.js('resources/assets/js/app.js', 'public/assets/js').sourceMaps();

mix.styles([
    'bower_components/ui-select/dist/select.css',
    'resources/assets/css/*.css',
    'bower_components/ng-dialog/css/ngDialog.css',
    'bower_components/ng-sortable/dist/ng-sortable.min.css',
    'bower_components/json-formatter/dist/json-formatter.min.css'
], 'public/assets/css/convo-all.css').sourceMaps();

mix.scripts([
    'bower_components/jquery-ui/jquery-ui.js',
    'bower_components/angular/angular.js',
    'bower_components/angular-route/angular-route.js',
    'bower_components/angular-sanitize/angular-sanitize.js',
    'bower_components/angular-animate/angular-animate.js',
    'bower_components/angular-cookies/angular-cookies.js',
    'bower_components/angular-bootstrap/ui-bootstrap.js',
    'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
    'bower_components/angular-bootstrap-contextmenu/contextMenu.js',
    'bower_components/ui-select/dist/select.js',
    'bower_components/ngSticky/dist/sticky.min.js',
    'bower_components/angular-local-storage/dist/angular-local-storage.min.js',
    'bower_components/ng-file-upload/ng-file-upload.js',
    'bower_components/json-formatter/dist/json-formatter.min.js'
], 'public/assets/js/ng-all.js').sourceMaps();

// Publish some assets
mix.copy('resources/assets/img/*', 'public/assets/images');