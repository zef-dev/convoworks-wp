<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
    ->name('*.php')
    ->ignoreDotFiles(true)
    ->ignoreVCS(true);

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(false)
    ->setRules([
        '@PSR12' => true,
        // Keep short arrays
        'array_syntax' => ['syntax' => 'short'],

        // Make concatenation look like your VS Code style: `$a . $b`
        'concat_space' => ['spacing' => 'one'],

        // Use single spaces around most binary operators (`=`, `=>`, etc.)
        // instead of fancy alignment, closer to what VS Code does.
        'binary_operator_spaces' => [
            'default' => 'single_space',
        ],
    ])
    ->setFinder($finder);
