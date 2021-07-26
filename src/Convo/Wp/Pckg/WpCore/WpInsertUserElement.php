<?php


namespace Convo\Wp\Pckg\WpCore;


use Convo\Core\Util\ArrayUtil;
use Convo\Core\Workflow\IConvoRequest;
use Convo\Core\Workflow\IConvoResponse;

class WpInsertUserElement extends \Convo\Core\Workflow\AbstractWorkflowContainerComponent implements \Convo\Core\Workflow\IConversationElement
{

	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onSuccess = array();

	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onFailure = array();

	/**
	 * @var \Convo\Core\Workflow\IConversationElement[]
	 */
	private $_onUserExists = array();

	private $_userInsertionResultName;

	private $_username = '';
	private $_email = '';
	private $_role = '';

	private $_shouldUseCustomRole = false;

	private $_userMetaArgs;

	public function __construct( $properties)
	{
		parent::__construct( $properties);

		foreach ( $properties['on_success'] as $element) {
			$this->_onSuccess[]        =   $element;
			$this->addChild( $element);
		}

		foreach ( $properties['on_failure'] as $element) {
			$this->_onFailure[]        =   $element;
			$this->addChild( $element);
		}

		foreach ( $properties['on_user_exists'] as $element) {
			$this->_onUserExists[]        =   $element;
			$this->addChild( $element);
		}


		$this->_userInsertionResultName =   $properties['created_user_var'];

		$this->_username =   $properties['username'];
		$this->_email =   $properties['email'];
		$this->_shouldUseCustomRole=   $properties['use_custom_role'];
		$this->_role =   $this->_shouldUseCustomRole ? $properties['custom_role'] : $properties['available_wp_roles'];

		$this->_userMetaArgs 	=   $properties['user_meta_input'];
	}

	/**
	 * @param IConvoRequest $request
	 * @param IConvoResponse $response
	 */
	public function read(IConvoRequest $request, IConvoResponse $response)
	{
		$params = $this->getService()->getComponentParams( \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST, $this);
		$name = $this->evaluateString($this->_userInsertionResultName);

		$username = $this->evaluateString($this->_username);
		$email = $this->evaluateString($this->_email);
		$role = $this->_role;
		if ($this->_shouldUseCustomRole) {
			$role = $this->evaluateString($this->_role);
		}

		$user_meta_args = $this->_evaluateArgs($this->_userMetaArgs);

		if (!username_exists($username)) {
			$activationKey = sha1( $email . time() );
			$userArgs = [
				'user_login' => $username,
				'user_email' => $email,
				'user_pass' => wp_generate_password(),
				'user_activation_key' => $activationKey,
				'role' => $role,
			];

			$this->_logger->debug("Args ready to pass to wp_insert_user(" . print_r($userArgs, true) . ")");
			$createdUserResult = wp_insert_user($userArgs);

			if (!is_wp_error($createdUserResult)) {
				$createdUser = get_user_by('ID', $createdUserResult);
				$params->setServiceParam($name, ['user' => $createdUser]);
				$this->_logger->info( 'Inserted new user with id ['.$createdUserResult.']');

				// insert user meta
				if (!empty($user_meta_args)) {
					foreach ($user_meta_args as $metaKey => $metaValue) {
						update_user_meta($createdUserResult, $metaKey, $metaValue);
					}
				}

				foreach ($this->_onSuccess as $element) {
					$element->read( $request, $response);
				}
			} else {
				$params->setServiceParam($name, ['wpError' => $createdUserResult]);
				$this->_logger->info( 'Could not insert new user due to errors ['.print_r($createdUserResult->errors, true).']');
				foreach ($this->_onFailure as $element) {
					$element->read( $request, $response);
				}
			}
		} else {
			$existingUser = get_user_by('login', $username);
			$params->setServiceParam($name, ['user' => $existingUser]);
			$this->_logger->info( 'Getting existing user with ID ['.$existingUser->ID.']');
			foreach ($this->_onUserExists as $element) {
				$element->read( $request, $response);
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