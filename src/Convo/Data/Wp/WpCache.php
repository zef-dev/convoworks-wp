<?php
namespace Convo\Data\Wp;


use Psr\SimpleCache\CacheInterface;

class WpCache implements CacheInterface
{
	/**
	 * Logger
	 *
	 * @var \Psr\Log\LoggerInterface
	 */
	protected $_logger;

	protected $_wpdb;


	public function __construct(\Psr\Log\LoggerInterface $logger, $wpdb)
	{
		$this->_logger =  $logger;
		$this->_wpdb = $wpdb;
	}

	/**
	 * @param string $key
	 * @param mixed|null $default
	 *
	 * @return mixed
	 * @throws \Exception
	 */
	public function get($key, $default = null)
	{
		if (! $this->_isKeyOk($key)) {
			return $default;
		}

		$this->_logger->debug( 'Fetching cached value for ['.$key.'] ...');

		$row = $this->_wpdb->get_row( $this->_checkPrepare(
			$this->_wpdb->prepare("SELECT * FROM {$this->_wpdb->prefix}convo_cache WHERE `key` = '%s'", $key)),
			ARRAY_A
		);

		if ( !$row) {
			$this->_logger->debug( 'Returning empty ...');
			return $default;
		}

		if (time() > $row['expires']) {
			$this->_logger->debug("Item [$key] has expired. Will treat GET as a cache miss.");
			return $default;
		}

		$this->_logger->debug( 'Returning data ['.$row['value'].'] ...');
		return json_decode( $row['value'], true);
	}

	/**
	 * @param string $key
	 * @param mixed $value
	 * @param \DateInterval|int|null $ttl
	 *
	 * @return bool
	 * @throws \Exception
	 */
	public function set($key, $value, $ttl = null)
	{
		if (!$this->_isKeyOk($key)) {
			return false;
		}

		$this->_logger->debug('Storing response [' . $key . '][' . json_encode($value) . ']');

		$now = time();
		$expires = 0;

		if ($ttl) {
			$expires = $now + $ttl;
		}

		$this->_checkError( $ret = $this->_wpdb->query( $this->_checkPrepare( $this->_wpdb->prepare(
			"REPLACE INTO {$this->_wpdb->prefix}convo_cache (`key`, `value`, `time_created`, `expires`) VALUES ('%s', '%s', '%s', '%s')",
			$key,
			json_encode($value, JSON_PRETTY_PRINT),
			$now,
			$expires
		))));

		return $ret;
	}

	/**
	 * @param string $key
	 *
	 * @return bool
	 * @throws \Exception
	 */
	public function delete($key)
	{
		return $this->_wpdb->query(
			$this->_checkPrepare( $this->_wpdb->prepare("
                DELETE FROM `{$this->_wpdb->prefix}convo_cache`
                WHERE `key` = '%s'
            ", $key))
		);
	}

	/**
	 * @return bool
	 */
	public function clear()
	{
		$hasCleared = $this->_wpdb->query("TRUNCATE TABLE `{$this->_wpdb->prefix}convo_cache`");

		$this->_logger->debug("Has Cleared rows [" . $hasCleared . "] .");

		return $hasCleared;
	}

	/**
	 * @param iterable $keys
	 * @param mixed|null $default
	 *
	 * @return iterable
	 * @throws \Exception
	 */
	public function getMultiple($keys, $default = null)
	{
		$ret = [];

		if (! is_array($keys)) {
			return $ret;
		}

		$rows = $this->_wpdb->get_results(
			$this->_checkPrepare( $this->_wpdb->prepare("
                SELECT * FROM {$this->_wpdb->prefix}convo_cache where find_in_set(`key`, %s)'
            ", implode(',', $keys))),
			ARRAY_A
		);

		if (empty($rows)) {
			$this->_logger->debug( 'Returning empty ...');
			return $ret;
		}

		foreach ($rows as $row) {
			if (time() < $row['expires']) {
				array_push($ret, $row['value']);
			}
		}

		$this->_logger->debug( 'Returning data ['.print_r($ret, true).'] ...');

		return $ret;
	}

	/**
	 * @param iterable $values
	 * @param \DateInterval|int|null $ttl
	 *
	 * @return bool
	 * @throws \Exception
	 */
	public function setMultiple($values, $ttl = null)
	{
		$ret = true;

		if (! is_array($values)) {
			return false;
		}

		foreach ($values as $key => $value) {
			$ret = $ret && $this->set($key, $value, $ttl);
		}

		return $ret;
	}

	/**
	 * @param iterable $keys
	 *
	 * @return bool
	 * @throws \Exception
	 */
	public function deleteMultiple($keys)
	{
		if (!is_array($keys)) {
			return false;
		}

		return $this->_wpdb->query(
			$this->_checkPrepare( $this->_wpdb->prepare("
                DELETE FROM {$this->_wpdb->prefix}convo_cache where find_in_set(`key`, %s)'
            ", implode(',', $keys))),
			ARRAY_A
		);
	}

	/**
	 * @param string $key
	 * @return bool
	 */
	public function has($key)
	{
		if (!$this->_isKeyOk($key)) {
			return false;
		}

		$row = $this->_wpdb->get_row(
			$this->_checkPrepare( $this->_wpdb->prepare("
                SELECT `key`, `expires` FROM {$this->_wpdb->prefix}convo_cache WHERE `key` = '%s'
            ", $key)),
			ARRAY_A
		);

		if (! $row) {
			$this->_logger->debug( 'Returning empty ...');
			return false;
		}

		if (time() > $row['expires']) {
			$this->_logger->debug("Item [$key] has expired. Will treat GET as a cache miss.");
			return false;
		}

		return $key === $row['key'];
	}

	private function _isKeyOk($key) {
		$isKeyOk = true;
		$regex = '/[\{\}\(\)\/\\\\@:]/m';

		if (!is_string($key)) {
			return false;
		}

		if (preg_match($regex, $key) === 1) {
			$isKeyOk = false;
		}

		return $isKeyOk;
	}

	// UTIL
	public function __toString()
	{
		return get_class($this);
	}

	// COMMON
	private function _checkError( $ret) {
		if ( $ret === false && $this->_wpdb->last_error) {
			throw new \Exception( $this->_wpdb->last_error);
		}
		return $ret;
	}

	private function _checkPrepare( $ret) {
		if ( is_null( $ret) || empty( $ret)) {
			throw new \Exception( 'Failed to prepare query');
		}
		return $ret;
	}
}