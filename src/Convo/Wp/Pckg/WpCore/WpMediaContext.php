<?php


namespace Convo\Wp\Pckg\WpCore;


use Convo\Core\DataItemNotFoundException;
use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Media\Mp3File;
use Convo\Core\Workflow\AbstractBasicComponent;
use Convo\Core\Workflow\IMediaSourceContext;
use wapmorgan\Mp3Info\Mp3Info;
use Convo\Core\Util\ArrayUtil;
use Convo\Core\ComponentNotFoundException;
use Convo\Core\ConvoServiceInstance;

class WpMediaContext extends AbstractBasicComponent implements IMediaSourceContext
{
    const NOT_FOUND = 'not_found';

    private $_id;

    /** @var boolean */
    private $_shouldMovePonter = true;

    /**
     * @var array
     */
    private $_searchQuery = [];

    /**
     *
     * @var \Psr\Log\LoggerInterface
     */
    protected $_logger;
    
    private $_args =   [];

    public function __construct( $properties)
    {
        parent::__construct( $properties);
        $this->_id      =   $properties['id'];
        $this->_args    =   $properties['args'];
    }
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IServiceContext::init()
     */
    public function init()
    {
    }
    
    
    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\AbstractBasicComponent::getId()
     */
    public function getId()
    {
        return $this->_id;
    }
    
    /**
     * @return \WP_Query
     */
    public function getComponent()
    {
        return $this->getWpQuery();
    }
    
    // MEDIA
    public function isEmpty();
    public function isLast();
    public function getCount();
    public function next() : Mp3File;
    public function current() : Mp3File;
    public function movePrevious();
    public function moveNext();
    public function getOffset() : int;
    public function setOffset( $offset);
    public function setLoopStatus( $loopStatus);
    public function getLoopStatus() : bool;
    
    // QUERY
    /**
     * @return \WP_Query
     */
    public function getWpQuery()
    {
        $args               =   $this->_evaluateArgs();
        if ( !isset( $args['offset'])) {
            $this->_logger->debug( 'Offset not set, going to claculate it ...');
            $args['offset']     =   $this->_calculateOffset();
        }
        
        $args['paged']      =   true;
        
        if ( !isset( $this->_wpQuery) || $args != $this->_queryArgs ) {
            $this->_queryArgs   =   $args;
            $this->_wpQuery     =   new \WP_Query( $args);
            $this->_logger->info( 'Got new query ['.print_r( $this->_wpQuery->request, true).']['.print_r( $this->_queryArgs, true).']');
        }
        return $this->_wpQuery;
    }
    
    private function _evaluateArgs()
    {
        //         $this->_logger->debug( 'Got raw args ['.print_r( $this->_args, true).']');
        $args   =   [];
        foreach ( $this->_args as $key => $val)
        {
            $key	=	$this->getService()->evaluateString( $key);
            $parsed =   $this->getService()->evaluateString( $val);
            
            if ( !ArrayUtil::isComplexKey( $key))
            {
                $args[$key] =   $parsed;
            }
            else
            {
                $root           =   ArrayUtil::getRootOfKey( $key);
                $final          =   ArrayUtil::setDeepObject( $key, $parsed, $args[$root] ?? []);
                $args[$root]    =   $final;
            }
        }
        //         $this->_logger->debug( 'Got evaluated args ['.print_r( $args, true).']');
        return $args;
    }
    
    // PERSISTANT MODEL NAVI
    private function _getQueryModel()
    {
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        $model  =   $params->getServiceParam( self::PARAM_NAME_QUERY_MODEL);
        
        if ( empty( $model)) {
            $this->_logger->info( 'There is no saved model. Going to create default one.');
            $model   =   [
                'page_index' => 0,
                'post_index' => 0,
            ];
            $this->_saveQueryModel( $model);
        }
        
        return $model;
    }
    
    private function _saveQueryModel( $model)
    {
        $this->_logger->info( 'Saving query model ['.print_r( $model, true).']['.$this.']');
        $params =   $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_SESSION, $this);
        $params->setServiceParam( self::PARAM_NAME_QUERY_MODEL, $model);
    }
    
    private function _calculateOffset()
    {
        $model  =   $this->_getQueryModel();
        $reset  =   $this->getService()->evaluateString( $this->_resetNaviVar);
        
        if ( $reset) {
            $this->_logger->info( 'Reseting navigation because ['.$this->_resetNaviVar.']['.$reset.'] evaluated to true');
            $model['page_index']    =   0;
            $this->_saveQueryModel( $model);
        }
        
        $offset =   $model['page_index'] * $this->getLimit();
        return $offset;
    }
    
    /**
     * @param string $contextId
     * @param ConvoServiceInstance $service
     * @throws ComponentNotFoundException
     * @return WpMediaContext
     */
    public static function getWpMediaContext( $contextId, $service)
    {
        $context    =   $service->getService()->findContext( $contextId);
        
        if ( is_a( $context, self::class)) {
            return $context;
        }
        throw new ComponentNotFoundException( 'Could not find context ['.$contextId.'] of type ['.self::class.']');
    }
    
    // UTIL
    public function __toString()
    {
        return parent::__toString().'['.$this->_id.']['.json_encode( $this->_args).']';
    }
}
