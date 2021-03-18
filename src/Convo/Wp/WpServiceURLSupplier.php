<?php


namespace Convo\Wp;


use Convo\Core\IServiceDataProvider;
use Convo\Core\IURLSupplier;

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
	 * @var string
	 */
	private $_baseUrl;

	public function __construct($logger, $convoServiceDataProvider, $baseUrl)
	{
		$this->_logger                      = $logger;
		$this->_convoServiceDataProvider    = $convoServiceDataProvider;
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
		return [
			'amazon' => [
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
				]
			]
		];
	}
}
