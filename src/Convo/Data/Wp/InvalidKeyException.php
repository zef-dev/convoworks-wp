<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Data\Wp;

class InvalidKeyException extends \Exception implements \Psr\SimpleCache\InvalidArgumentException
{
}