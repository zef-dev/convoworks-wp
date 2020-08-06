<?php 

return [
	'convoServiceParamsFactory' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceParamsFactory')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'convoServiceDataProvider' => DI\create( '\Convo\Data\Filesystem\FilesystemServiceDataProvider')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH
	),
	'serviceMediaManager' => DI\create('\Convo\Data\Filesystem\FilesystemServiceMediaManager')->constructor(
		DI\get('logger'),
		CONVO_DATA_PATH,
		CONVO_BASE_URL
	),
	'cache' => DI\create( '\Convo\Data\Filesystem\FilesystemCache')->constructor(
		DI\get('logger'),
		CONVO_CACHE_PATH
	),
];

