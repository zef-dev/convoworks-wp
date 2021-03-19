<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Wp;

use Convo\Core\DataItemNotFoundException;
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
	 * @return mixed
	 * @throws DataItemNotFoundException
	 */
	public function getUserByAccessToken($token, $type, $serviceId)
	{
		$users = $this->getUsers();

		foreach ($users as $user)
		{
			$platformConfig = $this->getPlatformConfig($user['id']);
			if (isset($platformConfig['accessToken'][$serviceId][$type])) {
				if ($platformConfig['accessToken'][$serviceId][$type]['access_token'] === $token) {
					$user['user_id'] = $user['id'];
					return $user;
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
	 * @return mixed
	 * @throws DataItemNotFoundException
	 */
	public function getUserByRefreshToken($token, $type, $serviceId)
	{
		$users = $this->getUsers();

		foreach ($users as $user)
		{
			$platformConfig = $this->getPlatformConfig($user['id']);
			if (isset($platformConfig['accessToken'][$serviceId][$type])) {
				if ($platformConfig['accessToken'][$serviceId][$type]['refresh_token'] === $token) {
					$wpUser = get_user_by('id', $user['id']);
					$user = new AdminUser($wpUser);
					return $user;
				}
			}
		}

		throw new DataItemNotFoundException('No user with this access token of type ['.$type.']');
	}

	public function getUserByAuthCode($code, $type, $serviceId)
	{
		$users = $this->getUsers();

		error_log('get user by auth code');
		error_log('get user by auth code');
		error_log($code);

		foreach ($users as $user)
		{
			$platformConfig = $this->getPlatformConfig($user['id']);
			if (isset($platformConfig['authCode'][$serviceId][$type])) {
				if ($platformConfig['authCode'][$serviceId][$type]['redeemed'] === true) {
					throw new \Exception('Code has been redeemed.');
				}

				if ($platformConfig['authCode'][$serviceId][$type]['code'] === $code) {
					$wpUser = get_user_by('id', $user['id']);
					$user = new AdminUser($wpUser);
					return $user;
				}
			}
		}

		throw new DataItemNotFoundException('No user with this code of type ['.$type.'].');
	}

}