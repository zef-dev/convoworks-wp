<?php

declare(strict_types=1);

namespace Convo\Core;

/**
 * Installation-level secret storage abstraction.
 *
 * Implementations are responsible for secure at-rest storage
 * and must never expose decrypted values via {@see ISecretStore::all()}.
 */
interface ISecretStore
{
    /**
     * Get the decrypted value for the given secret name.
     *
     * @param string $name
     * @return string|null Decrypted secret value or null if not found.
     */
    public function get(string $name): ?string;

    /**
     * Create or update a secret value.
     *
     * Implementations should store values encrypted at rest and
     * update metadata such as timestamps and user information.
     *
     * @param string   $name      Secret name (case-sensitive, not normalized).
     * @param string   $value     Plaintext value to store (can be empty string).
     * @param bool     $is_secret Whether the value should be treated as secret.
     * @param int|null $user_id   ID of the user performing the change, if known.
     */
    public function set(string $name, string $value, bool $is_secret = true, ?int $user_id = null): void;

    /**
     * Check if a secret with the given name exists.
     */
    public function exists(string $name): bool;

    /**
     * Return all stored secrets metadata.
     *
     * IMPORTANT: Implementations must NOT return decrypted plaintext values.
     * The "value" entry should contain only encrypted or masked data.
     *
     * Expected shape (after decrypting the option container, if any):
     *
     *  [
     *      'OPENAI_KEY' => [
     *          'value'      => '<encrypted-or-masked>',
     *          'is_secret'  => true,
     *          'updated_at' => '2025-11-18T19:00:00Z',
     *          'updated_by' => 3,
     *      ],
     *      // ...
     *  ]
     *
     * @return array<string,array<string,mixed>>
     */
    public function all(): array;
}
