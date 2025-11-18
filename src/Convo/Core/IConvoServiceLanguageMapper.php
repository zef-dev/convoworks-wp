<?php

namespace Convo\Core;

interface IConvoServiceLanguageMapper
{
    public const CONVO_SERVICE_ENGLISH = 'en';
    public const CONVO_SERVICE_ENGLISH_AU = 'en-AU';
    public const CONVO_SERVICE_ENGLISH_CA = 'en-CA';
    public const CONVO_SERVICE_ENGLISH_GB = 'en-GB';
    public const CONVO_SERVICE_ENGLISH_IN = 'en-IN';
    public const CONVO_SERVICE_ENGLISH_US = 'en-US';
    public const CONVO_SERVICE_GERMAN = 'de';

    /**
     * @param $locale
     * @return string
     * @throws \Exception
     */
    public static function getDefaultLocale($locale);

    /**
     * @param $locale
     * @return array
     * @throws \Exception
     */
    public static function getSupportedLocalesByLocale($locale);

    /**
     * @param $locale
     * @return string
     * @throws \Exception
     */
    public static function getDefaultLocaleFromExternalLocale($locale);

    /**
     * @param $locale
     * @return array
     * @throws \Exception
     */
    public static function getSupportedLocalesFromExternalLocale($locale);

    /**
     * @param $locales
     * @return string
     * @throws \Exception
     */
    public static function getDefaultLocaleFromExternalSupportedLocales($locales);
}
