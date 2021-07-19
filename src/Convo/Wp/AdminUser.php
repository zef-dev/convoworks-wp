<?php declare(strict_types=1);

namespace Convo\Wp;


use Convo\Core\IAdminUser;
use WP_User;

class AdminUser implements IAdminUser {

	private $_id;
	private $_username;
	private $_name;
	private $_email;
	private $_password;

	public function __construct(WP_User $user)
	{
		$this->_id			=	$user->ID;
		$this->_username	=	$user->user_login;
		$this->_name		=	$user->user_nicename;
		$this->_email		=	$user->user_email;
		$this->_password	=	''; // what here? WP passwords are encrypted
	}

	public function isSystem() {
		return false;
	}

	public function getId() {
		return $this->_id;
	}

	public function getUsername() {
		return $this->_username;
	}

	public function getEmail() {
		return $this->_email;
	}

	public function getName() {
		return $this->_name;
	}

	public function getPassword() {
		return $this->_password;
	}

	public function getWpUserById($id)
	{
		return get_user_by('id', $id)->to_array();
	}

	public function __toString()
	{
		return get_class( $this).'['.$this->_id.']['.$this->_email.']['.$this->_name.']';
	}

	public function toArray()
	{
		return [
			'id' => $this->_id,
			'username' => $this->_username,
			'email' => $this->_email,
			'name' => $this->_name,
			'wp_user' => $this->getWpUserById($this->_id)
		];
	}
}