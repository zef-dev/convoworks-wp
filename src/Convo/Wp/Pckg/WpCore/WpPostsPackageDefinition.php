<?php

declare(strict_types=1);

namespace Convo\Wp\Pckg\WpCore;

use Convo\Core\Factory\AbstractPackageDefinition;
use Convo\Core\Factory\IComponentFactory;
use Convo\Core\Workflow\IRunnableBlock;
use Convo\Wp\AdminUserDataProvider;
use Symfony\Component\ExpressionLanguage\ExpressionFunction;

class WpPostsPackageDefinition extends AbstractPackageDefinition
{
    const NAMESPACE = 'convo-wp-core';

	/**
	 * @var \Convo\Core\Factory\PackageProviderFactory
	 */
	private $_packageProviderFactory;

	/**
	 * @var AdminUserDataProvider
	 */
	private $_adminUserDataProvider;

	private $_wpdb;

    public function __construct(\Psr\Log\LoggerInterface $logger, \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory, AdminUserDataProvider $adminUserDataProvider)
    {
		global $wpdb;
        $this->_packageProviderFactory  =   $packageProviderFactory;
        $this->_adminUserDataProvider  =   $adminUserDataProvider;
		$this->_wpdb = $wpdb;

        parent::__construct($logger, self::NAMESPACE, __DIR__);

        $this->registerTemplate( __DIR__ . '/searchable-player.template.json');
        $this->registerTemplate( __DIR__ . '/loop-player.template.json');
        $this->registerTemplate( __DIR__ . '/loop-example.template.json');
        $this->registerTemplate( __DIR__ . '/loop-list.template.json');
    }

    protected function _initIntents()
    {
        return $this->_loadIntents( __DIR__ .'/system-intents.json');
    }

    public function getFunctions()
    {
        $functions = [];

        // CUSTOM
        $functions[] = new ExpressionFunction(
            'get_the_excerpt',
            function ($post = null) {
                return sprintf('get_the_excerpt(%s)', var_export($post, true));
            },
            function($args, $post = null) {
                return get_the_excerpt($post);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_the_post_thumbnail_url',
            function ($post = null, $size = null) {
                return sprintf('get_the_post_thumbnail_url(%s, %s)', var_export($post, true), var_export($size, true));
            },
            function($args, $post = null, $size = null) {
                return get_the_post_thumbnail_url($post, $size);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_the_title',
            function ($post = null) {
                return sprintf('get_the_title(%s)', var_export($post, true));
            },
            function($args, $post = null) {
                return get_the_title($post);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_the_content',
            function ($more_link_text = null, $strip_teaser = false, $post = null) {
                return sprintf('get_the_content(%s, %s, %s)', var_export($more_link_text, true), $strip_teaser ? 'true' : 'false', var_export($post, true));
            },
            function($args, $more_link_text = null, $strip_teaser = false, $post = null) {
                return get_the_content($more_link_text, $strip_teaser, $post);
            }
        );

        $functions[] = new ExpressionFunction(
            'get_the_author',
            function () {
                return 'get_the_author()';
            },
            function( $args) {
                return get_the_author();
            }
        );

        $functions[] = new ExpressionFunction(
            'wp_strip_all_tags',
            function ($string, $removeBreaks = false) {
                return sprintf('wp_strip_all_tags(%s, %s)', var_export($string, true), $removeBreaks ? 'true' : 'false');
            },
            function ($args, $string, $removeBreaks = null) {
                return wp_strip_all_tags($string, $removeBreaks);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_trim_words',
            function ($text, $numWords = 55, $more = null) {
                return sprintf('wp_trim_words(%s, %d, %s)', var_export($text, true), $numWords, var_export($more, true));
            },
            function ($args, $text, $numWords = 55, $more = null) {
                return wp_trim_words($text, $numWords, $more);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_post_meta',
            function ($post_id, $key = '', $single = false) {
                return sprintf('get_post_meta(%d, %s, %s)', $post_id, var_export($key, true), $single ? 'true' : 'false');
            },
            function ($args, $post_id, $key = '', $single = false) {
                return get_post_meta($post_id, $key, $single);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_get_attachment_metadata',
            function ($attachment_id = 0, $unfiltered = false) {
                return sprintf('wp_get_attachment_metadata(%d, %s)', $attachment_id, $unfiltered ? 'true' : 'false');
            },
            function ($args, $attachment_id = 0, $unfiltered = false) {
                return wp_get_attachment_metadata($attachment_id, $unfiltered);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_get_attachment_url',
            function ($attachment_id = 0) {
                return sprintf('wp_get_attachment_url(%d)', $attachment_id);
            },
            function ($args, $attachment_id = 0) {
                return wp_get_attachment_url($attachment_id);
            }
        );

        $functions[] = new ExpressionFunction(
            'wp_get_attachment_image_url',
            function ( $attachment_id, $size='thumbnail', $icon=false) {
                return sprintf( 'wp_get_attachment_image_url(%s, %s, %s)', $attachment_id, $size, var_export($icon, true));
            },
            function( $args, $attachment_id, $size = 'thumbnail', $icon = false ) {
                return wp_get_attachment_image_url( $attachment_id, $size, $icon);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_insert_attachment/
        $functions[] = new ExpressionFunction(
            'wp_insert_attachment',
            function ($args, $file, $parent_post_id = 0, $wp_error = false) {
                return sprintf('wp_insert_attachment(%s, %s, %s, %s)', var_export($args, true), var_export($file, true), var_export($parent_post_id, true), $wp_error ? 'true' : 'false');
            },
            function ($args, $file, $parent_post_id = 0, $wp_error = false) {
                return wp_insert_attachment($args, $file, $parent_post_id, $wp_error);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_update_attachment_metadata/
        $functions[] = new ExpressionFunction(
            'wp_update_attachment_metadata',
            function ($post_id, $data) {
                return sprintf('wp_update_attachment_metadata(%s, %s)', var_export($post_id, true), var_export($data, true));
            },
            function ($args, $post_id, $data) {
                return wp_update_attachment_metadata($post_id, $data);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_delete_attachment/
        $functions[] = new ExpressionFunction(
            'wp_delete_attachment',
            function ($post_id, $force_delete = false) {
                return sprintf('wp_delete_attachment(%s, %s)', var_export($post_id, true), $force_delete ? 'true' : 'false');
            },
            function ($args, $post_id, $force_delete = false) {
                return wp_delete_attachment($post_id, $force_delete);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/has_post_thumbnail/
        $functions[] = new ExpressionFunction(
            'has_post_thumbnail',
            function ($post = null) {
                return sprintf('has_post_thumbnail(%s)', var_export($post, true));
            },
            function ($args, $post = null) {
                return has_post_thumbnail($post);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_read_image_metadata/
        $functions[] = new ExpressionFunction(
            'wp_read_image_metadata',
            function ($file) {
                return sprintf('wp_read_image_metadata(%s)', var_export($file, true));
            },
            function ($args, $file) {
                return wp_read_image_metadata($file);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_post',
            function ( $post_id=0, $output=OBJECT, $filter='raw') {
                return sprintf( 'get_post(%s, %s, %s)', $post_id, var_export($output, true), $filter);
            },
            function( $args, $post = 0, $output = OBJECT, $filter = 'raw' ) {
                return get_post( $post, $output, $filter);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_count_posts/
        $functions[] = new ExpressionFunction(
            'wp_count_posts',
            function ($type = 'post', $perm = '') {
                return sprintf('wp_count_posts(%s, %s)', var_export($type, true), var_export($perm, true));
            },
            function ($args, $type = 'post', $perm = '') {
                return wp_count_posts($type, $perm);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_user_by',
            function ( $field='ID', $value=0) {
                return sprintf( 'get_user_by(%s, %s)', $field, $value);
            },
            function( $args, $field = 'ID', $value = 0 ) {
                return get_user_by( $field, $value);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_user_meta',
            function ( $user_id, $key='', $single=false) {
                return sprintf( 'get_user_meta(%s, %s, %s)', $user_id, $key, var_export($single, true));
            },
            function( $args, $user_id, $key = '', $single = false ) {
                return get_user_meta( $user_id, $key, $single);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_timezone_string',
            function () {
                return 'wp_timezone_string()';
            },
            function($args) {
                return wp_timezone_string();
            }
        );
        
        $functions[] = new ExpressionFunction(
            'get_option',
            function ($name, $default=null) {
                return sprintf('get_option(%s, %s)', $name, var_export($default, true));
            },
            function($args, $name, $default=null) {
                return get_option($name, $default);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'update_option',
            function ($option, $value, $autoload=null) {
                return sprintf('update_option(%s, %s, %s)', $option, var_export($value, true), $autoload ? 'true' : 'false');
            },
            function($args, $option, $value, $autoload=null) {
                return update_option($option, $value, $autoload);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'delete_option',
            function ($option) {
                return sprintf('delete_option(%s)', $option);
            },
            function($args, $option) {
                return delete_option($option);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_get_current_user',
            function () {
                return 'wp_get_current_user()';
            },
            function($args) {
                return wp_get_current_user();
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_delete_post/
        $functions[] = new ExpressionFunction(
            'wp_delete_post',
            function ($postid, $force=false) {
                return sprintf('wp_delete_post(%d, %s)', $postid, $force ? 'true' : 'false');
            },
            function($args, $postid, $force=false) {
                return wp_delete_post($postid, $force);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_trash_post/
        $functions[] = new ExpressionFunction(
            'wp_trash_post',
            function ($postid) {
                return sprintf('wp_trash_post(%d)', $postid);
            },
            function($args, $postid) {
                return wp_trash_post($postid);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wptexturize/
        $functions[] = new ExpressionFunction(
            'wptexturize',
            function ($text, $reset = false) {
                return sprintf('wptexturize(%s, %s)', var_export($text, true), $reset ? 'true' : 'false');
            },
            function ($args, $text, $reset = false) {
                return wptexturize($text, $reset);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wpautop/
        $functions[] = new ExpressionFunction(
            'wpautop',
            function ($text, $br = true) {
                return sprintf('wpautop(%s, %s)', var_export($text, true), $br ? 'true' : 'false');
            },
            function ($args, $text, $br = true) {
                return wpautop($text, $br);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_permalink/
        $functions[] = new ExpressionFunction(
            'get_permalink',
            function ($post=0, $leavename = false) {
                return sprintf('get_permalink(%s, %s)', var_export($post, true), $leavename ? 'true' : 'false');
            },
            function ($args, $post=0, $leavename = false) {
                return get_permalink($post, $leavename);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_template_directory_uri/
        $functions[] = new ExpressionFunction(
            'get_template_directory_uri',
            function () {
                return 'get_template_directory_uri()';
            },
            function ($args) {
                return get_template_directory_uri();
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_current_user_id/
        $functions[] = new ExpressionFunction(
            'get_current_user_id',
            function () {
                return 'get_current_user_id()';
            },
            function ($args) {
                return get_current_user_id();
            }
        );
        
        // https://developer.wordpress.org/reference/functions/current_user_can/
        $functions[] = new ExpressionFunction(
            'current_user_can',
            function ($capability, $args = null) {
                return sprintf('current_user_can(%s, %s)', var_export($capability, true), var_export($args, true));
            },
            function ($args, $capability, $args2 = null) {
                return current_user_can($capability, $args2);
            }
        );
        
        
        // https://developer.wordpress.org/reference/functions/wp_mail/
        $functions[] = new ExpressionFunction(
            'wp_mail',
            function ($to, $subject, $message, $headers = '', $attachments = array()) {
                return sprintf('wp_mail(%s, %s, %s, %s, %s)', var_export($to, true), var_export($subject, true), var_export($message, true), var_export($headers, true), var_export($attachments, true));
            },
            function ($args, $to, $subject, $message, $headers = '', $attachments = array()) {
                return wp_mail($to, $subject, $message, $headers, $attachments);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_site_url/
        $functions[] = new ExpressionFunction(
            'get_site_url',
            function ($blogId = null, $path = '', $scheme = null) {
                return sprintf('get_site_url(%s, %s, %s)', var_export($blogId, true), var_export($path, true), var_export($scheme, true));
            },
            function ($args, $blogId = null, $path = '', $scheme = null) {
                return get_site_url($blogId, $path, $scheme);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_posts/
        $functions[] = new ExpressionFunction(
            'get_posts',
            function ($postArgs = null) {
                return sprintf('get_posts(%s)', var_export($postArgs, true));
            },
            function ($args, $postArgs = null) {
                return get_posts($postArgs);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_insert_post/
        $functions[] = new ExpressionFunction(
            'wp_insert_post',
            function ($postarr, $wp_error = false) {
                return sprintf('wp_insert_post(%s, %s)', var_export($postarr, true), $wp_error ? 'true' : 'false');
            },
            function ($args, $postarr, $wp_error = false) {
                return wp_insert_post($postarr, $wp_error);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/update_post_meta/
        $functions[] = new ExpressionFunction(
            'update_post_meta',
            function ($post_id, $meta_key, $meta_value, $prev_value = '') {
                return sprintf('update_post_meta(%s, %s, %s, %s)', var_export($post_id, true), var_export($meta_key, true), var_export($meta_value, true), var_export($prev_value, true));
            },
            function ($args, $post_id, $meta_key, $meta_value, $prev_value = '') {
                return update_post_meta($post_id, $meta_key, $meta_value, $prev_value);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_set_object_terms/
        $functions[] = new ExpressionFunction(
            'wp_set_object_terms',
            function ($object_id, $terms, $taxonomy, $append = false) {
                return sprintf(
                    'wp_set_object_terms(%s, %s, %s, %s)',
                    var_export($object_id, true),
                    var_export($terms, true),
                    var_export($taxonomy, true),
                    $append ? 'true' : 'false'
                    );
            },
            function ($args, $object_id, $terms, $taxonomy, $append = false) {
                return wp_set_object_terms($object_id, $terms, $taxonomy, $append);
            }
        );
    
        // https://developer.wordpress.org/reference/functions/get_term_by/
        $functions[] = new ExpressionFunction(
            'get_term_by',
            function ($field, $value, $taxonomy = '', $output = OBJECT, $filter = 'raw') {
                return sprintf('get_term_by(%s, %s, %s, %s, %s)', var_export($field, true), var_export($value, true), var_export($taxonomy, true), var_export($output, true), var_export($filter, true));
            },
            function ($args, $field, $value, $taxonomy = '', $output = OBJECT, $filter = 'raw') {
                return get_term_by($field, $value, $taxonomy, $output, $filter);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_insert_term/
        $functions[] = new ExpressionFunction(
            'wp_insert_term',
            function ($term, $taxonomy, $args = array()) {
                return sprintf('wp_insert_term(%s, %s, %s)', var_export($term, true), var_export($taxonomy, true), var_export($args, true));
            },
            function ($elargs, $term, $taxonomy, $args = array()) {
                return wp_insert_term($term, $taxonomy, $args);
            }
        );
    
        
        // https://developer.wordpress.org/reference/functions/wp_hash/
        $functions[] = new ExpressionFunction(
            'wp_hash',
            function ($data, $scheme = 'auth') {
                return sprintf('wp_hash(%s, %s)', var_export($data, true), var_export($scheme, true));
            },
            function ($args, $data, $scheme = 'auth') {
                return wp_hash($data, $scheme);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_salt/
        $functions[] = new ExpressionFunction(
            'wp_salt',
            function ($scheme = 'auth') {
                return sprintf('wp_salt(%s)', var_export($scheme, true));
            },
            function ($args, $scheme = 'auth') {
                return wp_salt($scheme);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/wp_generate_password/
        $functions[] = new ExpressionFunction(
            'wp_generate_password',
            function ($length = 12, $special_chars = true, $extra_special_chars = false) {
                return sprintf('wp_generate_password(%s, %s, %s)', var_export($length, true), $special_chars ? 'true' : 'false', $extra_special_chars ? 'true' : 'false');
            },
            function ($args, $length = 12, $special_chars = true, $extra_special_chars = false) {
                return wp_generate_password($length, $special_chars, $extra_special_chars);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_post_type/
        $functions[] = new ExpressionFunction(
            'get_post_type',
            function ($post = null) {
                return sprintf('get_post_type(%s)', var_export($post, true));
            },
            function ($args, $post = null) {
                return get_post_type($post);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_post_types/
        $functions[] = new ExpressionFunction(
            'get_post_types',
            function ($args = array(), $output = 'names', $operator = 'and') {
                return sprintf('get_post_types(%s, %s, %s)', var_export($args, true), var_export($output, true), var_export($operator, true));
            },
            function ($args, $argsArr = array(), $output = 'names', $operator = 'and') {
                return get_post_types($argsArr, $output, $operator);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/home_url/
        $functions[] = new ExpressionFunction(
            'home_url',
            function ($path = '', $scheme = null) {
                return sprintf('home_url(%s, %s)', var_export($path, true), var_export($scheme, true));
            },
            function ($args, $path = '', $scheme = null) {
                return home_url($path, $scheme);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/is_product_category/
        $functions[] = new ExpressionFunction(
            'is_product_category',
            function ($category = '') {
                return sprintf('is_product_category(%s)', var_export($category, true));
            },
            function ($args, $category = '') {
                return is_product_category($category);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_queried_object/
        $functions[] = new ExpressionFunction(
            'get_queried_object',
            function () {
                return 'get_queried_object()';
            },
            function ($args) {
                return get_queried_object();
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_term_children/
        $functions[] = new ExpressionFunction(
            'get_term_children',
            function ($term_id, $taxonomy) {
                return sprintf('get_term_children(%s, %s)', var_export($term_id, true), var_export($taxonomy, true));
            },
            function ($args, $term_id, $taxonomy) {
                return get_term_children($term_id, $taxonomy);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_plugins/
        $functions[] = new ExpressionFunction(
            'get_plugins',
            function ($plugin_folder = '') {
                return sprintf('get_plugins(%s)', var_export($plugin_folder, true));
            },
            function ($args, $plugin_folder = '') {
                
                $func_name = 'get_plugins';
                if ( !function_exists( $func_name)) {
                    require_once 'wp-admin/includes/plugin.php';
                }
                
                return call_user_func( $func_name, $plugin_folder);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_site_transient/
        $functions[] = new ExpressionFunction(
            'get_site_transient',
            function ($transient) {
                return sprintf('get_site_transient(%s)', var_export($transient, true));
            },
            function ($args, $transient) {
                return get_site_transient($transient);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/delete_site_transient/
        $functions[] = new ExpressionFunction(
            'delete_site_transient',
            function ($transient) {
                return sprintf('delete_site_transient(%s)', var_export($transient, true));
            },
            function ($args, $transient) {
                return delete_site_transient($transient);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/set_transient/
        $functions[] = new ExpressionFunction(
            'set_transient',
            function ($transient, $value, $expiration = 0) {
                return sprintf('set_transient(%s, %s, %s)', var_export($transient, true), var_export($value, true), var_export($expiration, true));
            },
            function ($args, $transient, $value, $expiration = 0) {
                return set_transient($transient, $value, $expiration);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/get_page_by_path/
        $functions[] = new ExpressionFunction(
            'get_page_by_path',
            function ($page_path, $output = OBJECT, $post_type = 'page') {
                return sprintf('get_page_by_path(%s, %s, %s)', var_export($page_path, true), var_export($output, true), var_export($post_type, true));
            },
            function ($args, $page_path, $output = OBJECT, $post_type = 'page') {
                return get_page_by_path($page_path, $output, $post_type);
            }
        );
        
        // https://developer.wordpress.org/reference/functions/is_wp_error/
        $functions[] = new ExpressionFunction(
            'is_wp_error',
            function ($thing) {
                return sprintf('is_wp_error(%s)', var_export($thing, true));
            },
            function ($args, $thing) {
                return is_wp_error($thing);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_call_user_func',
            function ($callback, $parameter = []) {
                return sprintf('wp_call_user_func(%s, %s)', var_export($callback, true), var_export($parameter, true));
            },
            function ($args, $callback, $parameter = []) {
                
                if ( !function_exists( $callback)) {
                    require_once( ABSPATH . 'wp-admin/includes/media.php');
                    require_once( ABSPATH . 'wp-admin/includes/file.php');
                    require_once( ABSPATH . 'wp-admin/includes/image.php');
                    require_once( ABSPATH . 'wp-admin/includes/update.php');
                    require_once( ABSPATH . 'wp-admin/includes/taxonomy.php');
                    require_once( ABSPATH . 'wp-admin/includes/plugin.php');
                }
                if ( !function_exists( $callback)) {
                    throw new \Exception( 'Function "'.$callback.'" does not exists.');
                }
                
                if ( is_null( $parameter) || ( is_array( $parameter) && empty( $parameter))) {
                    return call_user_func($callback);
                }
                
                if ( !is_array( $parameter) || !isset( $parameter[0])) {
                    $this->_logger->debug( 'Wrapping up param ['.gettype( $parameter).'] as array');
                    $parameter = [$parameter];
                }
                return call_user_func($callback, ...$parameter);
            }
        );
        
        $functions[] = new ExpressionFunction(
            'wp_call_user_func_array',
            function ($callback, $parameter = []) {
                return sprintf('wp_call_user_func_array(%s, %s)', var_export($callback, true), var_export($parameter, true));
            },
            function ($args, $callback, $parameter = []) {
                
                if ( strpos( $callback, 'wpdb::') === 0) {
                    global $wpdb;
                    $callback = str_replace( 'wpdb::', '', $callback);
                    
                    if ( !method_exists( $wpdb, $callback)) {
                        throw new \Exception( 'Method "'.$callback.'" does not exists on the [wpdb].');
                    }
                    
                    return call_user_func_array( [$wpdb, $callback], $parameter);
                }
                
                if ( !function_exists( $callback)) {
                    require_once( ABSPATH . 'wp-admin/includes/media.php');
                    require_once( ABSPATH . 'wp-admin/includes/file.php');
                    require_once( ABSPATH . 'wp-admin/includes/image.php');
                    require_once( ABSPATH . 'wp-admin/includes/update.php');
                    require_once( ABSPATH . 'wp-admin/includes/taxonomy.php');
                    require_once( ABSPATH . 'wp-admin/includes/plugin.php');
                }
                
                if ( !function_exists( $callback)) {
                    throw new \Exception( 'Function "'.$callback.'" does not exists.');
                }
                if ( empty( $parameter)) {
                    $parameter = [];
                }
                return call_user_func_array( $callback, $parameter);
            }
        );
    
        return $functions;
    }

    protected function _initDefintions()
    {
        $CONTEXT_ID =   [
            'editor_type' => 'context_id',
            'editor_properties' => array(),
            'defaultValue' => '',
            'name' => 'Source',
            'description' => 'Referenced WP Query Context (id)',
            'valueType' => 'string'
        ];

        $PAGE_INFO  =   [
            'editor_type' => 'text',
            'editor_properties' => array(),
            'defaultValue' => 'page_info',
            'name' => 'Page info var',
            'description' => 'Variable name under which to provide search results page info',
            'valueType' => 'string'
        ];

        $POST_INFO  =   [
            'editor_type' => 'text',
            'editor_properties' => array(),
            'defaultValue' => 'post_info',
            'name' => 'Post info var',
            'description' => 'Variable name under which to provide current post info',
            'valueType' => 'string'
        ];


        return [
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpCore\WpQueryElement',
                'WP Query Element',
                'Allows simple access to the WP Query Context results',
                array(
                    'context_id' => $CONTEXT_ID,
                    'page_info_var' => $PAGE_INFO,
                    'has_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'Has results',
                        'description' => 'Executed if there are results',
                        'valueType' => 'class'
                    ],
                    'no_results' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'No results',
                        'description' => 'Executed if there are no results',
                        'valueType' => 'class'
                    ],
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'WP_Query from <b>{{ component.properties.context_id }}</b>' .
                        '</div>'
                    ),
                    '_workflow' => 'read',
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-query-element.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpCore\WpDbElement',
                'WP DB Element',
                'Perform an operation directly on the WP Database',
                [
                    'action' => [
                        'editor_type' => 'select',
                        'editor_properties' => [
                            'options' => ['select' => 'Select', 'insert' => 'Insert', 'update' => 'Update', 'delete' => 'Delete', 'replace' => 'Replace', 'query' => 'Custom query'],
                            'multiple' => false
                        ],
                        'defaultValue' => 'select',
                        'name' => 'Action',
                        'description' => 'Which action to take on the table.',
                        'valueType' => 'string'
                    ],
                    'table_name' => [
                        'editor_type' => 'text',
                        'editor_properties' => [
                            'dependency' => 'component.properties.action !== "select" && component.properties.action !== "query"'
                        ],
                        'defaultValue' => null,
                        'name' => 'Table name',
                        'description' => 'Actual name of the table you wish to access',
                        'valueType' => 'string'
                    ],
                    'query' => [
                        'editor_type' => 'desc',
                        'editor_properties' => [
                            'dependency' => 'component.properties.action === "select" || component.properties.action === "query"'
                        ],
                        'defaultValue' => null,
                        'name' => 'Query',
                        'description' => 'Query to run',
                        'valueType' => 'string'
                    ],
                    'last_result_name' => [
                        'editor_type' => 'text',
                        'editor_properties' => [],
                        'defaultValue' => 'last_result',
                        'name' => 'Last Result Name',
                        'description' => 'Name under which to store last query results in the service parameters.',
                        'valueType' => 'string'
                    ],
                    'insert_id_name' => [
                        'editor_type' => 'text',
                        'editor_properties' => [
                            'dependency' => 'component.properties.action === "insert" || component.properties.action === "replace"'
                        ],
                        'defaultValue' => 'insert_id',
                        'name' => 'Insert ID Name',
                        'description' => 'Name under which to store the auto incremented insert ID from the last Insert operation.',
                        'valueType' => 'string'
                    ],
                    'data' => [
                        'editor_type' => 'params',
                        'editor_properties' => [
                            'multiple' => true,
                            'dependency' => 'component.properties.action === "insert" || component.properties.action === "update" || component.properties.action === "replace"'
                        ],
                        'defaultValue' => null,
                        'name' => 'Data',
                        'description' => 'Key-value pairs of data you wish to insert, update, replace, etc.',
                        'valueType' => 'array'
                    ],
                    'format' => [
                        'editor_type' => 'text',
                        'editor_properties' => [
                            'dependency' => 'component.properties.action === "insert" || component.properties.action === "update" || component.properties.action === "replace"'
                        ],
                        'defaultValue' => null,
                        'name' => 'Formatting options',
                        'description' => 'For each data value, set corresponding formatting option. Use %s to format as string, %d as integer (whole number), and %f as float. Separate values with semicolon (;).',
                        'valueType' => 'string'
                    ],
                    'where' => [
                        'editor_type' => 'params',
                        'editor_properties' => [
                            'multiple' => true,
                            'dependency' => 'component.properties.action === "update" || component.properties.action === "delete" || component.properties.action === "replace"'
                        ],
                        'defaultValue' => null,
                        'name' => 'Where',
                        'description' => 'Key-value pairs of "where" confitions for replacing, deleting, etc.',
                        'valueType' => 'array'
                    ],
                    'where_format' => [
                        'editor_type' => 'text',
                        'editor_properties' => [
                            'dependency' => 'component.properties.action === "update" || component.properties.action === "delete" || component.properties.action === "replace"'
                        ],
                        'defaultValue' => null,
                        'name' => 'Where formatting options',
                        'description' => 'For each "where" value, set corresponding formatting option. Use %s to format as string, %d as integer (whole number), and %f as float. Separate values with semicolon (;).',
                        'valueType' => 'string'
                    ],
                    'ok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'OK',
                        'description' => 'Elements to be read if query succeeds',
                        'valueType' => 'class'
                    ],
                    'nok' => [
                        'editor_type' => 'service_components',
                        'editor_properties' => [
                            'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
                            'multiple' => true
                        ],
                        'defaultValue' => [],
                        'name' => 'NOK',
                        'description' => 'Elements to be read if query fails',
                        'valueType' => 'class'
                    ],
                    '_preview_angular' => [
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        '<p ng-if="component.properties.action !== \'select\' && component.properties.action !== \'query\'">' .
                        '<b><span class="statement">PERFORM {{ component.properties.action.toUpperCase() }}</span></b> on table <b>{{ component.properties.table_name }}</b>' .
                        '</p>' .
                        '<span ng-if="component.properties.action === \'insert\'">' .
                        '<span>{{ component.properties.action.toUpperCase() }} INTO {{ component.properties.table_name }} (<span ng-repeat="(key, obj) in component.properties.data">{{$last ? key : key + ", "}}</span>) <span>VALUES</span> (<span ng-repeat="(key, obj) in component.properties.data">{{$last ? obj : obj + ", "}}</span>)</span>' .
                        '</span>' .
                        '<span ng-if="component.properties.action === \'update\'">' .
                        '<span>{{ component.properties.action.toUpperCase() }} {{ component.properties.table_name }} SET (<span ng-repeat="(key, obj) in component.properties.data">{{$last ? key + " = " + obj : key + " = " + obj  + ", "}}</span>) <span>WHERE</span> <span ng-repeat="(key, obj) in component.properties.where">{{$last ? key + " = " + obj : key + " = " + obj  + " AND "}}</span> </span>' .
                        '</span>' .
                        '<span ng-if="component.properties.action === \'delete\'">' .
                        '<span>{{ component.properties.action.toUpperCase() }} FROM {{ component.properties.table_name }} WHERE <span ng-repeat="(key, obj) in component.properties.where">{{$last ? key + " = " + obj : key + " = " + obj  + " AND "}}</span></span>' .
                        '</span>' .
                        '<span ng-if="component.properties.action === \'replace\'">' .
                        '<span>{{ component.properties.action.toUpperCase() }} INTO {{ component.properties.table_name }} (<span ng-repeat="(key, obj) in component.properties.data">{{$last ? key : key + ", "}}</span>) <span>VALUES</span> (<span ng-repeat="(key, obj) in component.properties.data">{{$last ? obj : obj + ", "}}</span>)</span>' .
                        '</span>' .
                        '<span ng-if="component.properties.action === \'select\' || component.properties.action === \'query\'">' .
                        '<p ng-if="component.properties.action === \'select\'"><b><span class="statement">EXECUTE SELECT</code></b> on DB</p>' .
                        '<p ng-if="component.properties.action === \'query\'"><b><span class="statement">EXECUTE QUERY</code></b> on DB</p>' .
                        '<span ng-if="component.properties.query">{{ component.properties.query }}</span>' .
                        '</span>' .
                        '</div>'
                    ],
                    '_workflow' => 'read',
                    '_help' => [
                        'type' => 'file'
                    ],
					'_factory' => new class ($this->_wpdb) implements \Convo\Core\Factory\IComponentFactory
					{
						private $_wpdb;
						public function __construct( $wpdb)
						{
							$this->_wpdb = $wpdb;
						}
						public function createComponent($properties, $service)
						{
							return new WpDbElement($properties, $this->_wpdb);
						}
					}
                ]
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpCore\WpLoopElement',
                'WP Loop Element',
                'Allows simple looping over WP_Query results provided by the WP Query Context component (loop over single results page)',
                array(
                    'context_id' => $CONTEXT_ID,
                    'single_post_info_var' => $POST_INFO,
                    'each_post' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Each post',
                        'description' => 'Elements to be executed for each post from result',
                        'valueType' => 'class'
                    ),
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        'Loop over <b>{{ component.properties.context_id }}</b> WP Query Context results' .
                        '</div>'
                    ),
                    '_workflow' => 'read',
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-loop-element.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpCore\WpLoopPageBlock',
                'WP Loop Page Block',
                'Loop over WP_Query results with a built in pagination and selection support',
                array(
                    'role' => array(
                        'defaultValue' => IRunnableBlock::ROLE_CONVERSATION_BLOCK
                    ),
                    'block_id' => array(
                        'editor_type' => 'block_id',
                        'editor_properties' => array(),
                        'defaultValue' => 'new-block-id',
                        'name' => 'Block ID',
                        'description' => 'Unique string identificator',
                        'valueType' => 'string'
                    ),
                    'name' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'Loop page block',
                        'name' => 'Block name',
                        'description' => 'A user friendly name for the block',
                        'valueType' => 'string'
                    ),
                    'context_id' => $CONTEXT_ID,
                    'page_info_var' => $PAGE_INFO,
                    'single_post_info_var' => $POST_INFO,
                    'elements' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Page info phase',
                        'description' => 'Initial elements to read upon results page change or landing to this step',
                        'valueType' => 'class'
                    ),
                    'each_post' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Each post',
                        'description' => 'Elements to be executed for each post on page',
                        'valueType' => 'class'
                    ),
                    'after_loop' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'After loop',
                        'description' => 'Elements to be executed after the posts loop is done',
                        'valueType' => 'class',
                        '_separate' => true
                    ),
                    'post_selected' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Post selected flow',
                        'description' => 'Elements to be executed when user selected post',
                        'valueType' => 'class'
                    ),
                    'processors' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationProcessor'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Process phase',
                        'description' => 'Other processors to be executed in process phase. E.g. help, repeat ... This procoessors will not trigger loop iteration.',
                        'valueType' => 'class'
                    ),
                    'no_selected' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Selected not avilable',
                        'description' => 'Elements to be read if selected post is not available (e.g. select 5th post but you have only 3 posts)',
                        'valueType' => 'class'
                    ),
                    'no_next' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Next not avilable',
                        'description' => 'Elements to be read if next page is requested but not available',
                        'valueType' => 'class'
                    ),
                    'no_previous' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Previous not avilable',
                        'description' => 'Elements to be read if previous page is requested but not available',
                        'valueType' => 'class'
                    ),
                    'fallback' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Fallback',
                        'description' => 'Elements to be read if none of the processors match',
                        'valueType' => 'class'
                    ),
                    '_workflow' => 'read',
                    '_system' => true,
                    '_factory' => new class ( $this->_packageProviderFactory) implements \Convo\Core\Factory\IComponentFactory
                    {
                        private $_packageProviderFactory;
                        public function __construct( \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
                        {
                            $this->_packageProviderFactory	=	$packageProviderFactory;
                        }
                        public function createComponent( $properties, $service)
                        {
                            return new \Convo\Wp\Pckg\WpCore\WpLoopPageBlock( $properties, $service, $this->_packageProviderFactory);
                        }
                    },
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-loop-page-block.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpCore\WpLoopPostBlock',
                'WP Loop Post Block',
                'Selected post from the WP Loop Context',
                array(
                    'role' => array(
                        'defaultValue' => IRunnableBlock::ROLE_CONVERSATION_BLOCK
                    ),
                    'block_id' => array(
                        'editor_type' => 'block_id',
                        'editor_properties' => array(),
                        'defaultValue' => 'new-block-id',
                        'name' => 'Block ID',
                        'description' => 'Unique string identificator',
                        'valueType' => 'string'
                    ),
                    'name' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'New block',
                        'name' => 'Block name',
                        'description' => 'A user friendly name for the block',
                        'valueType' => 'string'
                    ),
                    'context_id' => $CONTEXT_ID,
                    'page_info_var' => $PAGE_INFO,
                    'single_post_info_var' => $POST_INFO,
                    'elements' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Read post',
                        'description' => 'Elements to read upon post selection change or initial landing to this step',
                        'valueType' => 'class',
                        '_separate' => true
                    ),
                    'processors' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationProcessor'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Process phase',
                        'description' => 'Other processors to be executed in process phase. E.g. help, repeat ... This procoessors will not trigger any loop iteration.',
                        'valueType' => 'class'
                    ),
                    'no_next' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Next not avilable',
                        'description' => 'Elements to be read if next post is requested but not available',
                        'valueType' => 'class'
                    ),
                    'no_previous' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Previous not avilable',
                        'description' => 'Elements to be read if previous post is requested but not available',
                        'valueType' => 'class'
                    ),
                    'fallback' => array(
                        'editor_type' => 'service_components',
                        'editor_properties' => array(
                            'allow_interfaces' => array('\Convo\Core\Workflow\IConversationElement'),
                            'multiple' => true
                        ),
                        'defaultValue' => array(),
                        'name' => 'Fallback',
                        'description' => 'Elements to be read if none of the processors match',
                        'valueType' => 'class'
                    ),
                    '_workflow' => 'read',
                    '_system' => true,
                    '_factory' => new class ( $this->_packageProviderFactory) implements \Convo\Core\Factory\IComponentFactory
                    {
                        private $_packageProviderFactory;
                        public function __construct( \Convo\Core\Factory\PackageProviderFactory $packageProviderFactory)
                        {
                            $this->_packageProviderFactory	=	$packageProviderFactory;
                        }
                        public function createComponent( $properties, $service)
                        {
                            return new \Convo\Wp\Pckg\WpCore\WpLoopPostBlock( $properties, $service, $this->_packageProviderFactory);
                        }
                    },
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-loop-post-block.html'
                    ),
                )
            ),
            new \Convo\Core\Factory\ComponentDefinition(
                $this->getNamespace(),
                '\Convo\Wp\Pckg\WpCore\WpQueryContext',
                'WP Query Context',
                'Performs search with WP_Query and defined arguments',
                array(
                    'id' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => 'search_posts',
                        'name' => 'Context ID',
                        'description' => 'Unique ID by which this context is referenced',
                        'valueType' => 'string'
                    ),
                    'args' => array(
                        'editor_type' => 'params',
                        'editor_properties' => array(
                            'multiple' => true
                        ),
                        'defaultValue' => array(
                            'post_type' => 'post',
                            'post_status' => 'publish',
                            'posts_per_page' => 3,
                        ),
                        'name' => 'WP_Query args',
                        'description' => 'Arguments passed to the WP_Query object',
                        'valueType' => 'array'
                    ),
                    'resetNaviVar' => array(
                        'editor_type' => 'text',
                        'editor_properties' => array(),
                        'defaultValue' => '',
                        'name' => 'Rewind pagination',
                        'description' => 'Expression which if evaluated to true will rewind pagination to the first page',
                        'valueType' => 'string'
                    ),
                    '_preview_angular' => array(
                        'type' => 'html',
                        'template' => '<div class="code">' .
                        '<span class="statement">WP_Query </span> <b>[{{ contextElement.properties.id }}]</b>' .
                        '</div>'
                    ),
                    '_interface' => '\Convo\Core\Workflow\IServiceContext',
                    '_workflow' => 'datasource',
                    '_help' =>  array(
                        'type' => 'file',
                        'filename' => 'wp-query-context.html'
                    ),
                )
                ),
                new \Convo\Core\Factory\ComponentDefinition(
                    $this->getNamespace(),
                    '\Convo\Wp\Pckg\WpCore\WpMediaContext',
                    'WP_Query mp3 source',
                    'Performs WP_Query and exposes result as media player source',
                    array(
                        'id' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => 'search_media',
                            'name' => 'Context ID',
                            'description' => 'Unique ID by which this context is referenced',
                            'valueType' => 'string'
                        ),
                        'args' => array(
                            'editor_type' => 'params',
                            'editor_properties' => array(
                                'multiple' => true
                            ),
                            'defaultValue' => array(
                                'post_type' => 'attachment',
                                'post_mime_type' => 'audio/mpeg',
                                'post_status' => 'all',
                                'orderby' => 'title',
                                'order' => 'ASC',
                            ),
                            'name' => 'WP_Query args',
                            'description' => 'Arguments passed to the WP_Query object',
                            'valueType' => 'array'
                        ),
                        'song_url' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Song URL',
                            'description' => 'Optional expression to evaluate song URL. If empty, wp_get_attachment_url() is used.',
                            'valueType' => 'string'
                        ),
                        'song_title' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Song Title',
                            'description' => 'Optional expression to evaluate song title. If empty, meta title or post title will be used',
                            'valueType' => 'string'
                        ),
                        'artist' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Artist',
                            'description' => 'Optional expression to evaluate song artist. If empty, meta artist or meta album will be used',
                            'valueType' => 'string'
                        ),
                        'artwork_url' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Song image',
                            'description' => 'Song image URL. If empty, system will use get_the_post_thumbnail_url() or "Default song image" if thumbnail is empty too',
                            'valueType' => 'string'
                        ),
                        'background_url' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Background image',
                            'description' => 'Background image url. Can be expression which will be evaluated in the service context.',
                            'valueType' => 'string'
                        ),
                        'default_song_image_url' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Default song image',
                            'description' => 'Default image for song artwork. Can be expression which will be evaluated in the service context.',
                            'valueType' => 'string'
                        ),
                        'default_loop' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Default loop status',
                            'description' => 'Empty (false) or expression (boolean) to have initial player loop state',
                            'valueType' => 'string'
                        ),
                        'default_shuffle' => array(
                            'editor_type' => 'text',
                            'editor_properties' => array(),
                            'defaultValue' => '',
                            'name' => 'Default shuffle status',
                            'description' => 'Empty (false) or expression (boolean) to have initial player shuffle state',
                            'valueType' => 'string'
                        ),
                        '_preview_angular' => array(
                            'type' => 'html',
                            'template' => '<div class="code">' .
                            '<span class="statement">WP Media </span> <b>[{{ contextElement.properties.id }}]</b>' .
                            '</div>'
                        ),
                        '_interface' => '\Convo\Core\Workflow\IServiceContext',
                        '_workflow' => 'datasource',
                        '_help' =>  array(
                            'type' => 'file',
                            'filename' => 'wp-media-context.html'
                        ),
                    )
                ),
                new \Convo\Core\Factory\ComponentDefinition(
                    $this->getNamespace(),
                    '\Convo\Wp\Pckg\WpCore\WpPostContext',
                    'Custom Post Catalog',
                    'Use a catalog list for custom posts',
                    [
                        'entity_name' => [
                            'editor_type' => 'text',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Entity name',
                            'description' => 'Entity name to use with this catalog.',
                            'valueType' => 'string'
                        ],
                        'version' => [
                            'editor_type' => 'text',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Version',
                            'description' => 'A value or expression that will determine whether or not a new set of values should be published for this catalog.',
                            'valueType' => 'string'
                        ],
                        'query_params' => [
                            'editor_type' => 'params',
                            'editor_properties' => [
                                'multiple' => true
                            ],
                            'defaultValue' => [],
                            'name' => 'Query parameters',
                            'description' => 'Query parameters used to filter WP posts.',
                            'valueType' => 'array'
                        ],
                        'final_value' => [
                            'editor_type' => 'text',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Final value',
                            'description' => 'An expression through which to format the final catalog value of any given post. Use WP functions such as get_the_title() etc. Result for each post MUST be a single string value.',
                            'valueType' => 'string'
                        ],
                        'class_aliases' => ['\Convo\Wp\Pckg\WpCore\WpPostCatalog'],
                        '_preview_angular' => [
                            'type' => 'html',
                            'template' => '<div class="code">' .
                                '<span class="statement">FORMAT EACH POST TO FINAL VALUE<br><b>{{ contextElement.properties.final_value }}</b></span>'.
                                '</div>'
                        ],
                        '_workflow' => 'datasource',
                        '_help' =>  array(
                            'type' => 'file',
                            'filename' => 'wp-post-context.html'
                        )
                    ]
                ),
                new \Convo\Core\Factory\ComponentDefinition(
                    $this->getNamespace(),
                    '\Convo\Wp\Pckg\WpCore\WpTableContext',
                    'WP Custom Table Catalog',
                    'Query the WP Database on a table to create a catalog of values',
                    [
                        'entity_name' => [
                            'editor_type' => 'text',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Entity name',
                            'description' => 'Entity name to use with this catalog.',
                            'valueType' => 'string'
                        ],
                        'version' => [
                            'editor_type' => 'text',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Version',
                            'description' => 'A value or expression that will determine whether or not a new set of values should be published for this catalog.',
                            'valueType' => 'string'
                        ],
                        'query' => [
                            'editor_type' => 'ssml',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Query',
                            'description' => 'SQL query to run on the table.',
                            'valueType' => 'string'
                        ],
                        'final_value' => [
                            'editor_type' => 'text',
                            'editor_properties' => [],
                            'defaultValue' => null,
                            'name' => 'Final value',
                            'description' => 'An expression through which to format the final catalog value of any given query row. The expression will be evaluated for every row of the result, and you can access that row by using `row.property`. Result for each row MUST be a single string value.',
                            'valueType' => 'string'
                        ],
                        '_preview_angular' => [
                            'type' => 'html',
                            'template' => '<div class="code">' .
                            '<span class="statement">FORMAT EACH VALUE TO<br><b>{{ contextElement.properties.final_value }}</b></span>' .
                            '</div>'
                        ],
                        '_workflow' => 'datasource',
                        '_factory' => new class ($this->_wpdb) implements IComponentFactory
				        {
					        private $_wpdb;

					        public function __construct($wpdb)
					        {
						        $this->_wpdb = $wpdb;
					        }

					        public function createComponent($properties, $service)
					        {
						        return new \Convo\Wp\Pckg\WpCore\WpTableContext($properties, $this->_wpdb);
					        }
				        },
                        '_help' =>  array(
                            'type' => 'file',
                            'filename' => 'wp-table-context.html'
                        )
                    ]
                ),
		        new \Convo\Core\Factory\ComponentDefinition(
			        $this->getNamespace(),
			        '\Convo\Wp\Pckg\WpCore\GetWpUserElement',
			        'Init current auth user',
			        'Initialize the currently authenticated user.',
			        [
				        'name' => [
					        'editor_type' => 'text',
					        'editor_properties' => [],
					        'defaultValue' => 'user',
					        'name' => 'Name',
					        'description' => 'Name under which to store the loaded user object in the context',
					        'valueType' => 'string'
				        ],
                        'should_set_as_current_user' => [
                            'editor_type' => 'boolean',
                            'editor_properties' => [],
                            'defaultValue' => true,
                            'name' => 'Set as Current User?',
                            'description' => 'Should change the current user by ID? Initially there is no WP User set in the service.',
                            'valueType' => 'boolean'
                        ],
				        'prompt_for_linking' => [
					        'editor_type' => 'boolean',
					        'editor_properties' => [],
					        'defaultValue' => false,
					        'name' => 'Prompt for linking',
					        'description' => 'Prompt the user to link their account if an authenticated user could not be loaded.',
					        'valueType' => 'boolean'
				        ],
				        '_preview_angular' => [
					        'type' => 'html',
					        'template' => '<div class="code">' .
					                      'Load user and set it as <span class="statement"><b>{{ component.properties.name }}</b></span>' .
					                      '</div>'
				        ],
				        '_workflow' => 'read',
						'_help' =>  array(
							'type' => 'file',
							'filename' => 'get-wp-user-element.html'
						),
				        '_factory' => new class ($this->_adminUserDataProvider) implements IComponentFactory
				        {
					        private $_adminUserDataProvider;

					        public function __construct(AdminUserDataProvider $adminUserDataProvider)
					        {
						        $this->_adminUserDataProvider = $adminUserDataProvider;
					        }

					        public function createComponent($properties, $service)
					        {
						        return  new \Convo\Wp\Pckg\WpCore\GetWpUserElement($properties, $this->_adminUserDataProvider);
					        }
				        }
			        ]
		        ),
			new \Convo\Core\Factory\ComponentDefinition(
				$this->getNamespace(),
				'\Convo\Wp\Pckg\WpCore\WpInsertPostElement',
				'WP Insert Post Element',
				'Allows to insert or update WP Posts.',
				array(
					'created_post_var' => [
						'editor_type' => 'text',
						'editor_properties' => [],
						'defaultValue' => 'status',
						'name' => 'Name',
						'description' => 'Name under which to store the recently created post.',
						'valueType' => 'string'
					],
					'fire_after_hooks' => array(
						'editor_type' => 'boolean',
						'editor_properties' => array(),
						'defaultValue' => true,
						'name' => 'Fire After Hooks',
						'description' => 'Whether to fire the after insert hooks. Default value: true',
						'valueType' => 'boolean'
					),
					'post_args' => array(
						'editor_type' => 'params',
						'editor_properties' => array(
							'multiple' => true
						),
						'defaultValue' => array(
							'post_type' => 'post',
							'post_title' => 'Hello World!',
							'post_content' => '',
							'post_status' => 'publish',
						),
						'name' => 'WP Post args',
						'description' => 'An array of elements that make up a post to update or insert.',
						'valueType' => 'array'
					),
					'post_tax_input' => array(
						'editor_type' => 'params',
						'editor_properties' => array(
							'multiple' => true
						),
						'defaultValue' => array(),
						'name' => 'WP Post tax input',
						'description' => 'Array of taxonomy terms keyed by their taxonomy name. Default empty.',
						'valueType' => 'array'
					),
					'post_meta_input' => array(
						'editor_type' => 'params',
						'editor_properties' => array(
							'multiple' => true
						),
						'defaultValue' => array(),
						'name' => 'WP Post meta input',
						'description' => 'Array of post meta values keyed by their post meta key. Default empty.',
						'valueType' => 'array'
					),
					'on_success' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On Success',
						'description' => 'Executed if the post was successfully inserted or updated.',
						'valueType' => 'class'
					],
					'on_failure' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On Failure',
						'description' => 'Executed if the post was not successfully inserted or updated.',
						'valueType' => 'class'
					],
					'_workflow' => 'read',
					'_help' =>  array(
						'type' => 'file',
						'filename' => 'wp-insert-post-element.html'
					),
				)
			),
			new \Convo\Core\Factory\ComponentDefinition(
				$this->getNamespace(),
				'\Convo\Wp\Pckg\WpCore\WpInsertUserElement',
				'WP Insert User Element',
				'Allows to insert WP Users.',
				array(
					'created_user_var' => [
						'editor_type' => 'text',
						'editor_properties' => [],
						'defaultValue' => 'status',
						'name' => 'Name',
						'description' => 'Name under which to store the recently created user.',
						'valueType' => 'string'
					],
					'username' => [
						'editor_type' => 'text',
						'editor_properties' => [],
						'defaultValue' => '',
						'name' => 'Username',
						'description' => 'Username of the user to be created. (required)',
						'valueType' => 'string'
					],
					'email' => [
						'editor_type' => 'text',
						'editor_properties' => [],
						'defaultValue' => '',
						'name' => 'Email',
						'description' => 'Email of the user to be created. (recommended)',
						'valueType' => 'string'
					],
					'available_wp_roles' => [
						'editor_type' => 'select',
						'editor_properties' => [
							'options' => wp_roles()->get_names()
						],
						'defaultValue' => get_option('default_role'),
						'name' => 'Role',
						'description' => 'Role from available WP Roles for the user to be created.',
						'valueType' => 'string'
					],
					'user_meta_input' => array(
						'editor_type' => 'params',
						'editor_properties' => array(
							'multiple' => true
						),
						'defaultValue' => array(),
						'name' => 'WP User meta input',
						'description' => 'An array of elements that make up key value pairs for user meta to be inserted or updated.',
						'valueType' => 'array'
					),
					'on_user_exists' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On User Exists',
						'description' => 'Executed if the user already exists.',
						'valueType' => 'class'
					],
					'on_success' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On Success',
						'description' => 'Executed if the user was successfully inserted.',
						'valueType' => 'class'
					],
					'on_failure' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On Failure',
						'description' => 'Executed if the user was not inserted successfully.',
						'valueType' => 'class'
					],
					'_help' =>  array(
						'type' => 'file',
						'filename' => 'wp-insert-user-element.html'
					),
					'_workflow' => 'read',
				)
			),
			new \Convo\Core\Factory\ComponentDefinition(
				$this->getNamespace(),
				'\Convo\Wp\Pckg\WpCore\WpUpdateUserMetaElement',
				'WP Update User Meta Element',
				'Allows to update meta of WP Users.',
				array(
					'updated_user_var' => [
						'editor_type' => 'text',
						'editor_properties' => [],
						'defaultValue' => 'status',
						'name' => 'Status Var',
						'description' => 'Name under which to store the recently updated user.',
						'valueType' => 'string'
					],
					'user_id' => [
						'editor_type' => 'text',
						'editor_properties' => [],
						'defaultValue' => '0',
						'name' => 'User ID',
						'description' => 'ID of the user to be updated. (required)',
						'valueType' => 'string'
					],
					'user_meta_input' => array(
						'editor_type' => 'params',
						'editor_properties' => array(
							'multiple' => true
						),
						'defaultValue' => array(),
						'name' => 'WP User meta input',
						'description' => 'An array of elements that make up key value pairs for user meta to be inserted or updated.',
						'valueType' => 'array'
					),
					'on_success' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On Success',
						'description' => 'Executed if the user was found to update meta for.',
						'valueType' => 'class'
					],
					'on_failure' => [
						'editor_type' => 'service_components',
						'editor_properties' => [
							'allow_interfaces' => ['\Convo\Core\Workflow\IConversationElement'],
							'multiple' => true
						],
						'defaultValue' => [],
						'name' => 'On Failure',
						'description' => 'Executed if the user was not found to update meta for.',
						'valueType' => 'class'
					],
					'_help' =>  array(
						'type' => 'file',
						'filename' => 'wp-update-user-meta-element.html'
					),
					'_workflow' => 'read',
				)
			),
			new \Convo\Core\Factory\ComponentDefinition(
			    $this->getNamespace(),
			    '\Convo\Wp\Pckg\WpCore\SimpleWpMailElement',
			    'WP Mail',
			    'Send email using wp_mail() function',
			    [
			        'to' => [
			            'editor_type' => 'text',
			            'editor_properties' => [],
			            'defaultValue' => '',
			            'name' => 'To',
			            'description' => 'To who we are sending email',
			            'valueType' => 'string'
			        ],
			        'subject' => [
			            'editor_type' => 'text',
			            'editor_properties' => [],
			            'defaultValue' => '',
			            'name' => 'Subject',
			            'description' => 'Subject for the email',
			            'valueType' => 'string'
			        ],
			        'message' => [
			            'editor_type' => 'desc',
			            'editor_properties' => [],
			            'defaultValue' => '',
			            'name' => 'Subject',
			            'description' => 'Email message',
			            'valueType' => 'string'
			        ],
			        'from' => [
			            'editor_type' => 'text',
			            'editor_properties' => [],
			            'defaultValue' => '',
			            'name' => 'From',
			            'description' => 'Optional, from for the email',
			            'valueType' => 'string'
			        ],
			        '_workflow' => 'read',
			        '_preview_angular' => array(
			            'type' => 'html',
			            'template' => '<div class="code">' .
			            '<span class="statement">SEND</span> wp_mail() <b>{{ component.properties.subject }}</b> <span class="statement">TO</span> <b>{{ component.properties.to }}</b>' .
			            '</div>'
			        ),
			        '_help' =>  [
			            'type' => 'file',
			            'filename' => 'simple-wp-mail-element.html'
			        ],
			    ]
			    ),
        ];
    }
}
