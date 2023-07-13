<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Rest\RequestInfo;
use Convo\Core\Workflow\ISpecialRoleRequest;

class ApiCommandRequest implements IConvoRequest, ISpecialRoleRequest
{
    
    private $_serviceId;
    private $_requestId = '';
    private $_specialRole;

    
    /**
     * @var \Psr\Http\Message\ServerRequestInterface
     */
    private $_psrRequest;
    
    /**
     * @var RequestInfo
     */
    private $_requestInfo;
    
    public function __construct( $requestId, $serviceId, $psrRequest, $specialRole)
    {
        $this->_requestId        =    $requestId;
        $this->_serviceId        =    $serviceId;
        $this->_psrRequest       =    $psrRequest;
        $this->_requestInfo      =    new RequestInfo( $psrRequest);
        $this->_specialRole      =   $specialRole;
    }
    
    public function getSpecialRole()
    {
        return $this->_specialRole;
    }
    
    public function getPsrRequest()
    {
        return $this->_psrRequest; 
    }
    
    public function getRequestInfo()
    {
        return $this->_requestInfo; 
    }

    public function getServiceId()
    {
        return $this->_serviceId;
    }

    public function getPlatformId()
    {
        return ApiBuilderPlatform::PLATFORM_ID;
    }

    public function getApplicationId()
    {
        return 'N/A';
    }
    
    public function getDeviceId()
    {
        return 'N/A';
    }
    
    public function getInstallationId()
    {
        return 'N/A';
    }
    
    public function getSessionId()
    {
        return 'N/A';
    }
    
    public function getRequestId()
    {
        return $this->_requestId;
    }

    public function getPlatformData()
    {
        return $this->_psrRequest->getParsedBody();
    }


    public function getText()
    {
        return null;
    }

    public function isEmpty()
    {
        return false;
    }


    public function isMediaRequest()
    {
        return false;
    }
    
    public function getMediaTypeRequest()
    {}

    public function isHealthCheck()
    {
        return false;
    }

    public function getIsCrossSessionCapable()
    {
        return true;
    }

    public function getAccessToken()
    {}

    public function isLaunchRequest()
    {
        return $this->isSessionStart();
    }

    public function isSalesRequest()
    {
        return false;
    }

    public function isSessionEndRequest()
    {
        return false;
    }

    public function isSessionStart()
    {
        return true;
    }


    
    // UTIL
    public function __toString()
    {
        return get_class( $this).'['.$this->getSpecialRole().']['.$this->getText().']['.$this->getDeviceId().']['.$this->getRequestId().']['.$this->getSessionId().']';
    }


}
