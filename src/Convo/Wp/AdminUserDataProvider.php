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

	public function __construct( \Psr\Log\LoggerInterface $logger)
	{
		$this->_logger		=	$logger;
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
		$args = array(
			'meta_query' => array(
				array(
					'key'     => $this->_generateUserMetaKey($type, $serviceId),
					'value'   => serialize(strval($token)),
					'compare' => 'LIKE'
				),
			)
		);

		$users = get_users($args);

		if (! empty($users)) {
			$user = $users[0];
			$wpUser = get_user_by('ID', $user->ID);
			return new AdminUser($wpUser);
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
		$args = array(
			'meta_query' => array(
				array(
					'key'     => $this->_generateUserMetaKey($type, $serviceId),
					'value'   => serialize(strval($token)),
					'compare' => 'LIKE'
				),
			)
		);

		$users = get_users($args);

		if (! empty($users)) {
			$user = $users[0];
			$wpUser = get_user_by('ID', $user->ID);
			return new AdminUser($wpUser);
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
		$args = array(
			'meta_query' => array(
				array(
					'key'     => $this->_generateUserMetaKey($type, $serviceId),
					'value'   => serialize(strval($code)),
					'compare' => 'LIKE'
				),
			)
		);

		$users = get_users($args);

		if (! empty($users)) {
			$user = $users[0];
			$wpUser = get_user_by('ID', $user->ID);
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
		return get_user_meta($userId, $this->_generateUserMetaKey($type, $serviceId));
	}

	private function _generateUserMetaKey($type, $serviceId) {
		return 'convo_account_linking_' .  str_replace('-', '_', $type) . '_' . str_replace('-', '_', $serviceId);
	}
}