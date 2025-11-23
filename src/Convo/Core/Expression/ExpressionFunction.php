<?php

declare(strict_types=1);

namespace Convo\Core\Expression;

class ExpressionFunction extends \Symfony\Component\ExpressionLanguage\ExpressionFunction
{
    /**
     * Creates an ExpressionFunction with a no-op compiler (for functions that don't need compilation)
     * 
     * @param string $name Function name
     * @param callable $evaluator The evaluator function (receives $args as first param, then function params)
     * @return ExpressionFunction
     */
    public static function fromEvaluator(string $name, callable $evaluator): self
    {
        return new self(
            $name,
            function () {
                return ''; // No-op compiler
            },
            $evaluator
        );
    }
}
