<?php

declare(strict_types=1);

namespace Convo\Core\Util;

interface IHttpFactory
{
    public const METHOD_OPTIONS = 'OPTIONS';
    public const METHOD_GET = 'GET';
    public const METHOD_HEAD = 'HEAD';
    public const METHOD_POST = 'POST';
    public const METHOD_PUT = 'PUT';
    public const METHOD_DELETE = 'DELETE';
    public const METHOD_TRACE = 'TRACE';
    public const METHOD_CONNECT = 'CONNECT';
    public const METHOD_PATCH = 'PATCH';
    public const METHOD_PROPFIND = 'PROPFIND';

    public const HTTP_STATUS_200 = 200;

    public function getHttpClient(array $config = []): \Psr\Http\Client\ClientInterface;

    public function buildRequest($method, $uri, array $headers = [], $body = null, $version = '1.1'): \Psr\Http\Message\RequestInterface;

    public function buildResponse($data, $status = 200, $headers = []): \Psr\Http\Message\ResponseInterface;

    public function buildUri($url, $queryParams = []): \Psr\Http\Message\UriInterface;
}
