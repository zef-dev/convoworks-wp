<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\ApiBuilder;

use Psr\Log\LoggerInterface;
use Psr\Http\Server\RequestHandlerInterface;

use Convo\Core\Rest\RestSystemUser;
use Convo\Core\Util\StrUtil;
use Convo\Core\EventDispatcher\ServiceRunRequestEvent;


class ApiBuilderRestHandler implements RequestHandlerInterface
{
    /**
     * @var \Convo\Core\Factory\ConvoServiceFactory
     */
    private $_convoServiceFactory;

    /**
     * @var \Convo\Core\Params\IServiceParamsFactory
     */
    private $_convoServiceParamsFactory;

    /**
     * @var \Convo\Core\Util\IHttpFactory
     */
    private $_httpFactory;

    /**
     * @var LoggerInterface
     */
    private $_logger;
    
    /**
     * @var \Convo\Core\IServiceDataProvider
     */
    private $_convoServiceDataProvider;
    
    /**
     * @var \Convo\Core\Factory\IPlatformRequestFactory
     */
    private $_platformRequestFactory;
    
    /**
    * @var \Convo\Core\EventDispatcher\EventDispatcher
    */
    private $_eventDispatcher;
    
    public function __construct( 
        $logger, $httpFactory, $serviceFactory, $serviceParamsFactory, $serviceDataProvider, $platformRequestFactory, $eventDispatcher)
    {
    	$this->_logger						=	$logger;
    	$this->_httpFactory					=	$httpFactory;
        $this->_convoServiceFactory 		=	$serviceFactory;
        $this->_convoServiceParamsFactory	=	$serviceParamsFactory;
        $this->_convoServiceDataProvider	= 	$serviceDataProvider;
        $this->_platformRequestFactory   	= 	$platformRequestFactory;
        $this->_eventDispatcher             =   $eventDispatcher;
    }

    public function handle( \Psr\Http\Message\ServerRequestInterface $request): \Psr\Http\Message\ResponseInterface
    {
    	$info	=	new \Convo\Core\Rest\RequestInfo( $request);

    	$this->_logger->debug( 'Got info ['.$info.']');

        if ( $route = $info->routePartial('service-run/convo-api-builder/{variant}/{serviceId}'))
        {
            $variant = $route->get('variant');
            $serviceId = $route->get('serviceId');
            return $this->_handleApiRequest( $request, $variant, $serviceId);
        }

        throw new \Convo\Core\Rest\NotFoundException('Could not map ['.$info.']');
    }

    private function _handleApiRequest( \Psr\Http\Message\ServerRequestInterface $request, $variant, $serviceId)
    {
    	$owner		=	new RestSystemUser();

        try {
            $version_id			=	$this->_convoServiceFactory->getVariantVersion( $owner, $serviceId, ApiBuilderPlatform::PLATFORM_ID, $variant);
        } catch ( \Convo\Core\ComponentNotFoundException $e) {
            throw new \Convo\Core\Rest\NotFoundException( 'Service variant ['.$serviceId.']['.$variant.'] not found', 0, $e);
        }

    	$service 	=	$this->_convoServiceFactory->getService( $owner, $serviceId, $version_id, $this->_convoServiceParamsFactory);

    	try {
    	    $platform_config	=	$this->_convoServiceDataProvider->getServicePlatformConfig( $owner, $serviceId, $version_id);
    	} catch ( \Convo\Core\ComponentNotFoundException $e) {
    	    throw new \Convo\Core\Rest\NotFoundException( 'Service platform config ['.$serviceId.']['.$version_id.'] not found', 0, $e);
    	}
    	
    	if ( !isset( $platform_config[ ApiBuilderPlatform::PLATFORM_ID])) {
    	    throw new \Convo\Core\Rest\InvalidRequestException( 'Service ['.$serviceId.'] version ['.$version_id.'] is not enabled for platform ['.ApiBuilderPlatform::PLATFORM_ID.']');
    	}
    	
        $this->_logger->info("Running variant [$variant] of [$serviceId] delegate");
        
        $this->_logger->debug( 'METHOD '. print_r( $request->getMethod(), true));
        $this->_logger->debug( 'REQUEST '. print_r( $request->getRequestTarget(), true));
//         $this->_logger->debug( 'URI '. print_r( $request->getUri(), true));
        $this->_logger->debug( 'QUERY '. print_r( $request->getQueryParams(), true));
//         $this->_logger->debug( 'COOKIE '. print_r( $request->getCookieParams(), true));
//         $this->_logger->debug( 'HEADERS '. print_r( $request->getHeaders(), true));
//         $this->_logger->debug( 'BODY '. print_r( $request->getBody(), true));
        $this->_logger->debug( 'PARSED BODY '. print_r( $request->getParsedBody(), true));
//         $this->_logger->debug( 'SERVER '. print_r( $request->getServerParams(), true));
//         $this->_logger->debug( 'SERVER '. print_r( $_SERVER, true));

        $request_id     =   StrUtil::uuidV4();
        $role           =   $platform_config['convo-api-builder']['special_role'] ?? null;
        $text_request = new ApiCommandRequest( $request_id, $serviceId, $request, $role);
        
        $this->_logger->debug('Got request [' . $text_request . ']');
        
        $text_response = new ApiCommandResponse( $this->_httpFactory);

        try {
            $this->_logger->info('Running service instance ['.$service->getId().'] in Api Builder REST Handler.');
            $service->run( $text_request, $text_response);
            $this->_eventDispatcher->dispatch(
                new ServiceRunRequestEvent( false, $text_request, $text_response, $service, $variant),
                ServiceRunRequestEvent::NAME);
        } catch ( \Throwable $e) {
            $this->_eventDispatcher->dispatch(
                new ServiceRunRequestEvent( false, $text_request, $text_response, $service, $variant, $e),
                ServiceRunRequestEvent::NAME);
            throw $e;
        }
        
        $this->_logger->info('Got response [' . $text_response . ']');

//         $data = $text_response->getPlatformResponse();

//         $this->_logger->debug('Got Api Builder response [' . strval( $data) . ']');

//         return $this->_httpFactory->buildResponse( strval( $data), IHttpFactory::HTTP_STATUS_200, ['Content-Type' => 'text/xml']);
        return $text_response->getPsrResponse();
    }

    // UTIL
    public function __toString()
    {
        return get_class( $this) . '[]';
    }
}
