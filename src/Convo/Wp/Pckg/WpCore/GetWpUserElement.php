<?php declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Workflow\AbstractWorkflowComponent;
use Convo\Core\Workflow\IConversationElement;

class GetWpUserElement extends AbstractWorkflowComponent implements IConversationElement
{
	const AUTH_CODE_TYPE_AMAZON = 'amazon';
	const AUTH_CODE_TYPE_GOOGLE = 'google';

	private $_name;

	private $_promptForLinking;

	/**
	 * @var \Convo\Wp\AdminUserDataProvider
	 */
	private $_userDao;

	public function __construct($properties, $userDao)
	{
		parent::__construct($properties);

		$this->_name = $properties['name'] ?? 'user';

		$this->_promptForLinking = $properties['prompt_for_linking'] ?? false;

		$this->_userDao = $userDao;
	}

	public function read(\Convo\Core\Workflow\IConvoRequest $request, \Convo\Core\Workflow\IConvoResponse $response)
	{
        $name = $this->evaluateString($this->_name);
        $promptForLinking = $this->evaluateString($this->_promptForLinking);
		$scope_type	= \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST;
		$params = $this->getService()->getServiceParams($scope_type);

		if (is_a($request, '\Convo\Core\Adapters\Alexa\AmazonCommandRequest')) {
			$type = self::AUTH_CODE_TYPE_AMAZON;
		} else if (is_a($request, '\Convo\Core\Adapters\Gactions\ActionsCommandRequest')) {
			$type = self::AUTH_CODE_TYPE_GOOGLE;
		} else {
			$this->_logger->warning('Could not discern type from request.');
			$params->setServiceParam($name, null);
			return;
		}

		try
		{
			$token = $request->getAccessToken();
			$serviceId = $request->getServiceId();
			$this->_logger->debug("Got token from request [$token]");

			if (!$token) {
				throw new \Convo\Core\DataItemNotFoundException("Missing token from request.");
			}

			$user = $this->_userDao->getUserByAccessToken($token, $type, $serviceId);
			$params->setServiceParam($name, get_user_by_email($user->getEmail()));
		}
		catch (\Convo\Core\DataItemNotFoundException $e)
		{
			$this->_logger->warning( $e->getMessage());
			$params->setServiceParam($name, null);

			if ($promptForLinking) {
				if (is_a($request, '\Convo\Core\Adapters\Alexa\AmazonCommandRequest'))
				{
					/** @var \Convo\Core\Adapters\Alexa\AmazonCommandResponse $response */
					$response->promptAccountLinking();
                    $response->setShouldEndSession(true);

                    throw new \Convo\Core\SessionEndedException();
				} else if (is_a($request, '\Convo\Core\Adapters\Gactions\ActionsCommandRequest'))
				{
					/** @var \Convo\Core\Adapters\Google\Gactions\ActionsCommandResponse $response */
					$response->prepareResponse(
						\Convo\Core\Adapters\Google\Common\IResponseType::SIGN_IN_RESPONSE,
						null
					);
                    $response->setShouldEndSession(true);

                    throw new \Convo\Core\SessionEndedException();
				}
			}
		}
	}
}
