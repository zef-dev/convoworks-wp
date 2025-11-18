<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Workflow\IConvoResponse;

class ApiCommandResponse implements IConvoResponse
{
    private $_status = 200;
    private $_headers = [];
    private $_body = [];

    /**
     * @var \Convo\Core\Util\IHttpFactory
     */
    private $_httpFactory;

    public function __construct($httpFactory)
    {
        $this->_httpFactory = $httpFactory;
    }

    public function setStatus($status)
    {
        $this->_status = $status;
    }

    public function setHeaders($headers)
    {
        $this->_headers = $headers;
    }

    public function setBody($body)
    {
        $this->_body = $body;
    }

    public function getPsrResponse()
    {
//         $data       =   $this->getPlatformResponse();
//         $str_resp   =   json_encode( $data);
        return $this->_httpFactory->buildResponse($this->_body, $this->_status, $this->_headers);
    }

    public function shouldEndSession()
    {
    }

    public function isSsml()
    {
        return false;
    }

    public function setShouldEndSession($endSession)
    {
    }

    public function getTextSsml()
    {
    }

    public function addRepromptText($text, $append = false)
    {
    }

    public function getText()
    {
        return $this->_body;
    }

    public function addText($text, $append = false)
    {
    }


    public function getPlatformResponse()
    {
        return [
            'hello' => 'world'
        ];
    }



    public function isEmpty()
    {
    }

    public function getRepromptTextSsml()
    {
    }

    public function getRepromptText()
    {
    }



    // UTIL
    public function __toString()
    {
        return get_class($this) . '';
    }
}
