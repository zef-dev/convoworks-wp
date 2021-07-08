<?php

namespace Convo\Wp\Pckg\WpPluginPack;


use Convo\Core\Util\ArrayUtil;
use Convo\Core\Media\Mp3File;
use Convo\Core\Workflow\AbstractMediaSourceContext;

class WpMediaAlbumContext extends AbstractMediaSourceContext
{
	const DEFAULT_MAX_RESULTS       =   100;


	private $_args =   [];

	private $_songsOfAlbum;
	private $_songOfAlbum;

	private $_songUrl;
	private $_songTitle;
	private $_artist;
	private $_artworkUrl;

	private $_backgroundUrl;
	private $_defaultSongImageUrl;

	public function __construct( $properties)
	{
		parent::__construct( $properties);

		$this->_args                    =   $properties['args'];

		$this->_songsOfAlbum            =   $properties['songs_of_album'];
		$this->_songOfAlbum             =   $properties['song_of_album'];

		$this->_songUrl                 =   $properties['song_url'];
		$this->_songTitle               =   $properties['song_title'];
		$this->_artist                  =   $properties['artist'];
		$this->_artworkUrl              =   $properties['artwork_url'];

		$this->_backgroundUrl           =   $properties['background_url'];
		$this->_defaultSongImageUrl     =   $properties['default_song_image_url'];
	}


	// MEDIA
	public function getCount() : int
	{
		$this->getWpQuery();
		$model = $this->_getQueryModel();
		return count($model['playlist']);
	}


	// QUERY
	public function getSongs()
	{
		$query = $this->getWpQuery();
		$query->rewind_posts();

		while ( $query->have_posts()) {
			$query->the_post();
			$post   =   $query->post;
			/** @var $post \WP_Post */
			$songsOfAlbum = $this->_evaluateStringWithPost($this->_songsOfAlbum, $post);
			$songOfAlbum = $this->_evaluateStringWithPost($this->_songOfAlbum, $post);

			if (!empty($songsOfAlbum) && is_array($songsOfAlbum) && !empty($songOfAlbum)) {
				$scope_type	= \Convo\Core\Params\IServiceParamsScope::SCOPE_TYPE_REQUEST;
				$params = $this->getService()->getComponentParams( $scope_type, $this);

				foreach ($songsOfAlbum as $songInAlbum) {
					$params->setServiceParam($songOfAlbum, $songInAlbum);

					$url        =   $this->_evaluateStringWithPost( $this->_evaluateString($this->_songUrl), $post);
					$song_title =   $this->_evaluateStringWithPost( $this->_evaluateString($this->_songTitle), $post);
					$artist     =   $this->_evaluateStringWithPost( $this->_evaluateString($this->_artist), $post);
					$artwork    =   $this->_evaluateStringWithPost( $this->_evaluateString($this->_artworkUrl), $post);
					$background =   $this->_evaluateStringWithPost( $this->_evaluateString($this->_backgroundUrl), $post);

					yield new Mp3File( $url, $song_title, $artist, $artwork, $background);
				}
			}
		}
	}

	private function _evaluateString( $str, $context=[]) {
		$own_params	= $this->getService()->getAllComponentParams( $this);
		return $this->getService()->evaluateString( $str, array_merge( $own_params, $context));
	}

	/**
	 * Evaluates string in service context, with additional "post" placed in evaluation context.
	 * @param string $str
	 * @param \WP_Post $post
	 * @return array|string|mixed
	 */
	private function _evaluateStringWithPost( $str, \WP_Post $post) {
		return $this->getService()->evaluateString( $str, ['post' => $post]);
	}

	/**
	 * @return \WP_Query
	 */
	public function getWpQuery()
	{
		$count 				= 	0;
		$model              =   $this->_getQueryModel();
		$args               =   $this->_evaluateArgs();
		$args_changed       =   $args != $model['arguments'];

		if ( !isset( $this->_wpQuery) || $args_changed)
		{
			if ( $args_changed) {
				$this->_logger->info( 'Arguments changed. SToring them and rewinding results ...');
				$model['arguments']     =   $args;
				$model['post_index']    =   0;
			}

			$this->_wpQuery     =   new \WP_Query( $args);
			$this->_logger->info( 'Got new query with ['.$this->_wpQuery->found_posts.'] results');
			$this->_logger->debug( 'Query data ['.print_r( $this->_wpQuery->request, true).']['.print_r( $args, true).']');

			foreach ( $this->_wpQuery->get_posts() as $post) {
				$songsOfAlbum = $this->_evaluateStringWithPost($this->_songsOfAlbum, $post);
				if (is_array($songsOfAlbum)) {
					$count += count($songsOfAlbum);
				}
			}

			$count_changed = count( $model['playlist']) !== $count;

			if ($count <= 0) {
				$model['playlist'] = [];
			} else if ( $args_changed || $count_changed) {
				if ( $count_changed) {
					$this->_logger->warning( 'Generating playlist because model and query count are different');
				} else {
					$this->_logger->info( 'Generating playlist because arguments were changed');
				}

				$model['playlist'] = range( 0, $count - 1);
				if ( $model['shuffle_status']) {
					$this->_logger->info( 'Shuffling playlist');
					shuffle( $model['playlist']);
				}
			}

			$this->_saveQueryModel($model);
		}

		return $this->_wpQuery;
	}

	protected function _evaluateArgs()
	{
		$args   =   [];
		foreach ( $this->_args as $key => $val)
		{
			$key	=	$this->getService()->evaluateString( $key);
			$parsed =   $this->getService()->evaluateString( $val);

			if ( !ArrayUtil::isComplexKey( $key))
			{
				$args[$key] =   $parsed;
			}
			else
			{
				$root           =   ArrayUtil::getRootOfKey( $key);
				$final          =   ArrayUtil::setDeepObject( $key, $parsed, $args[$root] ?? []);
				$args[$root]    =   $final;
			}
		}

		// DEFAULTS & FORCE
		$args['offset']             =   0;
		$args['paged']              =   true;

		if ( !isset( $args['posts_per_page']) || !is_numeric( $args['posts_per_page'])) {
			$args['posts_per_page']     =   self::DEFAULT_MAX_RESULTS;
		}

		return $args;
	}


	// UTIL
	public function __toString()
	{
		return parent::__toString().'['.json_encode( $this->_args).']';
	}
}
