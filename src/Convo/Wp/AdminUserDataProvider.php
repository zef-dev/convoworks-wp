<?php declare(strict_types=1);

namespace Convo\Wp;

use Convo\Core\DataItemNotFoundException;
use Convo\Core\IAdminUser;
use Convo\Core\IAdminUserDataProvider;

class AdminUserDataProvider implements IAdminUserDataProvider
{
	/**
	 * Logger
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	private $_logger;

	private $_wpdb;

	public function __construct( \Psr\Log\LoggerInterface $logger)
	{
		$this->_logger		=	$logger;

		global $wpdb;

		$this->_wpdb = $wpdb;
	}

	public function findUser($username)
	{
		// try to find  user by username
		$user = get_user_by('login', $username);

		// if not found by username, try by email
		if (! $user) {
			$user = get_user_by('email', $username);
		}

		if (! $user) {
			throw new \Exception( 'User ['.$username.'] not found');
		}

		return new AdminUser($user);
	}

	/**
	 * {@inheritDoc}
	 * @see IAdminUserDataProvider::getPlatformConfig()
	 */
	public function getPlatformConfig($userId)
	{
		$platformConfig = get_user_meta($userId, 'convo_settings', true);

		if (! $platformConfig)
			$platformConfig = [];

		return $platformConfig;
	}

	/**
	 * {@inheritDoc}
	 * @see IAdminUserDataProvider::updatePlatformConfig()
	 */
	public function updatePlatformConfig($userId, $config)
	{
		$existing  =   $this->getPlatformConfig($userId);
		$config    =   array_replace_recursive($existing, $config);

		return update_user_meta($userId, 'convo_settings', $config);
	}

	public function getUsers() {
		$users = get_users(['role__in' => ['administrator']]);

		$allUsers = [];

		if (! empty($users)) {
			foreach ($users as $user) {
				$adjustedUser = [
					'id'		=>	$user->ID,
					'username'	=>	$user->user_login,
					'name'		=>	$user->user_nicename,
					'email'		=>	$user->user_email,
					'password'	=>	''
				];
				$allUsers[] = $adjustedUser;
			}
		}

		return $allUsers;
	}

	/**
	 * @param $token
	 * @param $type
	 *
	 * @param $serviceId
	 *
	 * @return IAdminUser
	 * @throws DataItemNotFoundException
	 */
	public function getUserByAccessToken($token, $type, $serviceId)
	{
		$row = $this->_wpdb->get_row(
			$this->_wpdb->prepare(
				"SELECT * FROM {$this->_wpdb->prefix}convo_oauth WHERE `type` = '%s' AND `service_id` = '%s'",
				$type,
				$serviceId
			),
			ARRAY_A
		);

		if (! empty($row)) {
			if (isset($row['accessToken'])) {
				$data = json_decode($row['accessToken'], true);
				if ($data[$serviceId][$type]['access_token'] === $token) {
					$wpUser = get_user_by('ID', $row['user_id']);
					return new AdminUser($wpUser);
				}
			}
		}

		throw new DataItemNotFoundException('No user with this access token of type ['.$type.']');
	}

	/**
	 * @param $token
	 * @param $type
	 *
	 * @param $serviceId
	 *
	 * @return IAdminUser
	 * @throws DataItemNotFoundException
	 */
	public function getUserByRefreshToken($token, $type, $serviceId)
	{
		$row = $this->_wpdb->get_row(
			$this->_wpdb->prepare(
				"SELECT * FROM {$this->_wpdb->prefix}convo_oauth WHERE `type` = '%s' AND `service_id` = '%s'",
				$token,
				$type,
				$serviceId
			),
			ARRAY_A
		);

		if (! empty($row)) {
			if (isset($row['accessToken'])) {
				$data = json_decode($row['accessToken'], true);
				if ($data[$serviceId][$type]['refresh_token'] === $token) {
					$wpUser = get_user_by('ID', $row['user_id']);
					return new AdminUser($wpUser);
				}
			}
		}

		throw new DataItemNotFoundException('No user with this refresh token of type ['.$type.']');
	}

	/**
	 * @param $code
	 * @param $type
	 * @param $serviceId
	 *
	 * @return AdminUser
	 * @throws DataItemNotFoundException
	 */
	public function getUserByAuthCode($code, $type, $serviceId)
	{
		$row = $this->_wpdb->get_row(
			$this->_wpdb->prepare(
				"SELECT user_id FROM {$this->_wpdb->prefix}convo_oauth WHERE `code` = '%s' AND `type` = '%s' AND `service_id` = '%s'",
				$code,
				$type,
				$serviceId
			),
			ARRAY_A
		);

		if (! empty($row)) {
			$wpUser = get_user_by('id', $row['user_id']);

			return new AdminUser($wpUser);
		}

		throw new DataItemNotFoundException('No user with this code of type ['.$type.'].');
	}

	/**
	 * @param $userId
	 *
	 * @param $type
	 * @param $serviceId
	 *
	 * @return array|object|void
	 * @throws DataItemNotFoundException
	 */
	public function getUserOauth($userId, $type, $serviceId)
	{
		$row = $this->_wpdb->get_row(
			$this->_wpdb->prepare(
				"SELECT * FROM {$this->_wpdb->prefix}convo_oauth WHERE `user_id` = '%s' AND `type` = '%s' AND `service_id` = '%s'",
				$userId,
				$type,
				$serviceId
			),
			ARRAY_A
		);

		if (! empty($row)) {
			return $row;
		}

		return [];
	}
}