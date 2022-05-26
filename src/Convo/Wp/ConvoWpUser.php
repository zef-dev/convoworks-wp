<?php

namespace Convo\Wp;

class ConvoWpUser extends \WP_User
{
	public $nickname;
	public $description;
	public $user_description;
	public $first_name;
	public $user_firstname;
	public $last_name;
	public $user_lastname;
	public $user_login;
	public $user_nicename;
	public $user_email;
	public $user_url;
	public $user_registered;
	public $user_status;
	public $user_level;
	public $display_name;
	public $spam;
	public $deleted;
	public $locale;

	public function __construct(\WP_User $user)
	{
		parent::__construct($user);

		$this->nickname = $this->get('nickname');
		$this->description = $this->get('description');
		$this->user_description = $this->get('user_description');
		$this->first_name = $this->get('first_name');
		$this->user_firstname = $this->get('user_firstname');
		$this->last_name = $this->get('last_name');
		$this->user_lastname = $this->get('user_lastname');
		$this->user_login = $this->get('user_login');
		$this->user_nicename = $this->get('user_nicename');
		$this->user_email = $this->get('user_email');
		$this->user_url = $this->get('user_url');
		$this->user_registered = $this->get('user_registered');
		$this->user_status = $this->get('user_status');
		$this->user_level = $this->get('user_level');
		$this->display_name = $this->get('display_name');
		$this->spam = $this->get('spam');
		$this->deleted = $this->get('deleted');
		$this->locale = $this->get('locale');
	}
}
