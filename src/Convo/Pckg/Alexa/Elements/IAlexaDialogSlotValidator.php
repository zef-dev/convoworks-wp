<?php

namespace Convo\Pckg\Alexa\Elements;

interface IAlexaDialogSlotValidator
{
    public function getDialogValidation();

    public function setSlotToValidate($slotToValidate);
}
