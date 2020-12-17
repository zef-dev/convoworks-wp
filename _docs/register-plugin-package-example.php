<?php 

/*
 * Here is the simple example how you can register Convoworks package from your WordPress plugin
 * 
 * */

// enable autoload for your plugin namespace
spl_autoload_register( 'my_plugin_autoloader' );
function my_plugin_autoloader( $class_name ) {
    if ( false !== strpos( $class_name, 'Myorg\Convo\Example' ) ) {
        $classes_dir = realpath( __DIR__ ) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR;
        $class_file = str_replace( '_', DIRECTORY_SEPARATOR, $class_name ) . '.php';
        require_once $classes_dir . $class_file;
    }
}


// register your package into convoworks
/**
 * @param Convo\Core\Factory\PackageProviderFactory $packageProviderFactory
 * @param Psr\Container\ContainerInterface $container
 */
function my_package_registrator( $packageProviderFactory, $container) {
    $packageProviderFactory->registerPackage( new Convo\Core\Factory\FunctionPackageDescriptor('\Myorg\Convo\Example\MyPackageDefinition',
        function() use ( $container) {
            return new \Myorg\Convo\Example\MyPackageDefinition( $container->get( 'logger'));
        }));
}
add_action( 'register_convoworks_package', 'my_package_registrator', 10, 2);

