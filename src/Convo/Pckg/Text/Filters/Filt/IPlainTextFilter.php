<?php

declare(strict_types=1);

namespace Convo\Pckg\Text\Filters\Filt;

use Convo\Core\Workflow\IBasicServiceComponent;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IRequestFilterResult;

interface IPlainTextFilter extends IBasicServiceComponent
{
    /**
     * Filters text
     * @param IConvoRequest $request Request to parse
     */
    public function filter(IConvoRequest $request);

    /**
     * Returns the filter result
     * @return IRequestFilterResult
     */
    public function getFilterResult();
}
