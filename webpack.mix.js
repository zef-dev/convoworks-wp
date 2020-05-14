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
    'resources/assets/css/*',
    'bower_components/ng-dialog/css/ngDialog.css',
    'bower_components/ng-sortable/dist/ng-sortable.min.css',
    'bower_components/json-formatter/dist/json-formatter.min.css'
], 'public/assets/css/ng-all.css');

// Compile Scripts and styles
// mix.js('resources/assets/js/app.js', 'public/assets/js')
//     .sass('resources/assets/sass/app.scss', 'public/assets/css')
//     .sass('resources/assets/sass/admin.scss', 'public/assets/css')
//     .sourceMaps();

// Publish some assets
mix.copy('resources/assets/img/*', 'public/assets/images');
