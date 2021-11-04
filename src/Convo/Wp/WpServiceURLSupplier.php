<?php


namespace Convo\Wp;


use Convo\Core\IServiceDataProvider;
use Convo\Core\IURLSupplier;
use Convo\Core\Rest\RestSystemUser;
use Convo\Core\IAdminUserDataProvider;

class WpServiceURLSupplier implements IURLSupplier
{
	/**
	 * @var \Psr\Log\LoggerInterface
	 */
	private $_logger;

	/**
	 * @var IServiceDataProvider
	 */
	private $_convoServiceDataProvider;

	/**
	 * @var IAdminUserDataProvider
	 */
	private $_adminUserDataProvider;

	/**
	 * @var string
	 */
	private $_baseUrl;

	public function __construct($logger, $convoServiceDataProvider, $adminUserDataProvider, $baseUrl)
	{
		$this->_logger                      = $logger;
		$this->_convoServiceDataProvider    = $convoServiceDataProvider;
		$this->_adminUserDataProvider    	= $adminUserDataProvider;
		$this->_baseUrl                     = $baseUrl;
	}

	public function getSystemUrls()
	{
		return [
			'amazon' => [
				"allowedReturnUrlForAmazon" => $this->_baseUrl . '/wp-json/convo/v1/public/admin-auth/amazon'
			]
		];
	}

	public function getServiceUrls($serviceId)
	{
		$vendorId = $this->_getVendorId($serviceId);

		return [
			'amazon' => [
				'smallSkillIconUrl' => CONVOWP_URL . 'public/assets/images/convo_default_alexa_small_skill_icon.png',
				'largeSkillIconUrl' => CONVOWP_URL . 'public/assets/images/convo_default_alexa_large_skill_icon.png',
				'termsOfUseUrl' => '',
				'privacyPolicyUrl' => '',
				'accountLinkingModes' => [
					[
						'id' => 'installation',
						'label' => 'Installation',
						'webAuthorizationURI' => $this->_baseUrl . '/login/amazon/' . $serviceId,
						'accessTokenURI' => $this->_baseUrl . '/wp-json/convo/v1/token/amazon/' . $serviceId,
						'domains' => []
					],
					[
						'id' => 'amazon',
						'label' => 'Amazon',
						'webAuthorizationURI' => 'https://www.amazon.com/ap/oa',
						'accessTokenURI' => 'https://api.amazon.com/auth/o2/token',
						'domains' => []
					],
					[
						'id' => 'something_else',
						'label' => 'Something Else',
						'webAuthorizationURI' => '',
						'accessTokenURI' => '',
						'domains' => []
					]
				],
				"allowedReturnUrlsForLoginWithAmazon" => [
					'https://pitangui.amazon.com/api/skill/link/' . $vendorId,
					'https://layla.amazon.com/api/skill/link/' . $vendorId,
					'https://alexa.amazon.co.jp/api/skill/link/' . $vendorId
				]
			]
		];
	}

	/**
	 * @param $serviceId
	 * @return mixed|string
	 * @throws \Convo\Core\DataItemNotFoundException
	 */
	private function _getVendorId($serviceId)
	{
		$restSystemUser = new RestSystemUser();

		$serviceMeta = $this->_convoServiceDataProvider->getServiceMeta($restSystemUser, $serviceId);
		$serviceOwner = $serviceMeta['owner'];
		$userId = $this->_adminUserDataProvider->findUser($serviceOwner)->getId();
		$userPlatformConfig = $this->_adminUserDataProvider->getPlatformConfig(strval($userId));

		return $userPlatformConfig['amazon']['vendor_id'] ?? '';
	}
}
