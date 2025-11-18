<?php

namespace Convo\Wp\Data;

use Convo\Core\ISecretStore;
use Psr\Log\LoggerInterface;

/**
 * WordPress-backed implementation of the Convoworks ISecretStore.
 *
 * Secrets are stored in a single wp_option (convoworks_secrets) with autoload = 'no'.
 * Each value is encrypted at rest using either libsodium (preferred) or
 * AES-256-GCM (OpenSSL fallback).
 */
class WpOptionSecretStore implements ISecretStore
{
    /** @var string */
    public const OPTION_NAME = 'convoworks_secrets';

    /** @var LoggerInterface */
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    /** {@inheritDoc} */
    public function get(string $name): ?string
    {
        $data = $this->loadAllRaw();

        if (!isset($data[$name])) {
            return null;
        }

        $entry = $data[$name];

        if (!isset($entry['value']) || $entry['value'] === '') {
            return '';
        }

        try {
            return $this->decryptValue((string) $entry['value']);
        } catch (\Throwable $e) {
            // Never log plaintext; just log the key name and error message.
            $this->logger->error('Failed to decrypt secret [' . $name . ']: ' . $e->getMessage());
            return null;
        }
    }

    /** {@inheritDoc} */
    public function set(string $name, string $value, bool $is_secret = true, ?int $user_id = null): void
    {
        $data = $this->loadAllRaw();

        try {
            $encrypted = $this->encryptValue($value);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to encrypt secret [' . $name . ']: ' . $e->getMessage());
            throw $e;
        }

        $data[$name] = [
            'value' => $encrypted,
            'is_secret' => $is_secret,
            'updated_at' => gmdate('c'),
            'updated_by' => $user_id,
        ];

        $this->saveAllRaw($data);

        // Do not log the value, only the key name.
        $this->logger->info('Secret updated [' . $name . ']');
    }

    /** {@inheritDoc} */
    public function exists(string $name): bool
    {
        $data = $this->loadAllRaw();
        return isset($data[$name]);
    }

    /** {@inheritDoc} */
    public function all(): array
    {
        // Return raw stored data without decrypting values.
        $data = $this->loadAllRaw();

        // Ensure each entry at least exposes the expected keys.
        foreach ($data as $key => &$entry) {
            if (!is_array($entry)) {
                $entry = [];
            }
            if (!array_key_exists('value', $entry)) {
                $entry['value'] = '';
            }
            if (!array_key_exists('is_secret', $entry)) {
                $entry['is_secret'] = true;
            }
            if (!array_key_exists('updated_at', $entry)) {
                $entry['updated_at'] = null;
            }
            if (!array_key_exists('updated_by', $entry)) {
                $entry['updated_by'] = null;
            }
        }
        unset($entry);

        return $data;
    }

    /**
     * Load the raw secrets array from wp_options.
     *
     * @return array<string,array<string,mixed>>
     */
    private function loadAllRaw(): array
    {
        $option = get_option(self::OPTION_NAME, []);

        if (!is_array($option)) {
            return [];
        }

        return $option;
    }

    /**
     * Persist the raw secrets array into wp_options, ensuring autoload = 'no'.
     *
     * @param array<string,array<string,mixed>> $data
     */
    private function saveAllRaw(array $data): void
    {
        // Ensure the option exists with autoload = 'no' on first write.
        if (get_option(self::OPTION_NAME, null) === null) {
            // Suppress value logging; data is already encrypted.
            add_option(self::OPTION_NAME, $data, '', 'no');
            return;
        }

        update_option(self::OPTION_NAME, $data, false);
    }

    /**
     * Encrypt a plaintext value using the configured master key.
     *
     * @param string $plaintext
     * @return string Base64-encoded JSON structure with encryption metadata.
     */
    private function encryptValue(string $plaintext): string
    {
        $keyMaterial = $this->getMasterKey();

        // Prefer libsodium (secretbox), fallback to AES-256-GCM
        if ($this->isSodiumAvailable()) {
            $key = sodium_crypto_generichash($keyMaterial, '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES);
            $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            $ciphertext = sodium_crypto_secretbox($plaintext, $nonce, $key);

            $payload = [
                'algo' => 'sodium-secretbox',
                'nonce' => base64_encode($nonce),
                'ciphertext' => base64_encode($ciphertext),
            ];
        } else {
            $algo = 'aes-256-gcm';
            $ivLength = openssl_cipher_iv_length($algo);
            if ($ivLength === false) {
                throw new \RuntimeException('Unable to determine IV length for ' . $algo);
            }

            $iv = random_bytes($ivLength);
            $tag = '';
            $key = hash('sha256', $keyMaterial, true); // 32-byte key

            $ciphertext = openssl_encrypt($plaintext, $algo, $key, OPENSSL_RAW_DATA, $iv, $tag);
            if ($ciphertext === false) {
                throw new \RuntimeException('openssl_encrypt() failed for ' . $algo);
            }

            $payload = [
                'algo' => $algo,
                'iv' => base64_encode($iv),
                'tag' => base64_encode($tag),
                'ciphertext' => base64_encode($ciphertext),
            ];
        }

        return base64_encode(json_encode($payload));
    }

    /**
     * Decrypt a value previously created by encryptValue().
     *
     * @param string $encoded Base64-encoded JSON structure with metadata.
     * @return string
     */
    private function decryptValue(string $encoded): string
    {
        $json = base64_decode($encoded, true);
        if ($json === false) {
            throw new \RuntimeException('Failed to base64-decode secret payload');
        }

        $payload = json_decode($json, true);
        if (!is_array($payload) || !isset($payload['algo'])) {
            throw new \RuntimeException('Invalid secret payload structure');
        }

        $keyMaterial = $this->getMasterKey();

        if ($payload['algo'] === 'sodium-secretbox' && $this->isSodiumAvailable()) {
            if (!isset($payload['nonce'], $payload['ciphertext'])) {
                throw new \RuntimeException('Invalid sodium payload');
            }

            $key = sodium_crypto_generichash($keyMaterial, '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES);
            $nonce = base64_decode($payload['nonce'], true);
            $ciphertext = base64_decode($payload['ciphertext'], true);

            if ($nonce === false || $ciphertext === false) {
                throw new \RuntimeException('Failed to decode sodium payload components');
            }

            $plaintext = sodium_crypto_secretbox_open($ciphertext, $nonce, $key);
            if ($plaintext === false) {
                throw new \RuntimeException('sodium_crypto_secretbox_open() failed');
            }

            return $plaintext;
        }

        if ($payload['algo'] === 'aes-256-gcm') {
            if (!isset($payload['iv'], $payload['tag'], $payload['ciphertext'])) {
                throw new \RuntimeException('Invalid AES-GCM payload');
            }

            $iv = base64_decode($payload['iv'], true);
            $tag = base64_decode($payload['tag'], true);
            $ciphertext = base64_decode($payload['ciphertext'], true);

            if ($iv === false || $tag === false || $ciphertext === false) {
                throw new \RuntimeException('Failed to decode AES-GCM payload components');
            }

            $key = hash('sha256', $keyMaterial, true);
            $plaintext = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

            if ($plaintext === false) {
                throw new \RuntimeException('openssl_decrypt() failed for aes-256-gcm');
            }

            return $plaintext;
        }

        throw new \RuntimeException('Unsupported encryption algorithm [' . $payload['algo'] . ']');
    }

    /**
     * Retrieve the master key material from configuration.
     *
     * @return string
     */
    private function getMasterKey(): string
    {
        if (!defined('CONVOWORKS_SECRET_KEY')) {
            throw new \RuntimeException('CONVOWORKS_SECRET_KEY is not defined. Cannot use secret store.');
        }

        $key = (string) constant('CONVOWORKS_SECRET_KEY');
        if ($key === '') {
            throw new \RuntimeException('CONVOWORKS_SECRET_KEY is empty.');
        }

        return $key;
    }

    /**
     * Check if libsodium secretbox is available.
     */
    private function isSodiumAvailable(): bool
    {
        return extension_loaded('sodium') && function_exists('sodium_crypto_secretbox');
    }
}
