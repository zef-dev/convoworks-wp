<?php declare(strict_types=1);

namespace ConvoPlugin\Convo\Wp;

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
		return get_user_meta($userId, 'convo_settings', true);
	}

	/**
	 * {@inheritDoc}
	 * @see IAdminUserDataProvider::updatePlatformConfig()
	 */
	public function updatePlatformConfig($userId, $config)
	{
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
}