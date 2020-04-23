<?php 

return [
	'configProvider' => DI\create( '\Convo\Data\Filesystem\FilesystemConfigurationProvider')->constructor(
		DI\get('logger'),
		CONVO_CONFIG_PATH
	),
	'convoServiceParamsFactory' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceParamsFactory')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'convoServiceDataProvider' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceDataProvider')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'mediaService' => DI\create( '\Convo\Data\Filesystem\FilesystemMediaService')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'cache' => DI\create( '\Convo\Data\Filesystem\FilesystemCache')->constructor(
		DI\get('logger'),
		CONVO_CACHE_PATH
	),
];

