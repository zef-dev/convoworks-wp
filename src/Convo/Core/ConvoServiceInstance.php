<?php

declare(strict_types=1);

namespace Convo\Core;

use Convo\Core\Adapters\Alexa\AmazonCommandRequest;
use Convo\Core\Expression\EvaluationContext;
use Convo\Core\Intent\EntityModel;
use Convo\Core\Intent\IntentModel;
use Convo\Core\Params\ComponentParamsScope;
use Convo\Core\Params\IServiceParams;
use Convo\Core\Params\IServiceParamsFactory;
use Convo\Core\Params\IServiceParamsScope;
use Convo\Core\Util\ArrayUtil;
use Convo\Core\Workflow\IMediaType;
use Zef\Zel\ArrayResolver;
use Zef\Zel\ObjectResolver;
use Convo\Core\Workflow\IRunnableBlock;
use Convo\Core\Params\NoRequestParamsException;
use Convo\Core\Params\RequestParamsScope;
use Convo\Core\Workflow\IBasicServiceComponent;
use Convo\Core\Workflow\IConversationElement;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;
use Convo\Core\Workflow\IElementGenerator;
use Convo\Core\Workflow\IFragmentComponent;
use Convo\Core\Workflow\IIdentifiableComponent;
use Convo\Core\Workflow\ISpecialRoleRequest;
use Convo\Core\Workflow\IValueEvaluator;
use Convo\Core\Workflow\IPredispatchableBlock;
use Convo\Core\Workflow\IServiceContext;
use Convo\Core\Workflow\IServiceWorkflowComponent;
use Convo\Core\Workflow\IWorkflowContainerComponent;
use Psr\Log\LoggerInterface;
use Zef\Zel\IValueAdapter;
use Convo\Core\Util\IServerVarsResolver;

class ConvoServiceInstance implements IWorkflowContainerComponent, IIdentifiableComponent
{
    /**
     * @var string
     * @deprecated
     */
    public const BLOCK_TYPE_SESSION_END = '__sessionEnd';

    /**
     * @var string
     * @deprecated
     */
    public const BLOCK_TYPE_SESSION_START = '__sessionStart';

    /**
     * @var string
     * @deprecated
     */
    public const BLOCK_TYPE_SERVICE_PROCESSORS = '__serviceProcessors';

    /**
     * @var string
     * @deprecated
     */
    public const BLOCK_TYPE_MEDIA_CONTROLS = '__mediaControls';

    public const SERVICE_STATE_NAME = 'state';
    public const SERVICE_STATE_NEXT_NAME = 'state_next';
    public const SERVICE_STATE_PREV_NAME = 'state_previous';

    public const MAX_STATE_CHANGE_COUNT = 10;

    // DEFINITION

    private $_serviceId;

    private $_resolveCache = [];

    /**
     * @var array
     */
    private $_variables = [];

    /**
     * @var array
     */
    private $_packageIds = [];

    /**
     * @var EntityModel[]
     */
    private $_entities = [];

    /**
     * @var IntentModel[]
     */
    private $_intents = [];

    /**
     * @var array
     */
    private $_configs = [];

    /**
     * @var IRunnableBlock[]
     */
    private $_blocks = [];

    /**
     * @var IFragmentComponent[]
     */
    private $_fragments = [];

    /**
     * @var IBasicServiceComponent[]
     */
    private $_children = [];


    // RUNTIME
    /**
     * @var IServiceParamsFactory
     */
    private $_serviceParamsFactory;

    /**
     * @var IConvoRequest|null
     */
    private $_request;

    /**
     * @var IConvoResponse|null
     */
    private $_response;

    /**
     * @var IServiceContext[]
     */
    private $_contexts = [];

    private $_stateLog = [];

    /**
     * Logger
     *
     * @var LoggerInterface
     */
    private $_logger;

    /**
     * @var EvaluationContext
     */
    private $_eval;

    /**
     * @var IServerVarsResolver
     */
    private $_serverVarsResolver;

    public function __construct(
        LoggerInterface $logger,
        EvaluationContext $eval,
        IServiceParamsFactory $paramsFactory,
        ISecretStore $secretStore,
        IServerVarsResolver $serverVarsResolver,
        $serviceId
    ) {
        $this->_logger = $logger;
        $this->_serviceId = $serviceId;
        $this->_eval = $eval;
        $this->_serviceParamsFactory = $paramsFactory;
        $this->_serverVarsResolver = $serverVarsResolver;

        $this->_eval->getExpressionLanguage()->addFunction(
            new \Symfony\Component\ExpressionLanguage\ExpressionFunction(
                '_env',
                function () {
                    return ''; // No-op for compilation
                },
                function (...$params) use ($secretStore) {
                    return $secretStore->get($params[1]);
                }
            )
        );
    }

    public function getComponentId()
    {
        return $this->_serviceId;
    }

    public function getExpressionLanguage()
    {
        return $this->_eval->getExpressionLanguage();
    }

    public function setVariables($variables)
    {
        $this->_variables = $variables;
    }

    // @deprecated
    public function setPreviewVariables($previewVariables)
    {
    }

    public function setPackageIds($ids)
    {
        $this->_packageIds = $ids;
    }

    public function getPackageIds()
    {
        return $this->_packageIds;
    }

    /**
     * @param EntityModel $entitiy
     */
    public function addEntity($entitiy)
    {
        $this->_entities[] = $entitiy;
    }

    /**
     * @param string $name
     * @throws ComponentNotFoundException
     * @return EntityModel
     */
    public function getEntity($name)
    {
        if (strpos($name, '@') === 0) {
            $name = substr($name, 1);
        }

        foreach ($this->_entities as $entity) {
            if ($entity->getName() === $name) {
                return $entity;
            }
        }

        throw new ComponentNotFoundException('Entity [' . $name . '] not found');
    }

    /**
     * @param IntentModel $intent
     */
    public function addIntent($intent)
    {
        $this->_intents[] = $intent;
    }

    /**
     * @param string $name
     * @throws ComponentNotFoundException
     * @return IntentModel
     */
    public function getIntent($name)
    {
        $this->_logger->debug('Seraching for service intent [' . $name . ']');
        foreach ($this->_intents as $intent) {
            if ($intent->getName() === $name) {
                return $intent;
            }
        }

        throw new ComponentNotFoundException('Intent [' . $name . '] not found');
    }

    /**
     * @return ServiceIntentModel
     * @deprecated
     */
    //    public function getServiceIntentModel()
    //    {
    //        /** @var \Convo\Core\Intent\IIntentDriven $intent_drivens */
    //        $intent_drivens    =   $this->findChildren( '\Convo\Core\Intent\IIntentDriven');
    //
    //        $model             =   new ServiceIntentModel();
    //
    //        foreach ( $intent_drivens as $intent_driven) {
    //            foreach ( $intent_driven->getIntents() as $intent) {
    //                $model->addIntent( $intent);
    //                foreach ( $intent->getEntities() as $entity_name) {
    //                    try {
    //                        $entity    =   $this->_packageProviderFactory->getEntity( $entity_name);
    //                    } catch ( ComponentNotFoundException $e) {
    //                        $entity    =   $this->getEntity( $entity_name);
    //                    }
    //                    $model->addEntity( $entity);
    //                }
    //            }
    //        }
    //
    //        return $model;
    //    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IWorkflowContainerComponent::getAllChildren()
     */
    public function getAllChildren()
    {
        $all = [];
        foreach ($this->getChildren() as $child) {
            $all[] = $child;

            if (is_a($child, '\Convo\Core\Workflow\IWorkflowContainerComponent')) {
                /** @var IWorkflowContainerComponent $child */
                $all = array_merge($all, $child->getChildren());
            }
        }

        return $all;
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IWorkflowContainerComponent::findChildren()
     */
    public function findChildren($class)
    {
        $all = [];
        foreach ($this->getChildren() as $child) {
            if (is_a($child, $class)) {
                $all[] = $child;
            }
            if (is_a($child, '\Convo\Core\Workflow\IWorkflowContainerComponent')) {
                /** @var IWorkflowContainerComponent $child */
                $all = array_merge($all, $child->findChildren($class));
            }
        }
        return $all;
    }

    public function findAncestor($class)
    {
        if (is_a($this, $class)) {
            return $this;
        }

        throw new DataItemNotFoundException('Ancestor with class [' . $class . '] not found');
    }

    // RUN
    /**
     * @param IConvoRequest $request
     * @param IConvoResponse $response
     */
    public function run(
        IConvoRequest $request,
        IConvoResponse $response
    ) {
        $this->_logger->info('Processing request [' . $request->getRequestId() . '][' . $request->getServiceId() . '][' . $request->getPlatformId() . ']');

        // INITIALIZE
        $this->_request = $request;
        $this->_response = $response;
        $this->_stateLog = [];

        // CONTEXTS
        $this->_logger->debug('Initialize contexts [' . \count($this->_contexts) . ']');
        foreach ($this->_contexts as $eval) {
            /** @var IServiceContext $eval */
            try {
                $eval->init();
            } catch (\Exception $e) {
                /** @phpstan-ignore-next-line */
                $this->_logger->error($e);
            }
        }

        // SET first_call
        if ($request->isSessionStart()) {
            $this->_logger->debug('First session call. Setting [first_call=true]');
            $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_REQUEST)->setServiceParam('first_call', true);
        }


        // RUN ITSELF
        $this->_logger->debug('Running ...');

        try {
            // SPECIAL ROLE CALL
            if ($request instanceof ISpecialRoleRequest) {
                /* @var ISpecialRoleRequest  $request */
                if ($request->getSpecialRole()) {
                    $this->_logger->info('Handling special role call [' . $request->getSpecialRole() . ']');
                    try {
                        $block = $this->getBlockByRole($request->getSpecialRole());

                        try {
                            $block->run($request, $response);
                        } catch (EndRequestException $e) {
                            $this->_logger->info('Request terminate signal.');
                        } catch (StateChangedException $e) {
                            $this->_logger->info($e->getMessage());
                            $this->_readState($e->getState(), $request, $response);
                        } catch (ComponentNotFoundException $e) {
                            throw new \Exception('Failed to run special role block [' . $request->getSpecialRole() . ']', 0, $e);
                        }
                    } catch (ComponentNotFoundException $e) {
                        $this->_logger->warning('No block with role [' . $request->getSpecialRole() . '] found.');
                    }
                    $this->_logger->info('Exiting ...');
                    return;
                }
            }

            // SESSION END
            if ($request->isSessionEndRequest()) {
                $this->_logger->info('Reading session end block');
                try {
                    $block = $this->getBlockByRole(IRunnableBlock::ROLE_SESSION_ENDED);
                    $this->_readBlock($block, $request, $response);
                } catch (ComponentNotFoundException $e) {
                    $this->_logger->info($e->getMessage());
                }
                $this->_logger->info('Exiting ...');
                return;
            }

            // MEDIA
            if ($request->isMediaRequest()) {
                $mediaTypeRequest = $request->getMediaTypeRequest();
                switch ($mediaTypeRequest) {
                    case IMediaType::MEDIA_TYPE_AUDIO_STREAM:
                        $this->_logger->info('Audio player control request.');
                        $block = $this->getBlockByRole(IRunnableBlock::ROLE_MEDIA_PLAYER);
                        $block->run($request, $response);
                        $this->_logger->info('Exiting ...');
                        return;
                    case IMediaType::MEDIA_TYPE_RADIO_STREAM:
                        $this->_logger->info('Radio control request.');
                        $block = $this->getBlockByRole(IRunnableBlock::ROLE_RADIO_STREAM);
                        $block->run($request, $response);
                        $this->_logger->info('Exiting ...');
                        return;
                    default:
                        throw new \Exception('Unsupported media type [' . $mediaTypeRequest . ']');
                }
            }

            // SALES
            if ($request->isSalesRequest()) {
                $this->_logger->info('Sales request.');
                $block = $this->getBlockByRole(IRunnableBlock::ROLE_SALES_BLOCK);
                try {
                    $block->run($request, $response);
                } catch (EndRequestException $e) {
                    $this->_logger->info('Request terminate signal.');
                } catch (StateChangedException $e) {
                    $this->_logger->info($e->getMessage());
                    $this->_readState($e->getState(), $request, $response);
                }
                $this->_logger->info('Exiting ...');
                return;
            }

            if (is_a($request, '\Convo\Core\Adapters\Alexa\AmazonCommandRequest')) {
                /** @var AmazonCommandRequest $request */
                if ($request->isVoicePinConfirmationRequest()) {
                    $this->_logger->info('Voice PIN Confirmation request.');
                    $block = $this->getBlockByRole(IRunnableBlock::ROLE_VOICE_PIN_CONFIRMATION_BLOCK);
                    try {
                        $block->run($request, $response);
                    } catch (EndRequestException $e) {
                        $this->_logger->info('Request terminate signal.');
                    } catch (StateChangedException $e) {
                        $this->_logger->info($e->getMessage());
                        $this->_readState($e->getState(), $request, $response);
                    }
                    $this->_logger->info('Exiting ...');
                    return;
                }
            }

            // SESSION START
            if ($request->isSessionStart()) {
                // EMPTY REQUEST
                if ($request->isEmpty()) {
                    try {
                        $this->_logger->info('Trying to read role [' . IRunnableBlock::ROLE_SESSION_START . '] ...');
                        $block = $this->getBlockByRole(IRunnableBlock::ROLE_SESSION_START);
                        if (empty($block->getElements())) {
                            if ($block instanceof IPredispatchableBlock) {
                                /* @var IPredispatchableBlock $block */
                                try {
                                    // do predispatch anyways
                                    $this->_logger->info('Doing pre-dispatch on no elements session start ...');
                                    $block->preDispatch($request, $response);
                                    throw new ComponentNotFoundException('Session start block found, but has no elements');
                                } catch (StateChangedException $e) {
                                    $this->_logger->info('State changed in pre-dispatch [' . $e->getState() . ']');
                                    $this->setServiceState($e->getState());
                                    $block = $this->findBlock($e->getState());
                                }
                            }
                        }
                    } catch (ComponentNotFoundException $e) {
                        $this->_logger->info($e->getMessage());
                        $state = $this->_getDefaultState();
                        $this->_logger->info('Going to read an empty launch request wits state [' . $state . '] ...');
                        $this->_readState($state, $request, $response);
                        $this->_checkNextState();
                        $this->_logger->info('Read state done. Exiting ...');
                        return;
                    }

                    $this->_readBlock($block, $request, $response);
                    $this->_checkNextState();
                    $this->_logger->info('Read session start done. Exiting ...');
                    return;
                }

                // NON EMPTY REQUEST
                try {
                    $this->_logger->info('Trying to process role [' . IRunnableBlock::ROLE_SESSION_START . '] ...');
                    $block = $this->getBlockByRole(IRunnableBlock::ROLE_SESSION_START);
                    if (empty($block->getProcessors())) {
                        if ($block instanceof IPredispatchableBlock) {
                            /* @var IPredispatchableBlock $block */
                            try {
                                $this->_logger->info('Doing pre-dispatch on no processors session start ...');
                                // do predispatch anyways
                                $block->preDispatch($request, $response);
                                throw new ComponentNotFoundException('Session start block found, but has no processors');
                            } catch (StateChangedException $e) {
                                $this->_logger->info('State changed in pre-dispatch [' . $e->getState() . ']');
                                $block = $this->findBlock($e->getState());
                            }
                        }
                    }
                } catch (ComponentNotFoundException $e) {
                    $this->_logger->info($e->getMessage());
                    $state = $this->_getDefaultState();
                    $block = $this->findBlock($state);
                }

                // DIRECT INVOCATION
                $this->_logger->info('We have direct invocation in block [' . $block->getComponentId() . '] ...');
            } else {
                // REGULAR CALL
                $state = $this->getServiceState();
                $block = $this->findBlock($state);
                $this->_logger->info('We have regular state [' . $state . '] request');
            }

            // PROCESS
            if ($request->isEmpty()) {
                $this->_readBlock($block, $request, $response);
            } else {
                $this->_processBlock($block, $request, $response);
            }

            $this->_checkNextState();
            $this->_logger->info('Exiting ...');
        } catch (\Throwable $e) {
            /** @phpstan-ignore-next-line */
            $this->_logger->error($e);

            try {
                $error_handler = $this->getBlockByRole(IRunnableBlock::ROLE_ERROR_HANDLER);

                $component_params = $this->getComponentParams(IServiceParamsScope::SCOPE_TYPE_REQUEST, $error_handler);
                $component_params->setServiceParam('error', $e);

                $error_handler->read($request, $response);

                if ($request->getInstallationId() && strpos($request->getInstallationId(), 'admin-chat') !== false) {
                    $this->_logger->info('Running in test view, throwing exception again');
                    throw $e; // test view, throw exception quickfix
                }
            } catch (StateChangedException $sce) {
                $this->_logger->info('State changing is not allowed in error handling, wanted [' . $sce->getMessage() . ']');
                if (strpos($request->getInstallationId(), 'admin-chat') !== false) {
                    $this->_logger->info('Running in test view, throwing exception again');
                    throw $e; // test view, throw exception quickfix
                }
            } catch (ComponentNotFoundException $cnfe) {
                $this->_logger->info($cnfe->getMessage());
                throw $e;
            }
        }
    }

    /**
     * @param IRunnableBlock $block
     * @param IConvoRequest $request
     * @param IConvoResponse $response
     * @throws \Exception
     */
    protected function _processBlock(IRunnableBlock $block, $request, $response)
    {
        $params = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_SESSION);
        $this->setServiceState($block->getComponentId());

        $this->_logger->info('Going to process block [' . $block->getComponentId() . '] with text [' . $request->getText() . ']');
        try {
            $block->run($request, $response);
        } catch (EndRequestException $e) {
            $this->_logger->info('Request terminate signal.');
        } catch (StateChangedException $e) {
            $this->_logger->info('Caught state change [' . $e->getMessage() . ']');
            $params->setServiceParam(self::SERVICE_STATE_PREV_NAME, $block->getComponentId());
            $this->_readState($e->getState(), $request, $response);
        }
    }

    protected function _readState($state, $request, $response)
    {
        $this->setServiceState($state);

        $block = $this->findBlock($state);
        $this->_logger->info('Found block [' . $block->getId() . ']');

        try {
            $block->read($request, $response);
        } catch (EndRequestException $e) {
            $this->_logger->info('Request terminate signal.');
        } catch (StateChangedException $e) {
            $this->_logger->info('Caught state change [' . $e->getMessage() . ']');
            if ($e->getState() === $state) {
                throw new \Exception('Not allowed to call itself again in block [' . $state . ']');
            }
            $params = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_SESSION);
            $params->setServiceParam(self::SERVICE_STATE_PREV_NAME, $block->getComponentId());
            $this->_readState($e->getState(), $request, $response);
        }
    }

    protected function _readBlock(IRunnableBlock $block, $request, $response)
    {
        $this->_logger->info('Reading block [' . $block->getRole() . '][' . $block->getComponentId() . ']');

        try {
            $block->read($request, $response);
        } catch (EndRequestException $e) {
            $this->_logger->info('Request terminate signal.');
        } catch (StateChangedException $e) {
            $this->_logger->info($e->getMessage());
            if ($e->getState() === $block->getComponentId()) {
                throw new \Exception('Not allowed to call itself again in block [' . $block->getComponentId() . ']');
            }
            $this->_readState($e->getState(), $request, $response);
        }
    }

    private function _checkNextState()
    {
        $params = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_SESSION);
        $next = $params->getServiceParam(self::SERVICE_STATE_NEXT_NAME);

        if ($next) {
            $this->_logger->debug('Got next state [' . $next . ']. Will update it.');
            $this->setServiceState($next);
            $params->setServiceParam(self::SERVICE_STATE_PREV_NAME, $params->getServiceParam(self::SERVICE_STATE_NAME));
            $params->setServiceParam(self::SERVICE_STATE_NEXT_NAME, null);
        }

        $this->_logger->debug('Current state log [' . implode(', ', $this->_stateLog) . ']');
    }


    // CONFIG
    public function addConfig($config)
    {
        $this->_configs[] = $config;
    }

    public function findConfig($className)
    {
        foreach ($this->_configs as $config) {
            if (is_a($config, $className)) {
                return $config;
            }
        }

        throw new ComponentNotFoundException('Configuration [' . $className . '] not found');
    }

    // EVAL CONTEXTS

    /**
     * @param IServiceContext $item
     * @throws \Exception
     */
    public function addEvalContext($item)
    {
        $this->_contexts[$item->getId()] = $item;
    }

    /**
     * @param string $contextId
     * @param string $strClass
     * @throws ComponentNotFoundException
     * @return IServiceContext
     */
    public function findContext($contextId, $strClass = null)
    {
        if (isset($this->_contexts[$contextId])) {
            $context = $this->_contexts[$contextId];
            if ($strClass) {
                if (is_a($context, $strClass)) {
                    return $context;
                }
                throw new ComponentNotFoundException('Could not find context [' . $contextId . '] of type [' . $strClass . ']');
            }
            return $context;
        }
        throw new ComponentNotFoundException('Unexisting context [' . $contextId . ']');
    }

    /**
     *
     * @param string|mixed $string
     * @param array $context
     */
    public function evaluateString($string, $context = [])
    {
        if (!\is_string($string) || empty($string)) {
            return $string;
        }
        if (strpos($string, '${') === false) {
            $this->_logger->debug('Nothing to evaluate. Returning raw [' . $string . ']');
            return $string;
        }

        // PAARAMS
        try {
            $context = array_merge($this->_getAllServiceParams(), $context);
        } catch (NoRequestParamsException $e) {
            $this->_logger->debug($e->getMessage());
        }

        // VARIABLES
        $variables = $this->_resolveVariables($this->_variables, 'variables');
        $context = array_merge($variables, $context);

        // SERVER / ENVIRONMENT CONTEXT (POST, GET, etc.)
        $context = array_merge($this->_serverVarsResolver->getEnvironmentContext(), $context);

        // SERVICE CONTEXTS
        $context_map = [];
        foreach ($this->_contexts as $ctx) {
            $context_map[$ctx->getId()] = $ctx;
        }

        $context = array_merge(['contexts' => $context_map], $context);

        // REQUEST
        $objResolver = new ObjectResolver($this->_request);
        $context['request'] = $objResolver;

        $arrResolver = new ArrayResolver($context);
        $resolver = $arrResolver;

        return $this->_trimValueResolvers($this->_eval->evalString($string, $resolver->getValues()));
    }

    private function _trimValueResolvers($data)
    {
        if (is_a($data, '\Zef\Zel\IValueAdapter')) {
            /** @var IValueAdapter $data */
            return $this->_trimValueResolvers($data->get());
        } elseif (is_array($data)) {
            foreach ($data as $key => $val) {
                $data[$key] = $this->_trimValueResolvers($val);
            }
        }

        return $data;
    }


    /**
     * @param string|array $args
     * @param IValueEvaluator $eval
     * @return array
     */
    public function evaluateArgs($args, $eval)
    {
        if (\is_string($args)) {
            return $eval->evaluateString($args);
        }
        // $this->_logger->debug( 'Got raw args ['.print_r( $args, true).']');
        $returnedArgs = [];
        foreach ($args as $key => $val) {
            $key = $eval->evaluateString($key);
            $parsed = $eval->evaluateString($val);

            if (!ArrayUtil::isComplexKey($key)) {
                $returnedArgs[$key] = $parsed;
            } else {
                $root = ArrayUtil::getRootOfKey($key);
                $final = ArrayUtil::setDeepObject($key, $parsed, $returnedArgs[$root] ?? []);
                $returnedArgs[$root] = $final;
            }
        }
        // $this->_logger->debug( 'Got evaluated args ['.print_r( $returnedArgs, true).']');
        return $returnedArgs;
    }

    /**
     * @param IBasicServiceComponent $component
     * @return array
     */
    public function getAllComponentParams(IBasicServiceComponent $component)
    {
        $installation = $this->getComponentParams(IServiceParamsScope::SCOPE_TYPE_INSTALLATION, $component);
        $session = $this->getComponentParams(IServiceParamsScope::SCOPE_TYPE_SESSION, $component);
        $runtime = $this->getComponentParams(IServiceParamsScope::SCOPE_TYPE_REQUEST, $component);
        $user = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_USER);
        return array_merge($installation->getData(), $session->getData(), $runtime->getData(), $user->getData());
    }

    /**
     * @return array
     * @throws NoRequestParamsException
     */
    private function _getAllServiceParams()
    {
        $installation = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_INSTALLATION);
        $session = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_SESSION);
        $runtime = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $user = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_USER);
        return array_merge($installation->getData(), $session->getData(), $runtime->getData(), $user->getData());
    }

    // BLOCKS
    public function addBlock(IRunnableBlock $block)
    {
        $this->_blocks[$block->getComponentId()] = $block;
        $this->addChild($block);
    }

    /**
     * @return IRunnableBlock[]
     */
    public function getBlocks()
    {
        return $this->_blocks;
    }

    /**
     * @param string $state
     * @throws ComponentNotFoundException
     * @return IRunnableBlock
     */
    public function findBlock($state)
    {
        if (isset($this->_blocks[$state])) {
            return $this->_blocks[$state];
        }
        throw new ComponentNotFoundException('Unexisting block [' . $state . ']');
    }

    public function getBlockByRole($role)
    {
        if ($role === IRunnableBlock::ROLE_CONVERSATION_BLOCK) {
            throw new \Exception('Only singleton roles are allowed');
        }

        foreach ($this->_blocks as $block) {
            if ($block->getRole() === $role) {
                return $block;
            }
        }

        throw new ComponentNotFoundException('Block with role [' . $role . '] not found');
    }

    // FRAGMENTS
    public function addFragments(IFragmentComponent $fragment)
    {
        $this->_fragments[$fragment->getName()] = $fragment;
        $this->addChild($fragment);
    }

    public function findFragment($name)
    {
        if (isset($this->_fragments[$name])) {
            return $this->_fragments[$name];
        }
        throw new ComponentNotFoundException('Unexisting fragment [' . $name . ']');
    }

    public function getFragments()
    {
        return $this->_fragments;
    }

    // EXECUTION CONTEXT
    /**
     * @param string $scopeType
     * @throws NoRequestParamsException
     * @throws \Exception
     * @return IServiceParams
     */
    public function getServiceParams($scopeType)
    {
        if (!$this->_request) {
            throw new NoRequestParamsException('Service params can be used only inside service request');
        }
        $scope = new RequestParamsScope($this->_request, $scopeType, IServiceParamsScope::LEVEL_TYPE_SERVICE);
        return $this->_serviceParamsFactory->getServiceParams($scope);
    }

    /**
     * @param string $scopeType
     * @param IBasicServiceComponent $component
     * @throws NoRequestParamsException
     * @throws \Exception
     * @return IServiceParams
     */
    public function getComponentParams($scopeType, $component)
    {
        if (!$this->_request) {
            throw new NoRequestParamsException('Component params can be used only inside service request');
        }
        $scope = new ComponentParamsScope($component, $this->_request, $scopeType);
        return $this->_serviceParamsFactory->getServiceParams($scope);
    }

    /**
     * @throws \Exception
     * @return IConvoRequest
     */
    public function getRequest()
    {
        if (empty($this->_request)) {
            throw new \Exception('Service request not set in [' . $this . ']');
        }
        return $this->_request;
    }

    /**
     * @throws \Exception
     * @return IConvoResponse
     */
    public function getResponse()
    {
        if (empty($this->_response)) {
            throw new \Exception('Service response not set in [' . $this . ']');
        }
        return $this->_response;
    }


    // SERVICE STATES
    public function getServiceState()
    {
        $params = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_SESSION);
        $state = $params->getServiceParam(self::SERVICE_STATE_NAME);
        if (empty($state)) {
            $state = $this->_getDefaultState();
            $this->_logger->debug('Using default state [' . $state . ']');
        }
        return $state;
    }

    public function setServiceState($state)
    {
        $req_params = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_REQUEST);
        $params = $this->getServiceParams(IServiceParamsScope::SCOPE_TYPE_SESSION);
        $old_state = $params->getServiceParam(self::SERVICE_STATE_NAME);
        $params->setServiceParam(self::SERVICE_STATE_NAME, $state);

        if ($old_state === $state) {
            $this->_logger->info('Setting returning true');
            $req_params->setServiceParam('returning', true);
        } else {
            $this->_logger->info('Setting returning false');
            $req_params->setServiceParam('returning', false);
        }

        $this->_stateLog[] = $state;

        if (count($this->_stateLog) >= self::MAX_STATE_CHANGE_COUNT) {
            throw new \Exception('Too much state change [' . implode(', ', $this->_stateLog) . ']. Possible inifnite loop.');
        }
    }

    /**
     * Searches for first regular block
     * @throws ComponentNotFoundException
     * @return string
     */
    private function _getDefaultState()
    {
        foreach ($this->_blocks as $block) {
            if ($block->getRole() !== IRunnableBlock::ROLE_CONVERSATION_BLOCK) {
                continue;
            }

            return $block->getComponentId();
        }

        throw new ComponentNotFoundException('Could not find default block');
    }

    // SERVICE COMPONENT
    public function getService()
    {
        return $this;
    }
    public function setService(ConvoServiceInstance $service)
    {
        throw new \Exception('Not used here');
    }

    public function getParent()
    {
        throw new \Exception('Not used here');
    }

    public function isRoot()
    {
        return true;
    }

    public function setParent(IWorkflowContainerComponent $parent)
    {
        throw new \Exception('Not used here');
    }

    public function getId()
    {
        return $this->getComponentId();
    }

    public function getBlockParams($scopeType)
    {
        throw new \Exception('Not used here');
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IWorkflowContainerComponent::addChild()
     */
    public function addChild(IBasicServiceComponent $child)
    {
        $this->_children[] = $child;
        if (is_a($child, '\Convo\Core\Workflow\IServiceWorkflowComponent')) {
            /** @var IServiceWorkflowComponent $child */

            try {
                $parent = $child->getParent();

                if ($parent !== $this) {
                    $parent->removeChild($child);
                }
            } catch (ComponentNotFoundException $e) {
            } finally {
                $child->setParent($this);
            }
        }

        $child->setService($this);
    }

    public function removeChild(IBasicServiceComponent $child)
    {
        $this->_children = \array_filter($this->_children, function ($c) use ($child) {
            return $c->getId() !== $child->getId();
        });
    }

    /**
     * {@inheritDoc}
     * @see \Convo\Core\Workflow\IWorkflowContainerComponent::getChildren()
     */
    public function getChildren()
    {
        return $this->_children;
    }

    public function getOwner()
    {
    }

    /**
     * @param IConversationElement[] $elements
     * @return IConversationElement[]
     */
    public function spreadElements($elements)
    {
        $spread = [];
        foreach ($elements as $elem) {
            if ($elem instanceof IElementGenerator) {
                $spread = array_merge($spread, iterator_to_array($elem));
            } else {
                $spread[] = $elem;
            }
        }
        return $spread;
    }

    // UTIL
    private function _resolveVariables($variables, $cacheKey)
    {
        if (!isset($this->_resolveCache[$cacheKey])) {
            $variables = $this->_evaluateVariables($variables);

            foreach ($variables as $key => $val) {
                if (!ArrayUtil::isComplexKey($key)) {
                    // old simple setting
                    // $this->_logger->debug( "Parsed [$key][".gettype($val)."][$val]");
                    $variables[$key] = $val;
                } else {
                    $root = ArrayUtil::getRootOfKey($key);
                    $final = ArrayUtil::setDeepObject($key, $val, $variables[$root] ?? []);
                    $variables[$root] = $final;
                }
            }

            $this->_resolveCache[$cacheKey] = $variables;
        }

        return $this->_resolveCache[$cacheKey];
    }

    private function _evaluateVariables($variables)
    {
        $evaluated = [];

        foreach ($variables as $key => $val) {
            $evaluated[$key] = $this->_eval->evalString($val, $evaluated);
        }

        return $evaluated;
    }


    public function __toString()
    {
        return get_class($this) . '[' . $this->_serviceId . ']';
    }
}
