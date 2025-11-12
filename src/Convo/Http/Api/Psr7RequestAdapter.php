<?php

namespace Convo\Http\Api;

use WP_REST_Request;
use GuzzleHttp\Psr7\ServerRequest;
use GuzzleHttp\Psr7\Uri;

class Psr7RequestAdapter
{
    /**
     * Convert a WP_REST_Request to a PSR-7 ServerRequest.
     *
     * @param WP_REST_Request $wpRequest
     * @param \Psr\Http\Message\UriInterface|null $uri Optionally override the URI.
     * @return ServerRequest
     */
    public static function from_wp_rest_request(WP_REST_Request $wpRequest, $uri = null)
    {
        $method = $wpRequest->get_method();
        $route = $wpRequest->get_route();
        $body = $wpRequest->get_body();
        $headers = $wpRequest->get_headers();
        $queryParams = $wpRequest->get_params();
        $attributes = $wpRequest->get_attributes();
        $files = $wpRequest->get_file_params();

        // Build URI
        if ($uri) {
            $psr7Uri = $uri;
        } else {
            // Fallback: try to build from route (not always a full URL)
            $psr7Uri = new Uri($route);
        }

        $request = new ServerRequest($method, $psr7Uri, $headers, $body);

        // Set query params
        if (!empty($queryParams)) {
            $request = $request->withQueryParams($queryParams);
        }

        // Set attributes
        if (!empty($attributes)) {
            foreach ($attributes as $key => $value) {
                $request = $request->withAttribute($key, $value);
            }
        }

        // Convert WP file array to PSR-7 UploadedFile objects
        if (!empty($files)) {
            $uploadedFiles = self::convertFilesToUploadedFiles($files);
            $request = $request->withUploadedFiles($uploadedFiles);
        }

        // Set parsed body if JSON
        $parsedBody = json_decode($body, true);
        if (is_array($parsedBody)) {
            $request = $request->withParsedBody($parsedBody);
        }

        return $request;
    }

    /**
     * Recursively convert a $_FILES-style array to PSR-7 UploadedFile objects.
     *
     * @param array $files
     * @return array
     */
    private static function convertFilesToUploadedFiles(array $files)
    {
        $uploadedFiles = [];
        foreach ($files as $key => $file) {
            if (is_array($file) && isset($file['tmp_name'])) {
                // Single file
                if (is_array($file['tmp_name'])) {
                    // Multiple files with same field name (array of files)
                    $subFiles = [];
                    $numFiles = count($file['tmp_name']);
                    for ($i = 0; $i < $numFiles; $i++) {
                        $subFiles[] = new \GuzzleHttp\Psr7\UploadedFile(
                            $file['tmp_name'][$i],
                            $file['size'][$i],
                            $file['error'][$i],
                            $file['name'][$i],
                            $file['type'][$i]
                        );
                    }
                    $uploadedFiles[$key] = $subFiles;
                } else {
                    // Single file
                    $uploadedFiles[$key] = new \GuzzleHttp\Psr7\UploadedFile(
                        $file['tmp_name'],
                        $file['size'],
                        $file['error'],
                        $file['name'],
                        $file['type']
                    );
                }
            } elseif (is_array($file)) {
                // Nested array (multi-dimensional)
                $uploadedFiles[$key] = self::convertFilesToUploadedFiles($file);
            }
        }
        return $uploadedFiles;
    }
}
