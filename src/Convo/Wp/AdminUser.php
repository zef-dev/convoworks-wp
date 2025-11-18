<?php

declare(strict_types=1);

namespace Convo\Wp;

use Convo\Core\IAdminUser;
use WP_User;

class AdminUser implements IAdminUser
{
    /**
     * @var WP_User
     */
    private $_wpUser;

    public function __construct(WP_User $user)
    {
        $this->_wpUser = $user;
    }

    public function isSystem()
    {
        return false;
    }

    public function getId()
    {
        return $this->_wpUser->ID;
    }

    public function getUsername()
    {
        return $this->_wpUser->user_login;
    }

    public function getEmail()
    {
        return $this->_wpUser->user_email;
    }

    public function getName()
    {
        return $this->_wpUser->user_nicename;
    }

    public function getPassword()
    {
        return '';
    }

    public function getWpUser()
    {
        return $this->_wpUser;
    }

    public function toArray()
    {
        return [
            'id' => $this->getId(),
            'username' => $this->getUsername(),
            'email' => $this->getEmail(),
            'name' => $this->getName(),
            'wpUser' => $this->getWpUser()
        ];
    }

    public function __toString()
    {
        return get_class($this) . '[' . $this->getId() . '][' . $this->getEmail() . '][' . $this->getName() . ']';
    }
}
