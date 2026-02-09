<?php

// NOTE ON WORDPRESS & PLUGIN INTEGRATIONS
// ---------------------------------------
// This config must keep certain WordPress globals and 3rd-party plugin classes
// unscoped so they continue to match the runtime provided by WordPress.
//
// Guidelines:
// 1) Core WP globals (WP_*/wp_*/get_*/set_*/esc_attr) must never end up as
//    Convoworks\WP_* or Convoworks\wp_* at runtime. The WP patcher below:
//      - Explicitly de-prefixes WP_User, WP_REST_Request, WP_REST_Response.
//      - Uses regex rules to de-prefix any other WP_*/wp_* symbols.
//    When adding new WP-related typehints (e.g. WP_Query, WP_Post), verify the
//    scoped build and extend the explicit list above if needed.
//
// 2) Other WP plugins with global classes (SSA_*, Simply_Schedule_Appointments,
//    Frm*, rtbQuery, rtbBooking, etc.) must have a dedicated patcher that
//    reverses any Convoworks prefixing. See the SSA / Formidable / RTB patchers
//    below as reference.
//
// 3) When integrating a new plugin or WP feature that introduces new global
//    classes/functions, always:
//      - Use them as-is (no custom namespace aliases), and
//      - Add/adjust a patcher here if php-scoper ends up prefixing them.

declare(strict_types=1);

// Stub for IDE support - Finder is provided by php-scoper at runtime
// Use Symfony's Finder as a fallback for IDE autocomplete during development
if (class_exists('Symfony\Component\Finder\Finder') && !class_exists('Isolated\Symfony\Component\Finder\Finder', false)) {
    class_alias('Symfony\Component\Finder\Finder', 'Isolated\Symfony\Component\Finder\Finder');
}

use Isolated\Symfony\Component\Finder\Finder;

$polyfillsBootstraps = array_map(
    static function (SplFileInfo $fileInfo) {
        return $fileInfo->getPathname();
    },
    iterator_to_array(
        /** @phpstan-ignore-next-line */
        Finder::create()
            ->files()
            ->in(__DIR__ . '/vendor/symfony/polyfill-*')
            ->name('bootstrap.php'),
        false
    )
);

$polyfillsStubs = array_map(
    static function (SplFileInfo $fileInfo) {
        return $fileInfo->getPathname();
    },
    iterator_to_array(
        /** @phpstan-ignore-next-line */
        Finder::create()
            ->files()
            ->in(__DIR__ . '/vendor/symfony/polyfill-*/Resources/stubs')
            ->name('*.php'),
        false
    )
);

return [
    // The prefix configuration. When null, php-scoper will generate a random prefix.
    // When set to a non-null string, that exact prefix will be used.
    'prefix' => 'Convoworks',

    // By default when running php-scoper add-prefix, it will prefix all relevant code found in the current working
    // directory. You can however define which files should be scoped by defining a collection of Finders in the
    // following configuration key.
    //
    // For more see: https://github.com/humbug/php-scoper#finders-and-paths
    'finders' => [
        /** @phpstan-ignore-next-line */
        Finder::create()->files()->in('src'),
        /** @phpstan-ignore-next-line */
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
    'exclude-files' => array_merge(
        [
            'convo-plugin.php',
            'vendor/php-di/php-di/src/Compiler/Template.php',
            'vendor/league/plates/example/templates/layout.php',
        ],
        $polyfillsBootstraps,
        $polyfillsStubs
    ),

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

            $quotedPrefix = preg_quote($prefix, '/');

            // Ensure core WP classes such as WP_User, WP_REST_Request and WP_REST_Response are not prefixed
            $temp = str_replace(
                [
                    '\\' . $prefix . '\\WP_User',
                    $prefix . '\\WP_User',
                    '\\' . $prefix . '\\WP_REST_Request',
                    $prefix . '\\WP_REST_Request',
                    '\\' . $prefix . '\\WP_REST_Response',
                    $prefix . '\\WP_REST_Response',
                ],
                [
                    '\\WP_User',
                    'WP_User',
                    '\\WP_REST_Request',
                    'WP_REST_Request',
                    '\\WP_REST_Response',
                    'WP_REST_Response',
                ],
                $temp
            );

            $temp = preg_replace(
                [
                    '/\\\\' . $quotedPrefix . '\\\\WP_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/\\\\' . $quotedPrefix . '\\\\wp_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/' . $quotedPrefix . '\\\\WP_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/' . $quotedPrefix . '\\\\wp_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/\\\\' . $quotedPrefix . '\\\\get_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/\\\\' . $quotedPrefix . '\\\\set_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/\\\\' . $quotedPrefix . '\\\\esc_attr/m',
                ],
                [
                    '\\WP_$1',
                    '\\wp_$1',
                    '\\WP_$1',
                    '\\wp_$1',
                    '\\get_$1',
                    '\\set_$1',
                    '\\esc_attr',
                ],
                $temp
            );

            // Example of how to extend for specific get_the_* functions if needed:
            // $temp = preg_replace(
            //     '/\\\\' . $quotedPrefix . '\\\\get_the_([A-Za-z_][A-Za-z0-9_]*)/m',
            //     '\\get_the_$1',
            //     $temp
            // );

            if (preg_last_error() === PREG_NO_ERROR) {
                $content = $temp;
                unset($temp);
            } else {
                echo "preg_replace encountered an error during WP patcher: [" . preg_last_error() . "][" . preg_last_error_msg() . "]" . PHP_EOL;
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
                    // Explicitly fix common SSA classes used in the codebase
                    '\\' . $prefix . '\\SSA_Appointment_Type_Model',
                    $prefix . '\\SSA_Appointment_Type_Model',
                    '\\' . $prefix . '\\SSA_Appointment_Type_Object',
                    $prefix . '\\SSA_Appointment_Type_Object',
                    // "ssa()"
                ],
                [
                    "\\\\Simply_Schedule_Appointments",
                    "Simply_Schedule_Appointments",
                    "Simply_Schedule_Appointments",
                    '\\SSA_Appointment_Type_Model',
                    'SSA_Appointment_Type_Model',
                    '\\SSA_Appointment_Type_Object',
                    'SSA_Appointment_Type_Object',
                    // "\\ssa()"
                ],
                $content
            );

            $temp = $content;

            $quotedPrefix = preg_quote($prefix, '/');

            // Fix SSA_* classes - handle both with and without leading backslash
            // Similar to how WP_* classes are handled above
            $temp = preg_replace(
                [
                    '/\\\\' . $quotedPrefix . '\\\\SSA_([A-Za-z_][A-Za-z0-9_]*)/m',
                    '/' . $quotedPrefix . '\\\\SSA_([A-Za-z_][A-Za-z0-9_]*)/m',
                ],
                [
                    '\\SSA_$1',
                    'SSA_$1',
                ],
                $temp
            );

            if (preg_last_error() === PREG_NO_ERROR) {
                $content = $temp;
                unset($temp);
            } else {
                echo "preg_replace encountered an error during SSA patcher: [" . preg_last_error() . "][" . preg_last_error_msg() . "]" . PHP_EOL;
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
                ],
                [
                    "\\\\Frm",
                    "\\\\Frm",
                    "\\Frm",
                ],
                $content
            );

            $temp = $content;

            $quotedPrefix = preg_quote($prefix, '/');

            $temp = preg_replace(
                [
                    '/\\\\' . $quotedPrefix . '\\\\Frm([A-Za-z_][A-Za-z0-9_]*)/m',
                ],
                '\\Frm$1',
                $temp
            );

            if (preg_last_error() === PREG_NO_ERROR) {
                $content = $temp;
                unset($temp);
            } else {
                echo "preg_replace encountered an error during Formidable patcher: [" . preg_last_error() . "][" . preg_last_error_msg() . "]" . PHP_EOL;
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
        static function (string $filePath, string $prefix, string $content): string {
            // Ensure zef-dev formatter references scoped Monolog classes while keeping Zef\* unscoped
            // Make path check OS-agnostic (Windows/Unix)
            if (preg_match('#[\\\\/]+vendor[\\\\/]+zef-dev[\\\\/]+zef-monolog-formatter[\\\\/]#', $filePath)) {
                $content = str_replace('Monolog\\\\', "\\\\$prefix\\\\Monolog\\\\", $content);
            }
            return $content;
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
        // Note: 'Convo' is intentionally excluded from prefixing to keep the public plugin API namespace stable.
        'Convo',
        'Psr',
        'Symfony\Polyfill',
        'Inpsyde\WPRESTStarter',
        'Zef',
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
