<?php

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Factory\InvalidComponentDataException;
use Convo\Core\Util\ArrayUtil;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpUpdateUserMetaElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{
	private $_updatedUserVar;

	private $_userId;

	private $_userMetaArgs;

	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onSuccess = array();

	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onFailure = array();

	public function __construct( $properties)
	{
		parent::__construct($properties);

		$this->_updatedUserVar = $properties['updated_user_var'];
		$this->_userId = $properties['user_id'];
		$this->_userMetaArgs = $properties['user_meta_input'];

		foreach ( $properties['on_success'] as $element) {
			$this->_onSuccess[]        =   $element;
			$this->addChild( $element);
		}

		foreach ( $properties['on_failure'] as $element) {
			$this->_onFailure[]        =   $element;
			$this->addChild( $element);
		}
	}

	/**
	 * @param IConvoRequest $request
	 * @param IConvoResponse $response
	 */
	public function read(IConvoRequest $request, IConvoResponse $response)
	{
		$params = $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
		$name = $this->evaluateString($this->_updatedUserVar);
		$userId = $this->evaluateString($this->_userId);

		$user_meta_args = $this->_evaluateArgs($this->_userMetaArgs);

		$userToBeUpdated = get_user_by('ID', $userId);

		if (!$userToBeUpdated) {
			$errorMessage = 'User with ID [' . $userId . '] was not found';

			$params->setServiceParam($name, ['error' => $errorMessage]);
			$this->_logger->info($errorMessage);

			foreach ($this->_onFailure as $element) {
				$element->read( $request, $response);
			}
		} else {
			if (empty($user_meta_args)) {
				throw new InvalidComponentDataException('No meta was provided for the user with ID ['.$userToBeUpdated->ID.']');
			} else {
				foreach ($user_meta_args as $metaKey => $metaValue) {
					update_user_meta($userToBeUpdated->ID, $metaKey, $metaValue);
				}

				$params->setServiceParam($name, ['user' => $userToBeUpdated]);
				$this->_logger->info( 'Updated user meta by id ['.$userToBeUpdated->ID.']');

				foreach ($this->_onSuccess as $element) {
					$element->read( $request, $response);
				}
			}
		}
	}

	private function _evaluateArgs($args)
	{
		// $this->_logger->debug( 'Got raw args ['.print_r( $args, true).']');
		$returnedArgs   =   [];
		foreach ( $args as $key => $val)
		{
			$key	=	$this->getService()->evaluateString( $key);
			$parsed =   $this->getService()->evaluateString( $val);

			if ( !ArrayUtil::isComplexKey( $key))
			{
				$returnedArgs[$key] =   $parsed;
			}
			else
			{
				$root           =   ArrayUtil::getRootOfKey( $key);
				$final          =   ArrayUtil::setDeepObject( $key, $parsed, $returnedArgs[$root] ?? []);
				$returnedArgs[$root]    =   $final;
			}
		}
		// $this->_logger->debug( 'Got evaluated args ['.print_r( $returnedArgs, true).']');
		return $returnedArgs;
	}
}