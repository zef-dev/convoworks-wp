<?php

declare(strict_types=1);

use Isolated\Symfony\Component\Finder\Finder;

$polyfillsBootstraps = array_map(
    static fn (SplFileInfo $fileInfo) => $fileInfo->getPathname(),
    iterator_to_array(
        Finder::create()
            ->files()
            ->in(__DIR__ . '/vendor/symfony/polyfill-*')
            ->name('bootstrap.php'),
        false,
    ),
);

$polyfillsStubs = array_map(
    static fn (SplFileInfo $fileInfo) => $fileInfo->getPathname(),
    iterator_to_array(
        Finder::create()
            ->files()
            ->in(__DIR__ . '/vendor/symfony/polyfill-*/Resources/stubs')
            ->name('*.php'),
        false,
    ),
);

return [
    // The prefix configuration. If a non null value will be used, a random prefix will be generated.
    'prefix' => 'Convoworks',

    // By default when running php-scoper add-prefix, it will prefix all relevant code found in the current working
    // directory. You can however define which files should be scoped by defining a collection of Finders in the
    // following configuration key.
    //
    // For more see: https://github.com/humbug/php-scoper#finders-and-paths
    'finders' => [
        Finder::create()->files()->in('src'),
        Finder::create()->files()->in('lib/common'),
        Finder::create()
            ->files()
            ->ignoreVCS(true)
            ->notName('/LICENSE|.*\\.md|.*\\.dist|Makefile|composer\\.json|composer\\.lock/')
            ->exclude([
                'doc',
                'test',
                'test_old',
                'tests',
                'Tests',
                'vendor-bin',
            ])
            ->in('vendor')
    ],

    // Whitelists a list of files. Unlike the other whitelist related features, this one is about completely leaving
    // a file untouched.
    // Paths are relative to the configuration file unless if they are already absolute
    'exclude-files' => [
        'convo-plugin.php',
        'vendor/php-di/php-di/src/Compiler/Template.php',
        'vendor/league/plates/example/templates/layout.php',
        ...$polyfillsBootstraps,
        ...$polyfillsStubs
    ],

    // When scoping PHP files, there will be scenarios where some of the code being scoped indirectly references the
    // original namespace. These will include, for example, strings or string manipulations. PHP-Scoper has limited
    // support for prefixing such strings. To circumvent that, you can define patchers to manipulate the file to your
    // heart contents.
    //
    // For more see: https://github.com/humbug/php-scoper#patchers
    'patchers' => [
        // static function (string $filePath, string $prefix, string $content): string {
        //     $content = preg_replace('/a/', 'b', $content);
        //     return $content;
        // },
        static function (string $filePath, string $prefix, string $content): string {
            // Fix WP classes and functions used
            $temp = $content;

            $temp = preg_replace(
                [
                    "/\\\\".$prefix."\\\\WP_(.*?)(?=\b)/m",
                    "/\\\\".$prefix."\\\\wp_(.*?)(?=\b)/m",
                    // "/\\".$prefix."\\WP_(.*?)(?=\b)/m",
                    // "/\\".$prefix."\\wp_(.*?)(?=\b)/m",
                    "/".$prefix."\\\\WP_(.*?)(?=\b)/m",
                    "/".$prefix."\\wp_(.*?)(?=\b)/m",
                    "/\\\\".$prefix."\\\\get_(.*?)(?=\b)/m",
                    "/\\\\".$prefix."\\\\set_(.*?)(?=\b)/m",
                    "/\\\\".$prefix."\\\\esc_attr/m"
                ],
                [
                    "\\WP_$1",
                    "\\wp_$1",
                    // "\\WP_$1",
                    // "\\wp_$1",
                    "\\WP_$1",
                    "\\wp_$1",
                    "\\get_$1",
                    "\\set_$1",
                    "\\esc_attr"
                ],
                $temp
            );

            // This preg_replace causes the scoper to not do anything, and it doesn't raise any exceptions
            // $temp = preg_replace("/\\".$prefix."\\get_the_(.*?)(?=\b)/m", "\\get_the_$1", $temp);

            if (preg_last_error() === PREG_NO_ERROR) {
                $content = $temp;
                unset($temp);
            } else {
                echo "preg_replace encountered an error during WP patcher: [".preg_last_error()."][".preg_last_error_msg()."]".PHP_EOL;
            }

            return $content;
        },
        static function (string $filePath, string $prefix, string $content): string {
            // Fix SSA classes
            $content = str_replace(
                [
                    "\\\\$prefix\\\\Simply_Schedule_Appointments",
                    "$prefix\\\\Simply_Schedule_Appointments",
                    "\\$prefix\\Simply_Schedule_Appointments",
                    // "ssa()"
                ],
                [
                    "\\\\Simply_Schedule_Appointments",
                    "Simply_Schedule_Appointments",
                    "Simply_Schedule_Appointments",
                    // "\\ssa()"
                ],
                $content
            );

            $temp = $content;

            $temp = preg_replace(
                [
                    // "/\\".$prefix."\\SSA_(.*?)(?=\b)/m",
                    "/\\\\".$prefix."\\\\SSA_(.*?)(?=\b)/m"
                ],
                "\\SSA_$1",
                $temp
            );

            if (preg_last_error() === PREG_NO_ERROR) {
                $content = $temp;
                unset($temp);
            } else {
                echo "preg_replace encountered an error during SSA patcher: [".preg_last_error()."][".preg_last_error_msg()."]".PHP_EOL;
            }

            return $content;
        },
        static function (string $filePath, string $prefix, string $content): string {
            // Fix Formidable classes
            $content = str_replace(
                [
                    "\\\\$prefix\\\\Frm",
                    "$prefix\\\\Frm",
                    "\\$prefix\\Frm",
                    // "ssa()"
                ],
                [
                    "\\\\Frm",
                    "Frm",
                    "Frm",
                    // "\\ssa()"
                ],
                $content
            );

            $temp = $content;

            $temp = preg_replace(
                [
                    // "/\\".$prefix."\\SSA_(.*?)(?=\b)/m",
                    "/\\\\".$prefix."\\\\Frm(.*?)(?=\b)/m"
                ],
                "\\Frm$1",
                $temp
            );

            if (preg_last_error() === PREG_NO_ERROR) {
                $content = $temp;
                unset($temp);
            } else {
                echo "preg_replace encountered an error during Formidable patcher: [".preg_last_error()."][".preg_last_error_msg()."]".PHP_EOL;
            }

            return $content;
        },
        static function (string $filePath, string $prefix, string $content): string {
            // RTB fix

            $content = str_replace(
                [
                    "\\\\$prefix\\\\rtbQuery",
                    "\\\\$prefix\\\\rtbBooking",
                    "\\$prefix\\rtbQuery",
                    "\\$prefix\\rtbBooking",
                ],
                [
                    "\\\\rtbQuery",
                    "\\\\rtbBooking",
                    "\\rtbQuery",
                    "\\rtbBooking",
                ],
                $content
            );

            return $content;
        },
        static function (string $filePath, string $prefix, string $contents): string {
            // Guzzle-specific fixes

            $contents = str_replace(
                [
                    "GuzzleHttp\\\\ClientInterface::MAJOR_VERSION",
                    "GuzzleHttp\\\\ClientInterface::VERSION",
                ],
                [
                    "\\\\$prefix\\\\GuzzleHttp\\\\ClientInterface::MAJOR_VERSION",
                    "\\\\$prefix\\\\GuzzleHttp\\\\ClientInterface::VERSION",
                ],
                $contents
            );

            return $contents;
        },
    ],

    // PHP-Scoper's goal is to make sure that all code for a project lies in a distinct PHP namespace. However, you
    // may want to share a common API between the bundled code of your PHAR and the consumer code. For example if
    // you have a PHPUnit PHAR with isolated code, you still want the PHAR to be able to understand the
    // PHPUnit\Framework\TestCase class.
    //
    // A way to achieve this is by specifying a list of classes to not prefix with the following configuration key. Note
    // that this does not work with functions or constants neither with classes belonging to the global namespace.
    //
    // Fore more see https://github.com/humbug/php-scoper#whitelist
    'exclude-namespaces' => [
        // 'PHPUnit\Framework\TestCase',   // A specific class
        // 'PHPUnit\Framework\*',          // The whole namespace
        // '*',                            // Everything
        'Convo',
        'Psr',
        'Google',
        'Symfony\Polyfill'
    ],

    // If `true` then the user defined constants belonging to the global namespace will not be prefixed.
    //
    // For more see https://github.com/humbug/php-scoper#constants--constants--functions-from-the-global-namespace
    'expose-global-constants' => true,

    // If `true` then the user defined classes belonging to the global namespace will not be prefixed.
    //
    // For more see https://github.com/humbug/php-scoper#constants--constants--functions-from-the-global-namespace
    'expose-global-classes' => true,

    // If `true` then the user defined functions belonging to the global namespace will not be prefixed.
    //
    // For more see https://github.com/humbug/php-scoper#constants--constants--functions-from-the-global-namespace
    'expose-global-functions' => true,
];
